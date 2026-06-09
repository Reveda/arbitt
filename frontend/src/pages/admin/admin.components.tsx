import { useState, type ComponentType, type ReactNode } from "react";
import { WalletCards } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toneClasses } from "./admin.data";
import type { AdminOverview } from "@/services/admin.service";

const fallbackGrowthPoints = [
  { month: "Jan", users: 18400, x: 18, y: 132 },
  { month: "Feb", users: 20680, x: 54, y: 92 },
  { month: "Mar", users: 19890, x: 84, y: 106 },
  { month: "Apr", users: 23970, x: 116, y: 34 },
  { month: "May", users: 19220, x: 148, y: 118 },
  { month: "Jun", users: 22140, x: 186, y: 62 },
  { month: "Jul", users: 25430, x: 298, y: 20 }
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatUsdt(value: number) {
  return `${formatNumber(Number(value.toFixed(2)))} USDT`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Now";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export function AdminCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <Card className={cn("form-motion-off border-slate-200 bg-white text-slate-950 shadow-sm", className)}>
      {children}
    </Card>
  );
}

export function AdminPageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#08152e] via-[#0d5c80] to-[#22d3ee] px-4 py-4 text-white shadow-[0_18px_50px_rgba(8,21,46,0.18)] sm:px-5">
      <div className="absolute -right-10 -top-12 size-36 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-16 left-8 size-32 rounded-full bg-cyan-200/15 blur-2xl" />
      <div className="relative">
        <p className="text-[10px] font-black uppercase tracking-[0.32em] text-cyan-100/82 sm:text-xs">Admin Panel</p>
        <h1 className="mt-1 text-[1.35rem] font-black leading-tight tracking-tight sm:text-2xl">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-[13px] font-semibold leading-relaxed text-cyan-50/88 sm:text-sm">{description}</p> : null}
      </div>
    </div>
  );
}

export function MetricCard({ item }: { item: { title: string; value: string; tone: string; icon: ComponentType<{ className?: string }> } }) {
  const Icon = item.icon;

  return (
    <AdminCard className="rounded-2xl">
      <CardContent className="flex items-center justify-between gap-2 p-3.5 sm:gap-3 sm:p-4">
        <div>
          <p className="text-[11px] font-bold text-slate-500 sm:text-xs">{item.title}</p>
          <p className="mt-1 text-sm font-black tracking-tight text-slate-950 sm:text-lg">{item.value}</p>
        </div>
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl sm:size-10", toneClasses[item.tone])}>
          <Icon className="size-3.5 sm:size-4" />
        </span>
      </CardContent>
    </AdminCard>
  );
}

export function ManagementPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <AdminCard className="min-w-0">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm text-slate-950">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">{children}</CardContent>
    </AdminCard>
  );
}

