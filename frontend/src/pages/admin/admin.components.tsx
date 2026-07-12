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
  return `${new Intl.NumberFormat("en-US", {
    useGrouping: false,
  }).format(value)} USDT`;
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

export function MetricCard({ item }: { item: { title: string; value: string; caption?: string; tone: string; icon: ComponentType<{ className?: string }> } }) {
  const Icon = item.icon;

  return (
    <AdminCard className="relative rounded-2xl select-text">
      <CardContent className="flex items-center justify-between gap-2 p-3.5 sm:gap-3 sm:p-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-bold text-slate-500 sm:text-xs">{item.title}</p>
          <p className="mt-1 break-all text-xs font-black tracking-tight text-slate-950 sm:text-base leading-tight">
            {item.value}
          </p>
          {item.caption ? (
            <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-400">{item.caption}</p>
          ) : null}
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

  // Generate a mathematically smooth Catmull-Rom spline
  const getCurvePath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return "";
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(i + 2, pts.length - 1)];

      // Control points for a smooth transition (tension = 0.5)
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  };

  const chartPath = getCurvePath(chartPoints);
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
          className="relative h-48 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/20 sm:h-56"
          onMouseLeave={() => setActivePointIndex(null)}
        >
          <svg className="absolute inset-0 size-full" preserveAspectRatio="none" viewBox="0 0 320 160">
            <defs>
              <linearGradient id="adminLineFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#0891b2" stopOpacity="0.25" />
                <stop offset="50%" stopColor="#6366f1" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="adminLineStroke" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#0891b2" />
                <stop offset="50%" stopColor="#4f46e5" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
              <filter id="adminLineShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#4f46e5" floodOpacity="0.15" />
              </filter>
            </defs>

            {/* Clear dotted horizontal lines */}
            {[36, 70, 104, 138].map((lineY) => (
              <line key={lineY} stroke="#e2e8f0" strokeDasharray="2 4" strokeWidth="1.2" x1="12" x2="308" y1={lineY} y2={lineY} />
            ))}

            <path d={chartFillPath} fill="url(#adminLineFill)" />
            <path
              d={chartPath}
              fill="none"
              filter="url(#adminLineShadow)"
              stroke="url(#adminLineStroke)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="4.5"
            />
            {activePoint ? (
              <line
                stroke="#4f46e5"
                strokeDasharray="4 4"
                strokeOpacity="0.3"
                strokeWidth="1"
                x1={activePoint.x}
                x2={activePoint.x}
                y1="18"
                y2="142"
              />
            ) : null}

            {/* Invisible hover zones */}
            {chartPoints.map((point, index) => (
              <circle
                key={point.month}
                cx={point.x}
                cy={point.y}
                fill="transparent"
                r="16"
                className="cursor-pointer outline-none"
                onMouseEnter={() => setActivePointIndex(index)}
              />
            ))}
          </svg>

          {/* HTML radar circle marker - prevents SVG aspect ratio stretching (stays a perfect circle) */}
          {activePoint ? (
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center size-8 z-10"
              style={{
                left: `${(activePoint.x / 320) * 100}%`,
                top: `${(activePoint.y / 160) * 100}%`
              }}
            >
              <div className="absolute inset-0 rounded-full bg-indigo-600/20 animate-ping opacity-75" />
              <div className="absolute size-4 rounded-full bg-indigo-600/30" />
              <div className="size-2.5 rounded-full bg-indigo-600 border-2 border-white shadow-[0_2px_4px_rgba(0,0,0,0.15)]" />
            </div>
          ) : null}

          {activePoint ? (
            <div
              className="pointer-events-none absolute w-40 -translate-x-1/2 rounded-xl border border-slate-100 bg-white/95 p-2.5 text-left shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur sm:w-44 sm:p-3 text-slate-800"
              style={{ left: `${tooltipX}%`, top: `${tooltipY}%` }}
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                <p className="text-xs font-bold text-slate-500">{activePoint.month} Growth</p>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-black", growthDelta >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500")}>
                  {growthDelta >= 0 ? "+" : ""}
                  {growthPercent.toFixed(1)}%
                </span>
              </div>
              <p className="mt-2 text-lg font-black tracking-tight text-slate-900 sm:text-xl">{formatNumber(activePoint.users)}</p>
              <p className="text-[10px] font-bold text-slate-400">Total registered users</p>
              <div className="mt-2 flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-600">
                <span className="text-slate-400">Monthly change</span>
                <span className={cn("font-black", growthDelta >= 0 ? "text-emerald-600" : "text-rose-600")}>
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
                className={cn("rounded-full px-1.5 py-0.5 transition-colors", index === activePointIndex ? "bg-indigo-50 text-indigo-700 font-extrabold" : "hover:bg-slate-100")}
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

  // Enforce a minimum visual slice of 5% for better visibility of tiny amounts
  let visualDepositsPercent = depositsPercent;
  if (hasFlow) {
    if (withdrawalsPercent > 0 && withdrawalsPercent < 5) {
      visualDepositsPercent = 95;
    } else if (depositsPercent > 0 && depositsPercent < 5) {
      visualDepositsPercent = 5;
    }
  }

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
              ? `conic-gradient(#0891b2 0 ${visualDepositsPercent}%, #f43f5e ${visualDepositsPercent}% 100%)`
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
            <span className="size-2 rounded-full bg-rose-500" />
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

