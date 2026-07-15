const EMBEDDING_DIMENSIONS = 768;
const DEFAULT_EMBEDDING_BATCH_SIZE = 100;
const MAX_EMBEDDING_BATCH_SIZE = 100;
const MIN_RATE_LIMIT_BATCH_SIZE = 20;
const DEFAULT_EMBEDDING_BATCH_DELAY_MS = 0;
const DEFAULT_EMBED_REQUEST_TIMEOUT_MS = 30_000;
const DEFAULT_EMBED_MAX_ATTEMPTS = 3;
const DEFAULT_EMBED_RETRY_BASE_MS = 750;
const DEFAULT_EMBED_RETRY_MAX_MS = 8_000;
const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_EMBEDDING_MODEL = "gemini-embedding-001";

type GeminiErrorPayload = {
  error?: { code?: number; message?: string; status?: string };
};

export type EmbeddingErrorCode =
  | "EMBEDDING_TIMEOUT"
  | "EMBEDDING_NETWORK_ERROR"
  | "EMBEDDING_RATE_LIMITED"
  | "EMBEDDING_AUTH_FAILED"
  | "EMBEDDING_INVALID_REQUEST"
  | "EMBEDDING_PROVIDER_ERROR"
  | "EMBEDDING_INVALID_RESPONSE";

export type EmbeddingAttemptError = Error & {
  code: EmbeddingErrorCode;
  status?: number;
  statusText?: string;
  upstreamStatus?: string;
  retryable: boolean;
  retryAfterMs?: number;
};

export type EmbeddingRequestOptions = {
  models?: string[];
  signal?: AbortSignal;
};

type EmbeddingFailoverResult<T> = { value: T; model: string };

function splitKeys(value: string | undefined) {
  return value?.split(",").map((key) => key.trim()).filter(Boolean) ?? [];
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values));
}

