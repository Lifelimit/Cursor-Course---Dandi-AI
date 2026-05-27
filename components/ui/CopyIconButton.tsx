import React from "react";
import { CopyIcon } from "@/components/icons";

type CopyIconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: React.ReactNode;
  textToCopy?: string;
  onCopy?: () => void;
};

export function CopyIconButton({ children, textToCopy, onCopy, className = "", ...props }: CopyIconButtonProps) {
  return (
    <button
      onClick={(e) => {
        if (onCopy) onCopy();
        if (textToCopy) navigator.clipboard.writeText(textToCopy);
      }}
      className={`group flex items-center gap-2 rounded-xl bg-zinc-800/40 hover:bg-zinc-700/60 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-all active:scale-95 ${className}`}
      {...props}
    >
      {children || "Copy"}
      <CopyIcon className="h-3 w-3" />
    </button>
  );
}
