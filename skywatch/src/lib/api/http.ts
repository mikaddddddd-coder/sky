// Network calls give up after a while, so a bad connection shows the last
// known sky instead of spinning forever.
const TIMEOUT_MS = 15_000;

// The weather models update hourly at best, so an answer younger than this is
// as good as a new one. Reopening the app, switching language or toggling an
// alert then costs nothing; a pull to refresh asks for `fresh` and skips it.
const FRESH_MS = 15 * 60_000;
const cache = new Map<string, { at: number; data: Promise<unknown> }>();
// The last good answer per URL, however old, for callers that would rather have that than nothing.
const lastGood = new Map<string, unknown>();

export type FetchOptions = {
  timeoutMs?: number;
  fresh?: boolean;
  /** On failure, answer with the last good response instead, if there is one. */
  staleOnError?: boolean;
};

export function getJson<T>(url: string, opts: FetchOptions | number = {}): Promise<T> {
  const { timeoutMs = TIMEOUT_MS, fresh = false, staleOnError = false } = typeof opts === 'number' ? { timeoutMs: opts } : opts;
  const hit = cache.get(url);
  if (!fresh && hit && Date.now() - hit.at < FRESH_MS) return hit.data as Promise<T>;
  // Shared while in flight, so two screens asking at once make one request; a failure is not kept.
  const data = request<T>(url, timeoutMs);
  cache.set(url, { at: Date.now(), data });
  data.then(
    (v) => lastGood.set(url, v),
    () => cache.get(url)?.data === data && cache.delete(url),
  );
  return staleOnError ? data.catch((e) => (lastGood.has(url) ? (lastGood.get(url) as T) : Promise.reject(e))) : data;
}

async function request<T>(url: string, timeoutMs: number): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}
