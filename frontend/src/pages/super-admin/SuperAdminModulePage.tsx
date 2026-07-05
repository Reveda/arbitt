
import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  Database,
  FileCheck2,
  Gauge,
  GitBranch,
  HandCoins,
  LifeBuoy,
  ListChecks,
  LockKeyhole,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  UsersRound,
  Wallet,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";
import {
  superAdminService,
  type SuperAdminAdminRecord,
  type SuperAdminApiActivityRecord,
  type SuperAdminAuditLog,
  type SuperAdminConfigurationHealth,
  type SuperAdminDailyPoint,
  type SuperAdminNotificationRecord,
  type SuperAdminOverview,
  type SuperAdminPagination,
  type SuperAdminSettingRecord,
  type SuperAdminTransactionRecord,
  type SuperAdminTransactionException,
  type SuperAdminWorkflowStep,
  type SuperAdminPayoutSummary,
  type SuperAdminSkippedPayout,
} from "@/services/super-admin.service";
import {
  SuperAdminCard,
  SuperAdminMetricCard,
  SuperAdminPageHeader,
} from "./super-admin.components";

type SuperAdminModuleKey =
  | "admins"
  | "auditLogs"
  | "notifications"
  | "payoutCorrections"
  | "platformSettings"
  | "profile"
  | "roles"
  | "security"
  | "support"
  | "transactions";

type SuperAdminModulePageProps = {
  description: string;
  icon: ComponentType<{ className?: string }>;
  moduleKey?: SuperAdminModuleKey;
  title: string;
  items?: string[];
};

type MetricConfig = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  tone: string;
  value: string;
};

type RecordMode = "admins" | "apiActivity" | "audit" | "notifications" | "settings" | "transactions";

type OperationalRecord =
  | SuperAdminAdminRecord
  | SuperAdminApiActivityRecord
  | SuperAdminAuditLog
  | SuperAdminNotificationRecord
  | SuperAdminSettingRecord
  | SuperAdminTransactionRecord;

type RecordsState = {
  pagination: SuperAdminPagination;
  records: OperationalRecord[];
  summary?: {
    total?: number;
    totalAmountUsdt?: number;
  };
};

type ModuleConfig = {
  accent: string;
  detailMode: "audit" | "config" | "exceptions" | "governance" | "transactions";
  focus: string;
  graphTitle: string;
  highlightedSteps: string[];
};

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

const RECORDS_PAGE_SIZE = 10;

const emptyRecordsPagination: SuperAdminPagination = {
  hasNextPage: false,
  hasPreviousPage: false,
  limit: RECORDS_PAGE_SIZE,
  page: 1,
  total: 0,
  totalPages: 1,
};

const moduleConfigs: Record<SuperAdminModuleKey, ModuleConfig> = {
  admins: {
    accent: "cyan",
    detailMode: "governance",
    focus: "Admin account access, promotion, suspension, session review, and role boundaries.",
    graphTitle: "Admin Activity Graph",
    highlightedSteps: ["audit-trail", "deposit-review", "payout-review"],
  },
  auditLogs: {
    accent: "sky",
    detailMode: "audit",
    focus: "Immutable action trail for auth, deposits, payout decisions, wallet edits, and security events.",
    graphTitle: "Audit Coverage Graph",
    highlightedSteps: ["deposit-review", "payout-review", "audit-trail"],
  },
  notifications: {
    accent: "violet",
    detailMode: "governance",
    focus: "Critical alerts for deposits, payouts, security, support, and failed transaction events.",
    graphTitle: "Alert Signal Graph",
    highlightedSteps: ["deposit-request", "weekly-payout", "audit-trail"],
  },
  payoutCorrections: {
    accent: "emerald",
    detailMode: "exceptions",
    focus: "Rejected payout review, reopen control, correction reason tracking, and reversal audit trail.",
    graphTitle: "Payout Exception Graph",
    highlightedSteps: ["weekly-payout", "payout-review", "audit-trail"],
  },
  platformSettings: {
    accent: "violet",
    detailMode: "config",
    focus: "Backend settings, admin wallet policy, payout windows, rate limits, and plan rule health.",
    graphTitle: "Configuration Health Graph",
    highlightedSteps: ["payment-wallet", "weekly-payout", "audit-trail"],
  },
  profile: {
    accent: "cyan",
    detailMode: "governance",
    focus: "Super Admin account security, own session posture, and governance access status.",
    graphTitle: "Governance Activity Graph",
    highlightedSteps: ["audit-trail", "payment-wallet", "payout-review"],
  },
  roles: {
    accent: "blue",
    detailMode: "governance",
    focus: "Role matrix health, admin capability boundary, and permission audit trail.",
    graphTitle: "Permission Activity Graph",
    highlightedSteps: ["audit-trail", "deposit-review", "payout-review"],
  },
  security: {
    accent: "rose",
    detailMode: "exceptions",
    focus: "Failed transaction visibility, session risk, audit spikes, and account lock readiness.",
    graphTitle: "Security Risk Graph",
    highlightedSteps: ["payment-wallet", "withdrawal-queue", "audit-trail"],
  },
  support: {
    accent: "amber",
    detailMode: "exceptions",
    focus: "Escalated cases tied to failed/rejected transactions, payout disputes, and wallet issues.",
    graphTitle: "Support Escalation Graph",
    highlightedSteps: ["deposit-request", "payout-review", "withdrawal-queue"],
  },
  transactions: {
    accent: "emerald",
    detailMode: "transactions",
    focus: "Deposits, withdrawals, rewards, failed rows, pending queues, and lifecycle completion.",
    graphTitle: "Transaction Lifecycle Graph",
    highlightedSteps: ["deposit-request", "wallet-credit", "weekly-payout", "payout-review"],
  },
};

const defaultItemsByModule: Record<SuperAdminModuleKey, string[]> = {
  admins: ["Create or promote admin", "Suspend admin access", "Review admin sessions"],
  auditLogs: ["Action timeline", "Actor filters", "Correction history"],
  notifications: ["Critical alert queue", "Deposit and payout alerts", "Security notifications"],
  payoutCorrections: ["Rejected payout review", "Correction reason", "Reversal ledger"],
  platformSettings: ["Wallet policy", "Payout policy", "Rate-limit policy"],
  profile: ["Session health", "Super Admin role guard", "Recent account audit"],
  roles: ["Role matrix", "Permission groups", "Access history"],
  security: ["Session control", "Admin lock", "Security alerts"],
  support: ["Failed payment escalation", "Payout dispute review", "Support audit trail"],
  transactions: ["Deposit lifecycle", "Reward lifecycle", "Failed transaction review"],
};

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
    year: "numeric",
  }).format(new Date(value));
}

