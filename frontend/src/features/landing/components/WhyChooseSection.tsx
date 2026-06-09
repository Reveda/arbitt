import type { WhyChooseItem } from "@/features/landing/types";
import { RevealOnScroll } from "@/components/common/RevealOnScroll";

type WhyChooseSectionProps = {
  items: WhyChooseItem[];
};

export function WhyChooseSection({ items }: WhyChooseSectionProps) {
  return (
    <section className="grid gap-4 md:gap-5">
      <article className="rounded-2xl border border-blue-400/25 bg-[#040d25]/85 p-4 sm:p-6">
        <h2 className="section-title-premium text-2xl font-bold">Why Choose Arbitrum?</h2>
        <div className="mt-4 grid gap-2.5 sm:mt-5 sm:grid-cols-2 sm:gap-3">
          {items.map((item, idx) => {
            const Icon = item.icon;
            return (
              <RevealOnScroll className="h-full" delayMs={idx * 45} key={item.title}>
                <div className="glass-card hover-lift h-full rounded-lg p-4">
                  <Icon className="size-5 text-cyan-300" />
                  <p className="mt-3 text-sm font-semibold">{item.title}</p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">{item.description}</p>
                </div>
              </RevealOnScroll>
            );
          })}
        </div>
      </article>
    </section>
  );
}

