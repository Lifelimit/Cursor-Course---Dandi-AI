const EMBEDDING_DIMENSIONS = 768;
const EMBEDDING_BATCH_SIZE = 20;
const EMBEDDING_BATCH_DELAY_MS = 500;
const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_PRIMARY_EMBEDDING_MODEL = "text-embedding-004";
const DEFAULT_FALLBACK_EMBEDDING_MODEL = "text-embedding-004";

type GeminiErrorPayload = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

type EmbeddingAttemptError = Error & {
  status?: number;
  statusText?: string;
  upstreamStatus?: string;
  retryable: boolean;
};

type EmbeddingRequestOptions = {
  models?: string[];
};

type EmbeddingFailoverResult<T> = {
  value: T;
  model: string;
};

function splitKeys(value: string | undefined) {
  if (!value) return [];
  return value
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values));
}

function normalizeModelName(value: string | undefined, fallback: string) {
  const model = value?.trim() || fallback;
  return model.replace(/^models\//, "");
}

function getModelResourceName(model: string) {
  return `models/${normalizeModelName(model, model)}`;
}

function getEmbeddingConfig() {
  return {
    outputDimensionality: EMBEDDING_DIMENSIONS,
  };
}

function getErrorSearchText(status: number, payload: GeminiErrorPayload, statusText: string) {
  return `${status} ${statusText} ${payload.error?.status ?? ""} ${
    payload.error?.message ?? ""
  }`.toLowerCase();
}

function isRetryableEmbeddingError(status: number, payload: GeminiErrorPayload, statusText: string) {
  const searchText = getErrorSearchText(status, payload, statusText);
  const hasQuotaSignal =
    payload.error?.status === "RESOURCE_EXHAUSTED" ||
    searchText.includes("resource_exhausted") ||
    searchText.includes("quota exceeded") ||
    searchText.includes("rate limit");

  if (status === 400 || status === 401) return false;
  if (status === 403) return hasQuotaSignal;
  return status === 429 || status >= 500 || hasQuotaSignal;
}

function getSafeErrorLabel(status: number | undefined, payload?: GeminiErrorPayload, statusText?: string) {
  return payload?.error?.status || statusText || (status ? `HTTP ${status}` : "Unknown error");
}

async function readGeminiErrorPayload(response: Response): Promise<GeminiErrorPayload> {
  try {
    return (await response.json()) as GeminiErrorPayload;
  } catch {
    return {};
  }
}

function buildAttemptError(response: Response, payload: GeminiErrorPayload): EmbeddingAttemptError {
  const error = new Error(
    `Gemini embedding request failed. Status: ${response.status}. Error: ${getSafeErrorLabel(
      response.status,
      payload,
      response.statusText
    )}.`
  ) as EmbeddingAttemptError;
  error.status = response.status;
  error.statusText = response.statusText;
  error.upstreamStatus = payload.error?.status;
  error.retryable = isRetryableEmbeddingError(response.status, payload, response.statusText);
  return error;
}

function buildNetworkAttemptError(error: unknown): EmbeddingAttemptError {
  const message = error instanceof Error ? error.message : String(error);
  const attemptError = new Error(
    `Gemini embedding request failed before receiving a response. ${message}`
  ) as EmbeddingAttemptError;
  attemptError.retryable = false;
  return attemptError;
}

async function fetchGeminiEmbedding(
  apiKey: string,
  model: string,
  body: Record<string, unknown>,
  operation: "embedContent" | "batchEmbedContents"
) {
  const response = await fetch(`${GEMINI_API_BASE_URL}/${getModelResourceName(model)}:${operation}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw buildAttemptError(response, await readGeminiErrorPayload(response));
  }

  return response;
}

async function runWithEmbeddingFailover<T>(
  request: (apiKey: string, model: string) => Promise<T>,
  options: EmbeddingRequestOptions = {}
): Promise<EmbeddingFailoverResult<T>> {
  const apiKeys = getGoogleApiKeys();
  if (apiKeys.length === 0) {
    throw new Error("Google Generative AI API key is missing.");
  }

  const models = options.models?.length ? uniqueValues(options.models.map((model) => normalizeModelName(model, model))) : getEmbeddingModelCandidates();
  let lastError: EmbeddingAttemptError | null = null;

  for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex++) {
    const attempts = models.map((model, index) => ({
      model,
      kind: index === 0 ? "primary" as const : "fallback" as const,
    }));

    for (const attempt of attempts) {
      try {
        return {
          value: await request(apiKeys[keyIndex], attempt.model),
          model: attempt.model,
        };
      } catch (error) {
        lastError =
          error instanceof Error && "retryable" in error
            ? (error as EmbeddingAttemptError)
            : buildNetworkAttemptError(error);

        if (!lastError.retryable) {
          throw lastError;
        }

        if (attempt.kind === "primary" && attempts.length > 1) {
          console.warn("Embedding primary exhausted, trying fallback model", {
            apiKeyIndex: keyIndex + 1,
            status: lastError.status,
            error: getSafeErrorLabel(
              lastError.status,
              { error: { status: lastError.upstreamStatus } },
              lastError.statusText
            ),
          });
        } else if ((attempt.kind !== "primary" || attempts.length === 1) && keyIndex < apiKeys.length - 1) {
          console.warn("Embedding fallback exhausted, trying next API key", {
            apiKeyIndex: keyIndex + 1,
            status: lastError.status,
            error: getSafeErrorLabel(
              lastError.status,
              { error: { status: lastError.upstreamStatus } },
              lastError.statusText
            ),
          });
          console.warn(`Moving from API key #${keyIndex + 1} to API key #${keyIndex + 2}`);
        }
      }
    }
  }

  const exhaustedError = new Error(
    `Gemini embedding failed after exhausting all models and API keys. Last status: ${
      lastError?.status ?? "unknown"
    }. Last error: ${getSafeErrorLabel(
      lastError?.status,
      { error: { status: lastError?.upstreamStatus } },
      lastError?.statusText
    )}.`
  );
  if (lastError) {
    exhaustedError.cause = lastError;
    (exhaustedError as EmbeddingAttemptError).status = lastError.status;
    (exhaustedError as EmbeddingAttemptError).statusText = lastError.statusText;
    (exhaustedError as EmbeddingAttemptError).upstreamStatus = lastError.upstreamStatus;
    (exhaustedError as EmbeddingAttemptError).retryable = lastError.retryable;
  }
  throw exhaustedError;
}

