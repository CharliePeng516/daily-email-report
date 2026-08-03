const MAX_RETRIES = 4;

/**
 * fetch() with capped exponential backoff on 429/5xx, shared by every mail
 * provider (see "7. Storage, scheduling and reliability" — "Retry transient
 * API failures with a capped backoff").
 */
export async function fetchWithRetry(
  url: string,
  headers: Record<string, string>,
  attempt = 1,
): Promise<Response> {
  const res = await fetch(url, { headers });

  const isTransient = res.status === 429 || res.status >= 500;
  if (isTransient && attempt <= MAX_RETRIES) {
    const retryAfterHeader = Number(res.headers.get('Retry-After'));
    const delaySeconds = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
      ? retryAfterHeader
      : 2 ** attempt;
    await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000));
    return fetchWithRetry(url, headers, attempt + 1);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Request failed: ${res.status} ${res.statusText} ${body}`.trim());
  }

  return res;
}
