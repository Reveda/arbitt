import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ClipboardList,
  Database,
  HandCoins,
  Settings,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import {
  SuperAdminCard,
  SuperAdminMetricCard,
  SuperAdminPageHeader,
} from "./super-admin.components";
import {
  superAdminService,
  type SuperAdminConfigurationHealth,
  type SuperAdminDailyPoint,
  type SuperAdminOverview,
  type SuperAdminTransactionException,
} from "@/services/super-admin.service";
import { cn } from "@/lib/utils";

const fallbackOverview: SuperAdminOverview = {
  configurationHealth: [],
  dailySeries: [],
  metrics: {
    activeAdmins: 0,
    activeSettings: 0,
    activeSuperAdmins: 0,
    adminAuditEvents: 0,
    apiActivity24h: 0,
    auditEvents24h: 0,
    authAuditEvents: 0,
    approvedDeposits: 0,
    approvedPayouts: 0,
    depositAuditEvents: 0,
    failedApiActivity24h: 0,
    failedTransactions: 0,
    levelIncomePayouts: 0,
    paymentWalletAuditEvents: 0,
    pendingDeposits: 0,
    pendingPayouts: 0,
    pendingTransactions: 0,
    pendingWithdrawals: 0,
    payoutAuditEvents: 0,
    rejectedDeposits: 0,
    rejectedPayouts: 0,
    salaryRoyaltyPayouts: 0,
    securityNotifications: 0,
    successfulTransactions: 0,
    totalNotifications: 0,
    totalTransactions: 0,
    unreadNotifications: 0,
    userWallets: 0,
    weeklyPayouts: 0,
  },
  recentAuditLogs: [],
  recentExceptions: [],
  statusBreakdown: [],
  typeBreakdown: [],
  workflowSteps: [],
};