export function getGoogleApiKeys() {
  const configuredKeys = uniqueValues(splitKeys(process.env.GOOGLE_API_KEYS));
  if (configuredKeys.length > 0) return configuredKeys;

  return uniqueValues([
    ...splitKeys(process.env.GOOGLE_API_KEY),
    ...splitKeys(process.env.GOOGLE_GENERATIVE_AI_API_KEY),
  ]);
}

export function getPrimaryEmbeddingModel() {
  return normalizeModelName(process.env.GOOGLE_EMBEDDING_PRIMARY, DEFAULT_PRIMARY_EMBEDDING_MODEL);
}

export function getFallbackEmbeddingModel() {
  return normalizeModelName(process.env.GOOGLE_EMBEDDING_FALLBACK, DEFAULT_FALLBACK_EMBEDDING_MODEL);
}

export function getEmbeddingModelCandidates() {
  return uniqueValues([getPrimaryEmbeddingModel(), getFallbackEmbeddingModel()]);
}

export function isGeminiEmbeddingRateLimitError(error: unknown): boolean {
  const candidate = error as Partial<EmbeddingAttemptError> | undefined;
  const message = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error ? error.cause : undefined;

  return Boolean(
    candidate?.status === 429 ||
      candidate?.upstreamStatus === "RESOURCE_EXHAUSTED" ||
      message.includes("429") ||
      message.includes("RESOURCE_EXHAUSTED") ||
      (cause && isGeminiEmbeddingRateLimitError(cause))
  );
}

export async function googleEmbed(value: string, options: EmbeddingRequestOptions = {}): Promise<number[]> {
  const result = await runWithEmbeddingFailover(async (apiKey, model) => {
    const response = await fetchGeminiEmbedding(
      apiKey,
      model,
      {
        model: getModelResourceName(model),
        content: { parts: [{ text: value }] },
        embedContentConfig: getEmbeddingConfig(),
        outputDimensionality: EMBEDDING_DIMENSIONS,
      },
      "embedContent"
    );

    const data = (await response.json()) as { embedding: { values: number[] } };
    return data.embedding.values;
  }, options);

  return result.value;
}

export async function googleBatchEmbedWithModel(values: string[], options: EmbeddingRequestOptions = {}): Promise<{
  embeddings: number[][];
  model: string;
}> {
  if (values.length === 0) {
    return { embeddings: [], model: getPrimaryEmbeddingModel() };
  }

  const batches: string[][] = [];
  for (let i = 0; i < values.length; i += EMBEDDING_BATCH_SIZE) {
    batches.push(values.slice(i, i + EMBEDDING_BATCH_SIZE));
  }

  const embeddingsResults: number[][][] = [];
  let selectedModel = "";
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const batchResult = await runWithEmbeddingFailover(async (apiKey, model) => {
      const modelResourceName = getModelResourceName(model);
      const response = await fetchGeminiEmbedding(
        apiKey,
        model,
        {
          requests: batch.map((text) => ({
            model: modelResourceName,
            content: { parts: [{ text }] },
            embedContentConfig: getEmbeddingConfig(),
            outputDimensionality: EMBEDDING_DIMENSIONS,
          })),
        },
        "batchEmbedContents"
      );

      const data = (await response.json()) as { embeddings: { values: number[] }[] };
      return data.embeddings.map((embedding) => embedding.values);
    }, selectedModel ? { models: [selectedModel] } : options);

    selectedModel = batchResult.model;
    embeddingsResults.push(batchResult.value);

    if (i < batches.length - 1 && EMBEDDING_BATCH_DELAY_MS > 0) {
      await new Promise((resolve) => setTimeout(resolve, EMBEDDING_BATCH_DELAY_MS));
    }
  }

  return {
    embeddings: embeddingsResults.flat(),
    model: selectedModel || getPrimaryEmbeddingModel(),
  };
}

export async function googleBatchEmbed(values: string[], options: EmbeddingRequestOptions = {}): Promise<number[][]> {
  const result = await googleBatchEmbedWithModel(values, options);
  return result.embeddings;
}
