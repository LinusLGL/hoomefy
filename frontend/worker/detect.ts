/**
 * POST /api/detect-items: which furniture and decor are in a finished design?
 *
 * The studio sends a small copy of the design (a JPEG, PNG or WebP as a data URL, at most 400 KB of request).
 * A vision model on Cloudflare Workers AI looks at it and lists the pieces: what kind each is, what to call
 * it, and the words someone would type into a shop to find something like it. The studio then looks the
 * prices up with /api/furniture-search.
 *
 * It draws on the same free Workers AI allowance as the redesign (10,000 neurons a day, shared by the whole
 * site). One look costs a small fraction of one redesign. When the allowance is gone the call fails with
 * QUOTA and the studio offers the finder that runs on the visitor's own device instead.
 *
 * Protections, cheapest first: POST only; a JSON body of at most 400 KB with a Content-Length; the caller must be
 * a signed-in user of this site's Supabase project, within a per-user rate limit; the image must really be a
 * JPEG, PNG or WebP. The model's answer is untrusted: only known kinds survive, names and search words are
 * cleaned, and at most ten pieces are returned. The picture and the answer are never logged or stored.
 */

import { FURNITURE_IDS, isFurnitureKind, type FurnitureKindId } from '../src/features/furniture/taxonomy';
import { requireUser } from './guard';
import { failure, mapAiError, sniffBase64, type RedesignEnv } from './redesign';

/** Tried in order. Both read pictures; the second takes over if the first is retired or unavailable. */
export const VISION_MODELS: readonly string[] = ['@cf/meta/llama-4-scout-17b-16e-instruct', '@cf/google/gemma-4-26b-a4b-it'];
export const MAX_BODY_BYTES = 400_000;
export const MAX_FOUND = 10;

export interface FoundItem {
  kind: FurnitureKindId;
  name: string;
  query: string;
}

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

const SYSTEM = 'You identify furniture and decor in photographs of rooms. You answer with JSON only.';

export const INSTRUCTIONS = [
  'List the furniture and decor you can clearly see in this room, most prominent first, at most 10 items.',
  'Skip walls, floors, ceilings, windows, doors and anything built in.',
  'For each item give:',
  `- "kind": exactly one of: ${FURNITURE_IDS.join(', ')}. Choose the closest.`,
  '- "name": 2 to 6 words describing it with its colour or material, for example "round walnut coffee table".',
  '- "query": 3 to 8 words someone would type into an online shop to find a similar item to buy. No brand names.',
  'If several items are identical, such as matching dining chairs, list that item once.',
  'Answer with JSON only, in this shape: {"items":[{"kind":"sofa","name":"grey linen sofa","query":"grey linen 3 seater sofa"}]}',
].join('\n');

const DATA_URL = /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/;

/** The data URL, if it really is a small JPEG, PNG or WebP. */
export function readImage(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > MAX_BODY_BYTES) return null;
  const match = DATA_URL.exec(value);
  if (!match) return null;
  return sniffBase64(match[1]) ? value : null;
}

const collapse = (text: string): string => text.replace(/\s+/g, ' ').trim();

function cleanName(value: unknown): string {
  return typeof value === 'string' ? collapse(value.replace(/\p{Cc}+/gu, ' ')).slice(0, 60).trim() : '';
}

function cleanQuery(value: unknown): string {
  if (typeof value !== 'string') return '';
  const q = collapse(value.replace(/[^\p{L}\p{N} '&,.-]+/gu, ' '));
  if (q.length <= 80) return q;
  const cut = q.slice(0, 80);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), 0)).trim();
}

