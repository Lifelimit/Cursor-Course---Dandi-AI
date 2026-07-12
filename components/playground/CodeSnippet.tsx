"use client";

import { useState } from "react";
import { CopyIconButton } from "@/components/ui/CopyIconButton";
import { CodeWindow } from "@/components/command";
import { publicEnv } from "@/lib/env";

type CodeSnippetProps = {
  apiKey: string;
  githubUrl: string;
  onCopy?: (tabName: string) => void;
  mode?: "summary" | "rag";
};

const maskSnippetApiKey = (apiKey: string) => {
  void apiKey;
  return "$DANDI_API_KEY";
};

export function CodeSnippet({ apiKey, githubUrl, onCopy, mode = "summary" }: CodeSnippetProps) {
  const [activeTab, setActiveTab] = useState<"curl" | "fetch" | "python">("curl");

  const apiBaseUrl = publicEnv.NEXT_PUBLIC_APP_URL;

  const displayKey = maskSnippetApiKey(apiKey);
  const displayUrl = githubUrl || "https://github.com/facebook/react";
  const finalEndpointUrl = mode === "rag" 
    ? `${apiBaseUrl}/api/rag/chat` 
    : `${apiBaseUrl}/api/github-summarizer`;

  const snippets = {
    curl: mode === "rag" 
      ? `curl -X POST ${finalEndpointUrl} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${displayKey}" \\
  -d '{"githubUrl": "${displayUrl}", "messages": [{"role": "user", "content": "Explain the architecture"}]}'`
      : `curl -X POST ${finalEndpointUrl} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${displayKey}" \\
  -d '{"githubUrl": "${displayUrl}"}'`,
    
    fetch: mode === "rag"
      ? `fetch("${finalEndpointUrl}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "${displayKey}"
  },
  body: JSON.stringify({ 
    githubUrl: "${displayUrl}",
    messages: [{ role: "user", content: "Explain the architecture" }]
  })
})
.then(res => res.json())
.then(data => console.log(data));`
      : `fetch("${finalEndpointUrl}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "${displayKey}"
  },
  body: JSON.stringify({ 
    githubUrl: "${displayUrl}" 
  })
})
.then(res => res.json())
.then(data => console.log(data));`,

    python: mode === "rag"
      ? `import requests

url = "${finalEndpointUrl}"
headers = {
    "x-api-key": "${displayKey}",
    "Content-Type": "application/json"
}
data = {
    "githubUrl": "${displayUrl}",
    "messages": [
        {"role": "user", "content": "Explain the architecture"}
    ]
}

response = requests.post(url, headers=headers, json=data)
print(response.json())`
      : `import requests

url = "${finalEndpointUrl}"
headers = {
    "x-api-key": "${displayKey}",
    "Content-Type": "application/json"
}
data = {
    "githubUrl": "${displayUrl}"
}

response = requests.post(url, headers=headers, json=data)
print(response.json())`
  };


  const handleCopy = () => {
    navigator.clipboard.writeText(snippets[activeTab]);
    if (onCopy) {
      onCopy(activeTab);
    }
  };

  return (
    <CodeWindow
      title={mode === "rag" ? "rag-request-console" : "summary-request-console"}
      language={activeTab}
      actions={
        <CopyIconButton
          onClick={handleCopy}
          title="Copy snippet"
        />
      }
      maxHeight="22rem"
      className="border-[var(--command-border)]"
    >
      {/* Single min-w-max wrapper so tab bar + code block scroll as one unit */}
      <div className="min-w-max">
        <div className="border-b border-[var(--command-border)] bg-[var(--command-bg)]/20 px-4 py-3">
          <div className="flex gap-2">
            {(["curl", "fetch", "python"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-xl border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                  activeTab === tab
                    ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-300"
                    : "border-slate-800 bg-slate-950/60 text-slate-500 hover:text-slate-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        <pre className="p-4 font-mono text-[11px] leading-relaxed text-slate-300 sm:p-6">
          <code>{snippets[activeTab]}</code>
        </pre>
      </div>
    </CodeWindow>
  );
}
