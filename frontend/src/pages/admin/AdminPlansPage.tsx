import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Gift, Layers3, Network, Percent, ShoppingBag, WalletCards } from "lucide-react";
import { AdminCard, AdminPageHeader, MetricCard } from "./admin.components";
import {
  adminPlans as fallbackInvestmentTiers,
  levelIncomeRules as fallbackLevelIncomeRules,
  salaryRoyaltyRules as fallbackSalaryRoyaltyRules
} from "./admin.data";
import { cn } from "@/lib/utils";
import { adminService, type AdminPlanPurchaseRequest } from "@/services/admin.service";
import { planService, type PlanRuleSet } from "@/services/plan.service";

const POOL_UNIT = "ARB";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatPoolAmount(value: number) {
  return `${formatNumber(value)} ${POOL_UNIT}`;
}

function formatMonthly(value: number) {
  return `${formatNumber(value)} monthly`;
}

function formatRange(min: number, max: number, suffix = "") {
  return `${formatNumber(min)}${suffix} - ${formatNumber(max)}${suffix}`;
}

function formatWeeklyReturn(min: number, max: number) {
  return min === max ? `${formatNumber(min)}% weekly` : `${formatRange(min, max, "%")} weekly`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getUserName(request: AdminPlanPurchaseRequest) {
  return request.user?.username ?? "Unknown user";
}

export function AdminPlansPage() {
  const [ruleSet, setRuleSet] = useState<PlanRuleSet | null>(null);
  const [ruleSetError, setRuleSetError] = useState<string | null>(null);
  const [isRuleSetLoading, setIsRuleSetLoading] = useState(true);
  const [planPurchaseRequests, setPlanPurchaseRequests] = useState<AdminPlanPurchaseRequest[]>([]);
  const [isPlanPurchasesLoading, setIsPlanPurchasesLoading] = useState(true);
  const [planPurchaseError, setPlanPurchaseError] = useState<string | null>(null);
  const adminPlans = ruleSet?.investmentTiers ?? fallbackInvestmentTiers;
  const levelIncomeRules = ruleSet?.levelIncomeRules ?? fallbackLevelIncomeRules;
  const salaryRoyaltyRules = ruleSet?.salaryRoyaltyRules ?? fallbackSalaryRoyaltyRules;
  const terms = ruleSet?.terms ?? {
    withdrawalDay: "Weekly",
    settlementTime: "T+1",
    royaltyWithdrawal: "Monthly",
    levelIncomeCycle: "Once per sale and daily withdrawable"
  };
  const tierNameByCode = new Map(adminPlans.map((plan) => [plan.tier, plan.name]));
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

  const loadPlanPurchaseRequests = useCallback(async () => {
    setIsPlanPurchasesLoading(true);

    try {
      const response = await adminService.listPlanPurchases({
        page: 1,
        limit: 8,
        status: "completed",
      });

      setPlanPurchaseRequests(response.data.planPurchases);
      setPlanPurchaseError(null);
    } catch (caughtError) {
      setPlanPurchaseError(caughtError instanceof Error ? caughtError.message : "Unable to load plan purchase requests.");
    } finally {
      setIsPlanPurchasesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlanPurchaseRequests();
  }, [loadPlanPurchaseRequests]);

  const metrics = [
    { title: "Active Tiers", value: isRuleSetLoading ? "Loading..." : String(adminPlans.length), icon: Layers3, tone: "cyan" },
    { title: "Investment Range", value: `${formatPoolAmount(minEntry)} - ${formatPoolAmount(maxEntry)}`, icon: WalletCards, tone: "emerald" },
    { title: "Level Depth", value: `L1 - L${levelIncomeRules.length}`, icon: Network, tone: "violet" },
    { title: "Max Royalty", value: formatMonthly(maxSalary), icon: Gift, tone: "orange" },
    { title: "Weekly ROI", value: `${minReturn}% - ${maxReturn}%`, icon: Percent, tone: "pink" }
  ];

  return (
    <section className="space-y-3 sm:space-y-4">
      <AdminPageHeader
        description="Control finalized investment pools, level rewards, monthly royalty pools, and withdrawal terms."
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
                <th className="px-4 py-3 font-black">Range Weight</th>
                <th className="px-4 py-3 font-black">Status</th>
              </tr>
            </thead>
            <tbody>
              {adminPlans.map((plan) => {
                const weight = Math.max(10, Math.round((plan.maxUsdt / maxEntry) * 100));

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
                      <p className="text-xs font-semibold text-slate-500">to {formatPoolAmount(plan.maxUsdt)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-700">
                        {formatWeeklyReturn(plan.returnMinPercent, plan.returnMaxPercent)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-2.5 w-44 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            plan.maxUsdt === maxEntry
                              ? "bg-emerald-500"
                              : plan.maxUsdt >= 10000
                                ? "bg-cyan-600"
                                : "bg-sky-500"
                          )}
                          style={{ width: `${weight}%` }}
                        />
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

      <AdminCard>
        <div className="flex flex-col gap-2 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-black text-slate-950">Recent Plan Purchases</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Wallet-funded plan purchases activate automatically after the user buys a plan.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">
            <ShoppingBag className="size-3.5" />
            {planPurchaseRequests.length} active
          </span>
        </div>

        {planPurchaseError ? (
          <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
            {planPurchaseError}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase text-slate-500">
                <th className="px-4 py-3 font-black">User</th>
                <th className="px-4 py-3 font-black">Plan</th>
                <th className="px-4 py-3 font-black">Amount</th>
                <th className="px-4 py-3 font-black">Weekly ROI</th>
                <th className="px-4 py-3 font-black">Date</th>
                <th className="px-4 py-3 font-black">Status</th>
              </tr>
            </thead>
            <tbody>
              {isPlanPurchasesLoading ? (
                Array.from({ length: 3 }).map((_, rowIndex) => (
                  <tr className="border-b border-slate-100 last:border-0" key={rowIndex}>
                    {Array.from({ length: 6 }).map((__, cellIndex) => (
                      <td className="px-4 py-4" key={cellIndex}>
                        <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : planPurchaseRequests.length ? (
                planPurchaseRequests.map((request) => (
                  <tr className="border-b border-slate-100 last:border-0 hover:bg-cyan-50/30" key={request.id}>
                    <td className="px-4 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cyan-50 text-sm font-black uppercase text-cyan-700 ring-1 ring-cyan-100">
                          {getUserName(request).charAt(0)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-black text-slate-950">{getUserName(request)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-black text-slate-950">{request.planName || request.tier || "Investment Pool"}</p>
                      <p className="text-xs font-semibold text-slate-500">{request.tier ?? "POOL"}</p>
                    </td>
                    <td className="px-4 py-4 font-black text-slate-950">{formatPoolAmount(request.amountUsdt)}</td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                        {request.weeklyReturnPercent ?? 0}% weekly
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs font-semibold text-slate-500">
                      {formatDate(request.reviewedAt ?? request.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black capitalize text-emerald-700 ring-1 ring-emerald-100">
                        {request.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-10 text-center text-sm font-semibold text-slate-500" colSpan={6}>
                    No automatic plan purchases yet.
                  </td>
                </tr>
              )}
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
              <h2 className="text-base font-black text-slate-950">Royalty Pools</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">Direct pool requirement and monthly royalty amount.</p>
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
                  <th className="px-4 py-3 font-black">Royalty Pool</th>
                  <th className="px-4 py-3 font-black">Requirement</th>
                  <th className="px-4 py-3 font-black">Royalty</th>
                  <th className="px-4 py-3 font-black">Status</th>
                </tr>
              </thead>
              <tbody>
                {salaryRoyaltyRules.map((rule) => (
                  <tr className="border-b border-slate-100 last:border-0" key={rule.tier}>
                    <td className="px-4 py-4">
                      <span className="grid size-10 place-items-center rounded-xl border border-orange-100 bg-orange-50 text-sm font-black text-orange-800">
                        {rule.royaltyPool}
                      </span>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {tierNameByCode.get(rule.tier) ?? rule.tier}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-black text-slate-950">{rule.directRequired} direct</p>
                      <p className="text-xs font-semibold text-slate-500">
                        {rule.requiredDirectTier
                          ? `${tierNameByCode.get(rule.requiredDirectTier) ?? rule.requiredDirectTier} directs`
                          : "Any active directs"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                        {formatMonthly(rule.bonusUsdt)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                        {rule.status ?? "Active"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>
      </div>

      <AdminCard>
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <div className="rounded-xl border border-cyan-100 bg-cyan-50/70 p-4">
            <p className="text-xs font-black uppercase text-cyan-700">ROI Withdrawal</p>
            <p className="mt-1 text-sm font-black text-slate-950">{terms.withdrawalDay} withdrawable</p>
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
