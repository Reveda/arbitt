import { useEffect, useState } from "react";
import {
  BadgeDollarSign,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  HandCoins,
  Loader2,
  Search,
  XCircle,
  Crown,
  Layers,
  Percent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { Input } from "@/components/ui/input";
import {
  ToastMessage,
  type ToastMessageValue,
} from "@/components/ui/toast-message";
import { useAdminPayouts } from "@/hooks/useAdminQueries";
import { cn } from "@/lib/utils";
import { adminService, type AdminPayout } from "@/services/admin.service";
import {
  useReviewAdminPayoutMutation,
} from "@/store/api/adminApi";
import { getQueryErrorMessage } from "@/store/api/queryError";
import { AdminCard, AdminPageHeader } from "./admin.components";

const PAGE_SIZE = 10;

type ReviewAction = "approve" | "reject";
type ReviewConfirmation = {
  action: ReviewAction;
  payout: AdminPayout;
};

const STATUS_FILTERS = [
  { label: "All status", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "Completed", value: "completed" },
  { label: "Failed", value: "failed" },
];

function formatUsdt(value: number) {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 18,
    minimumFractionDigits: 0,
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
    timeZone: "UTC",
  }).format(new Date(value));
}

function getUserName(payout: AdminPayout) {
  return payout.user?.username ?? "Unknown user";
}

const STATUS_TONES: Record<string, string> = {
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  pending: "bg-amber-50 text-amber-700 ring-amber-100",
  rejected: "bg-rose-50 text-rose-700 ring-rose-100",
  failed: "bg-rose-50 text-rose-700 ring-rose-100",
};

function getStatusTone(status: string) {
  return STATUS_TONES[status] ?? "bg-slate-100 text-slate-600 ring-slate-200";
}

function getPayoutKindLabel(kind: string) {
  if (kind === "level") {
    return "Level";
  }

  if (kind === "salary_royalty") {
    return "Royalty";
  }

  return "ROI";
}

