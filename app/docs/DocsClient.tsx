"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Session } from "@supabase/supabase-js";
import { Navbar } from "@/components/landing/Navbar";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { Footer } from "@/components/landing/Footer";
import { CodeWindow, CommandPanel, ScrollFrame, StatusPill } from "@/components/command";

const getCodeExamples = (apiBaseUrl: string) => {
  const endpoint = `${apiBaseUrl}/api/github-summarizer`;
  return {
    curl: `curl -X POST ${endpoint} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"githubUrl": "https://github.com/facebook/react"}'`,
    
    javascript: `const response = await fetch("${endpoint}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "YOUR_API_KEY"
  },
  body: JSON.stringify({
    githubUrl: "https://github.com/facebook/react"
  })
});

const data = await response.json();
console.log(data);`,

    python: `import requests

url = "${endpoint}"
headers = {
    "Content-Type": "application/json",
    "x-api-key": "YOUR_API_KEY"
}
payload = {
    "githubUrl": "https://github.com/facebook/react"
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`,

    go: `package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

func main() {
	url := "${endpoint}"
	payload := map[string]string{
		"githubUrl": "https://github.com/facebook/react",
	}
	
	jsonBytes, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(jsonBytes))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", "YOUR_API_KEY")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	fmt.Println(string(body))
}`
  };
};



type CodeExampleTab = "curl" | "javascript" | "python" | "go";

const docsNav = [
  {
    label: "Start",
    items: [
      { href: "#quickstart", label: "Quickstart" },
      { href: "#authentication", label: "Authentication" },
    ],
  },
  {
    label: "API Reference",
    items: [
      { href: "#summarizer", label: "Summarizer" },
      { href: "#rag-ingest", label: "Prepare Repository" },
      { href: "#rag-chat", label: "Ask a Repository" },
      { href: "#code-explorer", label: "Code Examples" },
      { href: "#response-schema", label: "Response Schema" },
      { href: "#error-codes", label: "Errors" },
    ],
  },
];

const intelligenceWorkflow = [
  ["Repository", "Send a public GitHub repository URL."],
  ["Summary", "Generate a readable repository overview."],
  ["Prepare", "Index a repository once for source-backed questions."],
  ["Ask", "Ask questions against prepared repository sections."],
  ["Sources", "Review returned evidence when available."],
  ["Answer", "Use the streamed response in your workflow."],
];

function DocsTableSurface({ children, label }: { children: ReactNode; label: string }) {
  return (
    <CommandPanel
      padding="none"
      className="overflow-hidden [&_table]:w-full [&_thead_tr]:border-white/10 [&_thead_tr]:bg-white/[0.03] [&_th]:px-4 [&_th]:py-3 [&_th]:text-[10px] [&_th]:font-black [&_th]:uppercase [&_th]:tracking-widest [&_th]:text-slate-400 [&_td]:px-4 [&_td]:py-3 [&_tbody_tr]:border-white/5 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-emerald-300/[0.03]"
    >
      <ScrollFrame axis="x" minWidth="500px" label={label}>
        {children}
      </ScrollFrame>
    </CommandPanel>
  );
}

