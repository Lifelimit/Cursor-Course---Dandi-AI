"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { CodeWindow, CommandPanel, ScrollFrame, StatusPill } from "@/components/command";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { publicEnv } from "@/lib/env";

type NavItem = { id: string; label: string; terms: string };

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      { id: "overview", label: "Introduction", terms: "repository intelligence summarize prepare ask workflow" },
      { id: "quickstart", label: "Quickstart", terms: "api key curl github url request playground" },
    ],
  },
  {
    label: "Authentication",
    items: [{ id: "authentication", label: "API keys & headers", terms: "x-api-key content-type required key public private" }],
  },
  {
    label: "Endpoints",
    items: [
      { id: "summarize", label: "Repository Summary", terms: "post /api/github-summarizer summary metadata" },
      { id: "prepare", label: "Prepare repository", terms: "post get /api/rag/ingest job queued completed indexing" },
      { id: "ask", label: "Ask a repository", terms: "post /api/rag/chat messages sources evidence stream" },
    ],
  },
  {
    label: "Reference",
    items: [
      { id: "responses", label: "Responses & evidence", terms: "x-github-metadata x-rag-sources preview file path similarity stream" },
      { id: "errors", label: "Errors & recovery", terms: "400 401 403 404 422 429 500 invalid rate limit github authorization" },
    ],
  },
];

const allNavItems = navGroups.flatMap((group) => group.items);
const summaryRequest = `curl -X POST ${publicEnv.NEXT_PUBLIC_APP_URL}/api/github-summarizer \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"githubUrl":"https://github.com/facebook/react"}'`;
const prepareRequest = `curl -X POST ${publicEnv.NEXT_PUBLIC_APP_URL}/api/rag/ingest \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"githubUrl":"https://github.com/facebook/react"}'`;
const askRequest = `curl -N -X POST ${publicEnv.NEXT_PUBLIC_APP_URL}/api/rag/chat \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "githubUrl":"https://github.com/facebook/react",
    "messages":[{"role":"user","content":"Where is state managed?"}]
  }'`;
const prepareResponse = `{
  "success": true,
  "jobId": "JOB_ID",
  "repoUrl": "https://github.com/facebook/react",
  "status": "queued",
  "currentStep": "queued"
}`;
const sourcesResponse = `x-rag-sources: [{
  "chunkId": "CHUNK_ID",
  "filePath": "packages/react/src/ReactClient.js",
  "preview": "…",
  "similarity": 0.872
}]`;

