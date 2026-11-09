/**
 * DistortedImageTransition
 *
 * An on-demand WebGL1 canvas that warps and dissolves between two images with:
 *  - turbulent UV wobble
 *  - horizontal slice displacement and duplicated segments (screen tearing)
 *  - RGB channel separation
 *  - a noise-threshold dissolve driven by `progress`
 *
 * It draws only when `set()` is called (typically from a GSAP tween), never in a
 * continuous loop. If WebGL is unavailable it falls back to a 2D cross-fade with
 * slice displacement, so the page always renders.
 */

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export type TextureSource = HTMLCanvasElement | HTMLImageElement | null;

export interface TransitionParams {
  /** 0 = `from` image, 1 = `to` image */
  progress: number;
  /** 0..1 amount of warp + slice displacement */
  distort: number;
  /** channel separation in UV units (~0.01 is visible) */
  split: number;
  /** seconds, advances the noise */
  time: number;
}

export interface DistortedImageHandle {
  set: (params: Partial<TransitionParams>) => void;
  setImages: (from: TextureSource, to: TextureSource) => void;
  readonly usesWebGL: boolean;
}

interface Props {
  from: TextureSource;
  to: TextureSource;
  className?: string;
  label?: string;
  /** Fallback aspect ratio (w/h) for a texture that has no size yet. Each texture is otherwise fitted by its own size. */
  textureAspect?: number;
}

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main(){
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
uniform sampler2D uFrom;
uniform sampler2D uTo;
uniform float uProgress;
uniform float uDistort;
uniform float uSplit;
uniform float uTime;
uniform vec2 uCoverFrom;
uniform vec2 uCoverTo;
varying vec2 vUv;

float hash(float n){ return fract(sin(n) * 43758.5453123); }
float hash2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), f.x),
             mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), f.x), f.y);
}

vec3 sampleScene(vec2 uv, float mask){
  // Each texture is cover-fitted by its own aspect ratio (the Elegant photo and the mansion painting differ).
  vec3 a = texture2D(uFrom, (uv - 0.5) * uCoverFrom + 0.5).rgb;
  vec3 b = texture2D(uTo, (uv - 0.5) * uCoverTo + 0.5).rgb;
  return mix(a, b, mask);
}