// Fallback points for Treasury / Platform Reserve
const fallbackReservePoints = [
  { month: "Jan", reserve: 0 },
  { month: "Feb", reserve: 0 },
  { month: "Mar", reserve: 0 },
  { month: "Apr", reserve: 0 },
  { month: "May", reserve: 0 },
  { month: "Jun", reserve: 400000 },
  { month: "Jul", reserve: 464868 }
];

function buildCurvePath(points: { x: number; y: number }[]) {
  if (points.length === 0) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const cpX1 = p0.x + (p1.x - p0.x) / 2;
    const cpY1 = p0.y;
    const cpX2 = p0.x + (p1.x - p0.x) / 2;
    const cpY2 = p1.y;
    d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
  }
  return d;
}

function buildAreaPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return "";
  const curve = buildCurvePath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${curve} L ${last.x} 142 L ${first.x} 142 Z`;
}

export function PlatformReserveChart({ points }: { points?: AdminOverview["platformReserveHistory"] }) {
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);
  
  const sourcePoints = points?.length ? points : fallbackReservePoints;
  const slicedPoints = sourcePoints.slice(-6);
  
  const minReserve = Math.min(...slicedPoints.map((point) => point.reserve), 0);
  const maxReserve = Math.max(...slicedPoints.map((point) => point.reserve), 100);
  const range = maxReserve - minReserve;
  
  const chartPoints = slicedPoints.map((point, index) => ({
    ...point,
    x: slicedPoints.length === 1 ? 168 : 48 + (index * 252) / (slicedPoints.length - 1),
    y: range === 0 ? 120 : 132 - ((point.reserve - minReserve) / range) * 76
  }));

  const lastPoint = chartPoints[chartPoints.length - 1];
  const secondLastPoint = chartPoints[chartPoints.length - 2];
  let arrowheadPolygonPoints = "";
  if (lastPoint && secondLastPoint) {
    const dx = lastPoint.x - secondLastPoint.x;
    const dy = lastPoint.y - secondLastPoint.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      const ux = dx / len;
      const uy = dy / len;
      const vx = -uy;
      const vy = ux;

      const size = 11;
      const width = 6.5;
      const indent = 8;

      const b1x = lastPoint.x - size * ux + width * vx;
      const b1y = lastPoint.y - size * uy + width * vy;
      const mx = lastPoint.x - indent * ux;
      const my = lastPoint.y - indent * uy;
      const b2x = lastPoint.x - size * ux - width * vx;
      const b2y = lastPoint.y - size * uy - width * vy;

      arrowheadPolygonPoints = `${lastPoint.x},${lastPoint.y} ${b1x},${b1y} ${mx},${my} ${b2x},${b2y}`;
    }
  }


  return (
    <AdminCard className="overflow-hidden rounded-2xl border-cyan-500/15 bg-[#0b1628] text-white shadow-[0_20px_60px_rgba(6,182,212,0.08)]">
      <CardHeader className="flex-row items-start justify-between gap-3 p-3.5 pb-2 sm:p-4 sm:pb-2">
        <div>
          <CardTitle className="text-sm text-white">Platform Reserve (Treasury)</CardTitle>
          <p className="mt-1 text-xs font-medium text-slate-400">Cumulative net capital reserve over time</p>
        </div>
        <span className="shrink-0 rounded-full border border-cyan-500/20 bg-cyan-950/50 px-2.5 py-1 text-[10px] font-bold text-cyan-400 sm:px-3 sm:text-[11px]">Treasury</span>
      </CardHeader>
      <CardContent className="p-3.5 pt-0 sm:p-4 sm:pt-0">
        <div className="relative h-48 overflow-hidden rounded-2xl border border-slate-700/40 bg-gradient-to-b from-[#0d1b2e] to-[#091422] sm:h-56">
          <svg className="absolute inset-0 size-full" preserveAspectRatio="none" viewBox="0 0 320 160">
            <defs>
              <linearGradient id="aBarGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#0891b2" />
                <stop offset="25%" stopColor="#67e8f9" />
                <stop offset="65%" stopColor="#0284c7" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              <linearGradient id="aCurveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="aArrowLineGradient" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
              <filter id="aArrowGlow" height="200%" width="200%" x="-50%" y="-50%">
                <feGaussianBlur result="blur" stdDeviation="3" />
                <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.13 0 0 0 0 0.83 0 0 0 0 0.93 0 0 0 0.5 0" />
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="aBarGlow" x="-30%" y="-10%" width="160%" height="120%">
                <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#22d3ee" floodOpacity="0.18" />
              </filter>
            </defs>
            {[30, 48, 66, 84, 102, 120, 138].map((lineY) => (
              <line key={lineY} stroke="#1e293b" strokeOpacity="0.6" strokeWidth="0.6" x1="42" x2="308" y1={lineY} y2={lineY} />
            ))}
            {/* Dynamic Y-axis labels */}
            {[30, 48, 66, 84, 102, 120, 138].map((lineY) => {
              const peakVal = maxReserve || 100;
              const rawVal = ((132 - lineY) / 76) * peakVal;
              const rounded = Math.max(0, Math.round(rawVal / 1000) * 1000);
              const label = rounded >= 1000 ? `${(rounded / 1000).toFixed(0)}k` : `${rounded}`;
              return (
                <text key={`yl-${lineY}`} x="8" y={lineY + 3} fill="#475569" fontSize="6.5" fontWeight="600">
                  {label}{lineY === 30 ? " USDT" : ""}
                </text>
              );
            })}

            {/* Curve area glow */}
            <path d={buildAreaPath(chartPoints)} fill="url(#aCurveGradient)" />

            {/* Premium Capsule Bars */}
            {chartPoints.map((point) => {
              const cx = point.x;
              const cy = point.y;
              const yBase = 142;
              const barH = yBase - cy;
              return (
                <g
                  key={`bar-${point.month}-${cx}`}
                  className="cursor-pointer"
                  filter="url(#aBarGlow)"
                  onMouseEnter={() => setHoveredPoint(point)}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  <rect
                    x={cx - 8}
                    y={cy}
                    width={16}
                    height={barH}
                    rx="8"
                    fill="url(#aBarGradient)"
                    stroke="#22d3ee"
                    strokeWidth="0.8"
                    strokeOpacity="0.4"
                    className="transition-all duration-300 hover:brightness-125"
                  />
                  {/* Glossy specular highlight for 3D feel */}
                  <rect x={cx - 5} y={cy + 3} width={3} height={Math.max(barH - 8, 2)} rx="1.5" fill="#ffffff" fillOpacity="0.3" />
                </g>
              );
            })}

            {/* Sloped arrowhead directly inside SVG */}
            {arrowheadPolygonPoints && (
              <polygon
                points={arrowheadPolygonPoints}
                fill="url(#aArrowLineGradient)"
                filter="url(#aArrowGlow)"
              />
            )}
          </svg>

          <div className="absolute inset-0 pointer-events-none">

            {chartPoints.map((point, index) => {
              const left = (point.x / 320) * 100;
              const top = (point.y / 160) * 100;
              const isLatest = index === chartPoints.length - 1;

              if (hoveredPoint && hoveredPoint.month === point.month) return null;
              if (point.reserve <= 0 && !isLatest) return null;

              return (
                <div
                  className="absolute -translate-x-1/2 -translate-y-full"
                  key={`label-${point.month}-${point.x}`}
                  style={{
                    left: `${left}%`,
                    top: `calc(${top}% - 12px)`
                  }}
                >
                  <div className="relative rounded-lg border border-cyan-400/60 bg-slate-950/90 px-2 py-0.5 text-[9px] font-black text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.25)] backdrop-blur-sm">
                    {formatUsdt(point.reserve)}
                    <div className="absolute -bottom-1 left-1/2 size-1.5 -translate-x-1/2 rotate-45 border-b border-r border-cyan-400/60 bg-slate-950/90" />
                  </div>
                </div>
              );
            })}

            {/* Hover Tooltip */}
            {hoveredPoint && (
              <div
                className={cn(
                  "absolute z-10 -translate-x-1/2 pointer-events-none rounded-xl border border-cyan-500 bg-slate-950/95 px-3 py-2 text-white shadow-[0_0_20px_rgba(34,211,238,0.3)] backdrop-blur-sm transition-all duration-200 animate-in fade-in zoom-in-95",
                  hoveredPoint.y < 65 ? "top-full mt-2" : "bottom-full mb-2"
                )}
                style={{
                  left: `${(hoveredPoint.x / 320) * 100}%`,
                  top: hoveredPoint.y < 65 ? `calc(${(hoveredPoint.y / 160) * 100}% + 4px)` : undefined,
                  bottom: hoveredPoint.y >= 65 ? `calc(${100 - (hoveredPoint.y / 160) * 100}% + 4px)` : undefined
                }}
              >
                <p className="text-[9px] font-black text-cyan-400 uppercase tracking-wider">{hoveredPoint.month} Reserve</p>
                <p className="mt-0.5 text-xs font-black">{formatUsdt(hoveredPoint.reserve)}</p>
              </div>
            )}
          </div>

          <div className="absolute right-4 top-3 rounded-full border border-cyan-500/20 bg-slate-950/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.15)] backdrop-blur-sm">
            Treasury Reserve
          </div>
          <div className="absolute bottom-3 left-4 right-4 flex justify-between pl-8 text-[10px] font-black text-slate-500">
            {chartPoints.map((point) => (
              <span key={point.month}>{point.month}</span>
            ))}
          </div>
        </div>
      </CardContent>
      {/* Bottom Legend */}
      <div className="flex items-center justify-around border-t border-slate-700/40 px-4 py-3 text-[11px] font-bold text-slate-400">
        {chartPoints.length >= 2 && (() => {
          const prev = chartPoints[chartPoints.length - 2];
          const curr = chartPoints[chartPoints.length - 1];
          const isUp = curr.reserve >= prev.reserve;
          return (
            <>
              <div className="flex items-center gap-1.5">
                <span className="inline-block size-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                <span>{prev.month}: <strong className="text-white">{formatUsdt(prev.reserve)}</strong></span>
                <span className="text-emerald-400 text-[10px]">▲</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block size-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                <span>{curr.month}: <strong className="text-white">{formatUsdt(curr.reserve)}</strong></span>
                <span className={`text-[10px] ${isUp ? "text-emerald-400" : "text-rose-400"}`}>{isUp ? "▲" : "▼"}</span>
              </div>
            </>
          );
        })()}
      </div>
    </AdminCard>
  );
}

// Fallback transaction activity
const fallbackActivity = [
  { month: "Jan", deposits: 0, withdrawals: 0, payouts: 0 },
  { month: "Feb", deposits: 0, withdrawals: 0, payouts: 0 },
  { month: "Mar", deposits: 0, withdrawals: 0, payouts: 0 },
  { month: "Apr", deposits: 0, withdrawals: 0, payouts: 0 },
  { month: "May", deposits: 0, withdrawals: 0, payouts: 0 },
  { month: "Jun", deposits: 537596.07, withdrawals: 0, payouts: 1147.22 },
  { month: "Jul", deposits: 9491.86, withdrawals: 180, payouts: 80892.38 }
];

export function TransactionActivityChart({ activity }: { activity?: AdminOverview["transactionActivity"] }) {
  const sourceActivity = activity?.length ? activity : fallbackActivity;
  const maxVal = Math.max(
    ...sourceActivity.flatMap((a) => [a.deposits, a.withdrawals, a.payouts]),
    100
  );

  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);

  // Layout parameters for SVG
  const chartHeight = 112; // Height from y=20 to y=132
  const yBase = 132;

  // Map monthly data to bar coordinate parameters
  const chartGroups = sourceActivity.map((a, index) => {
    const xCenter = 28 + (index * 264) / (sourceActivity.length - 1);
    
    // Scale bar heights dynamically based on maxVal
    const depositsH = (a.deposits / maxVal) * chartHeight;
    const withdrawalsH = (a.withdrawals / maxVal) * chartHeight;
    const payoutsH = (a.payouts / maxVal) * chartHeight;

    return {
      month: a.month,
      xCenter,
      deposits: a.deposits,
      withdrawals: a.withdrawals,
      payouts: a.payouts,
      bars: [
        { key: "deposits", x: xCenter - 9, y: yBase - depositsH, h: Math.max(depositsH, 2), color: "#0891b2", label: "Deposits" },
        { key: "withdrawals", x: xCenter - 2, y: yBase - withdrawalsH, h: Math.max(withdrawalsH, 2), color: "#f43f5e", label: "Withdrawals" },
        { key: "payouts", x: xCenter + 5, y: yBase - payoutsH, h: Math.max(payoutsH, 2), color: "#8b5cf6", label: "Payouts" }
      ]
    };
  });

  const activeGroup = activeGroupIndex !== null ? chartGroups[activeGroupIndex] : null;

  return (
    <AdminCard>
      <CardHeader className="flex-row items-start justify-between gap-3 p-3.5 pb-2 sm:p-4 sm:pb-2">
        <div>
          <CardTitle className="text-sm text-slate-950">Transaction Activity Volume</CardTitle>
          <p className="mt-1 text-xs font-medium text-slate-500">Monthly deposits, withdrawals & ROI payouts comparison</p>
        </div>
        <div className="flex gap-2 text-[9px] font-bold text-slate-500">
          <span className="flex items-center gap-1"><span className="size-1.5 rounded bg-cyan-500" /> Dep</span>
          <span className="flex items-center gap-1"><span className="size-1.5 rounded bg-rose-500" /> With</span>
          <span className="flex items-center gap-1"><span className="size-1.5 rounded bg-violet-500" /> Pay</span>
        </div>
      </CardHeader>
      <CardContent className="p-3.5 pt-0 sm:p-4 sm:pt-0">
        <div
          className="relative h-48 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/20 sm:h-56"
          onMouseLeave={() => setActiveGroupIndex(null)}
        >
          <svg className="absolute inset-0 size-full" preserveAspectRatio="none" viewBox="0 0 320 160">
            {/* Faint dotted horizontal lines */}
            {[36, 70, 104, 138].map((lineY) => (
              <line key={lineY} stroke="#e2e8f0" strokeDasharray="2 4" strokeWidth="1.2" x1="12" x2="308" y1={lineY} y2={lineY} />
            ))}

            {chartGroups.map((g, index) => {
              const isGroupActive = index === activeGroupIndex;

              return (
                <g key={g.month}>
                  {/* Subtle active background highlight zone */}
                  {isGroupActive ? (
                    <rect x={g.xCenter - 14} y="15" width="28" height="122" fill="#4f46e5" fillOpacity="0.04" rx="6" />
                  ) : null}

                  {/* Draw 3 bars for each month */}
                  {g.bars.map((bar) => (
                    <rect
                      key={bar.key}
                      x={bar.x}
                      y={bar.y}
                      width="4.5"
                      height={bar.h}
                      rx="1"
                      fill={bar.color}
                      className="transition-all duration-300 hover:brightness-95"
                      opacity={activeGroupIndex === null || isGroupActive ? 1.0 : 0.45}
                    />
                  ))}

                  {/* Hover detector overlay */}
                  <rect
                    x={g.xCenter - 14}
                    y="12"
                    width="28"
                    height="125"
                    fill="transparent"
                    className="cursor-pointer outline-none"
                    onMouseEnter={() => setActiveGroupIndex(index)}
                  />
                </g>
              );
            })}
          </svg>

          {activeGroup ? (
            <div
              className="pointer-events-none absolute w-48 -translate-x-1/2 rounded-xl border border-slate-100 bg-white/95 p-2.5 text-left shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur text-slate-800 text-[11px]"
              style={{ left: `${(activeGroup.xCenter / 320) * 100}%`, top: "18%" }}
            >
              <p className="text-xs font-bold text-slate-500 border-b border-slate-100 pb-1.5 mb-1.5">{activeGroup.month} Activity</p>
              <div className="space-y-1 font-semibold text-slate-600">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-cyan-500" /> Deposits:</span>
                  <span className="text-slate-900 font-extrabold">{formatUsdt(activeGroup.deposits)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-rose-500" /> Withdraws:</span>
                  <span className="text-slate-900 font-extrabold">{formatUsdt(activeGroup.withdrawals)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-violet-500" /> ROI Payouts:</span>
                  <span className="text-slate-900 font-extrabold">{formatUsdt(activeGroup.payouts)}</span>
                </div>
              </div>
            </div>
          ) : null}

          <div className="absolute bottom-3 left-4 right-4 flex justify-between text-[10px] font-bold text-slate-400">
            {chartGroups.map((g, index) => (
              <button
                key={g.month}
                className={cn("rounded-full px-1.5 py-0.5 transition-colors", index === activeGroupIndex ? "bg-indigo-50 text-indigo-700 font-extrabold" : "hover:bg-slate-100")}
                onMouseEnter={() => setActiveGroupIndex(index)}
                type="button"
              >
                {g.month}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </AdminCard>
  );
}