export function AdminPayoutsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [status, setStatus] = useState("all");
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [activeTab, setActiveTab] = useState<"salary_royalty" | "level" | "weekly">("salary_royalty");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [message, setMessage] = useState<ToastMessageValue | null>(null);
  const [confirmation, setConfirmation] = useState<ReviewConfirmation | null>(
    null,
  );
  const [reviewAdminPayout] = useReviewAdminPayoutMutation();
  const [totalWithdrawals, setTotalWithdrawals] = useState<number>(0);
  const [totalRoiGenerated, setTotalRoiGenerated] = useState<number>(0);

  useEffect(() => {
    adminService
      .getOverview({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      })
      .then((res) => {
        setTotalWithdrawals(res.data.totalWithdrawalsUsdt);
        setTotalRoiGenerated(res.data.totalRoiGeneratedUsdt);
      })
      .catch((err) => console.error("Error loading overview for payouts page:", err));
  }, [fromDate, toDate]);

  const handleExportCsv = async () => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.append("search", debouncedSearch);
    if (status !== "all") params.append("status", status);
    if (fromDate) params.append("fromDate", fromDate);
    if (toDate) params.append("toDate", toDate);
    if (activeTab) params.append("payoutKind", activeTab);

    const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api/v1").replace(/\/$/, "");
    const url = `${API_BASE_URL}/admin/payouts/export?${params.toString()}`;

    try {
      const response = await fetch(url, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to export payouts.");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", `payouts-export-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Unable to export payouts.",
        tone: "error",
      });
    }
  };

  useEffect(() => {
    const timerId = window.setTimeout(
      () => setDebouncedSearch(searchValue.trim()),
      350,
    );
    return () => window.clearTimeout(timerId);
  }, [searchValue]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, fromDate, status, toDate, activeTab]);

  const payoutsQuery = useAdminPayouts({
    page,
    limit,
    search: debouncedSearch || undefined,
    status: status === "all" ? undefined : status,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    payoutKind: activeTab,
  });
  const data = payoutsQuery.data?.data;
  const payouts = data?.payouts ?? [];
  const summary = data?.summary ?? {
    approvedCount: 0,
    pendingCount: 0,
    rejectedCount: 0,
    totalApprovedUsdt: 0,
    totalPayoutUsdt: 0,
    totalPendingUsdt: 0,
  };
  const pagination = data?.pagination ?? {
    hasNextPage: false,
    hasPreviousPage: false,
    limit,
    page,
    total: 0,
    totalPages: 1,
  };
  const firstRow =
    pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const lastRow = Math.min(
    pagination.page * pagination.limit,
    pagination.total,
  );

  const stats = [
    {
      icon: HandCoins,
      label: "Generated",
      tone: "bg-cyan-50 text-cyan-700",
      value: formatUsdt(summary.totalPayoutUsdt),
    },
    {
      icon: Percent,
      label: "ROI Generated",
      tone: "bg-blue-50 text-blue-700",
      value: formatUsdt(totalRoiGenerated),
    },
    {
      icon: BadgeDollarSign,
      label: "Earnings Paid",
      tone: "bg-emerald-50 text-emerald-700",
      value: formatUsdt(totalWithdrawals),
    },
  ];



  const reviewPayout = async (payout: AdminPayout, action: ReviewAction) => {
    setReviewingId(payout.id);
    setMessage(null);
    setConfirmation(null);

    try {
      await reviewAdminPayout({ action, transactionId: payout.id }).unwrap();
      setMessage({
        text:
          action === "approve"
            ? `${formatUsdt(payout.amountUsdt)} payout approved and credited to ${getUserName(payout)}.`
            : `${formatUsdt(payout.amountUsdt)} payout rejected for ${getUserName(payout)}.`,
        tone: action === "approve" ? "success" : "error",
      });
    } catch (caughtError) {
      setMessage({
        text:
          getQueryErrorMessage(caughtError, "Unable to review payout.") ??
          "Unable to review payout.",
        tone: "error",
      });
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <section className="space-y-4">
      <AdminPageHeader
        description="Generate weekly pool rewards, level income, royalty bonuses, and credit wallets after approval."
        title="Payouts"
      />

      {payoutsQuery.error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
          {payoutsQuery.error}
        </div>
      ) : null}

      <ToastMessage message={message} onClose={() => setMessage(null)} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <AdminCard className="rounded-2xl" key={stat.label}>
              <div className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-500">
                    {stat.label}
                  </p>
                  <p className="mt-1 truncate text-sm font-black text-slate-950 sm:text-base">
                    {stat.value}
                  </p>
                </div>
                <span
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-xl",
                    stat.tone,
                  )}
                >
                  <Icon className="size-4" />
                </span>
              </div>
            </AdminCard>
          );
        })}
      </div>



      <AdminCard>
        <div className="grid gap-3 p-4 lg:grid-cols-[1fr_180px_auto]">
          <label className="relative block">
            <span className="sr-only">Search payouts</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-10 text-slate-900 placeholder:text-slate-400"
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search user or tier"
              type="search"
              value={searchValue}
            />
          </label>

          <select
            className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 shadow-sm outline-none transition-colors focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
            onChange={(event) => setStatus(event.target.value)}
            value={status}
          >
            {STATUS_FILTERS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <Button
            className="h-11 rounded-xl"
            onClick={() => {
              setSearchValue("");
              setDebouncedSearch("");
              setStatus("all");
              setFromDate("");
              setToDate("");
            }}
            type="button"
            variant="outline"
          >
            Clear
          </Button>
        </div>
      </AdminCard>

      {/* Tabs Selector */}
      <div className="grid grid-cols-3 gap-1 bg-slate-100/80 p-1 rounded-2xl">
        <button
          onClick={() => setActiveTab("salary_royalty")}
          className={cn(
            "flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm font-black transition-all duration-200 rounded-xl outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 select-none",
            activeTab === "salary_royalty"
              ? "bg-white text-cyan-700 shadow-sm border border-slate-200/50"
              : "text-slate-500 hover:text-slate-900 hover:bg-white/40 border border-transparent"
          )}
        >
          <Crown className="size-4 shrink-0 text-cyan-600" />
          <span>Royalty</span>
        </button>
        <button
          onClick={() => setActiveTab("level")}
          className={cn(
            "flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm font-black transition-all duration-200 rounded-xl outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 select-none",
            activeTab === "level"
              ? "bg-white text-cyan-700 shadow-sm border border-slate-200/50"
              : "text-slate-500 hover:text-slate-900 hover:bg-white/40 border border-transparent"
          )}
        >
          <Layers className="size-4 shrink-0 text-cyan-600" />
          <span>Level</span>
        </button>
        <button
          onClick={() => setActiveTab("weekly")}
          className={cn(
            "flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm font-black transition-all duration-200 rounded-xl outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 select-none",
            activeTab === "weekly"
              ? "bg-white text-cyan-700 shadow-sm border border-slate-200/50"
              : "text-slate-500 hover:text-slate-900 hover:bg-white/40 border border-transparent"
          )}
        >
          <Percent className="size-4 shrink-0 text-cyan-600" />
          <span>ROI</span>
        </button>
      </div>

      <AdminCard className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 relative z-30">
          <div>
            <p className="text-sm font-black text-slate-950">Payout Records</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Showing {firstRow}-{lastRow} of {pagination.total} payout records
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">

            <Button
              className="h-9 rounded-xl bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-50 disabled:bg-cyan-600/50 disabled:cursor-not-allowed"
              disabled={payouts.length === 0}
              onClick={handleExportCsv}
              size="sm"
              type="button"
            >
              <Download className="size-4" />
              Export CSV
            </Button>
            <DateRangeFilter
              fromDate={fromDate}
              onApply={(range) => {
                setFromDate(range.fromDate);
                setToDate(range.toDate);
              }}
              toDate={toDate}
            />
            <span className="rounded-full bg-cyan-50 px-3 py-1 text-[11px] font-black text-cyan-700">
              Page {pagination.page} / {pagination.totalPages}
            </span>
          </div>
        </div>

        <div className={cn("overflow-x-auto transition-all duration-300", payoutsQuery.isLoading ? "opacity-50" : "opacity-100")}>
          <table className="w-full min-w-[1160px] text-left">
            <thead className="bg-white text-xs text-slate-500 shadow-[0_1px_0_#e2e8f0]">
              <tr>
                <th className="px-4 py-3 font-black">User</th>
                <th className="px-4 py-3 font-black">Type</th>
                <th className="px-4 py-3 font-black">Amount</th>
                <th className="px-4 py-3 font-black">Tier</th>
                <th className="px-4 py-3 font-black">Principal</th>
                <th className="px-4 py-3 font-black">Period</th>
                <th className="px-4 py-3 font-black">Status</th>
                <th className="px-4 py-3 font-black">Created</th>
                <th className="px-4 py-3 text-right font-black">Action</th>
              </tr>
            </thead>
            <tbody>
              {payoutsQuery.isLoading ? (
                Array.from({ length: 5 }, (_, rowIndex) => (
                  <tr
                    className="border-b border-slate-100 last:border-0"
                    key={rowIndex}
                  >
                    {Array.from({ length: 9 }, (_, cellIndex) => (
                      <td className="px-4 py-4" key={cellIndex}>
                        <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : payouts.length ? (
                payouts.map((payout) => (
                  <tr
                    className="border-b border-slate-100 bg-white last:border-0 hover:bg-cyan-50/40"
                    key={payout.id}
                  >
                    <td className="px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cyan-50 text-sm font-black uppercase text-cyan-700 ring-1 ring-cyan-100">
                          {getUserName(payout).charAt(0)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-950">
                            {getUserName(payout)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                        {getPayoutKindLabel(payout.payoutKind)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-black text-slate-900">
                      {formatUsdt(payout.amountUsdt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                        {payout.payoutTier ??
                          getPayoutKindLabel(payout.payoutKind)}
                        {payout.payoutPercent !== null
                          ? ` - ${payout.payoutPercent}%`
                          : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-500">
                      {formatUsdt(payout.payoutPrincipalUsdt ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-500">
                      {payout.payoutPeriodStart || payout.payoutPeriodEnd
                        ? `${formatDate(payout.payoutPeriodStart)} - ${formatDate(payout.payoutPeriodEnd)}`
                        : "One-time"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-black capitalize ring-1",
                          getStatusTone(payout.status),
                        )}
                      >
                        {payout.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-500">
                      {formatDate(payout.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <BadgeDollarSign className={cn("size-4", payout.status === "pending" ? "text-amber-500" : payout.status === "rejected" || payout.status === "failed" ? "text-rose-400" : "text-emerald-500")} />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    className="py-12 text-center text-sm font-semibold text-slate-500"
                    colSpan={9}
                  >
                    {debouncedSearch || status !== "all" || fromDate || toDate
                      ? "No payout records match these filters."
                      : "No payout records found. Generate weekly payouts first."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4">
          <p className="text-xs font-semibold text-slate-500">
            {pagination.total
              ? `Showing ${firstRow}-${lastRow} of ${pagination.total}`
              : "No payout rows yet"}
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
            <Button
              className="h-9 rounded-xl border-slate-200 bg-white text-slate-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-100"
              disabled={!pagination.hasPreviousPage || payoutsQuery.isLoading}
              onClick={() =>
                setPage((currentPage) => Math.max(1, currentPage - 1))
              }
              type="button"
              variant="outline"
            >
              <ChevronLeft className="size-4" />
              Prev
            </Button>
            <Button
              className="h-9 rounded-xl border-slate-200 bg-white text-slate-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-100"
              disabled={!pagination.hasNextPage || payoutsQuery.isLoading}
              onClick={() => setPage((currentPage) => currentPage + 1)}
              type="button"
              variant="outline"
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </AdminCard>

      {confirmation ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-2xl">
            <div
              className={cn(
                "flex items-center gap-3 border-b px-4 py-4",
                confirmation.action === "approve"
                  ? "border-emerald-100 bg-emerald-50"
                  : "border-rose-100 bg-rose-50",
              )}
            >
              <span
                className={cn(
                  "grid size-10 place-items-center rounded-xl bg-white",
                  confirmation.action === "approve"
                    ? "text-emerald-700"
                    : "text-rose-600",
                )}
              >
                {confirmation.action === "approve" ? (
                  <CheckCircle2 className="size-5" />
                ) : (
                  <XCircle className="size-5" />
                )}
              </span>
              <div>
                <p className="text-base font-black text-slate-950">
                  Are you sure you want to {confirmation.action}?
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {getUserName(confirmation.payout)} ·{" "}
                  {formatUsdt(confirmation.payout.amountUsdt)}
                </p>
              </div>
            </div>
            <div className="p-4">
              <p className="text-sm font-semibold leading-relaxed text-slate-600">
                {confirmation.action === "approve"
                  ? "This will credit the user wallet and debit the admin payout balance."
                  : "This payout will be marked rejected and will not credit the user wallet."}
              </p>
              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  className="h-10 rounded-xl"
                  disabled={reviewingId === confirmation.payout.id}
                  onClick={() => setConfirmation(null)}
                  type="button"
                  variant="outline"
                >
                  No
                </Button>
                <Button
                  className={cn(
                    "h-10 rounded-xl text-white",
                    confirmation.action === "approve"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700",
                  )}
                  disabled={reviewingId === confirmation.payout.id}
                  onClick={() =>
                    void reviewPayout(confirmation.payout, confirmation.action)
                  }
                  type="button"
                >
                  {reviewingId === confirmation.payout.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : confirmation.action === "approve" ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <XCircle className="size-4" />
                  )}
                  Yes
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}


    </section>
  );
}
