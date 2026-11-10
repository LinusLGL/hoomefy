/**
 * The checks every signed-in-only route runs first: the caller must be a signed-in user of this site's Supabase
 * project, and must be within a per-user rate limit. Returns the user id, or the response to send back.
 */

import { failure, verifyUser, type RedesignEnv } from './redesign';

export type Limiter = { limit: (options: { key: string }) => Promise<{ success: boolean }> };

export async function requireUser(
  request: Request,
  env: Pick<RedesignEnv, 'SUPABASE_URL'>,
  limiter: Limiter | undefined,
  scope: string,
  fetchImpl: typeof fetch = fetch
): Promise<string | Response> {
  const userId = await verifyUser(request, env, fetchImpl);
  if (!userId) return failure({ status: 401, code: 'UNAUTHORIZED', message: 'Please sign in to use this.' });

  if (limiter) {
    const { success } = await limiter.limit({ key: `${scope}:${userId}` });
    if (!success) {
      return failure({ status: 429, code: 'RATE_LIMITED', message: 'Please wait a moment and try again.', headers: { 'Retry-After': '30' } });
    }
  }
  return userId;
}
