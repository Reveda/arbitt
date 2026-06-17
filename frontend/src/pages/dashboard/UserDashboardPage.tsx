import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CircleDollarSign,
  Network,
  ShoppingBag,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { useUserDashboard } from "@/hooks/useUserDashboard";
import { cn } from "@/lib/utils";
import type { UserDashboardOverview } from "@/services/userDashboard.service";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatUsdt(value: number) {
  return `${new Intl.NumberFormat("en-US", {
    useGrouping: false,
  }).format(Number(value.toFixed(2)))} USDT`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Now";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function buildChartPoints(
  overview: UserDashboardOverview["earningOverview"] | undefined,
) {
  const source = overview?.length
    ? overview
    : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"].map((month) => ({
        month,
        amountUsdt: 0,
      }));
  const minAmount = Math.min(...source.map((point) => point.amountUsdt));
  const maxAmount = Math.max(...source.map((point) => point.amountUsdt));
  const range = maxAmount - minAmount;

  return source.map((point, index) => ({
    ...point,
    x: source.length === 1 ? 158 : 18 + (index * 284) / (source.length - 1),
    y: range === 0 ? 120 : 132 - ((point.amountUsdt - minAmount) / range) * 102,
  }));
}

function getTransactionMeta(
  type: UserDashboardOverview["recentTransactions"][number]["type"],
) {
  const map = {
    deposit: {
      label: "Deposit",
      icon: ArrowDownLeft,
      tone: "bg-cyan-50 text-cyan-700",
    },
    withdrawal: {
      label: "Withdraw",
      icon: ArrowUpRight,
      tone: "bg-orange-50 text-orange-600",
    },
    reward: {
      label: "Reward",
      icon: CircleDollarSign,
      tone: "bg-emerald-50 text-emerald-600",
    },
    adjustment: {
      label: "Adjustment",
      icon: WalletCards,
      tone: "bg-violet-50 text-violet-600",
    },
    plan_purchase: {
      label: "Plan Purchase",
      icon: ShoppingBag,
      tone: "bg-blue-50 text-blue-600",
    },
  } as const;

  return map[type];
}

