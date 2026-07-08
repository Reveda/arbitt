import type { FeatureItem } from "@/features/landing/types";
import { RevealOnScroll } from "@/components/common/RevealOnScroll";
import { useLandingCardSelection } from "@/features/landing/context/LandingCardSelectionContext";

type FeaturesSectionProps = {
  features: FeatureItem[];
};

export function FeaturesSection({ features }: FeaturesSectionProps) {
  const { activeCardKey, setActiveCardKey } = useLandingCardSelection();

  return (
    <section className="rounded-2xl border border-blue-400/25 bg-[#040d25]/85 p-4 sm:p-6" id="features">
      <h2 className="section-title-premium text-2xl font-bold">Our Premium Features</h2>
      <p className="mt-2 text-sm text-slate-300">Core platform strengths designed for secure referral operations.</p>
      <div className="mt-4 grid gap-2.5 sm:mt-5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
        {features.map((item, idx) => {
          const Icon = item.icon;
          const cardKey = `feature-${item.title}`;
          const isSelected = activeCardKey === cardKey;
          return (
            <RevealOnScroll className="h-full" delayMs={idx * 40} key={item.title}>
              <button
                className={`glass-card hover-lift landing-selectable-card h-full rounded-lg p-4 text-left${isSelected ? " is-selected" : ""}`}
                type="button"
                onClick={() => setActiveCardKey(cardKey)}
                aria-pressed={isSelected}
              >
                <span className="inline-flex size-9 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-400/8">
                  <Icon className="size-[1.1rem] text-cyan-300" />
                </span>
                <p className="mt-3 text-sm font-semibold">{item.title}</p>
              </button>
            </RevealOnScroll>
          );
        })}
      </div>
    </section>
  );
}
