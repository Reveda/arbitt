import { useEffect } from "react";
import { CheckCircle2, Percent, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastMessageValue = {
  text: string;
  tone: "error" | "info" | "success";
};

type ToastMessageProps = {
  message: ToastMessageValue | null;
  onClose: () => void;
  durationMs?: number;
};

export function ToastMessage({
  durationMs = 4500,
  message,
  onClose,
}: ToastMessageProps) {
  useEffect(() => {
    if (!message) {
      return undefined;
    }

    const timerId = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(timerId);
  }, [durationMs, message, onClose]);

  if (!message) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed right-4 top-4 z-[60] flex w-[min(26rem,calc(100vw-2rem))] items-start gap-3 rounded-2xl border bg-white p-4 text-sm font-semibold shadow-[0_18px_50px_rgba(15,23,42,0.18)]",
        message.tone === "success" && "border-emerald-200 text-emerald-800",
        message.tone === "info" && "border-cyan-200 text-cyan-800",
        message.tone === "error" && "border-rose-200 text-rose-700",
      )}
      role={message.tone === "error" ? "alert" : "status"}
    >
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-xl",
          message.tone === "success" && "bg-emerald-50 text-emerald-700",
          message.tone === "info" && "bg-cyan-50 text-cyan-700",
          message.tone === "error" && "bg-rose-50 text-rose-600",
        )}
      >
        {message.tone === "success" ? (
          <CheckCircle2 className="size-4" />
        ) : message.tone === "info" ? (
          <Percent className="size-4" />
        ) : (
          <XCircle className="size-4" />
        )}
      </span>
      <p className="min-w-0 flex-1 leading-relaxed">{message.text}</p>
      <button
        aria-label="Close notification"
        className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
        onClick={onClose}
        type="button"
      >
        <XCircle className="size-4" />
      </button>
    </div>
  );
}
