import type { StepItem } from "@/features/landing/types";
import { RevealOnScroll } from "@/components/common/RevealOnScroll";
import howItWorksGeneratedImage from "@/assets/how-it-works-generated.png";
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

      <div className="mt-4 grid items-start gap-4 sm:mt-5 sm:gap-5 lg:grid-cols-[1.08fr_0.92fr] lg:gap-5">
        <div className="grid gap-2 sm:gap-2.5 lg:h-[280px] lg:grid-cols-2 lg:grid-rows-2">
          {steps.map((step, idx) => (
            <RevealOnScroll className="h-full" delayMs={idx * 42} key={step.id}>
              <button
                className={`glass-card hover-lift landing-selectable-card h-full rounded-lg p-3 text-left sm:p-3.5${activeCardKey === `step-${step.id}` ? " is-selected" : ""}`}
                type="button"
                onClick={() => setActiveCardKey(`step-${step.id}`)}
                aria-pressed={activeCardKey === `step-${step.id}`}
              >
                <p className="text-base font-bold text-cyan-200">{step.id}</p>
                <p className="mt-0.5 text-sm font-semibold">{step.title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{step.note}</p>
              </button>
            </RevealOnScroll>
          ))}
        </div>

        <RevealOnScroll className="how-it-works-reveal w-full self-start" delayMs={35}>
          <div className="how-it-works-visual relative w-full overflow-hidden rounded-xl border border-cyan-300/25 bg-slate-950/60">
            <img
              alt="Visual overview of the platform onboarding, deposit, growth, and withdrawal flow"
              className="block h-full w-full object-contain"
              src={howItWorksGeneratedImage}
            />
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full"
              preserveAspectRatio="none"
              viewBox="0 0 1000 560"
            >
              <path
                className="how-it-works-flow-glow"
                d="M24 382 C120 382 126 330 222 382 S322 430 420 382 S520 330 620 382 S720 430 818 382 S900 342 976 382"
                pathLength="1"
              />
              <path
                className="how-it-works-flow-path"
                d="M24 382 C120 382 126 330 222 382 S322 430 420 382 S520 330 620 382 S720 430 818 382 S900 342 976 382"
                pathLength="1"
              />
              <circle className="how-it-works-flow-node how-it-works-flow-node-1" cx="150" cy="382" r="9" />
              <circle className="how-it-works-flow-node how-it-works-flow-node-2" cx="390" cy="382" r="9" />
              <circle className="how-it-works-flow-node how-it-works-flow-node-3" cx="625" cy="382" r="9" />
              <circle className="how-it-works-flow-node how-it-works-flow-node-4" cx="850" cy="382" r="9" />
            </svg>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}