/** Keeps only pieces of a kind we know, with a name and shop words, without repeats. */
export function cleanFound(raw: unknown): FoundItem[] {
  if (!Array.isArray(raw)) return [];
  const out: FoundItem[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const r = entry as Record<string, unknown>;
    if (!isFurnitureKind(r.kind)) continue;
    const name = cleanName(r.name);
    if (name.length < 2) continue;
    const query = cleanQuery(r.query) || cleanQuery(name);
    if (query.length < 2) continue;
    const key = `${r.kind}:${name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ kind: r.kind, name, query });
    if (out.length >= MAX_FOUND) break;
  }
  return out;
}

/** Finds the JSON in a model's text, which may be wrapped in a code fence or a sentence. */
export function extractJson(text: string): unknown {
  const start = text.search(/[{[]/);
  if (start === -1) return null;
  const open = text[start];
  const end = text.lastIndexOf(open === '{' ? '}' : ']');
  if (end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** The model's answer as text or an object, whichever shape this model family uses. */
export function modelOutput(result: unknown): unknown {
  const r = result as { response?: unknown; choices?: Array<{ message?: { content?: unknown } }> } | null;
  if (typeof r?.response === 'string' || (r?.response && typeof r.response === 'object')) return r.response;
  const content = r?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((part) => (part && typeof (part as { text?: unknown }).text === 'string' ? (part as { text: string }).text : '')).join('');
  }
  return null;
}

/** The list of pieces in a model's answer, or null when the answer holds no list at all. */
export function itemsFromOutput(output: unknown): FoundItem[] | null {
  const parsed = typeof output === 'string' ? extractJson(output) : output;
  const list = Array.isArray(parsed) ? parsed : (parsed as { items?: unknown } | null)?.items;
  return Array.isArray(list) ? cleanFound(list) : null;
}

/** A short reason for the log. Any data URL is cut out first, so the picture can never end up in a log. */
function loggable(err: unknown): string {
  return (err instanceof Error ? err.message : String(err)).replace(/data:[^\s"']*/g, 'data:...').slice(0, 200);
}

export async function handleDetectItems(request: Request, env: RedesignEnv, fetchImpl: typeof fetch = fetch): Promise<Response> {
  if (request.method !== 'POST') return failure({ status: 405, code: 'METHOD_NOT_ALLOWED', message: 'Use POST.', headers: { Allow: 'POST' } });
  if (!env.AI || !env.SUPABASE_URL) return failure({ status: 503, code: 'NOT_CONFIGURED', message: 'The item finder is not set up on this site.' });

  const length = Number(request.headers.get('Content-Length'));
  if (!Number.isFinite(length) || length <= 0) return failure({ status: 411, code: 'LENGTH_REQUIRED', message: 'A request size is required.' });
  if (length > MAX_BODY_BYTES) return failure({ status: 413, code: 'TOO_LARGE', message: 'The picture is too large.' });
  if (!/^application\/json/i.test(request.headers.get('Content-Type') ?? '')) {
    return failure({ status: 415, code: 'UNSUPPORTED_TYPE', message: 'Send the picture as JSON.' });
  }

  const who = await requireUser(request, env, env.REDESIGN_LIMITER, 'detect', fetchImpl);
  if (who instanceof Response) return who;

  let image: string | null;
  try {
    image = readImage(((await request.json()) as { image?: unknown } | null)?.image);
  } catch {
    image = null;
  }
  if (!image) return failure({ status: 400, code: 'INVALID_REQUEST', message: 'The picture must be a small JPEG, PNG or WebP.' });

  const messages = [
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: [
        { type: 'text', text: INSTRUCTIONS },
        { type: 'image_url', image_url: { url: image } },
      ],
    },
  ];

  let lastError: unknown = null;
  for (const model of VISION_MODELS) {
    try {
      const result = await env.AI.run(model, { messages, max_tokens: 900, temperature: 0.2 });
      const items = itemsFromOutput(modelOutput(result));
      if (items) return new Response(JSON.stringify({ items }), { status: 200, headers: JSON_HEADERS });
      lastError = new Error('unreadable answer');
    } catch (err) {
      // Out of free allowance is the same for every model, so stop here and say so.
      if (mapAiError(err).code === 'QUOTA') return failure(mapAiError(err));
      lastError = err;
    }
  }
  console.error('detect-items: no model could read the design', loggable(lastError));
  return failure({ status: 502, code: 'UNAVAILABLE', message: 'The item finder is not available right now.' });
}