function getTypeCount(overview: SuperAdminOverview, type: string) {
  return overview.typeBreakdown.find((item) => item.type === type)?.count ?? 0;
}

function getConfigCount(overview: SuperAdminOverview, status: string) {
  return overview.configurationHealth.filter((item) => item.status === status).length;
}

function getFailedRate(overview: SuperAdminOverview) {
  if (!overview.metrics.totalTransactions) {
    return "0%";
  }

  return `${Math.round((overview.metrics.failedTransactions / overview.metrics.totalTransactions) * 100)}%`;
}

function getRecordMode(moduleKey: SuperAdminModuleKey): RecordMode {
  if (moduleKey === "admins" || moduleKey === "roles") {
    return "admins";
  }

  if (moduleKey === "auditLogs" || moduleKey === "profile") {
    return "audit";
  }

  if (moduleKey === "notifications") {
    return "notifications";
  }

  if (moduleKey === "platformSettings") {
    return "settings";
  }

  return "transactions";
}

function getRecordPanelTitle(mode: RecordMode) {
  if (mode === "admins") {
    return "Admin Accounts";
  }

  if (mode === "apiActivity") {
    return "API Status & Latency";
  }

  if (mode === "notifications") {
    return "Notification Records";
  }

  if (mode === "audit") {
    return "Audit Action Trail";
  }

  if (mode === "settings") {
    return "Platform Settings";
  }

  return "Transaction Records";
}

function getDefaultRecordFilters(moduleKey: SuperAdminModuleKey, mode: RecordMode) {
  if (moduleKey === "payoutCorrections" && mode === "transactions") {
    return { role: "", status: "rejected", type: "reward" };
  }

  if (moduleKey === "security" && mode === "transactions") {
    return { role: "", status: "failed", type: "" };
  }

  if (moduleKey === "support" && mode === "transactions") {
    return { role: "", status: "rejected", type: "" };
  }

  return { role: "", status: "", type: "" };
}

function isTransactionRecord(record: OperationalRecord): record is SuperAdminTransactionRecord {
  return "amountUsdt" in record && "type" in record;
}

function isAuditRecord(record: OperationalRecord): record is SuperAdminAuditLog {
  return "action" in record && "entityType" in record;
}

function isAdminRecord(record: OperationalRecord): record is SuperAdminAdminRecord {
  return "role" in record && "emailVerified" in record;
}

function isNotificationRecord(record: OperationalRecord): record is SuperAdminNotificationRecord {
  return "title" in record && "readAt" in record;
}

function isApiActivityRecord(record: OperationalRecord): record is SuperAdminApiActivityRecord {
  return "statusCode" in record && "durationMs" in record && "path" in record;
}

function isSettingRecord(record: OperationalRecord): record is SuperAdminSettingRecord {
  return "valueType" in record && "key" in record;
}

