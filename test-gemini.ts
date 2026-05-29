import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";


const summarySchema = z.object({
  summary: z.string(),
  cool_facts: z.array(z.string()),
});

async function main() {
  console.log("Starting...");
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey: process.env.GOOGLE_API_KEY,
    maxOutputTokens: 2048,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "Summarize projects."],
    ["user", "Summarize this: React is a UI library."],
  ]);

  const structuredLlm = model.withStructuredOutput(summarySchema);
  const chain = prompt.pipe(structuredLlm);

  console.log("Invoking...");
  const start = Date.now();
  try {
    const res = await chain.invoke({});
    console.log("Success in", Date.now() - start, "ms", res);
  } catch (err) {
    console.error("Failed in", Date.now() - start, "ms", err);
  }
}

main();
