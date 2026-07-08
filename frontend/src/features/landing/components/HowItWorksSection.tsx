import type { StepItem } from "@/features/landing/types";
import { RevealOnScroll } from "@/components/common/RevealOnScroll";
import howItWorksImage from "@/assets/how it works.png";
import { useLandingCardSelection } from "@/features/landing/context/LandingCardSelectionContext";

type HowItWorksSectionProps = {
  steps: StepItem[];
};

export function HowItWorksSection({ steps }: HowItWorksSectionProps) {
  const { activeCardKey, setActiveCardKey } = useLandingCardSelection();

  return (
    <section className="rounded-2xl border border-blue-400/25 bg-[#040d25]/85 p-4 sm:p-6" id="how-it-works">
      <h2 className="section-title-premium text-2xl font-bold">How It Works</h2>
      <p className="mt-2 text-sm text-slate-300">Simple onboarding flow to start and scale earnings.</p>

      <div className="mt-4 grid items-start gap-4 sm:mt-5 sm:gap-5 lg:grid-cols-[1.08fr_0.92fr] lg:gap-6">
        <div className="grid gap-2.5 sm:gap-3">
          {steps.map((step, idx) => (
            <RevealOnScroll className="h-full" delayMs={idx * 42} key={step.id}>
              <button
                className={`glass-card hover-lift landing-selectable-card h-full rounded-lg p-4 text-left${activeCardKey === `step-${step.id}` ? " is-selected" : ""}`}
                type="button"
                onClick={() => setActiveCardKey(`step-${step.id}`)}
                aria-pressed={activeCardKey === `step-${step.id}`}
              >
                <p className="text-lg font-bold text-cyan-200">{step.id}</p>
                <p className="mt-1 text-sm font-semibold">{step.title}</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{step.note}</p>
              </button>
            </RevealOnScroll>
          ))}
        </div>

        <RevealOnScroll delayMs={35}>
          <div className="relative overflow-hidden rounded-xl border border-cyan-300/25 bg-slate-950/60 p-1.5">
            <img
              alt="How it works visual"
              className="w-full rounded-lg object-contain"
              src={howItWorksImage}
            />
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}

