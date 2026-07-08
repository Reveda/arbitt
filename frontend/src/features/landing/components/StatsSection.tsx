import { useEffect, useRef } from "react";
import type { LandingStat } from "@/features/landing/types";
import { RevealOnScroll } from "@/components/common/RevealOnScroll";
import { useLandingCardSelection } from "@/features/landing/context/LandingCardSelectionContext";

interface StatsSectionProps {
  stats: LandingStat[];
}

export function StatsSection({ stats }: StatsSectionProps) {
  const { activeCardKey, setActiveCardKey } = useLandingCardSelection();

  return (
    <section className="grid gap-4 sm:gap-6 md:gap-8" id="stats">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {stats.map((item, idx) => (
          <RevealOnScroll className="h-full" delayMs={idx * 50} key={item.label}>
            <button
              className={`glass-card hover-lift landing-selectable-card flex h-full flex-col justify-between rounded-xl p-4 text-left md:p-5${activeCardKey === `stat-${item.label}` ? " is-selected" : ""}`}
              type="button"
              onClick={() => setActiveCardKey(`stat-${item.label}`)}
              aria-pressed={activeCardKey === `stat-${item.label}`}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 sm:text-xs">
                {item.label}
              </span>
              <div className="metric-value-premium mt-3 text-2xl font-extrabold text-cyan-300 sm:text-3xl md:text-4xl">
                <AnimatedCounter value={item.value} />
              </div>
            </button>
          </RevealOnScroll>
        ))}
      </div>
    </section>
  );
}

interface AnimatedCounterProps {
  value: string;
  duration?: number;
  delay?: number; // delay in ms before counter start (to sync with reveal transition)
}

function AnimatedCounter({ value, duration = 1800, delay = 350 }: AnimatedCounterProps) {
  const elementRef = useRef<HTMLSpanElement>(null);

  // Parse value like "25K+", "$4.2M+", "99.6%"
  const match = value.match(/^([^0-9.]*)([0-9.]+)(.*)$/);

  if (!match) {
    return <span>{value}</span>;
  }

  const prefix = match[1];
  const target = parseFloat(match[2]);
  const suffix = match[3];

  const decimalIdx = match[2].indexOf(".");
  const decimals = decimalIdx === -1 ? 0 : match[2].length - decimalIdx - 1;

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    // Set initial layout
    el.innerText = `${prefix}0${suffix}`;

    let animationFrameId: number;
    let startTimestamp: number | null = null;

    const startAnimation = () => {
      const step = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const elapsed = timestamp - startTimestamp;

        if (elapsed < delay) {
          // Keep at zero during the fade-in delay
          el.innerText = `${prefix}0${suffix}`;
          animationFrameId = window.requestAnimationFrame(step);
          return;
        }

        const progress = Math.min((elapsed - delay) / duration, 1);

        // Easing: easeOutQuad
        const easeProgress = progress * (2 - progress);
        const currentCount = easeProgress * target;

        el.innerText = `${prefix}${currentCount.toFixed(decimals)}${suffix}`;

        if (progress < 1) {
          animationFrameId = window.requestAnimationFrame(step);
        }
      };
      animationFrameId = window.requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          startAnimation();
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [value, duration, delay, prefix, target, suffix, decimals]);

  return <span ref={elementRef} className="font-tabular-nums" />;
}