const governanceModules = [
  {
    title: "Payout Correction Control",
    description: "Rejected payout exceptions, reopen requests, reversal history, and required correction reasons.",
    icon: HandCoins,
  },
  {
    title: "Audit Trail",
    description: "Admin actions, wallet edits, auth events, payout reviews, config changes, and security actions.",
    icon: ClipboardList,
  },
  {
    title: "Backend Configuration",
    description: "Payment wallet policy, payout windows, rate limits, plan rules, and operational switches.",
    icon: Settings,
  },
  {
    title: "Admin Governance",
    description: "Admin access, role elevation, suspension, session review, and permission boundaries.",
    icon: UserCog,
  },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatUsdt(value: number) {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    useGrouping: false,
  }).format(value)} USDT`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function getStatusTone(status: string) {
  if (status === "active" || status === "configured" || status === "approved" || status === "completed") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (status === "pending") {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }

  if (status === "required" || status === "failed" || status === "rejected") {
    return "bg-rose-50 text-rose-700 ring-rose-100";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function TransactionFlowGraph({ points }: { points: SuperAdminDailyPoint[] }) {
  const data = points.length ? points : fallbackDailyPoints();
  const maxVolume = Math.max(
    1,
    ...data.map((point) => point.depositsUsdt + point.withdrawalsUsdt + point.rewardsUsdt),
  );
  const maxException = Math.max(1, ...data.map((point) => point.failedCount + point.pendingCount));
  const lineCoordinates = data.map((point, index) => {
    const x = 24 + index * (592 / Math.max(1, data.length - 1));
    const y = 132 - ((point.failedCount + point.pendingCount) / maxException) * 104;

    return {
      ...point,
      x,
      y: Math.max(20, y),
    };
  });
  const linePoints = lineCoordinates.map((point) => `${point.x},${point.y}`).join(" ");
  const [activePointIndex, setActivePointIndex] = useState(0);

  useEffect(() => {
    if (!lineCoordinates.length) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActivePointIndex((current) => (current + 1) % lineCoordinates.length);
    }, 1600);

    return () => window.clearInterval(intervalId);
  }, [lineCoordinates.length]);

  const activePoint = lineCoordinates[activePointIndex] ?? lineCoordinates[0];

  return (
    <SuperAdminCard className="overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-4">
        <div>
          <p className="text-sm font-black text-slate-950">Transaction Flow Graph</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Deposits, withdrawals, rewards, pending items, and failed/rejected exceptions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-black">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">Deposits</span>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">Withdrawals</span>
          <span className="rounded-full bg-violet-50 px-3 py-1 text-violet-700">Rewards</span>
          <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-700">Failed</span>
        </div>
      </div>

      <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_220px]">
        <div className="min-w-0">
          <div className="relative h-72 overflow-hidden rounded-2xl border border-cyan-100 bg-gradient-to-br from-slate-50 via-white to-cyan-50 p-4 shadow-[0_24px_60px_-38px_rgba(8,145,178,0.65)] super-admin-flow-surface">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_14%,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_85%_0%,rgba(59,130,246,0.16),transparent_24%)]" />
            <div className="absolute inset-x-4 top-10 h-px bg-gradient-to-r from-transparent via-slate-200/80 to-transparent" />
            <div className="absolute inset-x-4 top-24 h-px bg-gradient-to-r from-transparent via-slate-200/80 to-transparent" />
            <div className="absolute inset-x-4 top-40 h-px bg-gradient-to-r from-transparent via-slate-200/80 to-transparent" />
            <svg
              aria-hidden
              className="pointer-events-none absolute inset-x-4 top-8 h-36 w-[calc(100%-2rem)] overflow-visible drop-shadow-[0_8px_16px_rgba(239,68,68,0.12)]"
              viewBox="0 0 640 150"
            >
              <defs>
                <linearGradient id="superAdminExceptionLine" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#fb923c" />
                  <stop offset="55%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#be123c" />
                </linearGradient>
                <linearGradient id="superAdminExceptionGlow" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#f87171" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
                </linearGradient>
                <filter id="superAdminExceptionShadow" x="-20%" y="-20%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#ef4444" floodOpacity="0.18" />
                </filter>
              </defs>
              <polyline
                fill="none"
                points={linePoints}
                stroke="#ffffff"
                strokeDasharray="10 14"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity="0.18"
                strokeWidth="12"
                transform="translate(4 4)"
              />
              <polyline
                fill="none"
                points={linePoints}
                stroke="url(#superAdminExceptionGlow)"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="18"
                className="super-admin-flow-glow"
              />
              <polyline
                fill="none"
                points={linePoints}
                stroke="url(#superAdminExceptionLine)"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="5"
                filter="url(#superAdminExceptionShadow)"
                className="super-admin-flow-line"
              />
              {activePoint ? (
                <line
                  stroke="#ef4444"
                  strokeDasharray="5 6"
                  strokeOpacity="0.28"
                  strokeWidth="1"
                  x1={activePoint.x}
                  x2={activePoint.x}
                  y1="16"
                  y2="138"
                />
              ) : null}
              {lineCoordinates.map((point, index) => {
                const isActive = index === activePointIndex;

                return (
                  <g key={`${point.date}-${index}`}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      fill="#fff"
                      r={isActive ? "7" : "6"}
                      stroke="#ef4444"
                      strokeWidth={isActive ? "4" : "3"}
                    />
                    {isActive ? (
                      <>
                        <circle cx={point.x} cy={point.y} fill="#ef4444" fillOpacity="0.18" r="16" className="super-admin-flow-ripple" />
                        <circle cx={point.x} cy={point.y} fill="#ef4444" fillOpacity="0.12" r="24" className="super-admin-flow-ripple super-admin-flow-ripple-delayed" />
                      </>
                    ) : null}
                  </g>
                );
              })}
            </svg>

            <div className="absolute inset-x-4 bottom-4 flex h-40 items-end justify-between gap-2">
              {lineCoordinates.map((point) => {
                const depositHeight = Math.max(8, (point.depositsUsdt / maxVolume) * 128);
                const withdrawalHeight = Math.max(8, (point.withdrawalsUsdt / maxVolume) * 128);
                const rewardHeight = Math.max(8, (point.rewardsUsdt / maxVolume) * 128);
                const isActive = point.date === activePoint?.date;

                return (
                  <div className="flex min-w-0 flex-1 flex-col items-center gap-2" key={point.date}>
                    <div className="flex h-32 items-end gap-1.5">
                      <span
                        className={cn("w-3 rounded-t-full bg-gradient-to-t from-emerald-500 to-emerald-300 shadow-sm transition-all duration-300 super-admin-flow-bar super-admin-flow-bar-deposits", isActive && "scale-y-105 shadow-[0_0_16px_rgba(16,185,129,0.35)]")}
                        style={{ height: `${depositHeight}px` }}
                        title={`Deposits: ${formatUsdt(point.depositsUsdt)}`}
                      />
                      <span
                        className={cn("w-3 rounded-t-full bg-gradient-to-t from-blue-500 to-sky-300 shadow-sm transition-all duration-300 super-admin-flow-bar super-admin-flow-bar-withdrawals", isActive && "scale-y-105 shadow-[0_0_16px_rgba(59,130,246,0.35)]")}
                        style={{ height: `${withdrawalHeight}px` }}
                        title={`Withdrawals: ${formatUsdt(point.withdrawalsUsdt)}`}
                      />
                      <span
                        className={cn("w-3 rounded-t-full bg-gradient-to-t from-violet-500 to-fuchsia-300 shadow-sm transition-all duration-300 super-admin-flow-bar super-admin-flow-bar-rewards", isActive && "scale-y-105 shadow-[0_0_16px_rgba(168,85,247,0.35)]")}
                        style={{ height: `${rewardHeight}px` }}
                        title={`Rewards: ${formatUsdt(point.rewardsUsdt)}`}
                      />
                    </div>
                    <div className="text-center">
                      <p className={cn("text-[10px] font-black transition-colors", isActive ? "text-slate-900" : "text-slate-500")}>{formatDate(point.date)}</p>
                      <p className={cn("mt-0.5 text-[10px] font-bold transition-colors", isActive ? "text-rose-700" : "text-rose-600")}>
                        {point.failedCount} failed
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          {data.slice(-3).map((point) => (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3" key={point.date}>
              <p className="text-xs font-black text-slate-950">{formatDate(point.date)}</p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-white p-2">
                  <p className="text-[10px] font-bold text-slate-500">OK</p>
                  <p className="text-sm font-black text-emerald-700">{point.approvedCount}</p>
                </div>
                <div className="rounded-xl bg-white p-2">
                  <p className="text-[10px] font-bold text-slate-500">Pending</p>
                  <p className="text-sm font-black text-amber-700">{point.pendingCount}</p>
                </div>
                <div className="rounded-xl bg-white p-2">
                  <p className="text-[10px] font-bold text-slate-500">Failed</p>
                  <p className="text-sm font-black text-rose-700">{point.failedCount}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SuperAdminCard>
  );
}

function fallbackDailyPoints(): SuperAdminDailyPoint[] {
  const today = new Date();

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));

    return {
      approvedCount: 0,
      date: date.toISOString().slice(0, 10),
      depositsUsdt: 0,
      failedCount: 0,
      pendingCount: 0,
      rewardsUsdt: 0,
      totalCount: 0,
      withdrawalsUsdt: 0,
    };
  });
}

function ConfigurationHealth({ items }: { items: SuperAdminConfigurationHealth[] }) {
  return (
    <SuperAdminCard className="rounded-2xl">
      <div className="border-b border-slate-100 p-4">
        <p className="text-sm font-black text-slate-950">Backend Configuration Control</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          Super Admin owned settings and operational switches.
        </p>
      </div>
      <div className="grid gap-3 p-4">
        {items.length ? (
          items.map((item) => (
            <div className="rounded-xl border border-slate-200 bg-white p-3" key={item.key}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-950">{item.label}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{item.value}</p>
                </div>
                <span className={cn("rounded-full px-3 py-1 text-[10px] font-black capitalize ring-1", getStatusTone(item.status))}>
                  {item.status}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
            Configuration data will appear after backend connection.
          </p>
        )}
      </div>
    </SuperAdminCard>
  );
}

function RecentExceptions({ exceptions }: { exceptions: SuperAdminTransactionException[] }) {
  return (
    <SuperAdminCard className="rounded-2xl">
      <div className="border-b border-slate-100 p-4">
        <p className="text-sm font-black text-slate-950">Failed / Rejected Transactions</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          High-risk transaction rows for Super Admin review.
        </p>
      </div>
      <div className="space-y-3 p-4">
        {exceptions.length ? (
          exceptions.map((transaction) => (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3" key={transaction.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-950">
                    {transaction.user?.username ?? "Unknown user"}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {transaction.type} · {formatUsdt(transaction.amountUsdt)}
                  </p>
                </div>
                <span className={cn("rounded-full px-3 py-1 text-[10px] font-black capitalize ring-1", getStatusTone(transaction.status))}>
                  {transaction.status}
                </span>
              </div>
              <p className="mt-2 text-[11px] font-bold text-slate-400">{formatDate(transaction.createdAt)}</p>
            </div>
          ))
        ) : (
          <p className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            No failed or rejected transactions found.
          </p>
        )}
      </div>
    </SuperAdminCard>
  );
}

export function SuperAdminDashboardPage() {
  const [overview, setOverview] = useState<SuperAdminOverview>(fallbackOverview);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setError(null);

    superAdminService
      .getOverview()
      .then((response) => {
        if (active) {
          setOverview(response.data);
        }
      })
      .catch((caughtError) => {
        if (active) {
          setError(caughtError instanceof Error ? caughtError.message : "Unable to load Super Admin overview.");
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const failedRate = useMemo(() => {
    if (!overview.metrics.totalTransactions) {
      return "0%";
    }

    return `${Math.round((overview.metrics.failedTransactions / overview.metrics.totalTransactions) * 100)}%`;
  }, [overview.metrics.failedTransactions, overview.metrics.totalTransactions]);

  return (
    <section className="space-y-4">
      <SuperAdminPageHeader
        description="Track every transaction movement, failed flow, backend configuration, admin access, audit history, and platform-level controls."
        title="Super Admin Dashboard"
      />

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SuperAdminMetricCard
          icon={Activity}
          label="Total Transactions"
          tone="bg-cyan-50 text-cyan-700"
          value={isLoading ? "Loading..." : formatNumber(overview.metrics.totalTransactions)}
        />
        <SuperAdminMetricCard
          icon={AlertTriangle}
          label="Failed / Rejected"
          tone="bg-rose-50 text-rose-700"
          value={isLoading ? "Loading..." : `${formatNumber(overview.metrics.failedTransactions)} (${failedRate})`}
        />
        <SuperAdminMetricCard
          icon={ShieldCheck}
          label="Successful"
          tone="bg-emerald-50 text-emerald-700"
          value={isLoading ? "Loading..." : formatNumber(overview.metrics.successfulTransactions)}
        />
        <SuperAdminMetricCard
          icon={Database}
          label="Backend Settings"
          tone="bg-violet-50 text-violet-700"
          value={isLoading ? "Loading..." : formatNumber(overview.metrics.activeSettings)}
        />
      </div>

      <TransactionFlowGraph points={overview.dailySeries} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <SuperAdminCard className="rounded-2xl">
          <div className="border-b border-slate-100 p-4">
            <p className="text-sm font-black text-slate-950">Super Admin Control Surface</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Platform controls that sit above normal admin permissions.
            </p>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {governanceModules.map((module) => {
              const Icon = module.icon;

              return (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4" key={module.title}>
                  <span className="grid size-10 place-items-center rounded-xl bg-cyan-50 text-cyan-700">
                    <Icon className="size-4" />
                  </span>
                  <p className="mt-3 text-sm font-black text-slate-950">{module.title}</p>
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                    {module.description}
                  </p>
                </div>
              );
            })}
          </div>
        </SuperAdminCard>

        <ConfigurationHealth items={overview.configurationHealth} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <RecentExceptions exceptions={overview.recentExceptions} />

        <SuperAdminCard className="rounded-2xl">
          <div className="border-b border-slate-100 p-4">
            <p className="text-sm font-black text-slate-950">Transaction Status Breakdown</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Full transaction status count and value summary.
            </p>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {overview.statusBreakdown.length ? (
              overview.statusBreakdown.map((item) => (
                <div className="rounded-xl border border-slate-200 bg-white p-3" key={item.status}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("rounded-full px-3 py-1 text-[10px] font-black capitalize ring-1", getStatusTone(item.status))}>
                      {item.status}
                    </span>
                    <p className="text-sm font-black text-slate-950">{item.count}</p>
                  </div>
                  <p className="mt-3 text-xs font-bold text-slate-500">{formatUsdt(item.amountUsdt)}</p>
                </div>
              ))
            ) : (
              <p className="col-span-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                No transaction data available yet.
              </p>
            )}
          </div>
        </SuperAdminCard>
      </div>
    </section>
  );
}
