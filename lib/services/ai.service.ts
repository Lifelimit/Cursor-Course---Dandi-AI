import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import { serverEnv } from "@/lib/env";

const summarySchema = z.object({
  summary: z.string().describe("A detailed, engaging, and comprehensive multi-paragraph summary of what the GitHub repository is, its main features, and why a developer would want to use it. Be enthusiastic!"),
  cool_facts: z.array(z.string()).describe("A list of highly specific, surprising, or deeply technical cool facts about the project architecture, history, or adoption found in the README. Avoid generic marketing speak."),
});

/**
 * Generates a structured summary of a GitHub repository based on its README content.
 */
export async function generateGithubSummary(readmeContent: string) {
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-3.1-flash-lite", // Using flash-lite 3.1
    apiKey: serverEnv.GOOGLE_API_KEY,
    maxOutputTokens: 2048,
    maxRetries: 0,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are an expert senior staff software engineer who writes deeply insightful, highly engaging, and technically accurate repository analysis. Your audience is other senior developers who want to know the *real* value of a project beyond the marketing fluff."],
    ["user", "Analyze this GitHub repository based on its README content. Dive deep into its architecture, core use-cases, developer experience, and what makes it truly special. README CONTENT:\n\n{readmeContent}"],
  ]);

  // Bind the structured output schema to the model
  const structuredLlm = model.withStructuredOutput(summarySchema);

  // Create the chain
  const chain = prompt.pipe(structuredLlm);

  // Invoke the chain with the fetched README content
  return await chain.invoke({
    readmeContent: readmeContent,
  });
}