export function UserGrowthChart({ points }: { points?: AdminOverview["userGrowth"] }) {
  const sourcePoints = points?.length ? points : fallbackGrowthPoints;
  const minUsers = Math.min(...sourcePoints.map((point) => point.users));
  const maxUsers = Math.max(...sourcePoints.map((point) => point.users));
  const range = maxUsers - minUsers;
  const chartPoints = sourcePoints.map((point, index) => ({
    ...point,
    x: sourcePoints.length === 1 ? 158 : 18 + (index * 280) / (sourcePoints.length - 1),
    y: range === 0 ? 82 : 132 - ((point.users - minUsers) / range) * 112
  }));
  const chartPath = chartPoints.map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`).join(" ");
  const chartFillPath = `${chartPath} L298 150 L18 150 Z`;
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
  const activePoint = activePointIndex === null ? null : chartPoints[activePointIndex];
  const previousPoint = activePointIndex === null ? null : chartPoints[Math.max(activePointIndex - 1, 0)];
  const growthDelta = activePoint && previousPoint ? activePoint.users - previousPoint.users : 0;
  const growthPercent =
    activePoint && previousPoint && previousPoint.users !== 0 && previousPoint.users !== activePoint.users
      ? (growthDelta / previousPoint.users) * 100
      : 0;
  const tooltipX = activePoint ? (activePoint.x > 250 ? 68 : activePoint.x < 70 ? 32 : 50) : 50;
  const tooltipY = activePoint && activePoint.y < 60 ? 60 : 18;

  return (
    <AdminCard>
      <CardHeader className="flex-row items-start justify-between gap-3 p-3.5 pb-2 sm:p-4 sm:pb-2">
        <div>
          <CardTitle className="text-sm text-slate-950">User Growth</CardTitle>
          <p className="mt-1 text-xs font-medium text-slate-500">Monthly registered users trend</p>
        </div>
        <span className="shrink-0 rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-bold text-cyan-700 sm:px-3 sm:text-[11px]">Live</span>
      </CardHeader>
      <CardContent className="p-3.5 pt-0 sm:p-4 sm:pt-0">
        <div
          className="relative h-48 overflow-hidden rounded-xl border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-slate-50 sm:h-56"
          onMouseLeave={() => setActivePointIndex(null)}
        >
          <svg className="absolute inset-0 size-full" preserveAspectRatio="none" viewBox="0 0 320 160">
            <defs>
              <linearGradient id="adminLineFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
              </linearGradient>
              <filter id="adminLineGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2.4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {[36, 70, 104, 138].map((lineY) => (
              <line key={lineY} stroke="#e2e8f0" strokeDasharray="3 5" strokeWidth="1" x1="12" x2="308" y1={lineY} y2={lineY} />
            ))}
            <path d={chartFillPath} fill="url(#adminLineFill)" />
            <path
              d={chartPath}
              fill="none"
              filter="url(#adminLineGlow)"
              stroke="#0891b2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="4"
            />
            {activePoint ? (
              <line
                stroke="#0e7490"
                strokeDasharray="4 4"
                strokeOpacity="0.35"
                strokeWidth="1"
                x1={activePoint.x}
                x2={activePoint.x}
                y1="18"
                y2="142"
              />
            ) : null}
            {chartPoints.map((point, index) => {
              const isActive = index === activePointIndex;

              return (
                <g
                  key={point.month}
                  aria-label={`${point.month}: ${formatNumber(point.users)} users`}
                  className="cursor-pointer outline-none"
                  onBlur={() => setActivePointIndex(null)}
                  onFocus={() => setActivePointIndex(index)}
                  onMouseEnter={() => setActivePointIndex(index)}
                  role="button"
                  tabIndex={0}
                >
                  <circle cx={point.x} cy={point.y} fill="transparent" r="13" />
                  <circle
                    cx={point.x}
                    cy={point.y}
                    fill={isActive ? "#ffffff" : "#0891b2"}
                    r={isActive ? "6.5" : "4.5"}
                    stroke={isActive ? "#0891b2" : "#ffffff"}
                    strokeWidth="3"
                  />
                  {isActive ? <circle cx={point.x} cy={point.y} fill="none" r="11" stroke="#22d3ee" strokeOpacity="0.42" strokeWidth="2" /> : null}
                </g>
              );
            })}
          </svg>

          {activePoint ? (
            <div
              className="pointer-events-none absolute w-40 -translate-x-1/2 rounded-2xl border border-cyan-100 bg-white/95 p-2.5 text-left shadow-[0_18px_46px_rgba(15,23,42,0.16)] backdrop-blur sm:w-44 sm:p-3"
              style={{ left: `${tooltipX}%`, top: `${tooltipY}%` }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-slate-950">{activePoint.month} Growth</p>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-black", growthDelta >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500")}>
                  {growthDelta >= 0 ? "+" : ""}
                  {growthPercent.toFixed(1)}%
                </span>
              </div>
              <p className="mt-2 text-lg font-black tracking-tight text-slate-950 sm:text-xl">{formatNumber(activePoint.users)}</p>
              <p className="text-[11px] font-semibold text-slate-500">Total registered users</p>
              <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-50 px-2.5 py-2 text-[11px]">
                <span className="font-semibold text-slate-500">Monthly change</span>
                <span className={cn("font-black", growthDelta >= 0 ? "text-emerald-600" : "text-rose-500")}>
                  {growthDelta >= 0 ? "+" : ""}
                  {formatNumber(growthDelta)}
                </span>
              </div>
            </div>
          ) : null}

          <div className="absolute bottom-3 left-4 right-4 flex justify-between text-[10px] font-bold text-slate-400">
            {chartPoints.map((point, index) => (
              <button
                key={point.month}
                className={cn("rounded-full px-1.5 py-0.5 transition-colors", index === activePointIndex ? "bg-cyan-100 text-cyan-800" : "hover:bg-slate-100")}
                onBlur={() => setActivePointIndex(null)}
                onFocus={() => setActivePointIndex(index)}
                onMouseEnter={() => setActivePointIndex(index)}
                type="button"
              >
                {point.month}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </AdminCard>
  );
}

export function DepositWithdrawChart({ flow }: { flow?: AdminOverview["depositWithdrawalFlow"] }) {
  const depositsPercent = flow?.depositsPercent ?? 0;
  const withdrawalsPercent = flow?.withdrawalsPercent ?? 0;
  const hasFlow = depositsPercent + withdrawalsPercent > 0;

  return (
    <AdminCard>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm text-slate-950">Top-up vs Withdraw</CardTitle>
      </CardHeader>
      <CardContent className="grid place-items-center p-4 pt-0">
        <div
          className="relative grid size-40 place-items-center rounded-full"
          style={{
            background: hasFlow
              ? `conic-gradient(#0891b2 0 ${depositsPercent}%, #2563eb ${depositsPercent}% 100%)`
              : "conic-gradient(#e2e8f0 0 100%)"
          }}
        >
          <div className="grid size-24 place-items-center rounded-full bg-white text-center text-xs font-semibold text-slate-600">
            USDT
            <span className="block text-[10px] font-medium text-slate-400">Flow</span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs font-medium text-slate-500">
          <span className="inline-flex items-center gap-2">
            <span className="size-2 rounded-full bg-cyan-600" />
            Top-ups {depositsPercent}%
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="size-2 rounded-full bg-blue-600" />
            Withdrawals {withdrawalsPercent}%
          </span>
        </div>
        <p className="mt-3 text-center text-[11px] font-semibold text-slate-400">
          {formatUsdt(flow?.depositsUsdt ?? 0)} top-ups · {formatUsdt(flow?.withdrawalsUsdt ?? 0)} withdrawals
        </p>
      </CardContent>
    </AdminCard>
  );
}

export function RecentDeposits({ deposits }: { deposits?: AdminOverview["recentDeposits"] }) {
  const items = deposits ?? [];

  return (
    <AdminCard>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm text-slate-950">Recent Top-ups</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        {items.length ? (
          items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
            <div className="flex items-center gap-3">
              <span className={cn("grid size-9 place-items-center rounded-xl", toneClasses.blue)}>
                <WalletCards className="size-4" />
              </span>
              <div>
                <p className="text-xs font-bold text-slate-900">{item.userName}</p>
                <p className="text-[11px] font-semibold text-slate-500">{formatUsdt(item.amountUsdt)}</p>
              </div>
            </div>
            <p className="text-[10px] font-medium text-slate-400">{formatDate(item.createdAt)}</p>
          </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-5 text-center">
            <p className="text-sm font-bold text-slate-700">No recent top-ups</p>
            <p className="mt-1 text-xs font-medium text-slate-400">Wallet top-up records will appear here.</p>
          </div>
        )}
      </CardContent>
    </AdminCard>
  );
}
