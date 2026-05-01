"use client";

import { useState } from "react";

type CodeSnippetProps = {
  apiKey: string;
  githubUrl: string;
};

export function CodeSnippet({ apiKey, githubUrl }: CodeSnippetProps) {
  const [activeTab, setActiveTab] = useState<"curl" | "fetch" | "python">("curl");
  const [copied, setCopied] = useState(false);

  const displayKey = apiKey || "sk_live_YOUR_API_KEY";
  const displayUrl = githubUrl || "https://github.com/facebook/react";

  const snippets = {
    curl: `curl -X POST https://dandi.ai/api/github-summarizer \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${displayKey}" \\
  -d '{"githubUrl": "${displayUrl}"}'`,
    
    fetch: `fetch("https://dandi.ai/api/github-summarizer", {
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

    python: `import requests

url = "https://dandi.ai/api/github-summarizer"
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
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-[#18181b] shadow-lg shadow-zinc-900/10">
      <div className="flex items-center justify-between border-b border-white/5 bg-white/5 px-4 py-2">
        <div className="flex gap-4">
          {(["curl", "fetch", "python"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${
                activeTab === tab ? "text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <button
          onClick={handleCopy}
          className="group flex items-center gap-1.5 rounded-md px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-zinc-500 transition hover:bg-white/5 hover:text-white"
        >
          {copied ? (
            <span className="text-emerald-400">Copied!</span>
          ) : (
            <>
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
                <path d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      <div className="relative p-6">
        <pre className="scrollbar-hide overflow-x-auto font-mono text-[11px] leading-relaxed text-zinc-300">
          <code>{snippets[activeTab]}</code>
        </pre>
      </div>
    </div>
  );
}
