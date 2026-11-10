/**
 * POST /api/redesign: the backup AI source.
 *
 * When the visitor's free Hugging Face time is used up, the studio sends the photo here instead. The Worker
 * runs the same model (FLUX.2 klein 4B) on Cloudflare Workers AI, which has its own free allowance of 10,000
 * neurons a day for the whole site (roughly 100 designs). On the Free plan nothing is billed: when the
 * allowance is gone the call fails and the studio shows its usual "free time used up" message.
 *
 * Protections, in the order they run (cheapest first):
 *   1. POST only, a multipart body of at most 1.5 MB with a Content-Length.
 *   2. The caller must be a signed-in user of this site's Supabase project (checked with Supabase itself).
 *   3. A per-user rate limit, so one person cannot empty the day's allowance in a minute.
 *   4. The prompt, size, seed and photo are validated. The photo must really be a JPEG, PNG or WebP.
 *
 * The photo and prompt are never logged or stored. The image comes back as base64 text and is decoded by the
 * browser, because the Workers Free plan allows only 10 ms of CPU time per request.
 */

export const MODEL = '@cf/black-forest-labs/flux-2-klein-4b';
export const MAX_BODY_BYTES = 1_500_000;
export const MAX_IMAGE_BYTES = 1_000_000;
export const MAX_PROMPT_LENGTH = 4_000;
export const MIN_SIDE = 256;
export const MAX_SIDE = 1024;

export interface RedesignEnv {
  /** Workers AI binding. Missing when the site is not deployed on Workers. */
  AI?: { run: (model: string, input: unknown) => Promise<unknown> };
  /** The site's Supabase project, for example https://abc.supabase.co. Public, not a secret. */
  SUPABASE_URL?: string;
  REDESIGN_LIMITER?: { limit: (options: { key: string }) => Promise<{ success: boolean }> };
}

/** The parts of a parsed form this code reads, so tests do not need a real multipart body. */
export interface FormLike {
  get: (name: string) => unknown;
}

export type ImageMime = 'image/jpeg' | 'image/png' | 'image/webp';

export interface Failure {
  status: number;
  code: string;
  message: string;
  headers?: Record<string, string>;
}

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

export function failure(f: Failure): Response {
  return new Response(JSON.stringify({ error: { code: f.code, message: f.message } }), {
    status: f.status,
    headers: { ...JSON_HEADERS, ...f.headers },
  });
}

/** Looks at the first bytes, not at the name or the type the caller claims. */
export function sniffImage(bytes: Uint8Array): ImageMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

/** The same check on the start of a base64 string (the model's answer). */
export function sniffBase64(b64: string): ImageMime | null {
  if (b64.startsWith('/9j/')) return 'image/jpeg';
  if (b64.startsWith('iVBORw0KGgo')) return 'image/png';
  if (b64.startsWith('UklGR')) return 'image/webp';
  return null;
}

/** Asks Supabase whether this token belongs to a signed-in user of the site's project. Returns the user id. */
export async function verifyUser(request: Request, env: RedesignEnv, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  const authorization = request.headers.get('Authorization') ?? '';
  const apiKey = request.headers.get('apikey') ?? '';
  if (authorization.length > 4096 || !/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/.test(authorization)) return null;
  if (!/^[\w.-]{10,400}$/.test(apiKey) || !env.SUPABASE_URL) return null;
  try {
    const res = await fetchImpl(`${env.SUPABASE_URL.replace(/\/+$/, '')}/auth/v1/user`, {
      headers: { Authorization: authorization, apikey: apiKey },
    });
    if (!res.ok) return null;
    const user = (await res.json()) as { id?: unknown };
    return typeof user.id === 'string' && user.id.length > 0 ? user.id : null;
  } catch {
    return null;
  }
}

export interface RedesignInput {
  prompt: string;
  width: number;
  height: number;
  seed?: number;
  image: Uint8Array;
  mime: ImageMime;
}

const isFileLike = (v: unknown): v is { size: number; arrayBuffer: () => Promise<ArrayBuffer> } =>
  typeof v === 'object' && v !== null && typeof (v as { arrayBuffer?: unknown }).arrayBuffer === 'function' && typeof (v as { size?: unknown }).size === 'number';

function parseInteger(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d{1,10}$/.test(value)) return null;
  return Number(value);
}

/** Validates every field. Anything unexpected is refused rather than passed on to the model. */
export async function parseRedesignForm(form: FormLike): Promise<RedesignInput | Failure> {
  const invalid = (message: string): Failure => ({ status: 400, code: 'INVALID_REQUEST', message });

  const prompt = form.get('prompt');
  if (typeof prompt !== 'string' || prompt.trim().length < 3 || prompt.length > MAX_PROMPT_LENGTH) return invalid('The design instructions are missing or too long.');

  const width = parseInteger(form.get('width'));
  const height = parseInteger(form.get('height'));
  const okSide = (n: number | null): n is number => n !== null && n >= MIN_SIDE && n <= MAX_SIDE && n % 8 === 0;
  if (!okSide(width) || !okSide(height)) return invalid('The image size is not supported.');

  const rawSeed = form.get('seed');
  let seed: number | undefined;
  if (rawSeed !== null && rawSeed !== undefined && rawSeed !== '') {
    const parsed = parseInteger(rawSeed);
    if (parsed === null || parsed > 2_147_483_647) return invalid('The seed is not valid.');
    seed = parsed;
  }

  const file = form.get('image');
  if (!isFileLike(file)) return invalid('A photo is required.');
  if (file.size < 100 || file.size > MAX_IMAGE_BYTES) return invalid('The photo is empty or too large.');
  const image = new Uint8Array(await file.arrayBuffer());
  const mime = sniffImage(image);
  if (!mime) return invalid('The photo must be a JPEG, PNG or WebP image.');

  return { prompt: prompt.trim(), width, height, seed, image, mime };
}

