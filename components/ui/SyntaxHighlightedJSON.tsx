import React, { useMemo } from "react";

// Custom interactive JSON syntax highlighter with line numbers
function SyntaxHighlightedJSONComponent({ data }: { data: unknown }) {
  const highlightedLines = useMemo(() => {
    if (data === null || data === undefined) {
      return null;
    }

    const jsonString = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    const tokenRegex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g;

    return jsonString.split("\n").map((line, lineIdx) => {
      let lastIndex = 0;
      const lineElements: React.ReactNode[] = [];
      let match;

      tokenRegex.lastIndex = 0;

      while ((match = tokenRegex.exec(line)) !== null) {
        const matchStr = match[0];
        const matchIndex = match.index;

        if (matchIndex > lastIndex) {
          lineElements.push(line.substring(lastIndex, matchIndex));
        }

        if (/^"/.test(matchStr)) {
          if (/:$/.test(matchStr)) {
            lineElements.push(
              <span key={matchIndex} className="text-indigo-400 font-medium">
                {matchStr.slice(0, -1)}
              </span>
            );
            lineElements.push(<span key={`${matchIndex}-colon`} className="text-zinc-500">:</span>);
          } else {
            lineElements.push(
              <span key={matchIndex} className="text-emerald-400">
                {matchStr}
              </span>
            );
          }
        } else if (/^(true|false)$/.test(matchStr)) {
          lineElements.push(
            <span key={matchIndex} className="text-amber-500 font-semibold">
              {matchStr}
            </span>
          );
        } else if (/^null$/.test(matchStr)) {
          lineElements.push(
            <span key={matchIndex} className="text-rose-500 font-semibold italic">
              {matchStr}
            </span>
          );
        } else {
          lineElements.push(
            <span key={matchIndex} className="text-purple-400 font-medium">
              {matchStr}
            </span>
          );
        }

        lastIndex = tokenRegex.lastIndex;
      }

      if (lastIndex < line.length) {
        lineElements.push(line.substring(lastIndex));
      }

      return (
        <div key={lineIdx} className="hover:bg-white/5 px-2 py-0.5 rounded transition-colors flex items-center">
          <span className="w-6 shrink-0 text-[8px] font-mono text-zinc-600 select-none text-right pr-2">
            {lineIdx + 1}
          </span>
          <span className="flex-1 whitespace-pre">{lineElements.length > 0 ? lineElements : line}</span>
        </div>
      );
    });
  }, [data]);

  if (data === null || data === undefined) {
    return <span className="text-zinc-500 font-mono text-[10px]">null</span>;
  }

  return (
    <pre className="font-mono text-[10px] leading-relaxed text-zinc-300 overflow-x-auto max-w-full">
      <code>{highlightedLines}</code>
    </pre>
  );
}

export const SyntaxHighlightedJSON = React.memo(SyntaxHighlightedJSONComponent);
