import { useEffect, useState } from "react";
import { CheckCircle2, Gift, Layers3, Network, Percent, WalletCards, ShoppingBag } from "lucide-react";
import { AdminCard, AdminPageHeader, MetricCard } from "./admin.components";
import {
  adminPlans as fallbackInvestmentTiers,
  levelIncomeRules as fallbackLevelIncomeRules,
  salaryRoyaltyRules as fallbackSalaryRoyaltyRules
} from "./admin.data";
import { planService, type PlanRuleSet, type InvestmentTierRule } from "@/services/plan.service";

const POOL_UNIT = "USDT";
const ROYALTY_REQUIREMENTS: Record<
  string,
  {
    detail: string;
    label: string;
    requirement: string;
  }
> = {
  M1: {
    detail: "10 directs must have active purchase & 50% single-leg cap",
    label: "M1",
    requirement: "10 active direct + 50000 team business",
  },
  M2: {
    detail: "2 M1 legs + 50% single-leg cap",
    label: "M2",
    requirement: "150000 team business",
  },
  M3: {
    detail: "2 M2 legs + 50% single-leg cap",
    label: "M3",
    requirement: "500000 team business",
  },
  M4: {
    detail: "2 M3 legs + 50% single-leg cap",
    label: "M4",
    requirement: "2000000 team business",
  },
  M5: {
    detail: "2 M4 legs + 50% single-leg cap",
    label: "M5",
    requirement: "5000000 team business",
  },
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { useGrouping: false }).format(value);
}

function formatPoolAmount(value: number) {
  return `${formatNumber(value)} ${POOL_UNIT}`;
}

function formatDaily(value: number) {
  return `${formatNumber(value)} daily`;
}

function formatRange(min: number, max: number, suffix = "") {
  return `${formatNumber(min)}${suffix} - ${formatNumber(max)}${suffix}`;
}

function formatWeeklyReturn(min: number, max: number) {
  return min === max ? `${formatNumber(min)}% weekly` : `${formatRange(min, max, "%")} weekly`;
}

