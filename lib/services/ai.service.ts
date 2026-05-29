import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import { serverEnv } from "@/lib/env";

// Define the structured output schema using Zod
const summarySchema = z.object({
  summary: z.string().describe("A concise summary of the GitHub repository"),
  cool_facts: z.array(z.string()).describe("A list of interesting or cool facts about the project found in the README"),
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
    ["system", "You are a professional software engineer summarizing projects."],
    ["user", "Summarize this github repository from this readme file content: {readmeContent}"],
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
