"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Session } from "@supabase/supabase-js";
import { Navbar } from "@/components/landing/Navbar";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { Footer } from "@/components/landing/Footer";
import { CodeWindow, CommandPanel, ScrollFrame } from "@/components/command";

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
    <div className="min-h-screen bg-[#f4f2ed] dark:bg-zinc-950 font-sans text-[#18181b] dark:text-zinc-100 selection:bg-zinc-200 dark:selection:bg-zinc-800">
      <Navbar session={initialSession} />

      <main className="mx-auto max-w-7xl px-4 pt-32 pb-24 sm:px-6 md:pt-40">
        <div className="grid gap-12 lg:grid-cols-12">
          
          {/* Left Navigation Sidebar */}
          <aside className="lg:col-span-3 lg:sticky lg:top-36 h-fit space-y-8 hidden lg:block">
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Getting Started</p>
              <ul className="space-y-2 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                <li><a href="#quickstart" className="hover:text-zinc-900 dark:hover:text-white transition">Quickstart</a></li>
                <li><a href="#authentication" className="hover:text-zinc-900 dark:hover:text-white transition">Authentication</a></li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">API Reference</p>
              <ul className="space-y-2 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                <li><a href="#summarizer" className="hover:text-zinc-900 dark:hover:text-white transition">POST Summarizer</a></li>
                <li><a href="#rag-ingest" className="hover:text-zinc-900 dark:hover:text-white transition">POST RAG Ingest</a></li>
                <li><a href="#rag-chat" className="hover:text-zinc-900 dark:hover:text-white transition">POST RAG Chat</a></li>
                <li><a href="#code-explorer" className="hover:text-zinc-900 dark:hover:text-white transition">Code Explorer</a></li>
                <li><a href="#response-schema" className="hover:text-zinc-900 dark:hover:text-white transition">Response Schema</a></li>
                <li><a href="#error-codes" className="hover:text-zinc-900 dark:hover:text-white transition">Error Handling</a></li>
              </ul>
            </div>
          </aside>

          {/* Right Main Content Panel */}
          <div className="min-w-0 max-w-3xl space-y-16 lg:col-span-9">
            
            {/* Intro Header */}
            <header className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
                API Reference
              </div>
              <h1 className="font-serif text-4xl font-bold md:text-5xl tracking-tight">API Reference Guide</h1>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed md:text-base">
                Welcome to the Dandi AI API documentation. Learn how to fetch repository summaries, sync metadata, and integrate insights directly into your workflow.
              </p>
            </header>

            {/* Quickstart Section */}
            <section id="quickstart" className="space-y-6 scroll-mt-28">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <h2 className="text-xl font-bold tracking-tight">Quickstart Guide</h2>
              </div>
              <div className="grid gap-6 sm:grid-cols-3">
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2">
                  <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">Step 01</span>
                  <h4 className="font-bold text-sm">Account Creation</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Create your account via email or Google to access your developer dashboard.
                  </p>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2">
                  <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">Step 02</span>
                  <h4 className="font-bold text-sm">Get API Keys</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Navigate directly to the <Link href="/playground" className="text-zinc-800 dark:text-zinc-100 underline hover:text-emerald-500">Playground</Link> to generate API keys.
                  </p>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2">
                  <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">Step 03</span>
                  <h4 className="font-bold text-sm">Send Request</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Invoke the summarizer endpoint using your API key in the headers.
                  </p>
                </div>
              </div>
            </section>

            {/* Authentication Section */}
            <section id="authentication" className="space-y-4 scroll-mt-28">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <h2 className="text-xl font-bold tracking-tight">Authentication</h2>
              </div>
              <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                All requests to the Dandi AI server must authenticate by passing your API key in the custom <code className="bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[11px] font-mono text-zinc-800 dark:text-zinc-200">x-api-key</code> header.
              </p>
              <div className="group relative flex min-w-0 flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 font-mono text-xs dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 overflow-x-auto">
                  <span className="text-zinc-400">x-api-key: </span>
                  <span className="text-emerald-500 dark:text-emerald-400">dandi_live_57cf89e0231ab42ef89c...</span>
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText("dandi_live_57cf89e0231ab42ef89c...");
                    showToast("success", "Example API key copied.");
                  }}
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-white transition-opacity"
                  title="Copy example key"
                  aria-label="Copy example API key"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
                    <path d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </section>

            {/* Summarizer Endpoint */}
            <section id="summarizer" className="space-y-6 scroll-mt-28">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <h2 className="text-xl font-bold tracking-tight">POST Summarizer Endpoint</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded bg-emerald-500 text-white dark:text-zinc-950 px-2 py-1 text-[9px] font-bold uppercase tracking-widest">POST</span>
                <div className="group relative flex min-w-0 items-center gap-2 rounded bg-zinc-200 px-3 py-1 font-mono text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                  <code className="min-w-0 truncate">/api/github-summarizer</code>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText("/api/github-summarizer");
                      showToast("success", "Endpoint path copied to clipboard.");
                    }}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-white transition-opacity ml-1.5"
                    title="Copy path"
                    aria-label="Copy endpoint path"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor">
                      <path d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Request Headers</h3>
                <DocsTableSurface label="Summarizer request headers">
                  <table className="w-full text-left border-collapse text-xs min-w-[500px]">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400">
                        <th className="py-2">Header</th>
                        <th className="py-2">Type</th>
                        <th className="py-2">Required</th>
                        <th className="py-2">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300">
                        <td className="py-3 font-mono font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2 group">
                          <span>x-api-key</span>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText("x-api-key");
                              showToast("success", "Header name copied to clipboard.");
                            }}
                            className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-white transition-opacity"
                            title="Copy header"
                            aria-label="Copy header key"
                          >
                            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
                              <path d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        </td>
                        <td className="py-3 font-mono text-zinc-500">string</td>
                        <td className="py-3 font-bold text-red-500">Yes</td>
                        <td className="py-3 text-zinc-500">Your secret API key.</td>
                      </tr>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300">
                        <td className="py-3 font-mono font-bold text-zinc-800 dark:text-zinc-100">Content-Type</td>
                        <td className="py-3 font-mono text-zinc-500">string</td>
                        <td className="py-3 font-bold text-red-500">Yes</td>
                        <td className="py-3 text-zinc-500">Must be set to <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-[10px]">application/json</code>.</td>
                      </tr>
                    </tbody>
                  </table>
                </DocsTableSurface>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">JSON Body Parameters</h3>
                <DocsTableSurface label="Summarizer JSON body parameters">
                  <table className="w-full text-left border-collapse text-xs min-w-[500px]">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400">
                        <th className="py-2">Parameter</th>
                        <th className="py-2">Type</th>
                        <th className="py-2">Required</th>
                        <th className="py-2">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300">
                        <td className="py-3 font-mono font-bold text-zinc-800 dark:text-zinc-100">githubUrl</td>
                        <td className="py-3 font-mono text-zinc-500">string</td>
                        <td className="py-3 font-bold text-red-500">Yes</td>
                        <td className="py-3 text-zinc-500 leading-relaxed">
                          The full URL of the public GitHub repository. Expected: <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-[10px]">https://github.com/owner/repo</code>.
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
                      className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-slate-400 transition-all hover:border-emerald-300/30 hover:text-emerald-200"
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

            {/* RAG Ingest Endpoint */}
            <section id="rag-ingest" className="space-y-6 scroll-mt-28">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <h2 className="text-xl font-bold tracking-tight">POST RAG Ingest Endpoint</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded bg-emerald-500 text-white dark:text-zinc-950 px-2 py-1 text-[9px] font-bold uppercase tracking-widest">POST</span>
                <div className="group relative flex min-w-0 items-center gap-2 rounded bg-zinc-200 px-3 py-1 font-mono text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                  <code className="min-w-0 truncate">/api/rag/ingest</code>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText("/api/rag/ingest");
                      showToast("success", "Endpoint path copied to clipboard.");
                    }}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-white transition-opacity ml-1.5"
                    title="Copy path"
                    aria-label="Copy endpoint path"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor">
                      <path d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  Submits a GitHub repository for vector embedding ingestion. Required before chatting with a repository using the RAG Chat endpoint. You can check the ingestion status by making a <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-[10px]">GET</code> request to this same endpoint with the <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-[10px]">jobId</code> query parameter.
                </p>
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">JSON Body Parameters</h3>
                <DocsTableSurface label="RAG ingest JSON body parameters">
                  <table className="w-full text-left border-collapse text-xs min-w-[500px]">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400">
                        <th className="py-2">Parameter</th>
                        <th className="py-2">Type</th>
                        <th className="py-2">Required</th>
                        <th className="py-2">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300">
                        <td className="py-3 font-mono font-bold text-zinc-800 dark:text-zinc-100">githubUrl</td>
                        <td className="py-3 font-mono text-zinc-500">string</td>
                        <td className="py-3 font-bold text-red-500">Yes</td>
                        <td className="py-3 text-zinc-500 leading-relaxed">
                          The full URL of the public GitHub repository. Expected: <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-[10px]">https://github.com/owner/repo</code>.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </DocsTableSurface>
              </div>
            </section>

            {/* RAG Chat Endpoint */}
            <section id="rag-chat" className="space-y-6 scroll-mt-28">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <h2 className="text-xl font-bold tracking-tight">POST RAG Chat Endpoint</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded bg-emerald-500 text-white dark:text-zinc-950 px-2 py-1 text-[9px] font-bold uppercase tracking-widest">POST</span>
                <div className="group relative flex min-w-0 items-center gap-2 rounded bg-zinc-200 px-3 py-1 font-mono text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                  <code className="min-w-0 truncate">/api/rag/chat</code>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText("/api/rag/chat");
                      showToast("success", "Endpoint path copied to clipboard.");
                    }}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-white transition-opacity ml-1.5"
                    title="Copy path"
                    aria-label="Copy endpoint path"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor">
                      <path d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  Chat with an ingested GitHub repository using Retrieval-Augmented Generation (RAG). Returns a streaming text response.
                </p>
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">JSON Body Parameters</h3>
                <DocsTableSurface label="RAG chat JSON body parameters">
                  <table className="w-full text-left border-collapse text-xs min-w-[500px]">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400">
                        <th className="py-2">Parameter</th>
                        <th className="py-2">Type</th>
                        <th className="py-2">Required</th>
                        <th className="py-2">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300">
                        <td className="py-3 font-mono font-bold text-zinc-800 dark:text-zinc-100">githubUrl</td>
                        <td className="py-3 font-mono text-zinc-500">string</td>
                        <td className="py-3 font-bold text-red-500">Yes</td>
                        <td className="py-3 text-zinc-500 leading-relaxed">
                          The full URL of the public GitHub repository. Expected: <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-[10px]">https://github.com/owner/repo</code>.
                        </td>
                      </tr>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300">
                        <td className="py-3 font-mono font-bold text-zinc-800 dark:text-zinc-100">messages</td>
                        <td className="py-3 font-mono text-zinc-500">array</td>
                        <td className="py-3 font-bold text-red-500">Yes</td>
                        <td className="py-3 text-zinc-500 leading-relaxed">
                          An array of message objects containing <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-[10px]">role</code> (&quot;user&quot; or &quot;assistant&quot;) and <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-[10px]">content</code> strings.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </DocsTableSurface>
              </div>
            </section>

            {/* Code Snippets Explorer */}
            <section id="code-explorer" className="space-y-6 scroll-mt-28">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <h2 className="text-xl font-bold tracking-tight">Code Explorer</h2>
              </div>
              <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                View integration code snippets in your language of choice:
              </p>

              <CodeWindow
                title="integration-explorer"
                language={activeTab}
                actions={
                  <button
                    onClick={copyToClipboard}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-slate-400 transition-all hover:border-emerald-300/30 hover:text-emerald-200"
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
                          className={`shrink-0 rounded-xl border px-4 py-2 text-[10px] font-black uppercase tracking-widest transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 ${
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
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <h2 className="text-xl font-bold tracking-tight">Response Payload Schema</h2>
              </div>
              <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                The API returns a structured JSON object enclosing repository metadata and summaries. Expand/collapse tree branches below to inspect properties:
              </p>

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
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-slate-400 transition-all hover:border-emerald-300/30 hover:text-emerald-200"
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
                    <button onClick={() => setIsDataOpen(!isDataOpen)} className="hover:text-emerald-400 focus:outline-none font-bold text-zinc-400 text-left">
                      {isDataOpen ? "▼" : "▶"} <span className="text-emerald-400">&quot;data&quot;</span>: {"{"}
                    </button>
                    
                    {isDataOpen && (
                      <div className="pl-4 border-l border-zinc-800 space-y-1 my-1">
                        <div>
                          <span className="text-emerald-400">&quot;owner&quot;</span>: <span className="text-blue-400">&quot;API Key Owner&quot;</span>,
                        </div>
                        
                        <div>
                          <span className="text-emerald-400">&quot;repo&quot;</span>: <span className="text-blue-400">&quot;https://github.com/facebook/react&quot;</span>,
                        </div>

                        {/* metadata node */}
                        <div>
                          <button onClick={() => setIsMetadataOpen(!isMetadataOpen)} className="hover:text-emerald-400 focus:outline-none font-bold text-zinc-400 text-left">
                            {isMetadataOpen ? "▼" : "▶"} <span className="text-emerald-400">&quot;metadata&quot;</span>: {"{"}
                          </button>
                          {isMetadataOpen && (
                            <div className="pl-4 border-l border-zinc-800 space-y-1 my-1">
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
                          <button onClick={() => setIsCoolFactsOpen(!isCoolFactsOpen)} className="hover:text-emerald-400 focus:outline-none font-bold text-zinc-400 text-left">
                            {isCoolFactsOpen ? "▼" : "▶"} <span className="text-emerald-400">&quot;cool_facts&quot;</span>: [
                          </button>
                          {isCoolFactsOpen && (
                            <div className="pl-4 border-l border-zinc-800 space-y-1 my-1 text-blue-400">
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
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <h2 className="text-xl font-bold tracking-tight">Error Handling Reference</h2>
              </div>
              <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                Standard error responses returned by the Dandi AI server when verification or limit checks fail:
              </p>

              <div className="space-y-6">
                <DocsTableSurface label="API error handling reference">
                  <table className="w-full text-left border-collapse text-xs min-w-[500px]">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400">
                        <th className="py-2">Status</th>
                        <th className="py-2">Error Value</th>
                        <th className="py-2">Trigger Condition</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800">
                        <td className="py-3 font-mono font-bold text-red-500">400 Bad Request</td>
                        <td className="py-3 font-mono text-zinc-700 dark:text-zinc-300">Invalid GitHub repository URL</td>
                        <td className="py-3 text-zinc-500">The repository URL is malformed or not hosted on github.com.</td>
                      </tr>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800">
                        <td className="py-3 font-mono font-bold text-red-500">401 Unauthorized</td>
                        <td className="py-3 font-mono text-zinc-700 dark:text-zinc-300">API key is required</td>
                        <td className="py-3 text-zinc-500">The key is missing or failed database verification.</td>
                      </tr>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800">
                        <td className="py-3 font-mono font-bold text-red-500">403 Forbidden</td>
                        <td className="py-3 font-mono text-zinc-700 dark:text-zinc-300">Monthly credit limit exceeded</td>
                        <td className="py-3 text-zinc-500">The active plan tier has depleted its allocated requests for the cycle.</td>
                      </tr>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800">
                        <td className="py-3 font-mono font-bold text-red-500">429 Too Many Requests</td>
                        <td className="py-3 font-mono text-zinc-700 dark:text-zinc-300">Too Many Requests</td>
                        <td className="py-3 text-zinc-500">IP rate limits are active (Limit: 5 requests per minute).</td>
                      </tr>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800">
                        <td className="py-3 font-mono font-bold text-red-500">500 Internal Error</td>
                        <td className="py-3 font-mono text-zinc-700 dark:text-zinc-300">Failed to generate AI summary</td>
                        <td className="py-3 text-zinc-500">Underlying LLM or network pipeline failure during processing.</td>
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
