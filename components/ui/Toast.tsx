import { ToastState } from "../../hooks/useToast";

export function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60]">
      <div
        className={`rounded-full px-4 py-2 text-sm shadow-lg ${
          toast.type === "success" ? "bg-zinc-900 text-white" : "bg-red-600 text-white"
        }`}
      >
        {toast.message}
      </div>
    </div>
  );
}