void main(){
  vec2 uv = vUv;
  float t = floor(uTime * 14.0);

  // Slice displacement and duplicated segments
  float bands = 38.0;
  float band = floor(uv.y * bands);
  float r = hash(band * 1.37 + t);
  float active = step(1.0 - uDistort * 0.55, r);
  uv.x += (hash(band * 3.1 + t * 1.7) - 0.5) * 0.32 * uDistort * active;
  float dup = step(0.93 - uDistort * 0.05, hash(band * 5.3 + t));
  uv.y += (hash(band + t * 0.3) - 0.5) * 0.12 * uDistort * dup;

  // Turbulent wobble
  vec2 w = vec2(noise(uv * 7.0 + uTime * 0.9), noise(uv * 7.0 - uTime * 0.7)) - 0.5;
  uv += w * 0.07 * uDistort;

  // Dissolve mask driven by noise so the haunting eats the room unevenly
  float n = noise(uv * 5.0 + 3.7) * 0.7 + noise(uv * 17.0) * 0.3;
  float mask = smoothstep(0.0, 0.22, uProgress * 1.22 - n);

  float s = uSplit * (0.4 + uDistort);
  vec3 col;
  col.r = sampleScene(uv + vec2(s, 0.0), mask).r;
  col.g = sampleScene(uv, mask).g;
  col.b = sampleScene(uv - vec2(s, s * 0.4), mask).b;

  // Scanline interference and slight desaturation while corrupted
  col *= 1.0 - 0.12 * uDistort * (0.5 + 0.5 * sin(vUv.y * 900.0 + uTime * 30.0));
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, vec3(l), 0.25 * uDistort);

  gl_FragColor = vec4(col, 1.0);
}`;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn('[haunting] shader compile failed:', gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

interface GlState {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  buffer: WebGLBuffer;
  texFrom: WebGLTexture;
  texTo: WebGLTexture;
  loc: Record<string, WebGLUniformLocation | null>;
}

function createGl(canvas: HTMLCanvasElement): GlState | null {
  // preserveDrawingBuffer keeps the last frame readable (tests and screenshots); this canvas
  // only redraws on demand, so there is no continuous-rendering cost.
  const gl = (canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power', preserveDrawingBuffer: true }) ||
    canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
  if (!gl || gl.isContextLost()) return null;
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  const texFrom = gl.createTexture();
  const texTo = gl.createTexture();
  if (!buffer || !texFrom || !texTo) return null;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  for (const tex of [texFrom, texTo]) {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  const names = ['uFrom', 'uTo', 'uProgress', 'uDistort', 'uSplit', 'uTime', 'uCoverFrom', 'uCoverTo'];
  const loc: Record<string, WebGLUniformLocation | null> = {};
  names.forEach((n) => (loc[n] = gl.getUniformLocation(program, n)));
  return { gl, program, buffer, texFrom, texTo, loc };
}

export const DistortedImageTransition = forwardRef<DistortedImageHandle, Props>(function DistortedImageTransition(
  { from, to, className, label, textureAspect = 1.6 },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<GlState | null>(null);
  const imagesRef = useRef<{ from: TextureSource; to: TextureSource }>({ from, to });
  const paramsRef = useRef<TransitionParams>({ progress: 0, distort: 0, split: 0, time: 0 });
  const dirtyTexturesRef = useRef(true);
  const webglRef = useRef(false);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const p = paramsRef.current;
    const { from: a, to: b } = imagesRef.current;

    // Cover scale so the texture fills the element without stretching
    const cw = canvas.clientWidth || canvas.width || 1;
    const ch = canvas.clientHeight || canvas.height || 1;
    const containerAspect = cw / ch;
    const coverFor = (src: TextureSource): [number, number] => {
      const natural = src instanceof HTMLImageElement ? [src.naturalWidth, src.naturalHeight] : src ? [src.width, src.height] : [0, 0];
      const aspect = natural[0] > 0 && natural[1] > 0 ? natural[0] / natural[1] : textureAspect;
      return containerAspect > aspect ? [1, aspect / containerAspect] : [containerAspect / aspect, 1];
    };
    const coverFrom = coverFor(a);
    const coverTo = coverFor(b);

    const st = glRef.current;
    if (st) {
      const { gl, loc } = st;
      if (gl.isContextLost()) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (dirtyTexturesRef.current) {
        const upload = (tex: WebGLTexture, src: TextureSource, unit: number) => {
          gl.activeTexture(gl.TEXTURE0 + unit);
          gl.bindTexture(gl.TEXTURE_2D, tex);
          if (src) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src);
        };
        upload(st.texFrom, a, 0);
        upload(st.texTo, b, 1);
        gl.uniform1i(loc.uFrom, 0);
        gl.uniform1i(loc.uTo, 1);
        dirtyTexturesRef.current = false;
      }
      gl.uniform1f(loc.uProgress, p.progress);
      gl.uniform1f(loc.uDistort, p.distort);
      gl.uniform1f(loc.uSplit, p.split);
      gl.uniform1f(loc.uTime, p.time);
      gl.uniform2f(loc.uCoverFrom, coverFrom[0], coverFrom[1]);
      gl.uniform2f(loc.uCoverTo, coverTo[0], coverTo[1]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return;
    }

    // 2D fallback: cross-fade with horizontal slice displacement
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const drawCover = (src: TextureSource, alpha: number, dx: number, y: number, hh: number) => {
      if (!src || alpha <= 0) return;
      const sw = src.width;
      const sh = src.height;
      const sa = sw / sh;
      const ca = w / h;
      let cw2 = sw;
      let ch2 = sh;
      if (ca > sa) ch2 = sw / ca;
      else cw2 = sh * ca;
      const sx = (sw - cw2) / 2;
      const sy = (sh - ch2) / 2;
      ctx.globalAlpha = alpha;
      ctx.drawImage(src, sx, sy + (y / h) * ch2, cw2, (hh / h) * ch2, dx, y, w, hh);
    };
    const bandsN = 24;
    const bandH = h / bandsN;
    for (let i = 0; i < bandsN; i++) {
      const jitter = Math.sin(i * 12.9898 + Math.floor(p.time * 14) * 78.233) * 43758.5453;
      const frac = jitter - Math.floor(jitter);
      const dx = frac > 1 - p.distort * 0.55 ? (frac - 0.5) * w * 0.3 * p.distort : 0;
      drawCover(a, 1 - p.progress, dx, i * bandH, bandH + 1);
      drawCover(b, p.progress, dx, i * bandH, bandH + 1);
    }
    ctx.globalAlpha = 1;
  };

  useImperativeHandle(ref, () => ({
    set: (params) => {
      paramsRef.current = { ...paramsRef.current, ...params };
      draw();
    },
    setImages: (f, t) => {
      imagesRef.current = { from: f, to: t };
      dirtyTexturesRef.current = true;
      draw();
    },
    get usesWebGL() {
      return webglRef.current;
    },
  }));

  // Create the context once; destroy it on unmount.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const st = createGl(canvas);
    glRef.current = st;
    webglRef.current = !!st;

    const onLost = (e: Event) => e.preventDefault();
    const onRestored = () => {
      glRef.current = createGl(canvas);
      dirtyTexturesRef.current = true;
      draw();
    };
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);

    // Keep the backing store sized to the element (capped for performance).
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(2, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(2, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      draw();
    };
    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(canvas);

    return () => {
      ro?.disconnect();
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      const s = glRef.current;
      if (s) {
        const { gl } = s;
        gl.deleteTexture(s.texFrom);
        gl.deleteTexture(s.texTo);
        gl.deleteBuffer(s.buffer);
        gl.deleteProgram(s.program);
        // Only release the context when the canvas has really left the document. React
        // StrictMode runs this cleanup and then re-mounts on the *same* element; a context
        // we had already killed would be handed straight back and every shader would fail.
        if (!canvas.isConnected) gl.getExtension('WEBGL_lose_context')?.loseContext();
      }
      glRef.current = null;
      webglRef.current = false;
    };
    // The draw function reads refs only, so it is intentionally not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Props changes replace the textures.
  useEffect(() => {
    imagesRef.current = { from, to };
    dirtyTexturesRef.current = true;
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
});
