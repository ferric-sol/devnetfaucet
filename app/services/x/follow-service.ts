// Verifies X (Twitter) follows of the faucet account via the Monid API.
//
// Note: Monid's tikhub `fetch_check_follow` endpoint returns false negatives when
// checking "does X follow @ferric", so instead we scan the newest pages of
// @ferric's followers list (returned newest-first) for the handle.

export const X_FOLLOW_TARGET = 'ferric';

const MONID_API = 'https://api.monid.ai';
const FOLLOWERS_ENDPOINT = '/api/v1/twitter/web/fetch_user_followers';
const MAX_PAGES = 3; // ~200 most recent followers
const RUN_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 1_500;

interface FollowersPage {
  followers?: { screen_name?: string }[];
  next_cursor?: string;
  more_users?: boolean;
}

export function normalizeXHandle(input: string): string | null {
  const handle = input
    .trim()
    .replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, '')
    .replace(/^@/, '')
    .replace(/[/?#].*$/, '');
  return /^[A-Za-z0-9_]{1,15}$/.test(handle) ? handle : null;
}

async function monidFetch(path: string, init?: RequestInit) {
  const apiKey = process.env.DF_MONID_KEY;
  if (!apiKey) throw new Error('DF_MONID_KEY is not set');

  const response = await fetch(`${MONID_API}${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Monid ${path} failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

async function fetchFollowersPage(cursor?: string): Promise<FollowersPage> {
  const queryParams: Record<string, string> = { screen_name: X_FOLLOW_TARGET };
  if (cursor) queryParams.cursor = cursor;

  const run = await monidFetch('/v1/run', {
    method: 'POST',
    body: JSON.stringify({
      provider: 'tikhub',
      endpoint: FOLLOWERS_ENDPOINT,
      input: { queryParams },
    }),
  });

  const deadline = Date.now() + RUN_TIMEOUT_MS;
  let result = run;
  while (result.status === 'READY' || result.status === 'RUNNING') {
    if (Date.now() > deadline) throw new Error(`Monid run ${run.runId} timed out`);
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    result = await monidFetch(`/v1/runs/${encodeURIComponent(run.runId)}`);
  }

  if (result.status !== 'COMPLETED' || result.providerResponse?.httpStatus !== 200 || !result.output) {
    throw new Error(`Monid run ${run.runId} ended with ${result.status}`);
  }
  return result.output as FollowersPage;
}

// Returns true if `handle` is among the most recent followers of X_FOLLOW_TARGET.
export async function isFollowingTarget(handle: string): Promise<boolean> {
  const needle = handle.toLowerCase();
  let cursor: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const { followers = [], next_cursor, more_users } = await fetchFollowersPage(cursor);
    if (followers.some(f => f.screen_name?.toLowerCase() === needle)) return true;
    if (!more_users || !next_cursor) break;
    cursor = next_cursor;
  }
  return false;
}