function normalizeModelName(value: string | undefined, fallback: string) {
  return (value?.trim() || fallback).replace(/^models\//, "");
}

function getModelResourceName(model: string) {
  return `models/${normalizeModelName(model, model)}`;
}

function getPositiveInt(name: string, fallback: number, max?: number) {
  const parsed = Number.parseInt((process.env[name] || "").trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return max ? Math.min(parsed, max) : parsed;
}

function getNonNegativeInt(name: string, fallback: number, max?: number) {
  const parsed = Number.parseInt((process.env[name] || "").trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return max ? Math.min(parsed, max) : parsed;
}

function getEmbeddingConfig() {
  return { outputDimensionality: EMBEDDING_DIMENSIONS };
}

function getErrorSearchText(status: number, payload: GeminiErrorPayload, statusText: string) {
  return `${status} ${statusText} ${payload.error?.status ?? ""} ${payload.error?.message ?? ""}`.toLowerCase();
}

function classifyHttpError(status: number, payload: GeminiErrorPayload, statusText: string): { code: EmbeddingErrorCode; retryable: boolean } {
  const searchText = getErrorSearchText(status, payload, statusText);
  const rateLimited = status === 408 || status === 409 || status === 425 || status === 429
    || payload.error?.status === "RESOURCE_EXHAUSTED"
    || searchText.includes("rate limit")
    || searchText.includes("quota exceeded");

  if (rateLimited) return { code: "EMBEDDING_RATE_LIMITED", retryable: true };
  if (status === 401 || (status === 403 && !searchText.includes("quota"))) return { code: "EMBEDDING_AUTH_FAILED", retryable: false };
  if (status === 400 || (status >= 400 && status < 500)) return { code: "EMBEDDING_INVALID_REQUEST", retryable: false };
  return { code: "EMBEDDING_PROVIDER_ERROR", retryable: status >= 500 };
}

function parseRetryAfter(response: Response) {
  const value = response.headers.get("retry-after");
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, Math.min(seconds * 1000, getPositiveInt("RAG_EMBED_RETRY_MAX_MS", DEFAULT_EMBED_RETRY_MAX_MS)));
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, Math.min(date - Date.now(), getPositiveInt("RAG_EMBED_RETRY_MAX_MS", DEFAULT_EMBED_RETRY_MAX_MS))) : undefined;
}

function safeErrorLabel(error: Partial<EmbeddingAttemptError>) {
  return error.code || (error.status ? `HTTP_${error.status}` : "EMBEDDING_NETWORK_ERROR");
}

async function readGeminiErrorPayload(response: Response): Promise<GeminiErrorPayload> {
  try { return (await response.json()) as GeminiErrorPayload; } catch { return {}; }
}

function buildAttemptError(response: Response, payload: GeminiErrorPayload): EmbeddingAttemptError {
  const classification = classifyHttpError(response.status, payload, response.statusText);
  const error = new Error(`Gemini embedding request failed (${safeErrorLabel({ code: classification.code, status: response.status })}, HTTP ${response.status}).`) as EmbeddingAttemptError;
  error.code = classification.code;
  error.status = response.status;
  error.statusText = response.statusText;
  error.upstreamStatus = payload.error?.status;
  error.retryable = classification.retryable;
  error.retryAfterMs = parseRetryAfter(response);
  return error;
}

function buildNetworkAttemptError(error: unknown): EmbeddingAttemptError {
  const isAbort = error instanceof Error && error.name === "AbortError";
  const attemptError = new Error(isAbort ? "Gemini embedding request timed out." : "Gemini embedding request failed before receiving a response.") as EmbeddingAttemptError;
  attemptError.code = isAbort ? "EMBEDDING_TIMEOUT" : "EMBEDDING_NETWORK_ERROR";
  attemptError.retryable = true;
  return attemptError;
}

function validateVector(values: unknown): number[] {
  if (!Array.isArray(values) || values.length !== EMBEDDING_DIMENSIONS || values.some((value) => typeof value !== "number" || !Number.isFinite(value))) {
    const error = new Error("Gemini returned an invalid embedding vector.") as EmbeddingAttemptError;
    error.code = "EMBEDDING_INVALID_RESPONSE";
    error.retryable = false;
    throw error;
  }
  return values as number[];
}

function validateBatch(values: unknown, expectedCount: number): number[][] {
  if (!Array.isArray(values) || values.length !== expectedCount) {
    const error = new Error("Gemini returned a mismatched embedding count.") as EmbeddingAttemptError;
    error.code = "EMBEDDING_INVALID_RESPONSE";
    error.retryable = false;
    throw error;
  }
  return values.map((embedding) => validateVector((embedding as { values?: unknown })?.values));
}

async function waitWithSignal(ms: number, signal?: AbortSignal) {
  if (ms <= 0) return;
  await new Promise<void>((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException("The operation was aborted.", "AbortError")); return; }
    const timer = setTimeout(resolve, ms);
    const abort = () => { clearTimeout(timer); reject(new DOMException("The operation was aborted.", "AbortError")); };
    signal?.addEventListener("abort", abort, { once: true });
    if (signal) setTimeout(() => signal.removeEventListener("abort", abort), ms + 1);
  });
}

