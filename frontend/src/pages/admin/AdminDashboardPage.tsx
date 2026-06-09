import { BadgeCheck, CalendarDays, HandCoins, Inbox, WalletCards } from "lucide-react";
import {
  AdminCard,
  AdminPageHeader,
  DepositWithdrawChart,
  MetricCard,
  RecentDeposits,
  UserGrowthChart
} from "./admin.components";
import { adminMetrics } from "./admin.data";
import { useAdminOverview } from "@/hooks/useAdminQueries";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatUsdt(value: number) {
  return `${formatNumber(Number(value.toFixed(2)))} USDT`;
}

export function AdminDashboardPage() {
  const overviewQuery = useAdminOverview();
  const metrics = adminMetrics.map((item) => {
    if (!overviewQuery.data) {
      return { ...item, value: overviewQuery.isLoading ? "Loading..." : "0" };
    }

    const metricValues: Record<string, string> = {
      "Total Users": formatNumber(overviewQuery.data.totalUsers),
      "Total Top-ups": formatUsdt(overviewQuery.data.totalDepositsUsdt),
      "Total Withdrawals": formatUsdt(overviewQuery.data.totalWithdrawalsUsdt),
      "Platform Earnings": formatUsdt(overviewQuery.data.platformEarningsUsdt),
      "Earnings Paid": formatUsdt(overviewQuery.data.earningsPaidUsdt)
    };

    return { ...item, value: metricValues[item.title] ?? item.value };
  });
  const depositOverview = overviewQuery.data?.depositOverview;
  const depositStats = [
    {
      title: "Today Top-up",
      value: overviewQuery.isLoading ? "Loading..." : formatUsdt(depositOverview?.todayApprovedUsdt ?? 0),
      detail: `${formatNumber(depositOverview?.todayApprovedCount ?? 0)} credited`,
      icon: CalendarDays,
      tone: "bg-cyan-50 text-cyan-700"
    },
    {
      title: "Monthly Top-up",
      value: overviewQuery.isLoading ? "Loading..." : formatUsdt(depositOverview?.monthApprovedUsdt ?? 0),
      detail: `${formatNumber(depositOverview?.monthApprovedCount ?? 0)} credited this month`,
      icon: WalletCards,
      tone: "bg-blue-50 text-blue-700"
    },
    {
      title: "Active Plans",
      value: overviewQuery.isLoading ? "Loading..." : formatNumber(overviewQuery.data?.activePlans ?? 0),
      detail: "Auto-activated purchases",
      icon: BadgeCheck,
      tone: "bg-emerald-50 text-emerald-700"
    },
    {
      title: "Total Top-up",
      value: overviewQuery.isLoading ? "Loading..." : formatUsdt(depositOverview?.totalApprovedUsdt ?? 0),
      detail: "Lifetime credited",
      icon: WalletCards,
      tone: "bg-emerald-50 text-emerald-700"
    }
  ];

  return (
    <section className="space-y-3 sm:space-y-4">
      <AdminPageHeader
        description="Quick command center for platform health, approvals, and operational visibility."
        title="Admin Dashboard"
      />

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-5">
        {metrics.map((item) => (
          <MetricCard item={item} key={item.title} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        {depositStats.map((item) => {
          const Icon = item.icon;

          return (
            <AdminCard className="rounded-xl" key={item.title}>
              <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-500">{item.title}</p>
                  <p className="mt-1 truncate text-sm font-black text-slate-950 sm:text-lg">{item.value}</p>
                  <p className="mt-1 truncate text-[10px] font-semibold text-slate-400 sm:text-[11px]">{item.detail}</p>
                </div>
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${item.tone}`}>
                  <Icon className="size-4" />
                </span>
              </div>
            </AdminCard>
          );
        })}
      </div>

      <div className="grid gap-3 sm:gap-4 xl:grid-cols-[1.2fr_0.8fr_1fr]">
        <UserGrowthChart points={overviewQuery.data?.userGrowth} />
        <DepositWithdrawChart flow={overviewQuery.data?.depositWithdrawalFlow} />
        <RecentDeposits deposits={overviewQuery.data?.recentDeposits} />
      </div>

      <div className="grid gap-2.5 sm:gap-4 md:grid-cols-3">
        {[
          { title: "Plan Purchases", value: `${overviewQuery.data?.activePlans ?? 0} Active`, icon: BadgeCheck, tone: "bg-cyan-50 text-cyan-700" },
          { title: "Withdrawal Approvals", value: `${overviewQuery.data?.pendingWithdrawals ?? 0} Pending`, icon: HandCoins, tone: "bg-orange-50 text-orange-600" },
          { title: "Support Tickets", value: "0 Open", icon: Inbox, tone: "bg-slate-100 text-slate-600" }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <AdminCard key={item.title}>
              <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500">{item.title}</p>
                  <p className="mt-1 text-lg font-bold text-slate-950">{item.value}</p>
                </div>
                <span className={`grid size-10 place-items-center rounded-xl ${item.tone}`}>
                  <Icon className="size-4" />
                </span>
              </div>
            </AdminCard>
          );
        })}
      </div>
    </section>
  );
}
