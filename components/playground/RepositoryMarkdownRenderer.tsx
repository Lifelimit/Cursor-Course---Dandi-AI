"use client";

import type { ReactNode } from "react";

type RepositoryMarkdownRendererProps = {
  content: string;
  onShowToast: (type: "success" | "error", message: string) => void;
};

type RepositoryInlineTextProps = {
  text: string;
};

const filePathPattern = /(?:^|[\s(["'])((?:\.\/)?(?:app|src|lib|components|hooks|types|tests|scripts|supabase|docs|public|pages|api|styles|utils|server|client)\/[A-Za-z0-9._@/+-]+\.[A-Za-z0-9]+)(?=$|[\s)\].,;:'"`])/g;

function renderFilePathChips(value: string, keyPrefix: string) {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = filePathPattern.exec(value)) !== null) {
    const fullMatch = match[0];
    const filePath = match[1];
    const prefixLength = fullMatch.length - filePath.length;
    const fileStart = match.index + prefixLength;

    if (fileStart > lastIndex) {
      nodes.push(value.slice(lastIndex, fileStart));
    }

    nodes.push(
      <span
        key={`${keyPrefix}-file-${fileStart}`}
        className="mx-0.5 inline-flex max-w-full items-center rounded-lg border border-emerald-300/20 bg-emerald-300/[0.08] px-1.5 py-0.5 align-baseline font-mono text-[0.82em] font-bold text-emerald-200"
      >
        {filePath}
      </span>
    );
    lastIndex = fileStart + filePath.length;
  }

  if (lastIndex < value.length) {
    nodes.push(value.slice(lastIndex));
  }

  filePathPattern.lastIndex = 0;
  return nodes;
}

function renderLinksAndFilePaths(value: string, keyPrefix: string) {
  const nodes: ReactNode[] = [];
  const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]+|#[^)\s]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(value)) !== null) {
    const [fullMatch, label, href] = match;

    if (match.index > lastIndex) {
      nodes.push(...renderFilePathChips(value.slice(lastIndex, match.index), `${keyPrefix}-text-${lastIndex}`));
    }

    const isExternal = href.startsWith("http");
    nodes.push(
      <a
        key={`${keyPrefix}-link-${match.index}`}
        href={href}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noreferrer" : undefined}
        className="font-bold text-emerald-200 underline decoration-emerald-300/30 underline-offset-4 transition-colors hover:text-emerald-100"
      >
        {renderFilePathChips(label, `${keyPrefix}-link-label-${match.index}`)}
      </a>
    );

    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex < value.length) {
    nodes.push(...renderFilePathChips(value.slice(lastIndex), `${keyPrefix}-text-${lastIndex}`));
  }

  return nodes;
}

export function RepositoryInlineText({ text }: RepositoryInlineTextProps) {
  if (!text) return null;
  const parts = text.split(/(`[^`]+`)/g);

  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={index} className="rounded-md border border-emerald-300/20 bg-emerald-300/[0.08] px-1.5 py-0.5 font-mono text-[0.86em] font-bold text-emerald-200">
          {part.slice(1, -1)}
        </code>
      );
    }
    return renderLinksAndFilePaths(part, `${index}`);
  });
}

function RenderLineText({ text }: RepositoryInlineTextProps) {
  if (!text) return null;
  const boldParts = text.split(/(\*\*.*?\*\*)/g);
  return boldParts.map((bp, bpIdx) => {
    if (bp.startsWith("**") && bp.endsWith("**")) {
      return (
        <strong key={bpIdx} className="font-bold text-slate-50">
          <RepositoryInlineText text={bp.slice(2, -2)} />
        </strong>
      );
    }
    return <RepositoryInlineText key={bpIdx} text={bp} />;
  });
}

const isMarkdownTableDivider = (line?: string) =>
  Boolean(line?.trim().match(/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/));

const splitMarkdownTableRow = (line: string) =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());

const stripFileContextMetadata = (text: string) =>
  text
    .replace(/^\s*\[File Context:[^\]]+\]\s*(?:\([^)]+\))?\s*[:,-]?\s*$/gim, "")
    .replace(/\s*\[File Context:[^\]]+\]\s*(?:\([^)]+\))?\s*/g, " ")
    .replace(/[ \t]+([,.;:])/g, "$1")
    .replace(/\n{3,}/g, "\n\n");