const EXTENSION: Record<ImageMime, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/**
 * Builds the multipart body Workers AI expects. Written by hand so it behaves the same in the Workers runtime
 * and in tests; every header value here is fixed, and caller text only ever appears inside a part body.
 */
export function buildAiBody(input: RedesignInput): { body: ReadableStream<Uint8Array>; contentType: string } {
  const boundary = `----hoomefy${crypto.randomUUID().replace(/-/g, '')}`;
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const field = (name: string, value: string) =>
    chunks.push(encoder.encode(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`));

  field('prompt', input.prompt);
  field('width', String(input.width));
  field('height', String(input.height));
  if (input.seed !== undefined) field('seed', String(input.seed));
  chunks.push(
    encoder.encode(
      `--${boundary}\r\nContent-Disposition: form-data; name="input_image_0"; filename="room.${EXTENSION[input.mime]}"\r\nContent-Type: ${input.mime}\r\n\r\n`
    ),
    input.image,
    encoder.encode(`\r\n--${boundary}--\r\n`)
  );

  const total = chunks.reduce((n, c) => n + c.length, 0);
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.length;
  }
  return { body: new Response(bytes).body as ReadableStream<Uint8Array>, contentType: `multipart/form-data; boundary=${boundary}` };
}

/** Turns a Workers AI error into a status the studio understands. The photo and prompt are never part of the log. */
export function mapAiError(err: unknown): Failure {
  const text = err instanceof Error ? err.message : String(err);
  if (/daily free allocation|\b3036\b|\b4006\b|10,?000 neurons/i.test(text)) {
    return { status: 429, code: 'QUOTA', message: 'The backup AI allowance for today is used up.' };
  }
  if (/nsfw|safety|flagged|moderat|not allowed|512|dimension|too large|invalid input|bad request/i.test(text)) {
    return { status: 400, code: 'INVALID_REQUEST', message: 'The backup AI service could not use this photo or request.' };
  }
  return { status: 502, code: 'UNAVAILABLE', message: 'The backup AI service is not available right now.' };
}

export async function handleRedesign(request: Request, env: RedesignEnv, fetchImpl: typeof fetch = fetch): Promise<Response> {
  if (request.method !== 'POST') return failure({ status: 405, code: 'METHOD_NOT_ALLOWED', message: 'Use POST.', headers: { Allow: 'POST' } });
  if (!env.AI || !env.SUPABASE_URL) return failure({ status: 503, code: 'NOT_CONFIGURED', message: 'The backup AI service is not set up on this site.' });

  const length = Number(request.headers.get('Content-Length'));
  if (!Number.isFinite(length) || length <= 0) return failure({ status: 411, code: 'LENGTH_REQUIRED', message: 'A request size is required.' });
  if (length > MAX_BODY_BYTES) return failure({ status: 413, code: 'TOO_LARGE', message: 'The photo is too large.' });
  if (!/^multipart\/form-data;/i.test(request.headers.get('Content-Type') ?? '')) {
    return failure({ status: 415, code: 'UNSUPPORTED_TYPE', message: 'Send the photo as a form upload.' });
  }

  const userId = await verifyUser(request, env, fetchImpl);
  if (!userId) return failure({ status: 401, code: 'UNAUTHORIZED', message: 'Please sign in to use the backup AI service.' });

  if (env.REDESIGN_LIMITER) {
    const { success } = await env.REDESIGN_LIMITER.limit({ key: userId });
    if (!success) {
      return failure({ status: 429, code: 'RATE_LIMITED', message: 'Please wait a moment before making another design.', headers: { 'Retry-After': '30' } });
    }
  }

  let form: FormLike;
  try {
    form = (await request.formData()) as unknown as FormLike;
  } catch {
    return failure({ status: 400, code: 'INVALID_REQUEST', message: 'The upload could not be read.' });
  }
  const parsed = await parseRedesignForm(form);
  if ('code' in parsed) return failure(parsed);

  let result: unknown;
  try {
    const { body, contentType } = buildAiBody(parsed);
    result = await env.AI.run(MODEL, { multipart: { body, contentType } });
  } catch (err) {
    const mapped = mapAiError(err);
    console.error('redesign: model call failed', mapped.code, (err instanceof Error ? err.message : String(err)).slice(0, 200));
    return failure(mapped);
  }

  const image = (result as { image?: unknown } | null)?.image;
  if (typeof image !== 'string' || image.length < 100 || image.includes('"') || image.includes('\\') || image.includes('\n')) {
    console.error('redesign: unexpected model answer');
    return failure({ status: 502, code: 'UNAVAILABLE', message: 'The backup AI service returned no image.' });
  }
  const mime = sniffBase64(image) ?? 'image/png';
  return new Response(`{"image":"${image}","mime":"${mime}"}`, { status: 200, headers: JSON_HEADERS });
}
