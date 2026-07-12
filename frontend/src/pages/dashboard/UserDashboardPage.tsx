import { useState } from "react";
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
  }).format(value)} USDT`;
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

function getLast6MonthsNames() {
  const months = [];
  const date = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
    months.push(d.toLocaleString("en-US", { month: "short" }));
  }
  return months;
}

function buildChartPoints(
  overview: UserDashboardOverview["earningOverview"] | undefined,
) {
  const sliced = overview?.length ? overview.slice(-6) : undefined;
  const source = sliced?.length
    ? sliced
    : getLast6MonthsNames().map((month) => ({
        month,
        amountUsdt: 0,
      }));
  const minAmount = Math.min(...source.map((point) => point.amountUsdt));
  const maxAmount = Math.max(...source.map((point) => point.amountUsdt));
  const range = maxAmount - minAmount;

  return source.map((point, index) => ({
    ...point,
    x: source.length === 1 ? 158 : 18 + (index * 284) / (source.length - 1),
    y: range === 0 ? 120 : 132 - ((point.amountUsdt - minAmount) / range) * 76,
  }));
}

function getChartStats(
  overview: UserDashboardOverview["earningOverview"] | undefined,
) {
  const sliced = overview?.length ? overview.slice(-6) : undefined;
  const source = sliced?.length
    ? sliced
    : getLast6MonthsNames().map((month) => ({
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
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);
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
                <p className="mt-1 break-all text-xs font-black tracking-tight text-slate-950 sm:text-base leading-tight select-text">
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
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
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
            <div className="relative h-64 overflow-hidden rounded-2xl border border-slate-150 bg-gradient-to-br from-emerald-50/20 via-white to-slate-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] sm:h-72">
              <svg
                className="absolute inset-0 size-full"
                preserveAspectRatio="none"
                viewBox="0 0 320 160"
              >
                <defs>
                  <linearGradient id="barFront" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4ade80" />
                    <stop offset="100%" stopColor="#16a34a" />
                  </linearGradient>
                  <linearGradient id="barSide" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#166534" />
                    <stop offset="100%" stopColor="#14532d" />
                  </linearGradient>
                  <linearGradient id="barTop" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#a7f3d0" />
                    <stop offset="100%" stopColor="#4ade80" />
                  </linearGradient>
                  <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="arrowLineGradient" x1="0" y1="1" x2="1" y2="0">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#15803d" />
                  </linearGradient>
                  <filter id="arrowGlow" height="200%" width="200%" x="-50%" y="-50%">
                    <feGaussianBlur result="blur" stdDeviation="2.5" />
                    <feColorMatrix
                      in="blur"
                      type="matrix"
                      values="0 0 0 0 0.14 0 0 0 0 0.77 0 0 0 0 0.37 0 0 0 0.35 0"
                    />
                  </filter>
                  <filter id="barShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="#14532d" floodOpacity="0.12" />
                  </filter>
                </defs>
                {[36, 70, 104, 138].map((lineY) => (
                  <line
                    key={lineY}
                    stroke="#e2e8f0"
                    strokeDasharray="1.5 9"
                    strokeOpacity="0.8"
                    strokeWidth="1"
                    x1="12"
                    x2="308"
                    y1={lineY}
                    y2={lineY}
                  />
                ))}
                
                {/* Curve Background area glow */}
                <path
                  d="M 25 138 Q 170 138 280 61 L 280 142 L 25 142 Z"
                  fill="url(#curveGradient)"
                />

                {/* 3D Bar Blocks with Gradient Shading and Interactive Glow */}
                {chartPoints.map((point) => {
                  const cx = point.x;
                  const cy = point.y;
                  const yBase = 142;
                  return (
                    <g
                      key={`bar-3d-${point.month}-${cx}`}
                      className="group cursor-pointer"
                      filter="url(#barShadow)"
                      onMouseEnter={() => setHoveredPoint(point)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    >
                      {/* Top Face */}
                      <polygon
                        points={`${cx - 7},${cy} ${cx - 3},${cy - 4} ${cx + 11},${cy - 4} ${cx + 7},${cy}`}
                        fill="url(#barTop)"
                        stroke="#ffffff"
                        strokeWidth="0.4"
                        className="transition-all duration-300 group-hover:brightness-105"
                      />
                      {/* Side Face */}
                      <polygon
                        points={`${cx + 7},${cy} ${cx + 11},${cy - 4} ${cx + 11},${yBase - 4} ${cx + 7},${yBase}`}
                        fill="url(#barSide)"
                        className="transition-all duration-300 group-hover:brightness-105"
                      />
                      {/* Front Face */}
                      <rect
                        x={cx - 7}
                        y={cy}
                        width={14}
                        height={yBase - cy}
                        fill="url(#barFront)"
                        className="transition-all duration-300 group-hover:brightness-105"
                      />
                    </g>
                  );
                })}

                {/* Green Upward Arrow Curve */}
                <path
                  d="M 25 138 Q 170 138 280 61"
                  fill="none"
                  stroke="url(#arrowLineGradient)"
                  strokeWidth="3.8"
                  strokeLinecap="round"
                  filter="url(#arrowGlow)"
                />
              </svg>
              <div className="absolute inset-0 pointer-events-none">
                {/* Non-scaling, non-distorting HTML Arrowhead aligned perfectly with tangent */}
                <div
                  className="absolute"
                  style={{
                    left: `${(280 / 320) * 100}%`,
                    top: `${(61 / 160) * 100}%`,
                    transform: "translate(-30%, -50%) rotate(-42deg)",
                    filter: "drop-shadow(0 2px 5px rgba(21, 128, 61, 0.45))"
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M6 18L18 12L6 6L9 12L6 18Z"
                      fill="#15803d"
                      stroke="#15803d"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                {chartPoints.map((point, index) => {
                  const left = (point.x / 320) * 100;
                  const top = (point.y / 160) * 100;
                  const isLatest = index === chartPoints.length - 1;

                  // Hide static label if it's currently hovered (detailed tooltip will show instead)
                  if (hoveredPoint && hoveredPoint.month === point.month) return null;

                  // Declutter: hide zero labels except for the latest month
                  if (point.amountUsdt <= 0 && !isLatest) return null;

                  return (
                    <div
                      className="absolute -translate-x-1/2 -translate-y-full"
                      key={`label-${point.month}-${point.x}`}
                      style={{
                        left: `${left}%`,
                        top: `calc(${top}% - 10px)`,
                      }}
                    >
                      <div className="rounded-full border border-emerald-100 bg-white/95 px-2.5 py-1 text-[10px] font-black text-slate-700 shadow-[0_8px_18px_rgba(8,21,46,0.08)]">
                        {formatChartUsdt(point.amountUsdt)}
                      </div>
                    </div>
                  );
                })}

                {/* Hover Tooltip Details with smart overflow protection */}
                {hoveredPoint && (
                  <div
                    className={cn(
                      "absolute z-10 -translate-x-1/2 pointer-events-none rounded-xl border border-emerald-500 bg-slate-950/95 px-3 py-2 text-white shadow-lg backdrop-blur-sm transition-all duration-200 animate-in fade-in zoom-in-95",
                      hoveredPoint.y < 65 ? "top-full mt-2" : "bottom-full mb-2"
                    )}
                    style={{
                      left: `${(hoveredPoint.x / 320) * 100}%`,
                      top: hoveredPoint.y < 65 ? `calc(${(hoveredPoint.y / 160) * 100}% + 4px)` : undefined,
                      bottom: hoveredPoint.y >= 65 ? `calc(${100 - (hoveredPoint.y / 160) * 100}% + 4px)` : undefined
                    }}
                  >
                    <p className="text-[9px] font-black text-emerald-400 uppercase tracking-wider">{hoveredPoint.month} Overview</p>
                    <p className="mt-0.5 text-xs font-black">{formatUsdt(hoveredPoint.amountUsdt)}</p>
                  </div>
                )}
              </div>
              <div className="absolute left-4 top-4 rounded-full border border-emerald-100 bg-white/92 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700 shadow-sm">
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

      {/* New Visual Analytics Row */}
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2 mt-3 sm:mt-4">
        <AssetAllocationChart wallet={dashboard?.wallet} />
        <TeamMetricsCard 
          referrals={dashboard?.referrals} 
          totalTeamMembers={dashboard?.totalTeamMembers ?? 0}
          totalTeamBusiness={dashboard?.totalTeamBusinessUsdt ?? 0}
        />
      </div>
    </section>
  );
}

/* ─── Asset Allocation Donut Chart ─── */
function AssetAllocationChart({ wallet }: { wallet?: UserDashboardOverview["wallet"] }) {
  const available = wallet?.availableUsdt ?? 0;
  const locked = wallet?.lockedUsdt ?? 0;
  const withdrawn = wallet?.lifetimeWithdrawalsUsdt ?? 0;
  const total = available + locked + withdrawn;

  const C = 251.2; // Circumference for r=40
  
  let pAvailable = 0;
  let pLocked = 0;
  let pWithdrawn = 0;

  if (total > 0) {
    pAvailable = (available / total) * 100;
    pLocked = (locked / total) * 100;
    pWithdrawn = (withdrawn / total) * 100;
  } else {
    pAvailable = 100; // default placeholder
  }

  // Calculate stroke-dasharray and offsets
  const lenAvailable = (pAvailable / 100) * C;
  const lenLocked = (pLocked / 100) * C;
  const lenWithdrawn = (pWithdrawn / 100) * C;

  const offsetAvailable = 0;
  const offsetLocked = lenAvailable;
  const offsetWithdrawn = lenAvailable + lenLocked;

  return (
    <Card className="form-motion-off border-slate-200 bg-white text-slate-950 shadow-[0_14px_40px_rgba(8,21,46,0.06)]">
      <CardHeader className="p-4 pb-1">
        <CardTitle className="text-sm font-bold text-slate-950">Asset Allocation</CardTitle>
        <p className="text-[11px] font-semibold text-slate-400">Distribution of your USDT holdings</p>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row items-center justify-around gap-4 p-4 pt-2">
        <div className="relative size-36 shrink-0">
          <svg className="size-full -rotate-90" viewBox="0 0 100 100">
            {/* Background base circle */}
            <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="10" fill="transparent" />
            
            {total === 0 ? (
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="#e2e8f0"
                strokeWidth="10"
                fill="transparent"
              />
            ) : (
              <>
                {/* Available segment */}
                {lenAvailable > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#06b6d4"
                    strokeWidth="10"
                    strokeDasharray={`${lenAvailable} ${C - lenAvailable}`}
                    strokeDashoffset={-offsetAvailable}
                    fill="transparent"
                    strokeLinecap={lenAvailable === C ? "butt" : "round"}
                  />
                )}
                {/* Locked segment */}
                {lenLocked > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#6366f1"
                    strokeWidth="10"
                    strokeDasharray={`${lenLocked} ${C - lenLocked}`}
                    strokeDashoffset={-offsetLocked}
                    fill="transparent"
                    strokeLinecap="round"
                  />
                )}
                {/* Withdrawn segment */}
                {lenWithdrawn > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#f43f5e"
                    strokeWidth="10"
                    strokeDasharray={`${lenWithdrawn} ${C - lenWithdrawn}`}
                    strokeDashoffset={-offsetWithdrawn}
                    fill="transparent"
                    strokeLinecap="round"
                  />
                )}
              </>
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Total Value</span>
            <span className="text-xs font-black text-slate-800 leading-tight truncate max-w-[90px]">{Math.round(total)} USDT</span>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-2.5 w-full sm:max-w-[180px]">
          <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-50 bg-slate-50/50 p-2">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#06b6d4]" />
              <span className="text-[11px] font-bold text-slate-500">Available</span>
            </div>
            <span className="text-xs font-black text-slate-900">{Math.round(available)} USDT ({Math.round(pAvailable)}%)</span>
          </div>

          <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-50 bg-slate-50/50 p-2">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#6366f1]" />
              <span className="text-[11px] font-bold text-slate-500">Locked</span>
            </div>
            <span className="text-xs font-black text-slate-900">{Math.round(locked)} USDT ({Math.round(pLocked)}%)</span>
          </div>

          <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-50 bg-slate-50/50 p-2">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#f43f5e]" />
              <span className="text-[11px] font-bold text-slate-500">Withdrawn</span>
            </div>
            <span className="text-xs font-black text-slate-900">{Math.round(withdrawn)} USDT ({Math.round(pWithdrawn)}%)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Team Metrics Card ─── */
function TeamMetricsCard({ referrals, totalTeamMembers, totalTeamBusiness }: { referrals?: UserDashboardOverview["referrals"]; totalTeamMembers: number; totalTeamBusiness: number }) {
  const direct = referrals?.directCount ?? 0;
  const active = referrals?.activeTeamCount ?? 0;
  const activeRatio = direct > 0 ? Math.round((active / direct) * 100) : 0;

  return (
    <Card className="form-motion-off border-slate-200 bg-white text-slate-950 shadow-[0_14px_40px_rgba(8,21,46,0.06)]">
      <CardHeader className="p-4 pb-1">
        <CardTitle className="text-sm font-bold text-slate-950">Team & Referral Network</CardTitle>
        <p className="text-[11px] font-semibold text-slate-400">Team expansion and conversion metrics</p>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-2">
        {/* Conversion Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-500">Active Referral Rate</span>
            <span className="font-black text-emerald-600">{active} / {direct} ({activeRatio}%)</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-1000 ease-out"
              style={{ width: `${activeRatio || 5}%` }}
            />
          </div>
        </div>

        {/* Detailed grid cards */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="rounded-xl border border-slate-50 bg-slate-50/50 p-3 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Members</span>
            <p className="mt-1 text-lg font-black text-slate-900">{totalTeamMembers}</p>
            <span className="text-[9px] font-semibold text-slate-400">Direct + Indirect</span>
          </div>
          <div className="rounded-xl border border-slate-50 bg-slate-50/50 p-3 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Team Business</span>
            <p className="mt-1 text-lg font-black text-slate-900 truncate">{Math.round(totalTeamBusiness)} USDT</p>
            <span className="text-[9px] font-semibold text-slate-400">Total volume in USDT</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
