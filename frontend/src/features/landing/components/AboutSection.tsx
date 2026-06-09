import type { AboutHighlight } from "@/features/landing/types";
import { RevealOnScroll } from "@/components/common/RevealOnScroll";

type AboutSectionProps = {
  highlights: AboutHighlight[];
};

export function AboutSection({ highlights }: AboutSectionProps) {
  return (
    <section className="grid gap-4 md:gap-5" id="about">
      <article className="rounded-2xl border border-blue-400/25 bg-[#040d25]/85 p-4 sm:p-6">
        <h2 className="section-title-premium text-2xl font-bold">About Arbitrum</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          Arbitrum is a decentralized earning platform built to provide structured growth through referral
          networks, secure wallet operations, and transparent financial tracking.
        </p>
        <div className="mt-4 grid gap-2.5 sm:mt-5 sm:grid-cols-2 sm:gap-3">
          {highlights.map((item, idx) => (
            <RevealOnScroll className="h-full" delayMs={idx * 45} key={item.title}>
              <div className="glass-card hover-lift h-full rounded-lg p-3">
                <p className="text-sm font-semibold text-cyan-200">{item.title}</p>
                <p className="mt-1 text-xs text-slate-400">{item.description}</p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </article>
    </section>
  );
}
