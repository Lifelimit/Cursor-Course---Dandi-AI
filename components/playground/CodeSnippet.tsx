"use client";

import { useState, useEffect } from "react";
import { CopyIconButton } from "@/components/ui/CopyIconButton";

type CodeSnippetProps = {
  apiKey: string;
  githubUrl: string;
  onCopy?: (tabName: string) => void;
};

export function CodeSnippet({ apiKey, githubUrl, onCopy }: CodeSnippetProps) {
  const [activeTab, setActiveTab] = useState<"curl" | "fetch" | "python">("curl");
  const [copied, setCopied] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState("https://dandi.ai");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setApiBaseUrl(window.location.origin);
  }, []);

  const displayKey = apiKey || "sk_live_YOUR_API_KEY";
  const displayUrl = githubUrl || "https://github.com/facebook/react";
  const finalEndpointUrl = `${apiBaseUrl}/api/github-summarizer`;

  const snippets = {
    curl: `curl -X POST ${finalEndpointUrl} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${displayKey}" \\
  -d '{"githubUrl": "${displayUrl}"}'`,
    
    fetch: `fetch("${finalEndpointUrl}", {
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
    setCopied(true);
    if (onCopy) {
      onCopy(activeTab);
    }
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-[#18181b] shadow-lg shadow-zinc-900/10">
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
        <CopyIconButton
          onClick={handleCopy}
          title="Copy snippet"
        />
      </div>
      <div className="relative p-6">
        <pre className="scrollbar-hide overflow-x-auto font-mono text-[11px] leading-relaxed text-zinc-300">
          <code>{snippets[activeTab]}</code>
        </pre>
      </div>
    </div>
  );
}
