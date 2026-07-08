import { useCallback, useEffect, useRef } from "react";
import { ArrowDownToLine, ArrowUpFromLine, BarChart3, Gift, ShieldCheck, Users } from "lucide-react";
import { useLandingCardSelection } from "@/features/landing/context/LandingCardSelectionContext";

const dashboardCards = [
  {
    title: "Wallet Balance",
    value: "1.24M USDT",
    hint: "Live platform wallet overview",
    icon: BarChart3,
  },
  {
    title: "Total Team",
    value: "320+ Members",
    hint: "Growing referral network",
    icon: Users,
  },
  {
    title: "Total Earnings",
    value: "6.8M USDT",
    hint: "Accumulated platform earnings",
    icon: Gift,
  },
  {
    title: "Total Users",
    value: "25K+",
    hint: "Platform overview",
    icon: ArrowDownToLine,
  },
  {
    title: "Total Deposits",
    value: "$4.2M+",
    hint: "USDT volume",
    icon: ArrowUpFromLine,
  },
  {
    title: "Total Payouts",
    value: "$2.8M+",
    hint: "USDT distributed",
    icon: ShieldCheck,
  },
];

const loopCards = [...dashboardCards, ...dashboardCards];

export function DashboardMarqueeSection() {
  const listRef = useRef<HTMLDivElement | null>(null);
  const { activeCardKey, setActiveCardKey } = useLandingCardSelection();

  const cardStep = useCallback(() => {
    const list = listRef.current;
    if (!list) {
      return 260;
    }
    const card = list.querySelector<HTMLElement>("[data-marquee-card='true']");
    const gap = 12;
    return (card?.offsetWidth ?? 248) + gap;
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const list = listRef.current;
      if (!list) {
        return;
      }

      const step = cardStep();
      const loopWidth = step * dashboardCards.length;
      if (loopWidth <= 0) {
        return;
      }

      // Keep scroll position in the first half so loop reset happens on identical cards.
      if (list.scrollLeft >= loopWidth) {
        list.scrollLeft -= loopWidth;
      }

      list.scrollTo({ left: list.scrollLeft + step, behavior: "smooth" });
    }, 2500);

    return () => window.clearInterval(intervalId);
  }, [cardStep]);

  return (
    <section className="rounded-2xl border border-blue-400/25 bg-[#040d25]/85 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-2.5">
        <h2 className="section-title-premium text-2xl font-bold">Dashboard Highlights</h2>
      </div>

      <div className="dashboard-marquee mt-4 sm:mt-5">
        <div className="dashboard-marquee-viewport" ref={listRef}>
          {loopCards.map((card, idx) => {
            const Icon = card.icon;
            const cardKey = `dashboard-${card.title}-${idx % dashboardCards.length}`;
            const isSelected = activeCardKey === cardKey;
            return (
              <button
                className={`dashboard-marquee-card landing-selectable-card${isSelected ? " is-selected" : ""}`}
                data-marquee-card="true"
                key={`${card.title}-${idx}`}
                type="button"
                onClick={() => setActiveCardKey(cardKey)}
                aria-pressed={isSelected}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-slate-400">{card.title}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-100">{card.value}</p>
                  </div>
                  <span className="inline-flex size-8 items-center justify-center rounded-md border border-cyan-300/30 bg-cyan-400/10">
                    <Icon className="size-4 text-cyan-200" />
                  </span>
                </div>
                <p className="mt-3 text-xs text-slate-400">{card.hint}</p>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