export function RepositoryMarkdownRenderer({ content, onShowToast }: RepositoryMarkdownRendererProps) {
  if (!content) return null;
  const parts = content.split(/(```[\s\S]*?```)/g);

  return parts.map((part, index) => {
    if (part.startsWith("```")) {
      const match = part.match(/```(\w*)\n([\s\S]*?)```/);
      const language = match ? match[1] : "";
      const code = match ? match[2] : part.slice(3, -3);

      return (
        <div key={index} className="my-7 overflow-hidden rounded-2xl border border-[var(--command-border)] bg-slate-950 font-mono text-xs text-slate-300 shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
          <div className="flex items-center justify-between border-b border-[var(--command-border)] bg-white/[0.03] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 select-none">
            <span>{language || "code"}</span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(code.trim());
                onShowToast("success", "Code snippet copied!");
              }}
              className="rounded-full border border-white/10 px-2 py-1 text-[9px] text-slate-400 transition-colors hover:border-emerald-300/30 hover:text-emerald-200"
            >
              Copy
            </button>
          </div>
          <pre className="overflow-x-auto p-4 leading-6"><code>{code.trim()}</code></pre>
        </div>
      );
    }

    const lines = stripFileContextMetadata(part).split("\n");
    const rendered: ReactNode[] = [];
    let lIdx = 0;

    while (lIdx < lines.length) {
      const line = lines[lIdx];
      const trimmedLine = line.trim();

      if (!trimmedLine) {
        rendered.push(<div key={`${index}-${lIdx}`} className="h-2" />);
        lIdx += 1;
        continue;
      }

      if (trimmedLine.includes("|") && isMarkdownTableDivider(lines[lIdx + 1])) {
        const headers = splitMarkdownTableRow(trimmedLine);
        const rows: string[][] = [];
        lIdx += 2;

        while (lIdx < lines.length) {
          const current = lines[lIdx].trim();
          if (!current || !current.includes("|")) break;
          rows.push(splitMarkdownTableRow(current));
          lIdx += 1;
        }

        rendered.push(
          <div key={`${index}-${lIdx}-table`} className="my-8 overflow-hidden rounded-2xl border border-[var(--command-border)] bg-slate-950/75 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left">
                <thead className="bg-emerald-300/[0.07]">
                  <tr>
                    {headers.map((header, headerIdx) => (
                      <th
                        key={headerIdx}
                        scope="col"
                        className="border-b border-emerald-300/15 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-100"
                      >
                        <RenderLineText text={header} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="border-t border-white/10 odd:bg-white/[0.015]">
                      {headers.map((_, cellIdx) => (
                        <td
                          key={cellIdx}
                          className="px-4 py-3 align-top text-[13px] font-medium leading-6 text-slate-300"
                        >
                          <RenderLineText text={row[cellIdx] ?? ""} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
        continue;
      }

      if (trimmedLine.startsWith("### ")) {
        rendered.push(
          <h4 key={`${index}-${lIdx}`} className="mt-9 mb-3 text-base font-black leading-snug text-slate-50">
            <RenderLineText text={trimmedLine.substring(4)} />
          </h4>
        );
        lIdx += 1;
        continue;
      }
      if (trimmedLine.startsWith("## ")) {
        rendered.push(
          <h3 key={`${index}-${lIdx}`} className="mt-10 mb-4 border-b border-emerald-300/10 pb-3 text-xl font-black leading-tight text-white">
            <RenderLineText text={trimmedLine.substring(3)} />
          </h3>
        );
        lIdx += 1;
        continue;
      }
      if (trimmedLine.startsWith("# ")) {
        rendered.push(
          <h2 key={`${index}-${lIdx}`} className="mt-10 mb-5 border-b border-emerald-300/12 pb-4 font-serif text-2xl font-bold leading-tight text-white">
            <RenderLineText text={trimmedLine.substring(2)} />
          </h2>
        );
        lIdx += 1;
        continue;
      }

      if (trimmedLine.startsWith("> ")) {
        const quoteLines: string[] = [];
        while (lIdx < lines.length && lines[lIdx].trim().startsWith("> ")) {
          quoteLines.push(lines[lIdx].trim().substring(2));
          lIdx += 1;
        }
        rendered.push(
          <blockquote key={`${index}-${lIdx}-quote`} className="my-7 border-l-2 border-emerald-300/45 bg-emerald-300/[0.04] px-5 py-4 text-sm font-semibold leading-7 text-slate-200">
            {quoteLines.map((quote, quoteIdx) => (
              <p key={quoteIdx}><RenderLineText text={quote} /></p>
            ))}
          </blockquote>
        );
        continue;
      }

      if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("* ")) {
        const items: string[] = [];
        while (lIdx < lines.length) {
          const current = lines[lIdx].trim();
          if (!(current.startsWith("- ") || current.startsWith("* "))) break;
          items.push(current.substring(2));
          lIdx += 1;
        }
        rendered.push(
          <ul key={`${index}-${lIdx}-ul`} className="my-7 space-y-3">
            {items.map((item, itemIdx) => (
              <li key={itemIdx} className="flex gap-3 text-[15px] leading-8 text-slate-200">
                <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.45)]" />
                <span><RenderLineText text={item} /></span>
              </li>
            ))}
          </ul>
        );
        continue;
      }

      const numListMatch = trimmedLine.match(/^(\d+)\.\s(.*)/);
      if (numListMatch) {
        const items: { number: string; text: string }[] = [];
        while (lIdx < lines.length) {
          const currentMatch = lines[lIdx].trim().match(/^(\d+)\.\s(.*)/);
          if (!currentMatch) break;
          items.push({ number: currentMatch[1], text: currentMatch[2] });
          lIdx += 1;
        }
        rendered.push(
          <ol key={`${index}-${lIdx}-ol`} className="my-7 space-y-3.5">
            {items.map((item, itemIdx) => (
              <li key={itemIdx} className="flex gap-3 text-[15px] leading-8 text-slate-200">
                <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-300/[0.08] text-[10px] font-black text-emerald-200">
                  {item.number}
                </span>
                <span><RenderLineText text={item.text} /></span>
              </li>
            ))}
          </ol>
        );
        continue;
      }

      rendered.push(
        <p key={`${index}-${lIdx}`} className="my-5 text-[15px] font-medium leading-8 text-slate-200 sm:text-base sm:leading-9">
          <RenderLineText text={line} />
        </p>
      );
      lIdx += 1;
    }

    return rendered;
  });
}