function DocsCopyButton({
  label,
  onClick,
  compact = false,
}: {
  label: string;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] font-black uppercase tracking-widest text-slate-400 transition hover:border-emerald-300/30 hover:text-emerald-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/45 ${
        compact ? "px-2 py-1 text-[8px]" : "px-3 py-1.5 text-[9px]"
      }`}
      aria-label={label}
      title={label}
    >
      <svg viewBox="0 0 24 24" className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} fill="none" stroke="currentColor">
        <path d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Copy
    </button>
  );
}

function DocsSectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-2 border-b border-white/10 pb-4">
      {eyebrow && <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300/70">{eyebrow}</p>}
      <h2 className="text-2xl font-bold tracking-tight text-white">{title}</h2>
      {description && <p className="max-w-3xl text-sm leading-relaxed text-slate-400">{description}</p>}
    </div>
  );
}

function EndpointHeader({
  title,
  path,
  description,
  onCopy,
}: {
  title: string;
  path: string;
  description: string;
  onCopy: () => void;
}) {
  return (
    <CommandPanel className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone="success" compact>POST</StatusPill>
            <code className="min-w-0 truncate rounded-lg border border-white/10 bg-slate-950/70 px-2.5 py-1 font-mono text-xs text-slate-200">
              {path}
            </code>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">{title}</h2>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-400">{description}</p>
        </div>
        <DocsCopyButton label={`Copy ${path} endpoint path`} onClick={onCopy} />
      </div>
    </CommandPanel>
  );
}

function DocsCallout({
  title,
  children,
  tone = "info",
}: {
  title: string;
  children: ReactNode;
  tone?: "info" | "warning";
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        tone === "warning"
          ? "border-amber-300/15 bg-amber-300/[0.05]"
          : "border-cyan-300/15 bg-cyan-300/[0.04]"
      }`}
    >
      <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${tone === "warning" ? "text-amber-300" : "text-cyan-300"}`}>{title}</p>
      <div className="mt-2 text-xs font-medium leading-relaxed text-slate-400">{children}</div>
    </div>
  );
}

export default function DocsClient({ initialSession }: { initialSession: Session | null }) {
  const { toast, showToast } = useToast();
  const [activeTab, setActiveTab] = useState<CodeExampleTab>("curl");
  const [isCopied, setIsCopied] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState("https://dandi.ai");

  useEffect(() => {
    // Keep the server and first client render identical, then localize snippets.
    const updateOrigin = window.setTimeout(() => {
      setApiBaseUrl(window.location.origin);
    }, 0);

    return () => window.clearTimeout(updateOrigin);
  }, []);

  const codeExamples = getCodeExamples(apiBaseUrl);

  // Collapsible JSON Tree node states
  const [isDataOpen, setIsDataOpen] = useState(true);
  const [isMetadataOpen, setIsMetadataOpen] = useState(true);
  const [isCoolFactsOpen, setIsCoolFactsOpen] = useState(true);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(codeExamples[activeTab]);
    setIsCopied(true);
    showToast("success", "Code snippet copied to clipboard.");
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#05070b] font-sans text-slate-200 selection:bg-emerald-500/20 selection:text-emerald-200">
      <Navbar session={initialSession} />

      <main className="mx-auto max-w-7xl px-4 pt-32 pb-24 sm:px-6 md:pt-40">
        <div className="grid gap-10 lg:grid-cols-12">
          
          {/* Left Navigation Sidebar */}
          <aside className="hidden h-fit space-y-6 lg:sticky lg:top-36 lg:col-span-3 lg:block">
            {docsNav.map((group) => (
              <div key={group.label} className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{group.label}</p>
                <ul className="space-y-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <a href={item.href} className="block rounded-lg px-2 py-1.5 transition hover:bg-white/[0.03] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40">
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <CommandPanel className="p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300/70">API v1</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                Use the Playground to test requests with your own key before integrating.
              </p>
            </CommandPanel>
          </aside>

          {/* Right Main Content Panel */}
          <div className="min-w-0 space-y-16 lg:col-span-9">
            
            {/* Intro Header */}
            <header className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-slate-950/40 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                API Reference
              </div>
              <h1 className="font-serif text-4xl font-bold md:text-5xl tracking-tight text-white animate-in fade-in slide-in-from-top-4 duration-500">API Reference Guide</h1>
              <p className="text-zinc-400 text-sm leading-relaxed md:text-base">
                Build repository summaries and source-backed answers with the Dandi API. These docs cover authentication, endpoint contracts, response shapes, and how summary generation differs from Ask a Repository.
              </p>
            </header>

            <div className="lg:hidden">
              <ScrollFrame axis="x" label="Documentation sections">
                <div className="flex min-w-max gap-2 pb-1">
                  {docsNav.flatMap((group) => group.items).map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 transition hover:border-emerald-300/30 hover:text-emerald-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40"
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              </ScrollFrame>
            </div>

            <CommandPanel className="p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300/70">Repository Intelligence Flow</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-400">
                    Use the summary endpoint for a readable overview. Use Ask a Repository when you need source-backed answers.
                  </p>
                </div>
                <StatusPill tone="info" compact>Docs map</StatusPill>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {intelligenceWorkflow.map(([label, detail], index) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-300/10 text-[10px] font-black text-emerald-300">{index + 1}</span>
                      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-200">{label}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-500">{detail}</p>
                  </div>
                ))}
              </div>
            </CommandPanel>

            {/* Quickstart Section */}
            <section id="quickstart" className="space-y-6 scroll-mt-28">
              <DocsSectionHeader
                eyebrow="Start here"
                title="Quickstart"
                description="Create an account, generate an API key, then send a repository URL to either the summary endpoint or the Ask a Repository workflow."
              />
              <div className="grid gap-6 sm:grid-cols-3">
                <CommandPanel className="space-y-2 p-5">
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">Step 01</span>
                  <h4 className="font-bold text-sm text-slate-200">Create Account</h4>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Create your account via email or Google to access your developer dashboard.
                  </p>
                </CommandPanel>
                <CommandPanel className="space-y-2 p-5">
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">Step 02</span>
                  <h4 className="font-bold text-sm text-slate-200">Get API Keys</h4>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Create and manage API keys from the <Link href="/dashboards" className="text-slate-300 underline hover:text-emerald-400">Dashboard</Link>.
                  </p>
                </CommandPanel>
                <CommandPanel className="space-y-2 p-5">
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">Step 03</span>
                  <h4 className="font-bold text-sm text-slate-200">Send Request</h4>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Call the API with your key in the request headers and a public GitHub URL in the JSON body.
                  </p>
                </CommandPanel>
              </div>
            </section>

            {/* Authentication Section */}
            <section id="authentication" className="space-y-5 scroll-mt-28">
              <DocsSectionHeader
                title="Authentication"
                description="Every API request must include your Dandi API key in the x-api-key header."
              />
              <p className="text-xs leading-relaxed text-zinc-400">
                All requests to the Dandi AI server must authenticate by passing your API key in the custom <code className="bg-slate-900/80 px-1.5 py-0.5 rounded text-[11px] font-mono text-slate-300 border border-white/5">x-api-key</code> header.
              </p>
              <DocsCallout title="Keep API keys server-side" tone="warning">
                Do not expose live API keys in browser bundles or public repositories. Use a server route or backend job to call Dandi from production applications.
              </DocsCallout>
              <div className="relative flex min-w-0 flex-col gap-3 rounded-2xl border border-white/5 bg-slate-950/40 p-4 font-mono text-xs sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 overflow-x-auto">
                  <span className="text-zinc-500">x-api-key: </span>
                  <span className="text-emerald-400">dandi_live_57cf89e0231ab42ef89c...</span>
                </div>
                <DocsCopyButton
                  label="Copy example API key"
                  onClick={() => {
                    navigator.clipboard.writeText("dandi_live_57cf89e0231ab42ef89c...");
                    showToast("success", "Example API key copied.");
                  }}
                />
              </div>
            </section>

            {/* Summarizer Endpoint */}
            <section id="summarizer" className="space-y-6 scroll-mt-28">
              <EndpointHeader
                title="Repository Summary"
                path="/api/github-summarizer"
                description="Get an overview of a repository's structure, purpose, and key components. Use this when you need metadata, a readable summary, and key findings without preparing the repository for follow-up questions."
                onCopy={() => {
                  navigator.clipboard.writeText("/api/github-summarizer");
                  showToast("success", "Endpoint path copied to clipboard.");
                }}
              />

              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Request Headers</h3>
                <DocsTableSurface label="Summarizer request headers">
                  <table className="w-full text-left border-collapse text-xs min-w-[500px]">
                    <thead>
                      <tr className="border-b border-white/10 text-zinc-500">
                        <th className="py-2">Header</th>
                        <th className="py-2">Type</th>
                        <th className="py-2">Required</th>
                        <th className="py-2">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-white/5 text-zinc-400">
                        <td className="py-3 font-mono font-bold text-slate-200">
                          <div className="flex items-center gap-2">
                          <span>x-api-key</span>
                          <DocsCopyButton
                            compact
                            label="Copy x-api-key header"
                            onClick={() => {
                              navigator.clipboard.writeText("x-api-key");
                              showToast("success", "Header name copied to clipboard.");
                            }}
                          />
                          </div>
                        </td>
                        <td className="py-3 font-mono text-zinc-500">string</td>
                        <td className="py-3 font-bold text-rose-400">Yes</td>
                        <td className="py-3 text-zinc-400">Your secret API key.</td>
                      </tr>
                      <tr className="border-b border-white/5 text-zinc-400">
                        <td className="py-3 font-mono font-bold text-slate-200">Content-Type</td>
                        <td className="py-3 font-mono text-zinc-500">string</td>
                        <td className="py-3 font-bold text-rose-400">Yes</td>
                        <td className="py-3 text-zinc-400">Must be set to <code className="font-mono bg-slate-900/80 px-1 py-0.5 rounded text-[10px] text-slate-300 border border-white/5">application/json</code>.</td>
                      </tr>
                    </tbody>
                  </table>
                </DocsTableSurface>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">JSON Body Parameters</h3>
                <DocsTableSurface label="Summarizer JSON body parameters">
                  <table className="w-full text-left border-collapse text-xs min-w-[500px]">
                    <thead>
                      <tr className="border-b border-white/10 text-zinc-500">
                        <th className="py-2">Parameter</th>
                        <th className="py-2">Type</th>
                        <th className="py-2">Required</th>
                        <th className="py-2">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-white/5 text-zinc-400">
                        <td className="py-3 font-mono font-bold text-slate-200">githubUrl</td>
                        <td className="py-3 font-mono text-zinc-500">string</td>
                        <td className="py-3 font-bold text-rose-400">Yes</td>
                        <td className="py-3 text-zinc-400 leading-relaxed">
                          The full URL of the public GitHub repository. Expected: <code className="font-mono bg-slate-900/80 px-1 py-0.5 rounded text-[10px] text-slate-300 border border-white/5">https://github.com/owner/repo</code>.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </DocsTableSurface>
                
                {/* Example JSON payload */}
                <CodeWindow
                  title="request-body"
                  language="json"
                  actions={
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify({ githubUrl: "https://github.com/facebook/react" }, null, 2));
                        showToast("success", "Request body JSON copied.");
                      }}
                      className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-slate-400 transition-all hover:border-emerald-300/30 hover:text-emerald-200 cursor-pointer"
                      title="Copy request body"
                      aria-label="Copy request body JSON"
                    >
                      Copy
                    </button>
                  }
                >
                  <pre className="min-w-max p-4 font-mono text-xs leading-relaxed text-slate-300">
{`{
  "githubUrl": "https://github.com/facebook/react"
}`}
                  </pre>
                </CodeWindow>
              </div>
            </section>

            {/* Prepare Repository Endpoint */}
            <section id="rag-ingest" className="space-y-6 scroll-mt-28">
              <EndpointHeader
                title="Prepare Repository"
                path="/api/rag/ingest"
                description="Index a public GitHub repository once, then ask source-backed questions with the Ask a Repository endpoint."
                onCopy={() => {
                  navigator.clipboard.writeText("/api/rag/ingest");
                  showToast("success", "Endpoint path copied to clipboard.");
                }}
              />

              <div className="space-y-4">
                <p className="text-xs leading-relaxed text-zinc-400">
                  Submits a GitHub repository for preparation. Required before asking source-backed questions about a repository. You can check the preparation status by making a <code className="font-mono bg-slate-900/80 px-1 py-0.5 rounded text-[10px] text-slate-300 border border-white/5">GET</code> request to this same endpoint with the <code className="font-mono bg-slate-900/80 px-1 py-0.5 rounded text-[10px] text-slate-300 border border-white/5">jobId</code> query parameter.
                </p>
                <DocsCallout title="Prepare before asking">
                  Preparation stores repository chunks so Dandi can answer later questions with source evidence. A summary response is not the same as a prepared repository.
                </DocsCallout>
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">JSON Body Parameters</h3>
                <DocsTableSurface label="Prepare repository JSON body parameters">
                  <table className="w-full text-left border-collapse text-xs min-w-[500px]">
                    <thead>
                      <tr className="border-b border-white/10 text-zinc-500">
                        <th className="py-2">Parameter</th>
                        <th className="py-2">Type</th>
                        <th className="py-2">Required</th>
                        <th className="py-2">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-white/5 text-zinc-400">
                        <td className="py-3 font-mono font-bold text-slate-200">githubUrl</td>
                        <td className="py-3 font-mono text-zinc-500">string</td>
                        <td className="py-3 font-bold text-rose-400">Yes</td>
                        <td className="py-3 text-zinc-400 leading-relaxed">
                          The full URL of the public GitHub repository. Expected: <code className="font-mono bg-slate-900/80 px-1 py-0.5 rounded text-[10px] text-slate-300 border border-white/5">https://github.com/owner/repo</code>.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </DocsTableSurface>
              </div>
            </section>

            {/* Ask a Repository Endpoint */}
            <section id="rag-chat" className="space-y-6 scroll-mt-28">
              <EndpointHeader
                title="Ask a Repository"
                path="/api/rag/chat"
                description="Ask questions against an indexed repository. Responses stream back to the client and may include matched source files through response metadata."
                onCopy={() => {
                  navigator.clipboard.writeText("/api/rag/chat");
                  showToast("success", "Endpoint path copied to clipboard.");
                }}
              />

              <div className="space-y-4">
                <p className="text-xs leading-relaxed text-zinc-400">
                  Ask questions about a prepared GitHub repository. Returns a streaming text response.
                </p>
                <DocsCallout title="Evidence availability">
                  When source metadata is returned, Dandi surfaces matched repository files with similarity scores in the Playground and through the response headers.
                </DocsCallout>
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">JSON Body Parameters</h3>
                <DocsTableSurface label="Ask a Repository JSON body parameters">
                  <table className="w-full text-left border-collapse text-xs min-w-[500px]">
                    <thead>
                      <tr className="border-b border-white/10 text-zinc-500">
                        <th className="py-2">Parameter</th>
                        <th className="py-2">Type</th>
                        <th className="py-2">Required</th>
                        <th className="py-2">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-white/5 text-zinc-400">
                        <td className="py-3 font-mono font-bold text-slate-200">githubUrl</td>
                        <td className="py-3 font-mono text-zinc-500">string</td>
                        <td className="py-3 font-bold text-rose-400">Yes</td>
                        <td className="py-3 text-zinc-400 leading-relaxed">
                          The full URL of the public GitHub repository. Expected: <code className="font-mono bg-slate-900/80 px-1 py-0.5 rounded text-[10px] text-slate-300 border border-white/5">https://github.com/owner/repo</code>.
                        </td>
                      </tr>
                      <tr className="border-b border-white/5 text-zinc-400">
                        <td className="py-3 font-mono font-bold text-slate-200">messages</td>
                        <td className="py-3 font-mono text-zinc-500">array</td>
                        <td className="py-3 font-bold text-rose-400">Yes</td>
                        <td className="py-3 text-zinc-400 leading-relaxed">
                          An array of message objects containing <code className="font-mono bg-slate-900/80 px-1 py-0.5 rounded text-[10px] text-slate-300 border border-white/5">role</code> (&quot;user&quot; or &quot;assistant&quot;) and <code className="font-mono bg-slate-900/80 px-1 py-0.5 rounded text-[10px] text-slate-300 border border-white/5">content</code> strings.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </DocsTableSurface>
              </div>
            </section>

            {/* Code Snippets Explorer */}
            <section id="code-explorer" className="space-y-6 scroll-mt-28">
              <DocsSectionHeader
                title="Code Examples"
                description="Copy a working request in your preferred language. Examples use the summarizer endpoint and the current site origin."
              />

              <CodeWindow
                title="integration-explorer"
                language={activeTab}
                actions={
                  <button
                    onClick={copyToClipboard}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-slate-400 transition-all hover:border-emerald-300/30 hover:text-emerald-200 cursor-pointer"
                  >
                    {isCopied ? "Copied!" : "Copy"}
                  </button>
                }
                maxHeight="32rem"
              >
                <div
                  className="border-b border-white/10 bg-white/[0.02] px-4 py-3"
                  role="tablist"
                  aria-label="Code examples in different languages"
                >
                  <ScrollFrame axis="x" label="Docs code example tabs">
                    <div className="flex min-w-max gap-2">
                      {(Object.keys(codeExamples) as CodeExampleTab[]).map((tab) => (
                        <button
                          key={tab}
                          role="tab"
                          id={`tab-${tab}`}
                          aria-selected={activeTab === tab}
                          aria-controls={`tabpanel-${tab}`}
                          tabIndex={activeTab === tab ? 0 : -1}
                          onClick={() => { setActiveTab(tab); setIsCopied(false); }}
                          onKeyDown={(e) => {
                            const tabs = Object.keys(codeExamples) as CodeExampleTab[];
                            const currentIndex = tabs.indexOf(tab);
                            let nextIndex = currentIndex;
                            if (e.key === "ArrowRight") {
                              nextIndex = (currentIndex + 1) % tabs.length;
                            } else if (e.key === "ArrowLeft") {
                              nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                            }
                            if (nextIndex !== currentIndex) {
                              const nextTab = tabs[nextIndex];
                              setActiveTab(nextTab);
                              setIsCopied(false);
                              document.getElementById(`tab-${nextTab}`)?.focus();
                            }
                          }}
                          className={`shrink-0 rounded-xl border px-4 py-2 text-[10px] font-black uppercase tracking-widest transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 cursor-pointer ${
                            activeTab === tab
                              ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-300"
                              : "border-white/10 bg-slate-950/60 text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  </ScrollFrame>
                </div>
                <div
                  role="tabpanel"
                  id={`tabpanel-${activeTab}`}
                  aria-labelledby={`tab-${activeTab}`}
                  tabIndex={0}
                  className="focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <pre className="min-w-max p-4 text-left font-mono text-[10px] leading-relaxed text-slate-300 md:text-[11px]">
                    <code>{codeExamples[activeTab]}</code>
                  </pre>
                </div>
              </CodeWindow>
            </section>

            {/* Response Schema Viewer */}
            <section id="response-schema" className="space-y-6 scroll-mt-28">
              <DocsSectionHeader
                title="Response Payload Schema"
                description="The summarizer returns a structured JSON object with repository metadata, a summary, and repository notes. Expand the tree to inspect the shape."
              />

              {/* Collapsible JSON Tree */}
              <CodeWindow
                title="response-schema"
                language="json"
                maxHeight="34rem"
                actions={
                  <button
                    onClick={() => {
                      const fullResponse = {
                        success: true,
                        message: "Successfully summarized https://github.com/facebook/react",
                        data: {
                          owner: "API Key Owner",
                          repo: "https://github.com/facebook/react",
                          metadata: {
                            stars: 225402,
                            license: "MIT",
                            version: "v18.3.1",
                            forks: 45102,
                            description: "The library for web and native user interfaces"
                          },
                          summary: "React is an open-source front-end JavaScript library...",
                          cool_facts: [
                            "React was originally created by Jordan Walke.",
                            "Introduced the concept of Virtual DOM for fast updates.",
                            "Serves as the foundation for React Native cross-platform apps."
                          ]
                        }
                      };
                      navigator.clipboard.writeText(JSON.stringify(fullResponse, null, 2));
                      showToast("success", "Response schema example copied.");
                    }}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-slate-400 transition-all hover:border-emerald-300/30 hover:text-emerald-200 cursor-pointer"
                    aria-label="Copy response JSON example"
                  >
                    Copy JSON
                  </button>
                }
              >
                <div className="min-w-max space-y-1 p-4 text-left font-mono text-[10px] leading-relaxed text-slate-300 sm:p-6 md:text-[11px]">
                  <div>{"{"}</div>
                  
                  <div className="pl-4">
                    <span className="text-emerald-400">&quot;success&quot;</span>: <span className="text-purple-400">true</span>,
                  </div>
                  
                  <div className="pl-4">
                    <span className="text-emerald-400">&quot;message&quot;</span>: <span className="text-blue-400">&quot;Successfully summarized https://github.com/facebook/react&quot;</span>,
                  </div>

                  {/* data node */}
                  <div className="pl-4">
                    <button onClick={() => setIsDataOpen(!isDataOpen)} className="hover:text-emerald-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded px-1 font-bold text-zinc-500 text-left cursor-pointer">
                      {isDataOpen ? "▼" : "▶"} <span className="text-emerald-400">&quot;data&quot;</span>: {"{"}
                    </button>
                    
                    {isDataOpen && (
                      <div className="pl-4 border-l border-white/5 space-y-1 my-1">
                        <div>
                          <span className="text-emerald-400">&quot;owner&quot;</span>: <span className="text-blue-400">&quot;API Key Owner&quot;</span>,
                        </div>
                        
                        <div>
                          <span className="text-emerald-400">&quot;repo&quot;</span>: <span className="text-blue-400">&quot;https://github.com/facebook/react&quot;</span>,
                        </div>

                        {/* metadata node */}
                        <div>
                          <button onClick={() => setIsMetadataOpen(!isMetadataOpen)} className="hover:text-emerald-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded px-1 font-bold text-zinc-500 text-left cursor-pointer">
                            {isMetadataOpen ? "▼" : "▶"} <span className="text-emerald-400">&quot;metadata&quot;</span>: {"{"}
                          </button>
                          {isMetadataOpen && (
                            <div className="pl-4 border-l border-white/5 space-y-1 my-1">
                              <div>
                                <span className="text-emerald-400">&quot;stars&quot;</span>: <span className="text-purple-400">225402</span>, <span className="text-zinc-600">{"// number"}</span>
                              </div>
                              <div>
                                <span className="text-emerald-400">&quot;license&quot;</span>: <span className="text-blue-400">&quot;MIT&quot;</span>, <span className="text-zinc-600">{"// string"}</span>
                              </div>
                              <div>
                                <span className="text-emerald-400">&quot;version&quot;</span>: <span className="text-blue-400">&quot;v18.3.1&quot;</span>, <span className="text-zinc-600">{"// string"}</span>
                              </div>
                              <div>
                                <span className="text-emerald-400">&quot;forks&quot;</span>: <span className="text-purple-400">45102</span>, <span className="text-zinc-600">{"// number"}</span>
                              </div>
                              <div>
                                <span className="text-emerald-400">&quot;description&quot;</span>: <span className="text-blue-400">&quot;The library for web and native user interfaces&quot;</span> <span className="text-zinc-600">{"// string"}</span>
                              </div>
                            </div>
                          )}
                          <div>{"},"}</div>
                        </div>

                        {/* summary property */}
                        <div>
                          <span className="text-emerald-400">&quot;summary&quot;</span>: <span className="text-blue-400">&quot;React is an open-source front-end JavaScript library...&quot;</span>,
                        </div>

                        {/* cool facts node */}
                        <div>
                          <button onClick={() => setIsCoolFactsOpen(!isCoolFactsOpen)} className="hover:text-emerald-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded px-1 font-bold text-zinc-500 text-left cursor-pointer">
                            {isCoolFactsOpen ? "▼" : "▶"} <span className="text-emerald-400">&quot;cool_facts&quot;</span>: [
                          </button>
                          {isCoolFactsOpen && (
                            <div className="pl-4 border-l border-white/5 space-y-1 my-1 text-blue-400">
                              <div>&quot;React was originally created by Jordan Walke.&quot;,</div>
                              <div>&quot;Introduced the concept of Virtual DOM for fast updates.&quot;,</div>
                              <div>&quot;Serves as the foundation for React Native cross-platform apps.&quot;</div>
                            </div>
                          )}
                          <div>{"]"}</div>
                        </div>
                      </div>
                    )}
                    <div>{"}"}</div>
                  </div>
                  <div>{"}"}</div>
                </div>
              </CodeWindow>
            </section>

            {/* Errors Section */}
            <section id="error-codes" className="space-y-6 scroll-mt-28">
              <DocsSectionHeader
                title="Error Handling"
                description="Standard error responses returned when validation, authentication, rate limits, or generation fail."
              />

              <div className="space-y-6">
                <DocsTableSurface label="API error handling reference">
                  <table className="w-full text-left border-collapse text-xs min-w-[500px]">
                    <thead>
                      <tr className="border-b border-white/10 text-zinc-500">
                        <th className="py-2">Status</th>
                        <th className="py-2">Error Value</th>
                        <th className="py-2">Trigger Condition</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-white/5">
                        <td className="py-3 font-mono font-bold text-rose-400">400 Bad Request</td>
                        <td className="py-3 font-mono text-slate-300">Invalid GitHub repository URL</td>
                        <td className="py-3 text-zinc-400">The repository URL is malformed or not hosted on github.com.</td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="py-3 font-mono font-bold text-rose-400">401 Unauthorized</td>
                        <td className="py-3 font-mono text-slate-300">API key is required</td>
                        <td className="py-3 text-zinc-400">The key is missing or failed database verification.</td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="py-3 font-mono font-bold text-rose-400">403 Forbidden</td>
                        <td className="py-3 font-mono text-slate-300">Monthly request limit exceeded</td>
                        <td className="py-3 text-zinc-400">The active plan tier has used its allocated requests for the cycle.</td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="py-3 font-mono font-bold text-rose-400">429 Too Many Requests</td>
                        <td className="py-3 font-mono text-slate-300">Too Many Requests</td>
                        <td className="py-3 text-zinc-400">IP rate limits are active (Limit: 5 requests per minute).</td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="py-3 font-mono font-bold text-rose-400">500 Internal Error</td>
                        <td className="py-3 font-mono text-slate-300">Failed to generate AI summary</td>
                        <td className="py-3 text-zinc-400">Underlying LLM or network pipeline failure during processing.</td>
                      </tr>
                    </tbody>
                  </table>
                </DocsTableSurface>
              </div>
            </section>

          </div>
        </div>
      </main>

      <Footer />
      <Toast toast={toast} />
    </div>
  );
}