function getStatusTone(status: string) {
  if (status === "healthy" || status === "active" || status === "configured" || status === "approved") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (status === "attention" || status === "pending" || status === "idle") {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }

  if (status === "blocked" || status === "failed" || status === "rejected" || status === "required") {
    return "bg-rose-50 text-rose-700 ring-rose-100";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function getStepIcon(status: string) {
  if (status === "healthy") {
    return CheckCircle2;
  }

  if (status === "blocked") {
    return XCircle;
  }

  if (status === "attention") {
    return AlertTriangle;
  }

  return Clock3;
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

function getMetrics(moduleKey: SuperAdminModuleKey, overview: SuperAdminOverview): MetricConfig[] {
  const requiredSettings = getConfigCount(overview, "required");
  const depositCount = getTypeCount(overview, "deposit");

  if (moduleKey === "platformSettings") {
    return [
      {
        icon: Settings,
        label: "Active Settings",
        tone: "bg-violet-50 text-violet-700",
        value: formatNumber(overview.metrics.activeSettings),
      },
      {
        icon: AlertTriangle,
        label: "Required Fixes",
        tone: "bg-rose-50 text-rose-700",
        value: formatNumber(requiredSettings),
      },
      {
        icon: Gauge,
        label: "Config Checks",
        tone: "bg-cyan-50 text-cyan-700",
        value: formatNumber(overview.configurationHealth.length),
      },
      {
        icon: ClipboardList,
        label: "Audit 24h",
        tone: "bg-emerald-50 text-emerald-700",
        value: formatNumber(overview.metrics.auditEvents24h),
      },
    ];
  }

  if (moduleKey === "payoutCorrections") {
    return [
      {
        icon: HandCoins,
        label: "Weekly Rewards",
        tone: "bg-emerald-50 text-emerald-700",
        value: formatNumber(overview.metrics.weeklyPayouts),
      },
      {
        icon: XCircle,
        label: "Rejected Payouts",
        tone: "bg-rose-50 text-rose-700",
        value: formatNumber(overview.metrics.rejectedPayouts),
      },
      {
        icon: Clock3,
        label: "Pending Payouts",
        tone: "bg-amber-50 text-amber-700",
        value: formatNumber(overview.metrics.pendingPayouts),
      },
      {
        icon: ShieldCheck,
        label: "Payout Audits",
        tone: "bg-cyan-50 text-cyan-700",
        value: formatNumber(overview.metrics.payoutAuditEvents),
      },
    ];
  }

  if (moduleKey === "transactions") {
    return [
      {
        icon: Activity,
        label: "All Transactions",
        tone: "bg-cyan-50 text-cyan-700",
        value: formatNumber(overview.metrics.totalTransactions),
      },
      {
        icon: Clock3,
        label: "Pending",
        tone: "bg-amber-50 text-amber-700",
        value: formatNumber(overview.metrics.pendingTransactions),
      },
      {
        icon: ShieldCheck,
        label: "Successful",
        tone: "bg-emerald-50 text-emerald-700",
        value: formatNumber(overview.metrics.successfulTransactions),
      },
      {
        icon: AlertTriangle,
        label: "Failed Rate",
        tone: "bg-rose-50 text-rose-700",
        value: getFailedRate(overview),
      },
    ];
  }

  if (moduleKey === "security" || moduleKey === "support") {
    return [
      {
        icon: ShieldAlert,
        label: moduleKey === "security" ? "Risk Rate" : "Escalation Risk",
        tone: "bg-rose-50 text-rose-700",
        value: getFailedRate(overview),
      },
      {
        icon: AlertTriangle,
        label: "Failed / Rejected",
        tone: "bg-amber-50 text-amber-700",
        value: formatNumber(overview.metrics.failedTransactions),
      },
      {
        icon: ClipboardList,
        label: "Audit 24h",
        tone: "bg-cyan-50 text-cyan-700",
        value: formatNumber(overview.metrics.auditEvents24h),
      },
      {
        icon: UsersRound,
        label: "Active Admins",
        tone: "bg-emerald-50 text-emerald-700",
        value: formatNumber(overview.metrics.activeAdmins + overview.metrics.activeSuperAdmins),
      },
    ];
  }

  if (moduleKey === "notifications") {
    return [
      {
        icon: Bell,
        label: "Notifications",
        tone: "bg-violet-50 text-violet-700",
        value: formatNumber(overview.metrics.totalNotifications),
      },
      {
        icon: Clock3,
        label: "Unread",
        tone: "bg-amber-50 text-amber-700",
        value: formatNumber(overview.metrics.unreadNotifications),
      },
      {
        icon: ShieldAlert,
        label: "Security Alerts",
        tone: "bg-rose-50 text-rose-700",
        value: formatNumber(overview.metrics.securityNotifications),
      },
      {
        icon: Activity,
        label: "API 24h",
        tone: "bg-cyan-50 text-cyan-700",
        value: formatNumber(overview.metrics.apiActivity24h),
      },
    ];
  }

  if (moduleKey === "auditLogs") {
    return [
      {
        icon: ClipboardList,
        label: "Audit 24h",
        tone: "bg-cyan-50 text-cyan-700",
        value: formatNumber(overview.metrics.auditEvents24h),
      },
      {
        icon: Activity,
        label: "API 24h",
        tone: "bg-emerald-50 text-emerald-700",
        value: formatNumber(overview.metrics.apiActivity24h),
      },
      {
        icon: AlertTriangle,
        label: "API Failures",
        tone: "bg-rose-50 text-rose-700",
        value: formatNumber(overview.metrics.failedApiActivity24h),
      },
      {
        icon: FileCheck2,
        label: "Auth Events",
        tone: "bg-violet-50 text-violet-700",
        value: formatNumber(overview.metrics.authAuditEvents),
      },
    ];
  }

  if (moduleKey === "profile") {
    return [
      {
        icon: ShieldCheck,
        label: "Super Admins",
        tone: "bg-emerald-50 text-emerald-700",
        value: formatNumber(overview.metrics.activeSuperAdmins),
      },
      {
        icon: ClipboardList,
        label: "Auth Events",
        tone: "bg-cyan-50 text-cyan-700",
        value: formatNumber(overview.metrics.authAuditEvents),
      },
      {
        icon: AlertTriangle,
        label: "API Failures",
        tone: "bg-rose-50 text-rose-700",
        value: formatNumber(overview.metrics.failedApiActivity24h),
      },
      {
        icon: Activity,
        label: "API 24h",
        tone: "bg-violet-50 text-violet-700",
        value: formatNumber(overview.metrics.apiActivity24h),
      },
    ];
  }

  if (moduleKey === "roles") {
    return [
      {
        icon: UserCog,
        label: "Admins",
        tone: "bg-cyan-50 text-cyan-700",
        value: formatNumber(overview.metrics.activeAdmins),
      },
      {
        icon: ShieldCheck,
        label: "Super Admins",
        tone: "bg-emerald-50 text-emerald-700",
        value: formatNumber(overview.metrics.activeSuperAdmins),
      },
      {
        icon: ClipboardList,
        label: "Admin Audits",
        tone: "bg-amber-50 text-amber-700",
        value: formatNumber(overview.metrics.adminAuditEvents),
      },
      {
        icon: Database,
        label: "Settings",
        tone: "bg-violet-50 text-violet-700",
        value: formatNumber(overview.metrics.activeSettings),
      },
    ];
  }

  if (moduleKey === "admins") {
    return [
      {
        icon: UserCog,
        label: "Admins",
        tone: "bg-cyan-50 text-cyan-700",
        value: formatNumber(overview.metrics.activeAdmins),
      },
      {
        icon: ShieldCheck,
        label: "Super Admins",
        tone: "bg-emerald-50 text-emerald-700",
        value: formatNumber(overview.metrics.activeSuperAdmins),
      },
      {
        icon: ClipboardList,
        label: "Admin Audits",
        tone: "bg-amber-50 text-amber-700",
        value: formatNumber(overview.metrics.adminAuditEvents),
      },
      {
        icon: Activity,
        label: "API 24h",
        tone: "bg-violet-50 text-violet-700",
        value: formatNumber(overview.metrics.apiActivity24h),
      },
    ];
  }

  return [
    {
      icon: UserCog,
      label: "Active Admins",
      tone: "bg-cyan-50 text-cyan-700",
      value: formatNumber(overview.metrics.activeAdmins),
    },
    {
      icon: ShieldCheck,
      label: "Super Admins",
      tone: "bg-emerald-50 text-emerald-700",
      value: formatNumber(overview.metrics.activeSuperAdmins),
    },
    {
      icon: Activity,
      label: "Deposits",
      tone: "bg-violet-50 text-violet-700",
      value: formatNumber(depositCount),
    },
    {
      icon: ClipboardList,
      label: "Audit 24h",
      tone: "bg-amber-50 text-amber-700",
      value: formatNumber(overview.metrics.auditEvents24h),
    },
  ];
}

function ModuleGraph({
  points,
  title,
}: {
  points: SuperAdminDailyPoint[];
  title: string;
}) {
  const data = points.length ? points : fallbackDailyPoints();
  const maxCount = Math.max(1, ...data.map((point) => point.totalCount + point.pendingCount + point.failedCount));
  const maxVolume = Math.max(
    1,
    ...data.map((point) => point.depositsUsdt + point.rewardsUsdt + point.withdrawalsUsdt),
  );
  const linePoints = data
    .map((point, index) => {
      const x = 24 + index * (592 / Math.max(1, data.length - 1));
      const y = 128 - ((point.failedCount + point.pendingCount) / maxCount) * 104;

      return `${x},${Math.max(18, y)}`;
    })
    .join(" ");

  return (
    <SuperAdminCard className="overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-4">
        <div>
          <p className="text-sm font-black text-slate-950">{title}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Seven-day flow for deposits, rewards, withdrawals, pending rows, and exceptions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-black">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">Deposit</span>
          <span className="rounded-full bg-violet-50 px-3 py-1 text-violet-700">Reward</span>
          <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-700">Risk Line</span>
        </div>
      </div>
      <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div className="relative h-72 overflow-hidden rounded-2xl border border-cyan-100 bg-slate-50 p-4">
          <div className="absolute inset-x-4 top-12 h-px bg-slate-200" />
          <div className="absolute inset-x-4 top-28 h-px bg-slate-200" />
          <div className="absolute inset-x-4 top-44 h-px bg-slate-200" />
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-x-4 top-8 h-36 w-[calc(100%-2rem)] overflow-visible"
            viewBox="0 0 640 150"
          >
            <polyline
              fill="none"
              points={linePoints}
              stroke="#ef4444"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="5"
            />
            {linePoints.split(" ").map((point, index) => {
              const [cx, cy] = point.split(",");

              return (
                <circle
                  cx={cx}
                  cy={cy}
                  fill="#fff"
                  key={`${point}-${index}`}
                  r="6"
                  stroke="#ef4444"
                  strokeWidth="3"
                />
              );
            })}
          </svg>
          <div className="absolute inset-x-4 bottom-4 flex h-40 items-end justify-between gap-2">
            {data.map((point) => {
              const depositHeight = Math.max(8, (point.depositsUsdt / maxVolume) * 128);
              const rewardHeight = Math.max(8, (point.rewardsUsdt / maxVolume) * 128);
              const withdrawalHeight = Math.max(8, (point.withdrawalsUsdt / maxVolume) * 128);

              return (
                <div className="flex min-w-0 flex-1 flex-col items-center gap-2" key={point.date}>
                  <div className="flex h-32 items-end gap-1.5">
                    <span
                      className="w-3 rounded-t-full bg-emerald-500"
                      style={{ height: `${depositHeight}px` }}
                      title={`Deposits: ${formatUsdt(point.depositsUsdt)}`}
                    />
                    <span
                      className="w-3 rounded-t-full bg-violet-500"
                      style={{ height: `${rewardHeight}px` }}
                      title={`Rewards: ${formatUsdt(point.rewardsUsdt)}`}
                    />
                    <span
                      className="w-3 rounded-t-full bg-sky-500"
                      style={{ height: `${withdrawalHeight}px` }}
                      title={`Withdrawals: ${formatUsdt(point.withdrawalsUsdt)}`}
                    />
                  </div>
                  <p className="text-[10px] font-black text-slate-500">{formatDate(point.date).slice(0, 6)}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid content-start gap-3">
          {data.slice(-3).map((point) => (
            <div className="rounded-2xl border border-slate-200 bg-white p-3" key={point.date}>
              <p className="text-xs font-black text-slate-950">{formatDate(point.date)}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
                  <p className="text-[10px] font-bold">OK</p>
                  <p className="text-sm font-black">{point.approvedCount}</p>
                </div>
                <div className="rounded-xl bg-amber-50 p-2 text-amber-700">
                  <p className="text-[10px] font-bold">Pending</p>
                  <p className="text-sm font-black">{point.pendingCount}</p>
                </div>
                <div className="rounded-xl bg-rose-50 p-2 text-rose-700">
                  <p className="text-[10px] font-bold">Failed</p>
                  <p className="text-sm font-black">{point.failedCount}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SuperAdminCard>
  );
}

function WorkflowTracker({
  highlightedSteps,
  steps,
}: {
  highlightedSteps: string[];
  steps: SuperAdminWorkflowStep[];
}) {
  const visibleSteps = highlightedSteps.length
    ? steps.filter((step) => highlightedSteps.includes(step.key))
    : steps;

  return (
    <SuperAdminCard className="rounded-2xl">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-4">
        <div>
          <p className="text-sm font-black text-slate-950">Module Flow Tracker</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Relevant Sprint 3 steps for this Super Admin module.
          </p>
        </div>
        <span className="rounded-full bg-cyan-50 px-3 py-1 text-[11px] font-black text-cyan-700">
          Live backend data
        </span>
      </div>
      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
        {visibleSteps.length ? (
          visibleSteps.map((step, index) => {
            const Icon = getStepIcon(step.status);
            const isHighlighted = highlightedSteps.includes(step.key);

            return (
              <div
                className={cn(
                  "rounded-2xl border bg-white p-3",
                  isHighlighted ? "border-cyan-200 shadow-sm" : "border-slate-200",
                )}
                key={step.key}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-600">
                    {index + 1}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black capitalize ring-1",
                      getStatusTone(step.status),
                    )}
                  >
                    <Icon className="size-3" />
                    {step.status}
                  </span>
                </div>
                <p className="mt-3 text-sm font-black text-slate-950">{step.label}</p>
                <p className="mt-1 text-xs font-black text-cyan-700">{step.metric}</p>
                <p className="mt-2 text-[11px] font-semibold leading-relaxed text-slate-500">{step.text}</p>
              </div>
            );
          })
        ) : (
          <p className="col-span-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
            Workflow tracking will appear after backend overview data is available.
          </p>
        )}
      </div>
    </SuperAdminCard>
  );
}

function PaginatedRecordsPanel({
  modeOverride,
  moduleKey,
}: {
  modeOverride?: RecordMode;
  moduleKey: SuperAdminModuleKey;
}) {
  const mode = modeOverride ?? getRecordMode(moduleKey);
  const defaultFilters = useMemo(() => getDefaultRecordFilters(moduleKey, mode), [mode, moduleKey]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(RECORDS_PAGE_SIZE);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState(defaultFilters.status);
  const [type, setType] = useState(defaultFilters.type);
  const [role, setRole] = useState(defaultFilters.role);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [state, setState] = useState<RecordsState>({
    pagination: {
      ...emptyRecordsPagination,
      limit: RECORDS_PAGE_SIZE
    },
    records: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const timerId = window.setTimeout(() => setDebouncedSearch(searchValue.trim()), 350);
    return () => window.clearTimeout(timerId);
  }, [searchValue]);

  useEffect(() => {
    setSearchValue("");
    setDebouncedSearch("");
    setStatus(defaultFilters.status);
    setType(defaultFilters.type);
    setRole(defaultFilters.role);
    setFromDate("");
    setToDate("");
    setPage(1);
  }, [defaultFilters.role, defaultFilters.status, defaultFilters.type]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, fromDate, mode, role, status, toDate, type, limit]);

  useEffect(() => {
    let active = true;
    const commonParams = {
      fromDate: fromDate || undefined,
      limit,
      page,
      search: debouncedSearch || undefined,
      toDate: toDate || undefined,
    };
    const params =
      mode === "audit"
        ? {
            ...commonParams,
            action: status || undefined,
            entityType: type || undefined,
          }
        : mode === "apiActivity"
          ? {
              ...commonParams,
              method: type || undefined,
              role: role || undefined,
              success: status || undefined,
            }
        : mode === "admins"
          ? {
              ...commonParams,
              role: role || undefined,
              status: status || undefined,
            }
          : mode === "notifications"
            ? {
                ...commonParams,
                readStatus: status || undefined,
                type: type || undefined,
              }
          : {
              ...commonParams,
              status: status || undefined,
              type: type || undefined,
            };
    const request =
      mode === "admins"
        ? superAdminService.listAdmins(params)
        : mode === "apiActivity"
          ? superAdminService.listApiActivity(params)
          : mode === "audit"
            ? superAdminService.listAuditLogs(params)
            : mode === "notifications"
              ? superAdminService.listNotifications(params)
            : mode === "settings"
              ? superAdminService.listSettings(params)
              : superAdminService.listTransactions(params);

    setIsLoading(true);
    setError(null);

    request
      .then((response) => {
        if (!active) {
          return;
        }

        setState({
          pagination: response.data.pagination,
          records: response.data.records,
          summary: "summary" in response.data ? response.data.summary : undefined,
        });
      })
      .catch((caughtError) => {
        if (active) {
          setError(caughtError instanceof Error ? caughtError.message : "Unable to load paginated records.");
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
  }, [debouncedSearch, fromDate, mode, page, role, status, toDate, type, limit, refreshTrigger]);

  const pagination = state.pagination;
  const firstRow = pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const lastRow = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <SuperAdminCard className="rounded-2xl">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-4">
        <div>
          <p className="text-sm font-black text-slate-950">{getRecordPanelTitle(mode)}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Showing {firstRow}-{lastRow} of {pagination.total}. Data is loaded page-by-page from backend.
          </p>
        </div>
        <span className="rounded-full bg-cyan-50 px-3 py-1 text-[11px] font-black text-cyan-700">
          Page {pagination.page}/{pagination.totalPages}
        </span>
      </div>

      <div className="grid gap-3 border-b border-slate-100 p-4 lg:grid-cols-[minmax(0,1fr)_160px_160px_160px_160px_auto]">
        <label className="relative block">
          <span className="sr-only">Search records</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-semibold text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder={
              mode === "audit"
                ? "Search action, actor, entity"
                : mode === "apiActivity"
                  ? "Search endpoint, action, user"
                : mode === "admins"
                  ? "Search admin or username"
                  : mode === "notifications"
                    ? "Search title, message, user"
                  : mode === "settings"
                    ? "Search setting key"
                    : "Search user, tx hash, notes"
            }
            type="search"
            value={searchValue}
          />
        </label>

        {mode === "transactions" ? (
          <>
            <select
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-700 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
              onChange={(event) => setType(event.target.value)}
              value={type}
            >
              <option value="">All types</option>
              <option value="deposit">Deposit</option>
              <option value="withdrawal">Withdrawal</option>
              <option value="reward">Reward</option>
              <option value="plan_purchase">Plan Purchase</option>
              <option value="adjustment">Adjustment</option>
            </select>
            <select
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-700 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
              onChange={(event) => setStatus(event.target.value)}
              value={status}
            >
              <option value="">All status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
              <option value="failed">Failed</option>
            </select>
          </>
        ) : null}

        {mode === "admins" ? (
          <>
            <select
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-700 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
              onChange={(event) => setRole(event.target.value)}
              value={role}
            >
              <option value="">All roles</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
            <select
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-700 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
              onChange={(event) => setStatus(event.target.value)}
              value={status}
            >
              <option value="">All status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
          </>
        ) : null}

        {mode === "audit" ? (
          <>
            <input
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
              onChange={(event) => setType(event.target.value)}
              placeholder="Entity type"
              value={type}
            />
            <input
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
              onChange={(event) => setStatus(event.target.value)}
              placeholder="Action contains"
              value={status}
            />
          </>
        ) : null}

        {mode === "apiActivity" ? (
          <>
            <select
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-700 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
              onChange={(event) => setType(event.target.value)}
              value={type}
            >
              <option value="">All methods</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PATCH">PATCH</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
            <select
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-700 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
              onChange={(event) => setStatus(event.target.value)}
              value={status}
            >
              <option value="">All results</option>
              <option value="true">Successful</option>
              <option value="false">Failed</option>
            </select>
            <input
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
              onChange={(event) => setRole(event.target.value)}
              placeholder="Route group"
              value={role}
            />
          </>
        ) : null}

        {mode === "notifications" ? (
          <>
            <select
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-700 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
              onChange={(event) => setType(event.target.value)}
              value={type}
            >
              <option value="">All alerts</option>
              <option value="deposit">Deposit</option>
              <option value="withdrawal">Withdrawal</option>
              <option value="referral">Referral</option>
              <option value="reward">Reward</option>
              <option value="security">Security</option>
              <option value="system">System</option>
            </select>
            <select
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-700 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
              onChange={(event) => setStatus(event.target.value)}
              value={status}
            >
              <option value="">All status</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>
          </>
        ) : null}

        {mode !== "admins" && mode !== "settings" ? (
          <>
            <input
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
              onChange={(event) => setFromDate(event.target.value)}
              type="date"
              value={fromDate}
            />
            <input
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
              onChange={(event) => setToDate(event.target.value)}
              type="date"
              value={toDate}
            />
          </>
        ) : null}

        <button
          className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          onClick={() => {
            setSearchValue("");
            setStatus(defaultFilters.status);
            setType(defaultFilters.type);
            setRole(defaultFilters.role);
            setFromDate("");
            setToDate("");
          }}
          type="button"
        >
          Clear
        </button>
      </div>

      {error ? (
        <div className="mx-4 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left">
          <thead className="bg-white text-xs text-slate-500 shadow-[0_1px_0_#e2e8f0]">
            <tr>
              <th className="px-4 py-3 font-black">Primary</th>
              <th className="px-4 py-3 font-black">Type / Role</th>
              <th className="px-4 py-3 font-black">Status</th>
              <th className="px-4 py-3 font-black">Amount / Detail</th>
              <th className="px-4 py-3 font-black">Date</th>
              {mode === "transactions" && <th className="px-4 py-3 font-black">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }, (_, rowIndex) => (
                <tr className="border-b border-slate-100 last:border-0" key={rowIndex}>
                  {Array.from({ length: 5 }, (_, cellIndex) => (
                    <td className="px-4 py-4" key={cellIndex}>
                      <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
                    </td>
                  ))}
                </tr>
              ))
            ) : state.records.length ? (
              state.records.map((record) => {
                const id = record.id;

                if (isApiActivityRecord(record)) {
                  return (
                    <tr className="border-b border-slate-100 bg-white last:border-0 hover:bg-cyan-50/40" key={id}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-black text-slate-950">{record.action}</p>
                        <p className="mt-1 max-w-[360px] truncate font-mono text-xs font-semibold text-slate-500">
                          {record.path}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-black text-slate-700">{record.method}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{record.routeGroup}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-black ring-1",
                            record.success
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                              : "bg-rose-50 text-rose-700 ring-rose-100",
                          )}
                        >
                          {record.statusCode}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-black text-slate-950">{record.durationMs} ms</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {record.user?.username ?? record.userRole ?? "Guest"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-500">{formatDate(record.createdAt)}</td>
                    </tr>
                  );
                }

                if (isNotificationRecord(record)) {
                  const notificationStatus = record.readAt ? "read" : "unread";

                  return (
                    <tr className="border-b border-slate-100 bg-white last:border-0 hover:bg-cyan-50/40" key={id}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-black text-slate-950">{record.title}</p>
                        <p className="mt-1 max-w-[360px] truncate text-xs font-semibold text-slate-500">
                          {record.message}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm font-black capitalize text-slate-700">{record.type}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-black capitalize ring-1",
                            notificationStatus === "unread"
                              ? "bg-amber-50 text-amber-700 ring-amber-100"
                              : "bg-emerald-50 text-emerald-700 ring-emerald-100",
                          )}
                        >
                          {notificationStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-500">
                        {record.user?.username ?? "System"}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-500">{formatDate(record.createdAt)}</td>
                    </tr>
                  );
                }

                if (isTransactionRecord(record)) {
                  return (
                    <tr className="border-b border-slate-100 bg-white last:border-0 hover:bg-cyan-50/40" key={id}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-black text-slate-950">
                          {record.user?.username ?? "Unknown user"}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{record.txnHash ?? "No tx hash"}</p>
                      </td>
                      <td className="px-4 py-3 text-sm font-black capitalize text-slate-700">{record.type}</td>
                      <td className="px-4 py-3">
                        <span className={cn("rounded-full px-3 py-1 text-xs font-black capitalize ring-1", getStatusTone(record.status))}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-black text-slate-950">{formatUsdt(record.amountUsdt)}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-500">{formatDate(record.createdAt)}</td>
                      <td className="px-4 py-3">
                        <select
                          className="h-8 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-xs font-black text-slate-700 outline-none focus:border-cyan-300"
                          value={record.status}
                          onChange={async (e) => {
                            const newStatus = e.target.value;
                            if (window.confirm(`Are you sure you want to force override transaction status to "${newStatus}"?`)) {
                              try {
                                await superAdminService.overrideTransactionStatus(record.id, newStatus, "Status corrected via Super Admin Console");
                                toast.success("Transaction status overridden successfully.");
                                setRefreshTrigger(prev => prev + 1);
                              } catch (err: any) {
                                toast.error(err instanceof Error ? err.message : "Failed to override transaction status.");
                              }
                            }
                          }}
                        >
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="completed">Completed</option>
                          <option value="rejected">Rejected</option>
                          <option value="failed">Failed</option>
                        </select>
                      </td>
                    </tr>
                  );
                }

                if (isAuditRecord(record)) {
                  return (
                    <tr className="border-b border-slate-100 bg-white last:border-0 hover:bg-cyan-50/40" key={id}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-black text-slate-950">{record.action}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {record.actor?.username ?? "System"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm font-black text-slate-700">{record.entityType}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-500">{record.ipAddress || "No IP"}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-500">{record.entityId || "No entity"}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-500">{formatDate(record.createdAt)}</td>
                    </tr>
                  );
                }

                if (isAdminRecord(record)) {
                  return (
                    <tr className="border-b border-slate-100 bg-white last:border-0 hover:bg-cyan-50/40" key={id}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-black text-slate-950">{record.username ?? "Unknown admin"}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{record.role}</p>
                      </td>
                      <td className="px-4 py-3 text-sm font-black text-slate-700">{record.role}</td>
                      <td className="px-4 py-3">
                        <span className={cn("rounded-full px-3 py-1 text-xs font-black capitalize ring-1", getStatusTone(record.status))}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-500">
                        {record.emailVerified ? "Email verified" : "Email pending"}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-500">{formatDate(record.joinedAt)}</td>
                    </tr>
                  );
                }

                if (isSettingRecord(record)) {
                  return (
                    <tr className="border-b border-slate-100 bg-white last:border-0 hover:bg-cyan-50/40" key={id}>
                      <td className="px-4 py-3 text-sm font-black text-slate-950">{record.key}</td>
                      <td className="px-4 py-3 text-sm font-black text-slate-700">setting</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                          active
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-500">{record.valueType}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-500">{formatDate(record.updatedAt)}</td>
                    </tr>
                  );
                }

                return null;
              })
            ) : (
              <tr>
                <td className="py-12 text-center text-sm font-semibold text-slate-500" colSpan={5}>
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4">
        <p className="text-xs font-semibold text-slate-500">
          {pagination.total
            ? `Showing ${formatNumber(firstRow)}-${formatNumber(lastRow)} of ${formatNumber(pagination.total)}`
            : "No matching data"}
          {state.summary?.totalAmountUsdt ? ` · ${formatUsdt(state.summary.totalAmountUsdt)}` : ""}
        </p>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mr-2">
            <span>Show rows:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 outline-none transition-colors focus:border-cyan-300"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 disabled:bg-slate-100 disabled:text-slate-400"
            disabled={!pagination.hasPreviousPage || isLoading}
            onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
            type="button"
          >
            <ChevronLeft className="size-4" />
            Prev
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 disabled:bg-slate-100 disabled:text-slate-400"
            disabled={!pagination.hasNextPage || isLoading}
            onClick={() => setPage((currentPage) => currentPage + 1)}
            type="button"
          >
            Next
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </SuperAdminCard>
  );
}

function AuditTimeline({ logs }: { logs: SuperAdminAuditLog[] }) {
  return (
    <SuperAdminCard className="rounded-2xl">
      <div className="border-b border-slate-100 p-4">
        <p className="text-sm font-black text-slate-950">Recent Audit Timeline</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">Latest immutable backend action records.</p>
      </div>
      <div className="space-y-3 p-4">
        {logs.length ? (
          logs.map((log) => (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3" key={log.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-950">{log.action}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{log.entityType}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black text-slate-500 ring-1 ring-slate-200">
                  {formatDate(log.createdAt)}
                </span>
              </div>
              <p className="mt-2 text-[11px] font-semibold text-slate-400">IP: {log.ipAddress || "Not captured"}</p>
            </div>
          ))
        ) : (
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
            No audit logs found yet.
          </p>
        )}
      </div>
    </SuperAdminCard>
  );
}

function ConfigurationPanel({ items }: { items: SuperAdminConfigurationHealth[] }) {
  return (
    <SuperAdminCard className="rounded-2xl">
      <div className="border-b border-slate-100 p-4">
        <p className="text-sm font-black text-slate-950">Backend Configuration Health</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          Settings Super Admin must own before production.
        </p>
      </div>
      <div className="grid gap-3 p-4">
        {items.length ? (
          items.map((item) => (
            <div className="rounded-xl border border-slate-200 bg-white p-3" key={item.key}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-950">{item.label}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{item.value}</p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-[10px] font-black capitalize ring-1",
                    getStatusTone(item.status),
                  )}
                >
                  {item.status}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
            No configuration records found.
          </p>
        )}
      </div>
    </SuperAdminCard>
  );
}

function ExceptionPanel({ exceptions }: { exceptions: SuperAdminTransactionException[] }) {
  return (
    <SuperAdminCard className="rounded-2xl">
      <div className="border-b border-slate-100 p-4">
        <p className="text-sm font-black text-slate-950">Exception Review Queue</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          Failed/rejected rows that need Super Admin visibility.
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
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-[10px] font-black capitalize ring-1",
                    getStatusTone(transaction.status),
                  )}
                >
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

function BreakdownPanel({ overview }: { overview: SuperAdminOverview }) {
  return (
    <SuperAdminCard className="rounded-2xl">
      <div className="border-b border-slate-100 p-4">
        <p className="text-sm font-black text-slate-950">Transaction Breakdown</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">Status and type health for ledger tracking.</p>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        {[...overview.statusBreakdown, ...overview.typeBreakdown].length ? (
          [...overview.statusBreakdown, ...overview.typeBreakdown].map((item) => {
            const label = ("status" in item ? item.status : item.type) ?? "unknown";

            return (
              <div className="rounded-xl border border-slate-200 bg-white p-3" key={label}>
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-[10px] font-black capitalize ring-1",
                      getStatusTone(label),
                    )}
                  >
                    {label}
                  </span>
                  <p className="text-sm font-black text-slate-950">{item.count}</p>
                </div>
                <p className="mt-3 text-xs font-bold text-slate-500">{formatUsdt(item.amountUsdt)}</p>
              </div>
            );
          })
        ) : (
          <p className="col-span-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
            No transaction breakdown available yet.
          </p>
        )}
      </div>
    </SuperAdminCard>
  );
}

function ControlFocusPanel({
  items,
  moduleKey,
}: {
  items: string[];
  moduleKey: SuperAdminModuleKey;
}) {
  const icons: ComponentType<{ className?: string }>[] = [
    ListChecks,
    GitBranch,
    LockKeyhole,
    Bell,
    LifeBuoy,
    Wallet,
  ];

  return (
    <SuperAdminCard className="rounded-2xl">
      <div className="border-b border-slate-100 p-4">
        <p className="text-sm font-black text-slate-950">Control Checklist</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          Operational controls for this Super Admin module.
        </p>
      </div>
      <div className="grid gap-3 p-4">
        {items.map((item, index) => {
          const Icon = icons[index % icons.length];

          return (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3" key={item}>
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-cyan-700 ring-1 ring-slate-200">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-950">{item}</p>
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                    {moduleKey === "payoutCorrections"
                      ? "Super Admin approval will be required before rejected payout rows can be corrected."
                      : "Tracked through backend metrics, audit logs, and module-level governance rules."}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </SuperAdminCard>
  );
}

function ModuleDetails({
  config,
  items,
  moduleKey,
  overview,
}: {
  config: ModuleConfig;
  items: string[];
  moduleKey: SuperAdminModuleKey;
  overview: SuperAdminOverview;
}) {
  if (config.detailMode === "audit") {
    return (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <AuditTimeline logs={overview.recentAuditLogs} />
        <ControlFocusPanel items={items} moduleKey={moduleKey} />
      </div>
    );
  }

  if (config.detailMode === "config") {
    return (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <ConfigurationPanel items={overview.configurationHealth} />
        <ControlFocusPanel items={items} moduleKey={moduleKey} />
      </div>
    );
  }

  if (config.detailMode === "transactions") {
    return (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <BreakdownPanel overview={overview} />
        <ExceptionPanel exceptions={overview.recentExceptions} />
      </div>
    );
  }

  if (config.detailMode === "exceptions") {
    return (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <ExceptionPanel exceptions={overview.recentExceptions} />
        <ControlFocusPanel items={items} moduleKey={moduleKey} />
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <ControlFocusPanel items={items} moduleKey={moduleKey} />
      <AuditTimeline logs={overview.recentAuditLogs} />
    </div>
  );
}

function PayoutSummaryPanel() {
  const [data, setData] = useState<SuperAdminPayoutSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    superAdminService.getPayoutSummary()
      .then((res) => {
        if (active) {
          setData(res.data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <SuperAdminCard className="p-6">
        <div className="flex h-32 items-center justify-center">
          <div className="size-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
        </div>
      </SuperAdminCard>
    );
  }

  if (!data) return null;

  const formatDateWithTime = (isoString: string | null) => {
    if (!isoString) return "No payouts generated today";
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    }).format(date);
  };

  const isToday = (dateString: string) => {
    const d = new Date(dateString);
    const today = new Date();
    return d.getUTCDate() === today.getUTCDate() &&
           d.getUTCMonth() === today.getUTCMonth() &&
           d.getUTCFullYear() === today.getUTCFullYear();
  };

  const formattedRunDate = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(data.runDate));

  return (
    <SuperAdminCard className="rounded-2xl p-6">
      <div className="border-b border-slate-100 pb-4 mb-4">
        <p className="text-base font-black text-slate-950">
          {isToday(data.runDate) ? "Today's Payout & Reward Summary" : `Latest Payout Run Summary (${formattedRunDate})`}
        </p>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          Aggregated metrics for weekly rewards, level commissions, and royalty cuts generated on this run cycle.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold text-slate-400">Total Generated</p>
          <p className="mt-2 text-xl font-black text-slate-900">{formatUsdt(data.todayStats.totalAmountGenerated)}</p>
          <p className="text-[10px] text-slate-500 mt-1">Sum of all generated rewards</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold text-slate-400">Total Sent / Credited</p>
          <p className="mt-2 text-xl font-black text-emerald-600">{formatUsdt(data.todayStats.totalAmountSent)}</p>
          <p className="text-[10px] text-slate-500 mt-1">Completed & approved status</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold text-slate-400">Recipient Users Count</p>
          <p className="mt-2 text-xl font-black text-slate-900">{data.todayStats.usersCount} Users</p>
          <p className="text-[10px] text-slate-500 mt-1">Unique user wallets credited</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold text-slate-400">Total Payout Transactions</p>
          <p className="mt-2 text-xl font-black text-slate-900">{data.todayStats.totalCount} Rows</p>
          <p className="text-[10px] text-slate-500 mt-1">Individual ledger records</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <p className="text-sm font-black text-slate-900 mb-3 border-b pb-1">Payout Kind Breakdown</p>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
              <span className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-cyan-400" />
                Weekly Performance ROI
              </span>
              <span>{data.breakdown.weekly.count} items ({formatUsdt(data.breakdown.weekly.amount)})</span>
            </div>
            <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
              <span className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-purple-400" />
                Level Commissions
              </span>
              <span>{data.breakdown.level.count} items ({formatUsdt(data.breakdown.level.amount)})</span>
            </div>
            <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
              <span className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-amber-400" />
                Salary & Royalty Rewards
              </span>
              <span>{data.breakdown.royalty.count} items ({formatUsdt(data.breakdown.royalty.amount)})</span>
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm font-black text-slate-900 mb-3 border-b pb-1">Execution Timings</p>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-bold text-slate-400">Generated On (Creation Time)</p>
              <p className="text-sm font-black text-slate-800 mt-0.5">{formatDateWithTime(data.timing.createdTime)}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400">Credited On (Settlement Time)</p>
              <p className="text-sm font-black text-emerald-600 mt-0.5">{formatDateWithTime(data.timing.creditedTime)}</p>
            </div>
          </div>
        </div>
      </div>
    </SuperAdminCard>
  );
}

function SkippedPayoutsDetectorPanel() {
  const [list, setList] = useState<SuperAdminSkippedPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchSkipped = () => {
    setLoading(true);
    superAdminService.getSkippedPayouts()
      .then((res) => {
        setList(res.data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSkipped();
  }, []);

  const handleForcePayout = async (item: SuperAdminSkippedPayout) => {
    const confirmation = window.confirm(
      `Force Payout Confirmation:\n\nUser: ${item.username}\nType: ${item.payoutKind.toUpperCase()}\nAmount: ${formatUsdt(item.amountUsdt)}\n\nAre you sure you want to generate and credit this payout transaction manually?`
    );
    if (!confirmation) return;

    setProcessingId(`${item.userId}-${item.sourceId}`);
    try {
      await superAdminService.processSkippedPayout({
        userId: item.userId,
        payoutKind: item.payoutKind,
        amountUsdt: item.amountUsdt,
        sourceId: item.sourceId,
        notes: `Manual force correction via Skipped Payout Detector: ${item.description}`
      });
      toast.success("Payout generated and credited successfully!");
      fetchSkipped();
    } catch (err: any) {
      toast.error(err instanceof Error ? err.message : "Failed to force credit payout.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <SuperAdminCard className="rounded-2xl p-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
        <div>
          <p className="text-base font-black text-slate-950">Skipped / Missing Payout Exceptions Detector</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Automatically extracts users who met eligibility for level income, daily ROI, or rank salaries, but got skipped during run distributions.
          </p>
        </div>
        <button
          onClick={fetchSkipped}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          type="button"
          disabled={loading}
        >
          {loading ? "Scanning..." : "Re-Scan"}
        </button>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="size-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
        </div>
      ) : list.length === 0 ? (
        <p className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          No skipped payouts detected! All eligible users have successfully received their payout transactions.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-black">User Details</th>
                <th className="px-4 py-3 font-black">Type</th>
                <th className="px-4 py-3 font-black">Description</th>
                <th className="px-4 py-3 font-black">Estimated Payout</th>
                <th className="px-4 py-3 font-black">Eligibility Rule Details</th>
                <th className="px-4 py-3 font-black">Action</th>
              </tr>
            </thead>
            <tbody>
              {list.map((item) => {
                const uniqueKey = `${item.userId}-${item.sourceId}-${item.payoutKind}`;
                const isProcessing = processingId === `${item.userId}-${item.sourceId}`;
                return (
                  <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50" key={uniqueKey}>
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-black text-slate-900">{item.username}</p>
                      <p className="text-xs text-slate-500 font-semibold">{item.email}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-black capitalize ring-1",
                        item.payoutKind === "weekly" ? "bg-cyan-50 text-cyan-700 ring-cyan-100" :
                        item.payoutKind === "level" ? "bg-purple-50 text-purple-700 ring-purple-100" :
                        "bg-amber-50 text-amber-700 ring-amber-100"
                      )}>
                        {item.payoutKind}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-slate-800">{item.description}</td>
                    <td className="px-4 py-3.5 text-sm font-black text-slate-900">{formatUsdt(item.amountUsdt)}</td>
                    <td className="px-4 py-3.5 text-[11px] font-semibold text-slate-500 max-w-xs">{item.details}</td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => handleForcePayout(item)}
                        disabled={isProcessing}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-black text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                        type="button"
                      >
                        {isProcessing ? "Processing..." : "Force Payout"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SuperAdminCard>
  );
}

export function SuperAdminModulePage({
  description,
  icon: Icon,
  items = [],
  moduleKey = "auditLogs",
  title,
}: SuperAdminModulePageProps) {
  const [overview, setOverview] = useState<SuperAdminOverview>(fallbackOverview);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const config = moduleConfigs[moduleKey];
  const controlItems = items.length ? items : defaultItemsByModule[moduleKey];
  const showGraph = ["security", "support", "transactions"].includes(moduleKey);
  const showWorkflow = moduleKey === "transactions";
  const showDetails = ["admins", "platformSettings", "profile", "roles", "transactions"].includes(moduleKey);

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
          setError(caughtError instanceof Error ? caughtError.message : "Unable to load Super Admin module data.");
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

  const metricCards = useMemo(() => getMetrics(moduleKey, overview), [moduleKey, overview]);

  return (
    <section className="space-y-4">
      <SuperAdminPageHeader description={description} title={title} />

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
          {error}
        </div>
      ) : null}

      <SuperAdminCard className="rounded-2xl">
        <div className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div className="flex min-w-0 items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-cyan-50 text-cyan-700">
              <Icon className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-base font-black text-slate-950">{title}</p>
              <p className="mt-1 max-w-3xl text-sm font-semibold leading-relaxed text-slate-500">
                {config.focus}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "rounded-full px-3 py-1 text-[11px] font-black capitalize ring-1",
              isLoading ? "bg-slate-100 text-slate-600 ring-slate-200" : "bg-emerald-50 text-emerald-700 ring-emerald-100",
            )}
          >
            {isLoading ? "Syncing" : "Live"}
          </span>
        </div>
      </SuperAdminCard>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((metric) => (
          <SuperAdminMetricCard
            icon={metric.icon}
            key={metric.label}
            label={metric.label}
            tone={metric.tone}
            value={isLoading ? "Loading..." : metric.value}
          />
        ))}
      </div>

      {showGraph ? <ModuleGraph points={overview.dailySeries} title={config.graphTitle} /> : null}

      {showWorkflow ? (
        <WorkflowTracker highlightedSteps={config.highlightedSteps} steps={overview.workflowSteps} />
      ) : null}

      {moduleKey === "auditLogs" ? (
        <PaginatedRecordsPanel modeOverride="apiActivity" moduleKey={moduleKey} />
      ) : null}

      {moduleKey === "payoutCorrections" ? (
        <>
          <PayoutSummaryPanel />
          <SkippedPayoutsDetectorPanel />
        </>
      ) : null}

      <PaginatedRecordsPanel moduleKey={moduleKey} />

      {showDetails ? (
        <ModuleDetails config={config} items={controlItems} moduleKey={moduleKey} overview={overview} />
      ) : null}
    </section>
  );
}
