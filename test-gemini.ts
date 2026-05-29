import { google } from "@ai-sdk/google";
import { streamObject } from "ai";
import { z } from "zod";

async function test() {
  try {
    const result = await streamObject({
      model: google("gemini-3.1-flash-lite"),
      schema: z.object({ summary: z.string() }),
      prompt: "Hello",
    });

    for await (const chunk of result.partialObjectStream) {
      console.log(chunk);
    }
    console.log("Done");
  } catch (e) {
    console.error("Error:", e.message);
  }
}
test();
