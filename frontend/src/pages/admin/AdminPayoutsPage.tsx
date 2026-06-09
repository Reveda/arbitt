import { useEffect, useState, type FormEvent } from "react";
import {
  BadgeDollarSign,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  HandCoins,
  Loader2,
  Percent,
  Search,
  XCircle,
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
import type { AdminPayout } from "@/services/admin.service";
import {
  planService,
  type InvestmentTierRule,
  type PlanRuleSet,
} from "@/services/plan.service";
import {
  useGenerateAdminPayoutsMutation,
  useReviewAdminPayoutMutation,
} from "@/store/api/adminApi";
import { getQueryErrorMessage } from "@/store/api/queryError";
import { AdminCard, AdminPageHeader } from "./admin.components";
import { adminPlans as fallbackInvestmentTiers } from "./admin.data";

const PAGE_SIZE = 10;
type ReturnStrategy = "min" | "average" | "max";
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
const RETURN_STRATEGY_OPTIONS: Array<{
  label: string;
  note: string;
  value: ReturnStrategy;
}> = [{ label: "Fixed Return", note: "Final pool return", value: "min" }];

function formatUsdt(value: number) {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value)} USDT`;
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(Number(value.toFixed(2)))}%`;
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

function getPayoutWeekStartInputValue() {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const daysSinceMonday = (start.getUTCDay() + 6) % 7;
  start.setUTCDate(start.getUTCDate() - daysSinceMonday);

  const periodEnd = new Date(start);
  periodEnd.setUTCDate(periodEnd.getUTCDate() + 5);
  periodEnd.setUTCHours(23, 59, 59, 999);

  if (periodEnd.getTime() > now.getTime()) {
    start.setUTCDate(start.getUTCDate() - 7);
  }

  return start.toISOString().slice(0, 10);
}

function getTodayInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getPayoutWeekStartForDateInput(value: string) {
  if (!value) {
    return "";
  }

  const selectedDate = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(selectedDate.getTime())) {
    return "";
  }

  const weekStart = new Date(
    Date.UTC(
      selectedDate.getUTCFullYear(),
      selectedDate.getUTCMonth(),
      selectedDate.getUTCDate(),
    ),
  );
  const daysSinceMonday = (weekStart.getUTCDay() + 6) % 7;
  weekStart.setUTCDate(weekStart.getUTCDate() - daysSinceMonday);

  return weekStart.toISOString().slice(0, 10);
}

function getUserName(payout: AdminPayout) {
  return payout.user?.username ?? "Unknown user";
}

