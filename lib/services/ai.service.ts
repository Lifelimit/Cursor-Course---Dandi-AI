import { generateObject, streamObject } from "ai";
import { z } from "zod";
import { getGoogleApiKeys } from "@/lib/services/google-gemini.service";

export const summarySchema = z.object({
  summary: z.string().describe("A detailed, engaging, and comprehensive multi-paragraph summary of what the GitHub repository is, its main features, and why a developer would want to use it. Be enthusiastic!"),
  cool_facts: z.array(z.string()).describe("A list of highly specific, surprising, or deeply technical cool facts about the project architecture, history, or adoption found in the README. Avoid generic marketing speak."),
});

/**
 * Generates a structured summary of a GitHub repository based on its README content.
 * Returns a StreamObject result which can be converted to a Response.
 */
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const apiKeys = getGoogleApiKeys();
const [defaultGoogleApiKey] = apiKeys;

export const googleProvider = createGoogleGenerativeAI({
  apiKey: defaultGoogleApiKey || "",
});

export async function streamGithubSummary(readmeContent: string) {
  const keys = getGoogleApiKeys();
  if (keys.length === 0) {
    throw new Error("Google Generative AI API key is missing.");
  }

  let lastError: unknown = null;
  const modelName = "gemini-3.1-flash-lite";

  for (let keyIndex = 0; keyIndex < keys.length; keyIndex++) {
    const key = keys[keyIndex];
    const keyPreview = key.substring(0, 6);
    console.log(`[AI Summary Stream] Attempting generation. Key Index: ${keyIndex}, Key Preview: ${keyPreview}..., Model: ${modelName}, Total Keys: ${keys.length}`);

    try {
      const provider = createGoogleGenerativeAI({ apiKey: key });
      const result = await streamObject({
        model: provider(modelName),
        schema: summarySchema,
        system: "You are an expert senior staff software engineer who writes deeply insightful, highly engaging, and technically accurate repository analysis. Your audience is other senior developers who want to know the *real* value of a project beyond the marketing fluff.",
        prompt: `Analyze this GitHub repository based on its README content. Dive deep into its architecture, core use-cases, developer experience, and what makes it truly special. README CONTENT:\n\n${readmeContent}`,
      });

      console.log(`[AI Summary Stream] Success with Key Index: ${keyIndex}`);
      return result;
    } catch (err) {
      lastError = err;
      const errorWithStatus = err as {
        statusCode?: number;
        response?: { status?: number };
        message?: string;
        responseBody?: string;
      };
      const status = errorWithStatus.statusCode || errorWithStatus.response?.status;
      const errMsg = errorWithStatus.message || String(err);
      const responseBody = errorWithStatus.responseBody || "";

      console.error(`[AI Summary Stream] Failure with Key Index: ${keyIndex}. Model: ${modelName}. Status: ${status}. Error: ${errMsg}. ResponseBody: ${responseBody}`);

      const isAuthOrRateLimit =
        status === 400 ||
        status === 401 ||
        status === 403 ||
        status === 429 ||
        errMsg.toLowerCase().includes("api key") ||
        responseBody.toLowerCase().includes("api_key_invalid") ||
        responseBody.toLowerCase().includes("invalid_argument") ||
        responseBody.toLowerCase().includes("resource_exhausted");

      if (isAuthOrRateLimit && keyIndex < keys.length - 1) {
        console.warn(`[AI Summary Stream] Retrying with key index ${keyIndex + 1}...`);
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error("Failed to stream AI summary after exhausting all keys.");
}

export async function generateGithubSummary(readmeContent: string) {
  const keys = getGoogleApiKeys();
  if (keys.length === 0) {
    throw new Error("Google Generative AI API key is missing.");
  }

  let lastError: unknown = null;
  const modelName = "gemini-3.1-flash-lite";

  for (let keyIndex = 0; keyIndex < keys.length; keyIndex++) {
    const key = keys[keyIndex];
    const keyPreview = key.substring(0, 6);
    console.log(`[AI Summary] Attempting generation. Key Index: ${keyIndex}, Key Preview: ${keyPreview}..., Model: ${modelName}, Total Keys: ${keys.length}`);

    try {
      const provider = createGoogleGenerativeAI({ apiKey: key });
      const result = await generateObject({
        model: provider(modelName),
        schema: summarySchema,
        system: "You are an expert senior staff software engineer who writes deeply insightful, highly engaging, and technically accurate repository analysis. Your audience is other senior developers who want to know the *real* value of a project beyond the marketing fluff.",
        prompt: `Analyze this GitHub repository based on its README content. Dive deep into its architecture, core use-cases, developer experience, and what makes it truly special. README CONTENT:\n\n${readmeContent}`,
      });

      console.log(`[AI Summary] Success with Key Index: ${keyIndex}`);
      return result.object;
    } catch (err) {
      lastError = err;
      const errorWithStatus = err as {
        statusCode?: number;
        response?: { status?: number };
        message?: string;
        responseBody?: string;
      };
      const status = errorWithStatus.statusCode || errorWithStatus.response?.status;
      const errMsg = errorWithStatus.message || String(err);
      const responseBody = errorWithStatus.responseBody || "";

      console.error(`[AI Summary] Failure with Key Index: ${keyIndex}. Model: ${modelName}. Status: ${status}. Error: ${errMsg}. ResponseBody: ${responseBody}`);

      const isAuthOrRateLimit =
        status === 400 ||
        status === 401 ||
        status === 403 ||
        status === 429 ||
        errMsg.toLowerCase().includes("api key") ||
        responseBody.toLowerCase().includes("api_key_invalid") ||
        responseBody.toLowerCase().includes("invalid_argument") ||
        responseBody.toLowerCase().includes("resource_exhausted");

      if (isAuthOrRateLimit && keyIndex < keys.length - 1) {
        console.warn(`[AI Summary] Retrying with key index ${keyIndex + 1}...`);
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error("Failed to generate AI summary after exhausting all keys.");
}
