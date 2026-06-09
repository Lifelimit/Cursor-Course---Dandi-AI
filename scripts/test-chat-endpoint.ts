import * as fs from "fs";
import * as path from "path";

// Manually parse .env.local FIRST
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
  // Dynamically import POST after env vars are populated
  const { POST } = await import("../app/api/rag/chat/route");

  const mockBody = {
    apiKey: "sk_live_demo_key_dandi_2026",
    githubUrl: "https://github.com/facebook/react",
    messages: [
      { role: "user", content: "Are there any rate limiting or quota guardrails implemented?" }
    ]
  };

  const req = new Request("http://localhost:3000/api/rag/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(mockBody)
  });

  console.log("Invoking POST handler...");
  const res = await POST(req);
  console.log("Response status:", res.status);
  const data = await res.json();
  console.log("Response body:", JSON.stringify(data, null, 2));
}

main().catch(console.error);