function getStatusTone(status: string) {
  if (status === "approved" || status === "completed") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (status === "pending") {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }

  if (status === "rejected" || status === "failed") {
    return "bg-rose-50 text-rose-700 ring-rose-100";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function getPayoutKindLabel(kind: string) {
  if (kind === "level") {
    return "Level";
  }

  if (kind === "salary_royalty") {
    return "Royalty";
  }

  return "Weekly";
}

function getReturnPercent(tier: InvestmentTierRule, strategy: ReturnStrategy) {
  if (strategy === "max") {
    return tier.returnMaxPercent;
  }

  if (strategy === "average") {
    return (tier.returnMinPercent + tier.returnMaxPercent) / 2;
  }

  return tier.returnMinPercent;
}

export function AdminPayoutsPage() {
  const lastCompletedWeekStart = getPayoutWeekStartInputValue();
  const maxSelectableDate = getTodayInputValue();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [weekStart, setWeekStart] = useState(getPayoutWeekStartInputValue);
  const [returnStrategy, setReturnStrategy] = useState<ReturnStrategy>("min");
  const [planRuleSet, setPlanRuleSet] = useState<PlanRuleSet | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [message, setMessage] = useState<ToastMessageValue | null>(null);
  const [confirmation, setConfirmation] = useState<ReviewConfirmation | null>(
    null,
  );
  const [generateAdminPayouts, generatePayoutsState] =
    useGenerateAdminPayoutsMutation();
  const [reviewAdminPayout] = useReviewAdminPayoutMutation();

  useEffect(() => {
    let active = true;

    planService
      .getRuleSet()
      .then((response) => {
        if (active) {
          setPlanRuleSet(response.data.ruleSet);
        }
      })
      .catch(() => {
        if (active) {
          setPlanRuleSet(null);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(
      () => setDebouncedSearch(searchValue.trim()),
      350,
    );
    return () => window.clearTimeout(timerId);
  }, [searchValue]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, fromDate, status, toDate]);

  const payoutsQuery = useAdminPayouts({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: status === "all" ? undefined : status,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
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
    limit: PAGE_SIZE,
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
  const investmentTiers = (
    planRuleSet?.investmentTiers ?? fallbackInvestmentTiers
  ).filter((tier) => tier.status.toLowerCase() === "active");
  const selectedReturnOption =
    RETURN_STRATEGY_OPTIONS.find((option) => option.value === returnStrategy) ??
    RETURN_STRATEGY_OPTIONS[0];
  const selectedPayoutWeekStart = getPayoutWeekStartForDateInput(weekStart);
  const canGenerateSelectedWeek =
    Boolean(selectedPayoutWeekStart) && selectedPayoutWeekStart <= lastCompletedWeekStart;
  const stats = [
    {
      icon: HandCoins,
      label: "Generated",
      tone: "bg-cyan-50 text-cyan-700",
      value: formatUsdt(summary.totalPayoutUsdt),
    },
    {
      icon: Clock3,
      label: "Pending",
      tone: "bg-amber-50 text-amber-700",
      value: `${summary.pendingCount} / ${formatUsdt(summary.totalPendingUsdt)}`,
    },
    {
      icon: CheckCircle2,
      label: "Approved",
      tone: "bg-emerald-50 text-emerald-700",
      value: `${summary.approvedCount} / ${formatUsdt(summary.totalApprovedUsdt)}`,
    },
    {
      icon: XCircle,
      label: "Rejected",
      tone: "bg-rose-50 text-rose-700",
      value: String(summary.rejectedCount),
    },
  ];

  const generatePayouts = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    try {
      const response = await generateAdminPayouts({
        weekStart: selectedPayoutWeekStart || weekStart,
        returnStrategy,
      }).unwrap();
      setMessage({
        text: `${response.data.weeklyCreatedCount} weekly payouts and ${response.data.salaryRoyaltyCreatedCount} royalty payouts generated, ${response.data.weeklyUpdatedCount} pending weekly payouts updated. ${response.data.skippedCount} already approved, unchanged, or not eligible.`,
        tone: "info",
      });
    } catch (caughtError) {
      setMessage({
        text:
          getQueryErrorMessage(caughtError, "Unable to generate payouts.") ??
          "Unable to generate payouts.",
        tone: "error",
      });
    }
  };

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

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
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
        <form className="grid gap-3 p-4" onSubmit={generatePayouts}>
          <div className="grid gap-3 lg:grid-cols-[1fr_210px_auto]">
            <label className="block">
              <span className="mb-2 block text-xs font-black text-slate-500">
                Payout Date
              </span>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-10 text-sm font-bold text-slate-900 [color-scheme:light]"
                  max={maxSelectableDate}
                  onChange={(event) => setWeekStart(event.target.value)}
                  required
                  type="date"
                  value={weekStart}
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-black text-slate-500">
                Return
              </span>
              <select
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 shadow-sm outline-none transition-colors focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
                onChange={(event) =>
                  setReturnStrategy(event.target.value as ReturnStrategy)
                }
                value={returnStrategy}
              >
                {RETURN_STRATEGY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} ({option.note})
                  </option>
                ))}
              </select>
            </label>

            <Button
              className="mt-0 h-11 self-end rounded-xl lg:mt-6"
              disabled={generatePayoutsState.isLoading || !canGenerateSelectedWeek}
              title={
                canGenerateSelectedWeek
                  ? "Generate payouts"
                  : "Only completed payout weeks can be generated"
              }
              type="submit"
            >
              {generatePayoutsState.isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Percent className="size-4" />
              )}
              Generate
            </Button>
          </div>

          <div className="rounded-2xl border border-cyan-100 bg-cyan-50/45 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-black text-slate-700">
                {selectedReturnOption.label}
              </p>
              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-cyan-700 ring-1 ring-cyan-100">
                {selectedReturnOption.note}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
              {investmentTiers.map((tier) => (
                <div
                  className="flex items-center justify-between gap-2 rounded-xl border border-white bg-white/90 px-3 py-2 shadow-sm"
                  key={tier.tier}
                >
                  <span className="text-xs font-black text-slate-600">
                    {tier.name}
                  </span>
                  <span className="text-sm font-black text-slate-950">
                    {formatPercent(getReturnPercent(tier, returnStrategy))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </form>
      </AdminCard>

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

      <AdminCard className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div>
            <p className="text-sm font-black text-slate-950">Payout Records</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Showing {firstRow}-{lastRow} of {pagination.total} payout records
            </p>
          </div>
          <div className="flex items-center gap-2">
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

        <div className="overflow-x-auto">
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
                      {payout.status === "pending" ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            className="h-9 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                            disabled={reviewingId === payout.id}
                            onClick={() =>
                              setConfirmation({ action: "approve", payout })
                            }
                            size="sm"
                            type="button"
                          >
                            {reviewingId === payout.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="size-4" />
                            )}
                            Approve
                          </Button>
                          <Button
                            className="h-9 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50"
                            disabled={reviewingId === payout.id}
                            onClick={() =>
                              setConfirmation({ action: "reject", payout })
                            }
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            <XCircle className="size-4" />
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end">
                          <BadgeDollarSign className="size-4 text-slate-300" />
                        </div>
                      )}
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
