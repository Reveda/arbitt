import type { FeatureItem } from "@/features/landing/types";
import { RevealOnScroll } from "@/components/common/RevealOnScroll";

type FeaturesSectionProps = {
  features: FeatureItem[];
};

export function FeaturesSection({ features }: FeaturesSectionProps) {
  return (
    <section className="rounded-2xl border border-blue-400/25 bg-[#040d25]/85 p-4 sm:p-6" id="features">
      <h2 className="section-title-premium text-2xl font-bold">Our Premium Features</h2>
      <p className="mt-2 text-sm text-slate-300">Core platform strengths designed for secure referral operations.</p>
      <div className="mt-4 grid gap-2.5 sm:mt-5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
        {features.map((item, idx) => {
          const Icon = item.icon;
          return (
            <RevealOnScroll className="h-full" delayMs={idx * 40} key={item.title}>
              <article className="glass-card hover-lift h-full rounded-lg p-4">
                <span className="inline-flex size-9 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-400/8">
                  <Icon className="size-[1.1rem] text-cyan-300" />
                </span>
                <p className="mt-3 text-sm font-semibold">{item.title}</p>
              </article>
            </RevealOnScroll>
          );
        })}
      </div>
    </section>
  );
}