async function fetchGeminiEmbedding(apiKey: string, model: string, body: Record<string, unknown>, operation: "embedContent" | "batchEmbedContents", signal?: AbortSignal) {
  const timeoutMs = getPositiveInt("RAG_EMBED_REQUEST_TIMEOUT_MS", DEFAULT_EMBED_REQUEST_TIMEOUT_MS);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const forwardAbort = () => controller.abort();
  signal?.addEventListener("abort", forwardAbort, { once: true });
  try {
    const response = await fetch(`${GEMINI_API_BASE_URL}/${getModelResourceName(model)}:${operation}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) throw buildAttemptError(response, await readGeminiErrorPayload(response));
    return response;
  } catch (error) {
    if (error instanceof Error && "code" in error) throw error;
    throw buildNetworkAttemptError(error);
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", forwardAbort);
  }
}

async function runWithEmbeddingFailover<T>(request: (apiKey: string, model: string, signal?: AbortSignal) => Promise<T>, options: EmbeddingRequestOptions = {}): Promise<EmbeddingFailoverResult<T>> {
  const apiKeys = getGoogleApiKeys();
  if (apiKeys.length === 0) throw new Error("Google Generative AI API key is missing.");
  const models = options.models?.length ? uniqueValues(options.models.map((model) => normalizeModelName(model, model))) : [getEmbeddingModel()];
  const maxAttempts = getPositiveInt("RAG_EMBED_MAX_ATTEMPTS", DEFAULT_EMBED_MAX_ATTEMPTS, 12);
  const retryBaseMs = getPositiveInt("RAG_EMBED_RETRY_BASE_MS", DEFAULT_EMBED_RETRY_BASE_MS);
  const retryMaxMs = getPositiveInt("RAG_EMBED_RETRY_MAX_MS", DEFAULT_EMBED_RETRY_MAX_MS);
  let attempt = 0;
  let lastError: EmbeddingAttemptError | null = null;

  const candidates = apiKeys.flatMap((apiKey) => models.map((model) => ({ apiKey, model })));
  while (attempt < maxAttempts) {
    const candidate = candidates[attempt % candidates.length];
    attempt += 1;
    try {
      return { value: await request(candidate.apiKey, candidate.model, options.signal), model: candidate.model };
    } catch (error) {
      lastError = error instanceof Error && "code" in error ? error as EmbeddingAttemptError : buildNetworkAttemptError(error);
      if (!lastError.retryable || attempt >= maxAttempts) break;
      const exponential = Math.min(retryMaxMs, retryBaseMs * 2 ** (attempt - 1));
      const retryDelay = Math.min(retryMaxMs, lastError.retryAfterMs ?? exponential) * (0.75 + Math.random() * 0.5);
      const nextCandidate = candidates[attempt % candidates.length];
      if (nextCandidate.apiKey !== candidate.apiKey) {
        const currentKeyNumber = apiKeys.indexOf(candidate.apiKey) + 1;
        const nextKeyNumber = apiKeys.indexOf(nextCandidate.apiKey) + 1;
        console.warn(`Moving from API key #${currentKeyNumber} to API key #${nextKeyNumber}`, { attempt, code: lastError.code, status: lastError.status });
      }
      console.warn("Gemini embedding attempt will retry", { attempt, maxAttempts, code: lastError.code, status: lastError.status, retryDelayMs: Math.round(retryDelay) });
      await waitWithSignal(Math.round(retryDelay), options.signal);
    }
  }

  const exhausted = new Error(`Gemini embedding failed after exhausting all models and API keys. Last status: ${lastError?.status ?? "unknown"}. Last error: ${lastError?.upstreamStatus || lastError?.code || "unknown"}.`) as EmbeddingAttemptError;
  exhausted.code = lastError?.code || "EMBEDDING_PROVIDER_ERROR";
  exhausted.status = lastError?.status;
  exhausted.statusText = lastError?.statusText;
  exhausted.upstreamStatus = lastError?.upstreamStatus;
  exhausted.retryable = true;
  exhausted.cause = lastError || undefined;
  throw exhausted;
}

export function getGoogleApiKeys() {
  const configuredKeys = uniqueValues(splitKeys(process.env.GOOGLE_API_KEYS));
  return configuredKeys.length > 0 ? configuredKeys : uniqueValues([...splitKeys(process.env.GOOGLE_API_KEY), ...splitKeys(process.env.GOOGLE_GENERATIVE_AI_API_KEY)]);
}

