// Network calls give up after a while, so a bad connection shows the last
// known sky instead of spinning forever.
const TIMEOUT_MS = 15_000;

export async function getJson<T>(url: string, timeoutMs = TIMEOUT_MS): Promise<T> {
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