export function UserDashboardPage() {
  const dashboardQuery = useUserDashboard();
  const dashboard = dashboardQuery.data;
  const stats = [
    {
      title: "Income Wallet",
      value: dashboard
        ? formatUsdt(dashboard.wallet.availableUsdt)
        : dashboardQuery.isLoading
          ? "Loading..."
          : "0.00 USDT",
      detail: "Available balance",
      icon: WalletCards,
      tone: "cyan",
    },
    {
      title: "Total Team Business",
      value: dashboard
        ? formatUsdt(dashboard.totalTeamBusinessUsdt)
        : dashboardQuery.isLoading
          ? "Loading..."
          : "0.00 USDT",
      detail: "Team business volume",
      icon: UsersRound,
      tone: "blue",
    },
    {
      title: "Available Limit",
      value: dashboard
        ? formatUsdt(dashboard.availableLimitUsdt)
        : dashboardQuery.isLoading
          ? "Loading..."
          : "0.00 USDT",
      detail: "Remaining reward capacity",
      icon: CircleDollarSign,
      tone: "emerald",
    },
    {
      title: "Direct Referrals",
      value: dashboard
        ? formatNumber(dashboard.referrals.directCount)
        : dashboardQuery.isLoading
          ? "Loading..."
          : "0",
      detail: "Joined through your link",
      icon: Network,
      tone: "violet",
    },
  ];
  const chartPoints = buildChartPoints(dashboard?.earningOverview);
  const chartPath = chartPoints
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`)
    .join(" ");
  const chartFillPath = `${chartPath} L302 150 L18 150 Z`;

  const toneClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    cyan: "bg-cyan-50 text-cyan-700",
    emerald: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
  };

  return (
    <section className="space-y-3 sm:space-y-4">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#08152e] via-[#0d5c80] to-[#22d3ee] px-4 py-4 text-white shadow-[0_18px_50px_rgba(8,21,46,0.18)] sm:px-5">
        <div className="absolute -right-10 -top-12 size-36 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-16 left-8 size-32 rounded-full bg-cyan-200/15 blur-2xl" />
        <div className="relative">
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-cyan-100/82 sm:text-xs">
            User Panel
          </p>
          <h1 className="mt-1 text-[1.35rem] font-black leading-tight tracking-tight sm:text-2xl">
            User Dashboard
          </h1>
          <p className="mt-1 max-w-2xl text-[13px] font-semibold leading-relaxed text-cyan-50/88 sm:text-sm">
            Track wallet balance, team growth, rewards, and account activity
            from one clean command center.
          </p>
        </div>
      </div>

      {dashboardQuery.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
          {dashboardQuery.error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        {stats.map((item) => (
          <Card
            className="form-motion-off rounded-2xl border-slate-200 bg-white text-slate-950 shadow-sm"
            key={item.title}
          >
            <CardContent className="flex items-center justify-between gap-2 p-3.5 sm:gap-3 sm:p-4">
              <div>
                <p className="text-[11px] font-bold text-slate-500 sm:text-xs">
                  {item.title}
                </p>
                <p className="mt-1 text-sm font-black tracking-tight text-slate-950 sm:text-lg">
                  {item.value}
                </p>
                <p className="mt-1 text-[10px] font-semibold text-slate-400 sm:text-[11px]">
                  {item.detail}
                </p>
              </div>
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-xl sm:size-10",
                  toneClasses[item.tone],
                )}
              >
                <item.icon className="size-3.5 sm:size-4" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 sm:gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="form-motion-off border-slate-200 bg-white text-slate-950 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-sm text-slate-950">
                  Earning Overview
                </CardTitle>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  Monthly reward activity preview
                </p>
              </div>
              <span className="rounded-full bg-cyan-50 px-3 py-1 text-[11px] font-bold text-cyan-700">
                This Year
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="relative h-56 overflow-hidden rounded-xl border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-slate-50">
              <svg
                className="absolute inset-0 size-full"
                preserveAspectRatio="none"
                viewBox="0 0 320 160"
              >
                <defs>
                  <linearGradient
                    id="userEarningFill"
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[36, 70, 104, 138].map((lineY) => (
                  <line
                    key={lineY}
                    stroke="#e2e8f0"
                    strokeDasharray="3 5"
                    strokeWidth="1"
                    x1="12"
                    x2="308"
                    y1={lineY}
                    y2={lineY}
                  />
                ))}
                <path d={chartFillPath} fill="url(#userEarningFill)" />
                <path
                  d={chartPath}
                  fill="none"
                  stroke="#0891b2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="4"
                />
                {chartPoints.map((point) => (
                  <circle
                    cx={point.x}
                    cy={point.y}
                    fill="#0891b2"
                    key={`${point.month}-${point.x}`}
                    r="4.5"
                    stroke="#ffffff"
                    strokeWidth="3"
                  />
                ))}
              </svg>
              <div className="absolute bottom-3 left-4 right-4 flex justify-between text-[10px] font-bold text-slate-400">
                {chartPoints.map((point) => (
                  <span key={point.month}>{point.month}</span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="form-motion-off border-slate-200 bg-white text-slate-950 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm text-slate-950">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0">
            {dashboardQuery.isLoading ? (
              Array.from({ length: 3 }, (_, index) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3"
                  key={index}
                >
                  <div className="flex items-center gap-3">
                    <span className="size-9 animate-pulse rounded-xl bg-slate-100" />
                    <div>
                      <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
                      <div className="mt-2 h-3 w-32 animate-pulse rounded bg-slate-100" />
                    </div>
                  </div>
                  <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
                </div>
              ))
            ) : dashboard?.recentTransactions.length ? (
              dashboard.recentTransactions.map((transaction) => {
                const item = getTransactionMeta(transaction.type);
                const Icon = item.icon;

                return (
                  <div
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3"
                    key={transaction.id}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "grid size-9 place-items-center rounded-xl",
                          item.tone,
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {item.label}
                        </p>
                        <p className="text-[11px] font-semibold capitalize text-slate-500">
                          {transaction.status} ·{" "}
                          {formatDate(transaction.createdAt)}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs font-black text-slate-700">
                      {formatUsdt(transaction.amountUsdt)}
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-5 text-center">
                <p className="text-sm font-bold text-slate-700">
                  No activity yet
                </p>
                <p className="mt-1 text-xs font-medium text-slate-400">
                  Your top-ups, plan purchases, withdrawals, and rewards will
                  appear here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
