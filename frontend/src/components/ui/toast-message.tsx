/**
 * Bridge wrapper: delegates all toast rendering to react-hot-toast.
 * Keeps the existing ToastMessageValue type so all pages compile without changes.
 */
import { useEffect, useRef } from "react";
import toast from "react-hot-toast";

export type ToastMessageValue = {
  text: string;
  tone: "error" | "info" | "success";
};

type ToastMessageProps = {
  message: ToastMessageValue | null;
  onClose: () => void;
  durationMs?: number;
};

export function ToastMessage({ message, onClose }: ToastMessageProps) {
  const lastFired = useRef<string | null>(null);

  useEffect(() => {
    if (!message) {
      lastFired.current = null;
      return;
    }

    // Prevent duplicate fire for the same message
    const key = `${message.tone}:${message.text}`;
    if (lastFired.current === key) return;
    lastFired.current = key;

    switch (message.tone) {
      case "success":
        toast.success(message.text);
        break;
      case "error":
        toast.error(message.text);
        break;
      default:
        toast(message.text);
        break;
    }

    // Defer onClose to next tick to avoid React state update during render
    const timerId = window.setTimeout(onClose, 50);
    return () => window.clearTimeout(timerId);
  }, [message, onClose]);

  // All rendering is handled by <Toaster /> in main.tsx
  return null;
}
