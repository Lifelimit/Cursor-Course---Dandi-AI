"use client";

import { CodeWindow } from "@/components/command";

type JsonViewerProps = {
  data: unknown;
};

export function JsonViewer({ data }: JsonViewerProps) {
  return (
    <CodeWindow
      title="response-inspector"
      language="json"
      maxHeight="28rem"
      className="border-cyan-300/15"
    >
      <pre className="min-w-max p-5 font-mono text-xs leading-relaxed text-slate-300 sm:p-6">
        <code>{JSON.stringify(data, null, 2)}</code>
      </pre>
    </CodeWindow>
  );
}
