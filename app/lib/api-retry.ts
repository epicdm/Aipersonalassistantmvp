/**
 * Retry wrapper with exponential backoff for Meta API calls.
 * Stripe SDK handles its own retry — use this for direct Meta Graph API fetch() calls.
 */

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  retryableStatuses?: number[];
}

const DEFAULTS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  retryableStatuses: [429, 500, 502, 503, 504],
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULTS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if this is a fetch Response error with a retryable status
      const status = error?.status ?? error?.response?.status;
      const isRetryable =
        status && opts.retryableStatuses.includes(status);

      if (!isRetryable || attempt === opts.maxRetries) {
        throw error;
      }

      // Respect Retry-After header if present (for 429)
      const retryAfter = error?.headers?.get?.("retry-after");
      const delayMs = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : opts.baseDelayMs * Math.pow(2, attempt);

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

/**
 * Wrapper for Meta Graph API fetch calls with built-in retry.
 * Throws on non-2xx responses with the status code attached.
 */
export async function metaFetch(
  url: string,
  init?: RequestInit
): Promise<Response> {
  return withRetry(async () => {
    const res = await fetch(url, init);
    if (!res.ok) {
      const error: any = new Error(
        `Meta API ${res.status}: ${res.statusText}`
      );
      error.status = res.status;
      error.headers = res.headers;
      error.body = await res.text().catch(() => "");
      throw error;
    }
    return res;
  });
}
