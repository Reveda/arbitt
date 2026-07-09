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

function formatChartUsdt(value: number) {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value)} USDT`;
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

function getChartStats(
  overview: UserDashboardOverview["earningOverview"] | undefined,
) {
  const source = overview?.length
    ? overview
    : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"].map((month) => ({
        month,
        amountUsdt: 0,
      }));

  const values = source.map((point) => point.amountUsdt);
  const first = values[0] ?? 0;
  const last = values[values.length - 1] ?? 0;
  const peak = Math.max(...values);
  const growth = first > 0 ? ((last - first) / first) * 100 : last > 0 ? 100 : 0;

  return { first, growth, last, peak };
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
  const chartStats = getChartStats(dashboard?.earningOverview);
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
        <Card className="form-motion-off border-slate-200 bg-white text-slate-950 shadow-[0_14px_40px_rgba(8,21,46,0.06)]">
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
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Start</p>
                <p className="mt-1 text-sm font-black text-slate-950">{formatUsdt(chartStats.first)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Peak</p>
                <p className="mt-1 text-sm font-black text-slate-950">{formatUsdt(chartStats.peak)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Growth</p>
                <p className="mt-1 text-sm font-black text-slate-950">
                  {chartStats.growth >= 0 ? "+" : ""}
                  {Math.round(chartStats.growth)}%
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="relative h-64 overflow-hidden rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-slate-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] sm:h-72">
              <svg
                className="absolute inset-0 size-full"
                preserveAspectRatio="none"
                viewBox="0 0 320 160"
              >
                <defs>
                  <linearGradient
                    id="userEarningStroke"
                    x1="18"
                    x2="302"
                    y1="0"
                    y2="0"
                  >
                    <stop offset="0%" stopColor="#d946ef" />
                    <stop offset="48%" stopColor="#0ea5e9" />
                    <stop offset="100%" stopColor="#22d3ee" />
                  </linearGradient>
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
                  <filter id="chartGlow" height="180%" width="180%" x="-40%" y="-40%">
                    <feGaussianBlur result="blur" stdDeviation="2.4" />
                    <feColorMatrix
                      in="blur"
                      type="matrix"
                      values="0 0 0 0 0.05 0 0 0 0 0.55 0 0 0 0 0.75 0 0 0 0.35 0"
                    />
                  </filter>
                </defs>
                {[36, 70, 104, 138].map((lineY) => (
                  <line
                    key={lineY}
                    stroke="#d9e7f2"
                    strokeDasharray="1.5 9"
                    strokeOpacity="0.62"
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
                  filter="url(#chartGlow)"
                  fill="none"
                  stroke="url(#userEarningStroke)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="4.5"
                />
                {chartPoints.map((point) => (
                  <g key={`${point.month}-${point.x}`}>
                    <circle cx={point.x} cy={point.y} fill="#22d3ee" opacity="0.14" r="11" />
                    <circle
                      cx={point.x}
                      cy={point.y}
                      fill="#0891b2"
                      r="5.5"
                      stroke="#ffffff"
                      strokeWidth="3.5"
                    />
                    <circle cx={point.x} cy={point.y} fill="#ffffff" r="1.6" opacity="0.85" />
                  </g>
                ))}
              </svg>
              <div className="absolute inset-0 pointer-events-none">
                {chartPoints.map((point) => {
                  const left = (point.x / 320) * 100;
                  const top = (point.y / 160) * 100;

                  return (
                    <div
                      className="absolute -translate-x-1/2 -translate-y-full"
                      key={`label-${point.month}-${point.x}`}
                      style={{
                        left: `${left}%`,
                        top: `calc(${top}% - 10px)`,
                      }}
                    >
                      <div className="rounded-full border border-cyan-100 bg-white/95 px-2.5 py-1 text-[10px] font-black text-slate-700 shadow-[0_8px_18px_rgba(8,21,46,0.08)]">
                        {formatChartUsdt(point.amountUsdt)}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="absolute left-4 top-4 rounded-full border border-cyan-100 bg-white/92 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700 shadow-sm">
                Revenue trend
              </div>
              <div className="absolute bottom-3 left-4 right-4 flex justify-between text-[10px] font-black text-slate-500">
                {chartPoints.map((point) => (
                  <span key={point.month}>{point.month}</span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="form-motion-off border-slate-200 bg-white text-slate-950 shadow-[0_14px_40px_rgba(8,21,46,0.06)]">
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
