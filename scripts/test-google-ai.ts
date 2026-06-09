import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
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
        // Strip quotes if any
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

  try {
    console.log("Testing gemini-3.1-flash-lite...");
    const result = await generateText({
      model: googleProvider("gemini-3.1-flash-lite"),
      prompt: "Hello, answer in one word.",
    });
    console.log("Response:", result.text);
  } catch (err) {
    console.error("Error with gemini-3.1-flash-lite:", err);
  }

  try {
    console.log("Testing gemini-2.5-flash...");
    const result = await generateText({
      model: googleProvider("gemini-2.5-flash"),
      prompt: "Hello, answer in one word.",
    });
    console.log("Response:", result.text);
  } catch (err) {
    console.error("Error with gemini-2.5-flash:", err);
  }

  try {
    console.log("Testing gemini-1.5-flash...");
    const result = await generateText({
      model: googleProvider("gemini-1.5-flash"),
      prompt: "Hello, answer in one word.",
    });
    console.log("Response:", result.text);
  } catch (err) {
    console.error("Error with gemini-1.5-flash:", err);
  }
}

main().catch(console.error);
