import { useEffect, useState } from "react";

export function LandingScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const viewport = window.innerHeight;
      const totalHeight = document.documentElement.scrollHeight - viewport;
      if (totalHeight <= 0) {
        setProgress(0);
        return;
      }
      const next = Math.min(Math.max((scrollTop / totalHeight) * 100, 0), 100);
      setProgress(next);
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[4.35rem] z-40 h-[2px] bg-slate-800/40 lg:top-[4.55rem]">
      <div
        className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.6)] transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
