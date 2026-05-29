import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";

const summarySchema = z.object({
  summary: z.string().describe("A concise summary"),
  cool_facts: z.array(z.string()).describe("List of cool facts"),
});

async function main() {
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-3.1-flash-lite",
    apiKey: process.env.GOOGLE_API_KEY,
    maxOutputTokens: 2048,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are a helpful assistant."],
    ["user", "Tell me about France and give me 3 cool facts."],
  ]);

  const structuredLlm = model.withStructuredOutput(summarySchema);
  const chain = prompt.pipe(structuredLlm);

  try {
    const stream = await chain.stream({});
    for await (const chunk of stream) {
      console.log("CHUNK:", chunk);
    }
  } catch (err) {
    console.error("Stream failed:", err);
  }
}

main();
