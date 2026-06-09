import * as fs from "fs";
import * as path from "path";

// Load env vars
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
  const apiKeyVal = "__demo__";

  // Now, let's invoke the live server endpoint via fetch
  console.log("Sending live HTTP request to http://localhost:3000/api/rag/chat...");
  const res = await fetch("http://localhost:3000/api/rag/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKeyVal,
    },
    body: JSON.stringify({
      githubUrl: "https://github.com/facebook/react",
      messages: [
        { role: "user", content: "Are there any rate limiting or quota guardrails implemented?" }
      ]
    })
  });

  console.log("HTTP Response Status:", res.status);
  const text = await res.text();
  console.log("HTTP Response Body:", text);
}

main().catch(console.error);