function CopyButton({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setCopyError(false);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopyError(true);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy ${label}`}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-300 transition hover:border-emerald-300/40 hover:text-emerald-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor"><path d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      {copyError ? "Select text" : copied ? "Copied" : "Copy"}
      <span className="sr-only" aria-live="polite">{copyError ? `Could not copy ${label}. Select the text and copy it manually.` : copied ? `${label} copied` : ""}</span>
    </button>
  );
}

function SectionHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children: ReactNode }) {
  return <div className="max-w-3xl space-y-2 border-b border-white/10 pb-5">
    {eyebrow && <p className="dandi-type-metadata text-emerald-300/75">{eyebrow}</p>}
    <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h2>
    <div className="text-sm leading-7 text-slate-400">{children}</div>
  </div>;
}

function CodeExample({ title, language, tone = "cyan", value }: { title: string; language: string; tone?: "cyan" | "emerald" | "violet" | "amber"; value: string }) {
  const tones = { cyan: "text-cyan-200", emerald: "text-emerald-200", violet: "text-violet-200", amber: "text-amber-200" };
  return <CodeWindow title={title} language={language} actions={<CopyButton label={title} value={value} />}>
    <pre className={`min-w-max p-4 text-left text-[11px] leading-6 ${tones[tone]} sm:p-5`}><code>{value}</code></pre>
  </CodeWindow>;
}

function EndpointHeader({ title, path, children, playgroundHref, playgroundLabel }: { title: string; path: string; children: ReactNode; playgroundHref: string; playgroundLabel: string }) {
  return <CommandPanel className="space-y-4 p-4 sm:p-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2"><StatusPill tone="success" compact>POST</StatusPill><code className="rounded-lg border border-white/10 bg-slate-950/70 px-2.5 py-1 text-xs text-slate-200">{path}</code></div>
        <div><h2 className="text-2xl font-bold tracking-tight text-white">{title}</h2><p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">{children}</p></div>
      </div>
      <CopyButton label={`${path} endpoint path`} value={path} />
    </div>
    <Link href={playgroundHref} className="inline-flex w-fit items-center gap-2 rounded-lg border border-cyan-300/20 bg-cyan-300/[0.06] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-cyan-100 transition hover:border-cyan-300/45 hover:bg-cyan-300/[0.11] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70">{playgroundLabel}<span aria-hidden="true">→</span></Link>
  </CommandPanel>;
}

function ParameterTable({ children, label }: { children: ReactNode; label: string }) {
  return <ScrollFrame axis="x" minWidth="560px" label={label} className="w-full rounded-xl border border-white/10 bg-slate-950/50 [&_table]:w-full [&_th]:bg-white/[0.03] [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:text-[10px] [&_th]:font-black [&_th]:uppercase [&_th]:tracking-widest [&_th]:text-slate-400 [&_td]:border-t [&_td]:border-white/5 [&_td]:px-4 [&_td]:py-3 [&_td]:align-top [&_td]:text-xs [&_td]:leading-5 [&_td]:text-slate-400"><table>{children}</table></ScrollFrame>;
}

function NavList({ activeId, query, onNavigate, onSectionNavigate }: { activeId: string; query: string; onNavigate?: () => void; onSectionNavigate: (id: string) => void }) {
  const normalizedQuery = query.trim().toLowerCase();
  const groups = navGroups.map((group) => ({ ...group, items: group.items.filter((item) => !normalizedQuery || `${item.label} ${item.terms}`.toLowerCase().includes(normalizedQuery)) })).filter((group) => group.items.length);
  if (!groups.length) return <p role="status" className="rounded-lg border border-dashed border-white/10 p-3 text-xs leading-5 text-slate-400">No sections match this filter. Try an endpoint, error, or concept.</p>;
  return <div className="space-y-6">{groups.map((group) => <div key={group.label} className="space-y-2"><p className="dandi-type-metadata text-zinc-500">{group.label}</p><ul className="space-y-1">{group.items.map((item) => <li key={item.id}><a href={`#${item.id}`} onClick={(event) => { event.preventDefault(); onSectionNavigate(item.id); onNavigate?.(); }} aria-current={activeId === item.id ? "location" : undefined} className={`block rounded-lg border px-3 py-2 text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60 ${activeId === item.id ? "border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-200" : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.03] hover:text-white"}`}>{item.label}</a></li>)}</ul></div>)}</div>;
}

export default function DocsClient({ initialSession }: { initialSession: Session | null }) {
  const [activeId, setActiveId] = useState("overview");
  const [query, setQuery] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const sectionIds = useMemo(() => allNavItems.map((item) => item.id), []);

  const scrollToSection = useCallback((id: string) => {
    const section = document.getElementById(id);
    if (!section) return;
    section.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    window.history.pushState(null, "", `#${id}`);
    setActiveId(id);
  }, [reducedMotion]);

  useEffect(() => {
    const updateFromHash = () => {
      const id = window.location.hash.slice(1);
      if (sectionIds.includes(id)) setActiveId(id);
    };
    updateFromHash();
    window.addEventListener("hashchange", updateFromHash);
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible) setActiveId(visible.target.id);
    }, { rootMargin: "-24% 0px -64% 0px", threshold: 0 });
    sectionIds.forEach((id) => { const section = document.getElementById(id); if (section) observer.observe(section); });
    return () => { window.removeEventListener("hashchange", updateFromHash); observer.disconnect(); };
  }, [sectionIds]);

  const ContentRoot: "main" | "div" = initialSession ? "div" : "main";
  const docsWorkspace = <>
    <ContentRoot id={initialSession ? undefined : "docs-content"} tabIndex={initialSession ? undefined : -1} className={initialSession ? "pb-16" : "mx-auto max-w-7xl px-4 pb-24 pt-28 outline-none sm:px-6 md:pt-36"}>
      <div className="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
        <aside aria-label="Documentation navigation" className={`hidden h-fit space-y-5 lg:sticky lg:block lg:self-start ${initialSession ? "lg:top-6" : "lg:top-28"}`}>
          <div><p className="dandi-type-metadata text-emerald-300/75">Dandi API</p><p className="mt-2 text-sm font-semibold text-slate-200">Documentation workspace</p></div>
          <label className="block"><span className="sr-only">Search documentation</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search endpoints, errors, or concepts" className="w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2.5 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-emerald-300/45 focus:ring-2 focus:ring-emerald-300/15" /></label>
          <NavList activeId={activeId} query={query} onSectionNavigate={scrollToSection} />
          <CommandPanel className="p-4"><p className="dandi-type-metadata text-emerald-300/70">Action plane</p><p className="mt-2 text-xs leading-5 text-slate-400">Use the Playground with your own key to run the same Summary or Prepare & Ask workflow.</p></CommandPanel>
        </aside>
        <div className="min-w-0 space-y-16">
          <header className="max-w-3xl space-y-4"><p className="dandi-type-metadata text-emerald-300/75">Developer workspace / API reference</p><h1 className="font-serif text-4xl font-bold tracking-tight text-white sm:text-5xl">Build with repository intelligence.</h1><p className="text-base leading-8 text-slate-400">Move from a repository overview to prepared, source-backed questions without leaving the Dandi workflow.</p></header>
          <div className="lg:hidden"><button type="button" onClick={() => setMobileNavOpen((open) => !open)} aria-expanded={mobileNavOpen} aria-controls="mobile-docs-navigation" className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-xs font-bold text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60">Browse documentation <span aria-hidden="true">{mobileNavOpen ? "−" : "+"}</span></button>{mobileNavOpen && <div id="mobile-docs-navigation" className="mt-2 rounded-xl border border-white/10 bg-slate-950/70 p-4"><label className="block"><span className="sr-only">Search documentation</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search endpoints, errors, or concepts" className="mb-5 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-emerald-300/45" /></label><NavList activeId={activeId} query={query} onSectionNavigate={scrollToSection} onNavigate={() => setMobileNavOpen(false)} /></div>}</div>

          <section id="overview" className="scroll-mt-28 space-y-6"><SectionHeader eyebrow="Product model" title="Repository intelligence flow">Summarize gives an immediate overview of an accessible repository. Prepare indexes public repository content into retrieval-ready chunks. Ask retrieves relevant prepared context and returns an answer with source evidence when matches are available.</SectionHeader><div className="grid gap-3 sm:grid-cols-3">{[["01", "Summarize", "Inspect structure, purpose, and key components immediately."], ["02", "Prepare", "Create or restore a durable completed preparation job for a public repository."], ["03", "Ask", "Query the prepared public repository and inspect associated evidence."]].map(([number, title, text]) => <CommandPanel key={title} className="space-y-2 p-4"><span className="dandi-type-metadata text-emerald-300">{number}</span><h3 className="font-bold text-slate-100">{title}</h3><p className="text-xs leading-5 text-slate-400">{text}</p></CommandPanel>)}</div><p className="max-w-3xl text-sm leading-7 text-slate-400"><strong className="font-semibold text-slate-200">Preparation enables Ask; it is not required for Summary.</strong> Summary does not automatically prepare a repository.</p></section>

          <section id="quickstart" className="scroll-mt-28 space-y-6"><SectionHeader eyebrow="First request" title="Quickstart">1. Create or select an API key in Workspace Settings → API access. 2. Choose a public GitHub repository URL. 3. Send this Summary request. 4. Inspect the streamed response and metadata. 5. Open the same workflow in Playground.</SectionHeader><CodeExample title="summary-request" language="curl" value={summaryRequest} /><Link href="/playground?mode=summary" className="inline-flex rounded-lg border border-cyan-300/20 bg-cyan-300/[0.06] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-cyan-100 transition hover:border-cyan-300/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70">Open Summarize in Playground →</Link></section>

          <section id="authentication" className="scroll-mt-28 space-y-6"><SectionHeader eyebrow="Authentication" title="Send your API key with every request">All documented endpoints accept JSON requests and require <code className="rounded border border-white/10 bg-slate-950 px-1.5 py-0.5 font-mono text-xs text-slate-200">x-api-key: YOUR_API_KEY</code>. Keep keys server-side; never place a live key in browser code or a public repository.</SectionHeader><ParameterTable label="Required request headers"><thead><tr><th>Header</th><th>Required</th><th>Value</th></tr></thead><tbody><tr><td><code className="text-cyan-200">Content-Type</code></td><td><strong className="text-rose-200">Yes</strong></td><td><code>application/json</code></td></tr><tr><td><code className="text-cyan-200">x-api-key</code></td><td><strong className="text-rose-200">Yes</strong></td><td>Your Dandi API key</td></tr></tbody></ParameterTable><div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.05] p-4 text-sm leading-6 text-slate-400"><p className="dandi-type-metadata text-amber-200">Repository access</p><p className="mt-2">Summary, Prepare, and Ask currently support public GitHub repositories only. A connected GitHub App is display-only integration metadata and does not authorize private repository reads.</p></div></section>

          <section id="summarize" className="scroll-mt-28 space-y-6"><EndpointHeader title="Repository Summary" path="/api/github-summarizer" playgroundHref="/playground?mode=summary" playgroundLabel="Open Summarize in Playground">Generate a README-grounded overview of a public repository&apos;s documented purpose, features, setup, and architecture when supported by the README. GitHub metadata is attached separately. This endpoint does not prepare the repository for later questions.</EndpointHeader><div className="grid gap-6 xl:grid-cols-2"><div className="min-w-0 space-y-4"><h3 className="dandi-type-metadata text-slate-500">Request body</h3><ParameterTable label="Repository Summary request parameters"><thead><tr><th>Parameter</th><th>Required</th><th>Description</th></tr></thead><tbody><tr><td><code className="text-cyan-200">githubUrl</code></td><td><strong className="text-rose-200">Yes</strong></td><td>Full public GitHub repository URL, such as <code>https://github.com/owner/repo</code>.</td></tr></tbody></ParameterTable></div><div className="min-w-0 space-y-3"><h3 className="dandi-type-metadata text-slate-500">Important behavior</h3><p className="text-sm leading-7 text-slate-400">The successful body is a streamed structured summary based on README evidence. Repository metadata is supplied in the <code className="text-cyan-200">x-github-metadata</code> response header as base64-encoded JSON.</p><p className="text-sm leading-7 text-slate-400">Invalid URLs return 400; unavailable or private repositories can return 404, 403, or 422 depending on visibility and metadata retrieval.</p></div></div><CodeExample title="repository-summary-request" language="curl" value={summaryRequest} /></section>

          <section id="prepare" className="scroll-mt-28 space-y-6"><EndpointHeader title="Prepare repository" path="/api/rag/ingest" playgroundHref="/playground?mode=ask" playgroundLabel="Open Prepare & Ask in Playground">Index a public repository into retrieval-ready chunks. Prepare is required before asking source-backed questions; completed jobs may be restored rather than indexed again. Private repository preparation is not supported.</EndpointHeader><ParameterTable label="Prepare repository request parameters"><thead><tr><th>Parameter</th><th>Required</th><th>Description</th></tr></thead><tbody><tr><td><code className="text-cyan-200">githubUrl</code></td><td><strong className="text-rose-200">Yes</strong></td><td>Full public GitHub repository URL.</td></tr></tbody></ParameterTable><div className="grid gap-5 xl:grid-cols-2"><CodeExample title="prepare-repository-request" language="curl" value={prepareRequest} /><CodeExample title="prepare-repository-response" language="json" tone="emerald" value={prepareResponse} /></div><p className="text-sm leading-7 text-slate-400">Use <code className="text-cyan-200">GET /api/rag/ingest?jobId=JOB_ID</code> with the same API key to inspect a job. A completed job includes its status, current step, and available preparation summary such as file and chunk counts when returned.</p></section>

          <section id="ask" className="scroll-mt-28 space-y-6"><EndpointHeader title="Ask a repository" path="/api/rag/chat" playgroundHref="/playground?mode=ask" playgroundLabel="Open Prepare & Ask in Playground">Retrieve relevant prepared public-repository context and generate a streamed answer. The response can attach source evidence for the matched repository content. Private repository chat is not supported.</EndpointHeader><ParameterTable label="Ask a repository request parameters"><thead><tr><th>Parameter</th><th>Required</th><th>Description</th></tr></thead><tbody><tr><td><code className="text-cyan-200">githubUrl</code></td><td><strong className="text-rose-200">Yes</strong></td><td>The prepared public GitHub repository URL.</td></tr><tr><td><code className="text-cyan-200">messages</code></td><td><strong className="text-rose-200">Yes</strong></td><td>Message objects with <code>role</code> (<code>user</code> or <code>assistant</code>) and <code>content</code> strings.</td></tr></tbody></ParameterTable><CodeExample title="ask-repository-request" language="curl" tone="violet" value={askRequest} /><div className="rounded-xl border border-violet-300/20 bg-violet-300/[0.05] p-4 text-sm leading-7 text-slate-400"><p className="dandi-type-metadata text-violet-200">Evidence, not hidden reasoning</p><p className="mt-2">Answers stream in the response body. The optional <code>x-rag-sources</code> header describes retrieved repository evidence; it is context associated with the prepared repository, not chain-of-thought or a promise of an exact source count.</p></div></section>

          <section id="responses" className="scroll-mt-28 space-y-6"><SectionHeader eyebrow="Reference" title="Responses and source evidence">Summary and Ask return streaming text. Prepare returns JSON. Read headers alongside streams when you need repository metadata or the evidence that was retrieved for an answer.</SectionHeader><div className="grid gap-5 xl:grid-cols-2"><CodeExample title="source-evidence-header" language="http" tone="violet" value={sourcesResponse} /><CommandPanel className="space-y-4 p-5"><div><p className="dandi-type-metadata text-emerald-300/75">Evidence fields</p><h3 className="mt-2 font-bold text-white">How to use sources</h3></div><ul className="space-y-3 text-sm leading-6 text-slate-400"><li><code className="text-violet-200">filePath</code> identifies the matching repository file.</li><li><code className="text-violet-200">preview</code> is a short excerpt and may be absent.</li><li><code className="text-violet-200">similarity</code> is retrieval metadata, not a confidence guarantee.</li><li><code className="text-violet-200">chunkId</code> is a technical identifier for the matched chunk.</li></ul></CommandPanel></div><p className="text-sm leading-7 text-slate-400">If no relevant evidence is returned, verify that the repository was prepared, refine the question, and retry only when appropriate. An empty source list does not expose internal model reasoning.</p></section>

          <section id="errors" className="scroll-mt-28 space-y-6"><SectionHeader eyebrow="Recovery guide" title="Errors and recovery">Errors use status codes and safe messages. Check the request, access, and limits before retrying; retries are not guaranteed to succeed.</SectionHeader><div className="grid gap-3">{[["400", "Invalid repository URL or request", "Use a full GitHub repository URL and valid message payload. Correct the input before retrying."], ["401", "Missing or invalid API key", "Send x-api-key and verify the key is active. Create or select a valid key before retrying."], ["403 / 404", "Repository access or request allowance", "Summary, Prepare, and Ask require a public repository. Also check your plan allowance and repository URL."], ["422", "Repository metadata failure", "The repository could not be fetched or interpreted. Verify availability and retry later if the repository is temporarily unavailable."], ["429", "Request limit exceeded", "Wait before retrying. Summary, Prepare, and Ask have endpoint-specific limits."], ["503", "Repository verification or retrieval unavailable", "Dandi could not safely verify public access or retrieve prepared evidence. Wait briefly and retry without changing repository permissions."], ["500", "Summary, ingestion, or chat failure", "Retry only after checking the request. If it persists, use the safe error message when contacting support."]].map(([status, title, recovery]) => <CommandPanel key={status} className="grid gap-3 p-4 sm:grid-cols-[5rem_minmax(0,1fr)]"><div><span className="inline-flex rounded border border-rose-300/20 bg-rose-300/[0.06] px-2 py-1 font-mono text-xs font-bold text-rose-200">{status}</span></div><div><h3 className="font-bold text-slate-100">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-400">{recovery}</p></div></CommandPanel>)}</div></section>
        </div>
      </div>
    </ContentRoot>
  </>;

  if (initialSession) {
    const plan = (initialSession.user.user_metadata as { plan?: string } | undefined)?.plan || "Hobby";
    return (
      <DashboardShell
        variant="dashboard"
        sidebar={{ totalUsage: null, plan, limit: null, alerts: [] }}
      >
        {docsWorkspace}
      </DashboardShell>
    );
  }

  return <div className="min-h-screen bg-[#05070b] font-sans text-slate-200 selection:bg-emerald-500/20 selection:text-emerald-100">
    <a href="#docs-content" className="sr-only z-[1000] rounded bg-emerald-200 px-3 py-2 text-sm font-bold text-slate-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to documentation</a>
    <Navbar session={initialSession} />
    {docsWorkspace}
    <Footer />
  </div>;
}
