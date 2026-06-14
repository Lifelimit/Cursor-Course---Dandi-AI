import React from "react";
import { CopyIcon } from "@/components/icons";
import { Button } from "@/components/ui/PrimaryButton";

type CopyIconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: React.ReactNode;
  textToCopy?: string;
  onCopy?: () => void;
};

export function CopyIconButton({ children, textToCopy, onCopy, className = "", ...props }: CopyIconButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => {
        if (onCopy) onCopy();
        if (textToCopy) navigator.clipboard.writeText(textToCopy);
      }}
      className={className}
      {...props}
    >
      {children || "Copy"}
      <CopyIcon className="h-3 w-3" />
    </Button>
  );
}