export function getEmbeddingModel() { return normalizeModelName(process.env.GOOGLE_EMBEDDING_MODEL, DEFAULT_EMBEDDING_MODEL); }
export function getEmbeddingDimensions() { return EMBEDDING_DIMENSIONS; }
export function getEmbeddingBatchSize() {
  return getPositiveInt("RAG_EMBED_BATCH_SIZE", DEFAULT_EMBEDDING_BATCH_SIZE, MAX_EMBEDDING_BATCH_SIZE);
}

export function isGeminiEmbeddingRateLimitError(error: unknown): boolean {
  const candidate = error as Partial<EmbeddingAttemptError> | undefined;
  const cause = error instanceof Error ? error.cause : undefined;
  return Boolean(candidate?.code === "EMBEDDING_RATE_LIMITED" || candidate?.status === 429 || candidate?.upstreamStatus === "RESOURCE_EXHAUSTED" || (cause && isGeminiEmbeddingRateLimitError(cause)));
}

export async function googleEmbed(value: string, options: EmbeddingRequestOptions = {}): Promise<number[]> {
  const result = await runWithEmbeddingFailover(async (apiKey, model, signal) => {
    const response = await fetchGeminiEmbedding(apiKey, model, {
      model: getModelResourceName(model),
      content: { parts: [{ text: value }] },
      embedContentConfig: getEmbeddingConfig(),
      outputDimensionality: EMBEDDING_DIMENSIONS,
    }, "embedContent", signal);
    const data = (await response.json()) as { embedding?: { values?: unknown } };
    return validateVector(data.embedding?.values);
  }, options);
  return result.value;
}

export async function googleBatchEmbedWithModel(values: string[], options: EmbeddingRequestOptions = {}): Promise<{ embeddings: number[][]; model: string }> {
  if (values.length === 0) return { embeddings: [], model: getEmbeddingModel() };
  const batchSize = getEmbeddingBatchSize();
  const delayMs = getNonNegativeInt("RAG_EMBED_BATCH_DELAY_MS", DEFAULT_EMBEDDING_BATCH_DELAY_MS);
  const embeddingsResults: number[][][] = [];
  let selectedModel = "";
  let offset = 0;
  let effectiveBatchSize = batchSize;
  while (offset < values.length) {
    const batch = values.slice(offset, offset + effectiveBatchSize);
    let result: EmbeddingFailoverResult<number[][]>;
    try {
      result = await runWithEmbeddingFailover(async (apiKey, model, signal) => {
        const response = await fetchGeminiEmbedding(apiKey, model, {
          requests: batch.map((text) => ({ model: getModelResourceName(model), content: { parts: [{ text }] }, embedContentConfig: getEmbeddingConfig(), outputDimensionality: EMBEDDING_DIMENSIONS })),
        }, "batchEmbedContents", signal);
        const data = (await response.json()) as { embeddings?: unknown };
        return validateBatch(data.embeddings, batch.length);
      }, selectedModel ? { ...options, models: [selectedModel] } : options);
    } catch (error) {
      if (isGeminiEmbeddingRateLimitError(error) && effectiveBatchSize > MIN_RATE_LIMIT_BATCH_SIZE) {
        const nextBatchSize = Math.max(MIN_RATE_LIMIT_BATCH_SIZE, Math.ceil(effectiveBatchSize / 2));
        console.warn("Gemini embedding batch was rate limited; reducing the next request size", { from: effectiveBatchSize, to: nextBatchSize });
        effectiveBatchSize = nextBatchSize;
        continue;
      }
      throw error;
    }
    selectedModel = result.model;
    embeddingsResults.push(result.value);
    offset += batch.length;
    if (offset < values.length) await waitWithSignal(delayMs, options.signal);
  }
  return { embeddings: embeddingsResults.flat(), model: selectedModel || getEmbeddingModel() };
}

export async function googleBatchEmbed(values: string[], options: EmbeddingRequestOptions = {}) {
  return (await googleBatchEmbedWithModel(values, options)).embeddings;
}