export function AdminPlansPage() {
  const [ruleSet, setRuleSet] = useState<PlanRuleSet | null>(null);
  const [ruleSetError, setRuleSetError] = useState<string | null>(null);
  const [isRuleSetLoading, setIsRuleSetLoading] = useState(true);
  const adminPlans: InvestmentTierRule[] = ruleSet?.investmentTiers ?? fallbackInvestmentTiers;
  const levelIncomeRules = ruleSet?.levelIncomeRules ?? fallbackLevelIncomeRules;
  const salaryRoyaltyRules = ruleSet?.salaryRoyaltyRules ?? fallbackSalaryRoyaltyRules;
  const terms = ruleSet?.terms ?? {
    withdrawalDay: "Weekly",
    settlementTime: "T+1",
    royaltyWithdrawal: "Daily",
    levelIncomeCycle: "Once per sale and daily withdrawable"
  };
  const minEntry = Math.min(...adminPlans.map((plan) => plan.minUsdt));
  const maxEntry = Math.max(...adminPlans.map((plan) => plan.maxUsdt));
  const minReturn = Math.min(...adminPlans.map((plan) => plan.returnMinPercent));
  const maxReturn = Math.max(...adminPlans.map((plan) => plan.returnMaxPercent));
  const maxLevelPercent = Math.max(...levelIncomeRules.map((rule) => rule.percent));
  const maxSalary = Math.max(...salaryRoyaltyRules.map((rule) => rule.bonusUsdt));

  useEffect(() => {
    let active = true;

    planService
      .getRuleSet()
      .then((response) => {
        if (!active) {
          return;
        }

        setRuleSet(response.data.ruleSet);
        setRuleSetError(null);
      })
      .catch((caughtError) => {
        if (!active) {
          return;
        }

        setRuleSetError(caughtError instanceof Error ? caughtError.message : "Unable to load plan rules.");
      })
      .finally(() => {
        if (active) {
          setIsRuleSetLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const metrics = [
    { title: "ACTIVE TIERS", value: isRuleSetLoading ? "LOADING..." : String(adminPlans.length), icon: Layers3, tone: "cyan" },
    { title: "INVESTMENT RANGE", value: `${formatPoolAmount(minEntry)} - ${formatPoolAmount(maxEntry)}`, icon: WalletCards, tone: "emerald" },
    { title: "LEVEL DEPTH", value: `L1 - L${levelIncomeRules.length}`, icon: Network, tone: "violet" },
    { title: "MAX ROYALTY", value: formatDaily(maxSalary).toUpperCase(), icon: Gift, tone: "orange" },
    { title: "WEEKLY ROI", value: `${minReturn}% - ${maxReturn}%`, icon: Percent, tone: "pink" }
  ];

  return (
    <section className="space-y-3 sm:space-y-4">
      <AdminPageHeader
        description="Control finalized investment pools, level rewards, daily royalty club rates, and withdrawal terms."
        title="Plan Management"
      />

      {ruleSetError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
          {ruleSetError}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-5">
        {metrics.map((item) => (
          <MetricCard item={item} key={item.title} />
        ))}
      </div>

      <AdminCard>
        <div className="flex flex-col gap-2 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-black text-slate-950">Investment Pool Rules</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">Investment amount decides the active pool automatically.</p>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
            <CheckCircle2 className="size-3.5" />
            {adminPlans.length} active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase text-slate-500">
                <th className="px-4 py-3 font-black">Pool Name</th>
                <th className="px-4 py-3 font-black">Range ({POOL_UNIT})</th>
                <th className="px-4 py-3 font-black">Weekly ROI</th>
                <th className="px-4 py-3 font-black">Packages Sold</th>
                <th className="px-4 py-3 font-black">Status</th>
              </tr>
            </thead>
            <tbody>
              {adminPlans.map((plan) => {
                return (
                  <tr className="border-b border-slate-100 last:border-0" key={plan.tier}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid size-10 place-items-center rounded-xl border border-cyan-100 bg-cyan-50 text-sm font-black text-cyan-800">
                          {plan.name.charAt(0)}
                        </span>
                        <div>
                          <p className="font-black text-slate-950">{plan.name}</p>
                          <p className="text-xs font-semibold text-slate-500">{plan.tier}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-black text-slate-950">{formatPoolAmount(plan.minUsdt)}</p>
                      <p className="text-xs font-bold text-slate-500">
                        to <span className="font-black text-slate-950">{formatPoolAmount(plan.maxUsdt)}</span>
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-700">
                        {formatWeeklyReturn(plan.returnMinPercent, plan.returnMaxPercent)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50/70 border border-blue-100/50 px-2.5 py-1 text-xs font-black text-blue-700 shadow-sm">
                          <ShoppingBag className="size-3.5 text-blue-500" />
                          {plan.packagesSold ?? 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                        {plan.status ?? "Active"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </AdminCard>

      <div className="space-y-3 sm:space-y-4">
        <AdminCard>
          <div className="flex flex-col gap-2 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-black text-slate-950">Level Income Structure</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">Referral depth percentage rules.</p>
            </div>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">
              <Network className="size-3.5" />
              {levelIncomeRules.length} levels
            </span>
          </div>

          <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-5">
            {levelIncomeRules.map((rule) => {
              const weight = Math.max(8, Math.round((rule.percent / maxLevelPercent) * 100));

              return (
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3" key={rule.level}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-black text-slate-950">{rule.level}</span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-cyan-700">
                      {rule.percent}%
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full bg-cyan-600" style={{ width: `${weight}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </AdminCard>

        <AdminCard>
          <div className="flex flex-col gap-2 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-black text-slate-950">Royalty Club</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">M1-M5 qualification, team business, and daily income.</p>
            </div>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-700">
              <Gift className="size-3.5" />
              {salaryRoyaltyRules.length} rules
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase text-slate-500">
                  <th className="px-4 py-3 font-black">Club Level</th>
                  <th className="px-4 py-3 font-black">Qualification</th>
                  <th className="px-4 py-3 font-black">Daily Income</th>
                  <th className="px-4 py-3 font-black">Status</th>
                </tr>
              </thead>
              <tbody>
                {salaryRoyaltyRules.map((rule) => {
                  const royaltyRequirement = ROYALTY_REQUIREMENTS[rule.royaltyPool];

                  return (
                    <tr className="border-b border-slate-100 last:border-0" key={rule.royaltyPool}>
                      <td className="px-4 py-4">
                        <span className="grid size-10 place-items-center rounded-xl border border-orange-100 bg-orange-50 text-sm font-black text-orange-800">
                          {royaltyRequirement?.label ?? rule.royaltyPool}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-black text-slate-950">
                          {royaltyRequirement?.requirement ?? `${rule.directRequired} direct`}
                        </p>
                        <p className="text-xs font-semibold text-slate-500">
                          {royaltyRequirement?.detail ?? "Active team requirement"}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                          {formatDaily(rule.bonusUsdt)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                          {rule.status ?? "Active"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </AdminCard>
      </div>

      <AdminCard>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-cyan-100 bg-cyan-50/70 p-4">
            <p className="text-xs font-black uppercase text-cyan-700">ROI Withdrawal</p>
            <p className="mt-1 text-sm font-black text-slate-950">{terms.withdrawalDay} withdrawable</p>
          </div>
          <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-4">
            <p className="text-xs font-black uppercase text-rose-700">Withdrawal Charge</p>
            <p className="mt-1 text-sm font-black text-slate-950">10% Fee</p>
          </div>
          <div className="rounded-xl border border-violet-100 bg-violet-50/70 p-4">
            <p className="text-xs font-black uppercase text-violet-700">Settlement Time</p>
            <p className="mt-1 text-sm font-black text-slate-950">{terms.settlementTime}</p>
          </div>
          <div className="rounded-xl border border-orange-100 bg-orange-50/70 p-4">
            <p className="text-xs font-black uppercase text-orange-700">Royalty Withdrawal</p>
            <p className="mt-1 text-sm font-black text-slate-950">{terms.royaltyWithdrawal}</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
            <p className="text-xs font-black uppercase text-emerald-700">Level Income</p>
            <p className="mt-1 text-sm font-black text-slate-950">{terms.levelIncomeCycle}</p>
          </div>
        </div>
      </AdminCard>
    </section>
  );
}
