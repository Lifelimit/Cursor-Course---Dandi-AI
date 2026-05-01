"use client";

type JsonViewerProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
};

export function JsonViewer({ data }: JsonViewerProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-50/50 shadow-sm">
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Raw JSON Response</span>
        <div className="flex gap-1.5">
          <div className="h-2 w-2 rounded-full bg-zinc-200" />
          <div className="h-2 w-2 rounded-full bg-zinc-200" />
          <div className="h-2 w-2 rounded-full bg-zinc-200" />
        </div>
      </div>
      <div className="p-8">
        <pre className="scrollbar-hide overflow-x-auto font-mono text-xs leading-relaxed text-zinc-600">
          <code>{JSON.stringify(data, null, 2)}</code>
        </pre>
      </div>
    </div>
  );
}
