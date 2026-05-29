
import { streamObject } from "ai";
import { z } from "zod";

export const summarySchema = z.object({
  summary: z.string().describe("A detailed, engaging, and comprehensive multi-paragraph summary of what the GitHub repository is, its main features, and why a developer would want to use it. Be enthusiastic!"),
  cool_facts: z.array(z.string()).describe("A list of highly specific, surprising, or deeply technical cool facts about the project architecture, history, or adoption found in the README. Avoid generic marketing speak."),
});

/**
 * Generates a structured summary of a GitHub repository based on its README content.
 * Returns a StreamObject result which can be converted to a Response.
 */
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export const googleProvider = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export async function streamGithubSummary(readmeContent: string) {
  const result = await streamObject({
    model: googleProvider("gemini-3.1-flash-lite"),
    schema: summarySchema,
    system: "You are an expert senior staff software engineer who writes deeply insightful, highly engaging, and technically accurate repository analysis. Your audience is other senior developers who want to know the *real* value of a project beyond the marketing fluff.",
    prompt: `Analyze this GitHub repository based on its README content. Dive deep into its architecture, core use-cases, developer experience, and what makes it truly special. README CONTENT:\n\n${readmeContent}`,
  });

  return result;
}
