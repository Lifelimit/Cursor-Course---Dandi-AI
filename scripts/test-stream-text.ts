import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";
import * as fs from "fs";
import * as path from "path";

// Manually parse .env.local
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  }
}

async function main() {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  console.log("Using API Key:", apiKey ? "FOUND" : "MISSING");

  const googleProvider = createGoogleGenerativeAI({
    apiKey: apiKey,
  });

  const systemPrompt = "You are Dandi AI RAG Assistant.";
  
  // Starting conversation with assistant message (reproducing the client message structure)
  const messages = [
    { role: "assistant" as const, content: "Hi! I have successfully ingested facebook/react." },
    { role: "user" as const, content: "Are there any rate limiting or quota guardrails implemented?" }
  ];

  console.log("Calling streamText with assistant message first...");
  try {
    const result = await streamText({
      model: googleProvider("gemini-3.1-flash-lite"),
      system: systemPrompt,
      messages: messages,
    });

    console.log("Consuming stream...");
    for await (const chunk of result.textStream) {
      process.stdout.write(chunk);
    }
    console.log("\n✅ Stream completed successfully!");
  } catch (err) {
    console.error("❌ streamText error:", err);
  }
}

main().catch(console.error);
