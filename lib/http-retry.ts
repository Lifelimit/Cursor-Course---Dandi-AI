type RetryInfo = {
  error?: {
    details?: Array<{
      "@type"?: string;
      retryDelay?: string;
    }>;
  };
};

function getRetryAfterMs(response: Response, fallbackMs: number) {
  const retryAfter = response.headers.get("retry-after");
  if (!retryAfter) return fallbackMs;

  const seconds = Number.parseInt(retryAfter, 10);
  if (Number.isFinite(seconds)) return seconds * 1000;

  const retryDate = Date.parse(retryAfter);
  if (Number.isFinite(retryDate)) return Math.max(0, retryDate - Date.now());

  return fallbackMs;
}

async function getGoogleRetryDelayMs(response: Response, fallbackMs: number) {
  try {
    const data = (await response.clone().json()) as RetryInfo;
    const retryDelay = data.error?.details?.find((detail) =>
      detail["@type"]?.includes("RetryInfo")
    )?.retryDelay;
    if (!retryDelay) return getRetryAfterMs(response, fallbackMs);

    const seconds = Number.parseInt(retryDelay, 10);
    return Number.isFinite(seconds) ? seconds * 1000 + 500 : fallbackMs;
  } catch {
    return getRetryAfterMs(response, fallbackMs);
  }
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  delayMs = 1500
): Promise<Response> {
  let lastError: Error | null = null;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.status === 429 || response.status >= 500) {
        const retryAfter = response.status === 429
          ? await getGoogleRetryDelayMs(response, delayMs * Math.pow(2, i))
          : delayMs * Math.pow(2, i);

        console.warn(
          `Transient upstream response (${response.status}). Retrying in ${retryAfter}ms (attempt ${i + 1}/${retries}).`
        );
        await new Promise((resolve) => setTimeout(resolve, retryAfter));
        continue;
      }

      return response;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, i)));
    }
  }

  throw lastError || new Error(`Failed after ${retries} retries.`);
}
