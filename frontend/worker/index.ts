/**
 * Cloudflare Worker entry. Most files (the built site in `dist`) are served by Cloudflare itself;
 * this code only runs for the paths listed in `run_worker_first` in wrangler.jsonc:
 *   /api/*             the product search
 *   /video/*, /audio/* media, because Workers static assets ignore HTTP Range requests and Safari
 *                      refuses to play a video that answers a Range request with the whole file
 *
 * Environment (Worker settings, optional):
 *   SERPER_API_KEY   a serper.dev key for live product prices (add it as a Secret)
 */
import { onRequestGet } from '../functions/api/furniture-search';

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  SERPER_API_KEY?: string;
}

interface Ctx {
  waitUntil: (promise: Promise<unknown>) => void;
}

const json = (body: unknown, status: number, extra: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extra,
    },
  });

/**
 * Answers `Range: bytes=a-b`, `bytes=a-` and `bytes=-n` for a small media file with 206 Partial Content.
 * The files are a few megabytes at most, so reading one fully into memory is fine.
 */
export async function serveMedia(request: Request, env: Env): Promise<Response> {
  const res = await env.ASSETS.fetch(request);
  if (res.status !== 200) return res;

  // The single-page-app fallback answers unknown paths with index.html; for media that is a 404.
  if ((res.headers.get('Content-Type') ?? '').startsWith('text/html')) return new Response(null, { status: 404 });

  // A HEAD request has no body to slice; just advertise that ranges are supported.
  if (request.method !== 'GET') {
    const head = new Headers(res.headers);
    head.set('Accept-Ranges', 'bytes');
    return new Response(null, { status: 200, headers: head });
  }

  const body = await res.arrayBuffer();
  const size = body.byteLength;
  const headers = new Headers(res.headers);
  headers.set('Accept-Ranges', 'bytes');

  const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('Range') ?? '');
  if (!match || (match[1] === '' && match[2] === '')) {
    headers.set('Content-Length', String(size));
    return new Response(body, { status: 200, headers });
  }

  let start: number;
  let end: number;
  if (match[1] === '') {
    start = Math.max(0, size - Number(match[2]));
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === '' ? size - 1 : Math.min(Number(match[2]), size - 1);
  }

  if (start > end || start >= size) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  }

  headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
  headers.set('Content-Length', String(end - start + 1));
  return new Response(body.slice(start, end + 1), { status: 206, headers });
}

export default {
  async fetch(request: Request, env: Env, ctx: Ctx): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === '/api/furniture-search') {
      if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405, { Allow: 'GET' });
      return onRequestGet({ request, env, waitUntil: (p) => ctx.waitUntil(p) });
    }

    // An unknown API path is an error, not the single-page app.
    if (pathname.startsWith('/api/')) return json({ error: 'Not found.' }, 404);

    if (pathname.startsWith('/video/') || pathname.startsWith('/audio/')) return serveMedia(request, env);

    return env.ASSETS.fetch(request);
  },
};
