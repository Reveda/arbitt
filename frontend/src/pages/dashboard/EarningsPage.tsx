import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Gift,
  HandCoins,
  Layers3,
  WalletCards
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import {
  earningsService,
  type EarningKind,
  type EarningStatus,
  type UserEarningRecord,
  type UserEarningsResponse
} from "@/services/earnings.service";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;
const EARNING_KINDS: Array<"all" | EarningKind> = ["all", "weekly", "level", "salary_royalty"];
const EARNING_STATUSES: Array<"all" | EarningStatus> = [
  "all",
  "pending",
  "approved",
  "completed",
  "rejected",
  "failed"
];

const emptyPagination: UserEarningsResponse["pagination"] = {
  page: 1,
  limit: PAGE_SIZE,
  total: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false
};

const emptySummary: UserEarningsResponse["summary"] = {
  approvedCount: 0,
  availableUsdt: 0,
  byKind: {
    level: { approvedUsdt: 0, pendingUsdt: 0, totalCount: 0, totalUsdt: 0 },
    salary_royalty: { approvedUsdt: 0, pendingUsdt: 0, totalCount: 0, totalUsdt: 0 },
    weekly: { approvedUsdt: 0, pendingUsdt: 0, totalCount: 0, totalUsdt: 0 }
  },
  lifetimeRewardsUsdt: 0,
  pendingCount: 0,
  rejectedCount: 0,
  totalApprovedUsdt: 0,
  totalGeneratedUsdt: 0,
  totalPendingUsdt: 0,
  totalRejectedUsdt: 0
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(value);
}

function formatUsdt(value: number) {
  return `${formatNumber(value)} USDT`;
}

function formatPercent(value: number | null) {
  if (value === null) {
    return "";
  }

  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)}%`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function statusTone(status: string) {
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

function getKindLabel(kind: EarningKind) {
  if (kind === "level") {
    return "Level Income";
  }

  if (kind === "salary_royalty") {
    return "Royalty";
  }

  return "Weekly Return";
}

function getKindIcon(kind: EarningKind) {
  if (kind === "level") {
    return Layers3;
  }

  if (kind === "salary_royalty") {
    return Gift;
  }

  return CalendarDays;
}

function getSourceLabel(record: UserEarningRecord) {
  if (record.payoutKind === "salary_royalty") {
    return record.payoutPrincipalUsdt ? `${formatNumber(record.payoutPrincipalUsdt)} directs` : "Direct rule";
  }

  if (record.payoutPrincipalUsdt !== null) {
    return formatUsdt(record.payoutPrincipalUsdt);
  }

  return "Not available";
}

function getPeriodLabel(record: UserEarningRecord) {
  if (record.payoutPeriodStart || record.payoutPeriodEnd) {
    return `${formatDate(record.payoutPeriodStart)} - ${formatDate(record.payoutPeriodEnd)}`;
  }

  return record.reviewedAt ? formatDate(record.reviewedAt) : "One-time";
}

export function EarningsPage() {
  const [page, setPage] = useState(1);
  const [kind, setKind] = useState<(typeof EARNING_KINDS)[number]>("all");
  const [status, setStatus] = useState<(typeof EARNING_STATUSES)[number]>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [rewards, setRewards] = useState<UserEarningRecord[]>([]);
  const [summary, setSummary] = useState<UserEarningsResponse["summary"]>(emptySummary);
  const [pagination, setPagination] = useState<UserEarningsResponse["pagination"]>(emptyPagination);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [fromDate, kind, status, toDate]);

  useEffect(() => {
    let active = true;

    setIsLoading(true);

    earningsService
      .getEarnings({
        page,
        limit: PAGE_SIZE,
        fromDate: fromDate || undefined,
        kind: kind === "all" ? undefined : kind,
        status: status === "all" ? undefined : status,
        toDate: toDate || undefined
      })
      .then((response) => {
        if (!active) {
          return;
        }

        setRewards(response.data.rewards);
        setSummary(response.data.summary);
        setPagination(response.data.pagination);
        setError(null);
      })
      .catch((caughtError) => {
        if (!active) {
          return;
        }

        setError(caughtError instanceof Error ? caughtError.message : "Unable to load earnings.");
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [fromDate, kind, page, status, toDate]);

  const firstRow = pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const lastRow = Math.min(pagination.page * pagination.limit, pagination.total);
  const metrics = [
    {
      detail: `${summary.approvedCount} approved`,
      icon: CircleDollarSign,
      label: "Credited Earnings",
      tone: "bg-emerald-50 text-emerald-700",
      value: formatUsdt(summary.lifetimeRewardsUsdt || summary.totalApprovedUsdt)
    },
    {
      detail: `${summary.pendingCount} waiting`,
      icon: Clock3,
      label: "Pending Payouts",
      tone: "bg-amber-50 text-amber-700",
      value: formatUsdt(summary.totalPendingUsdt)
    },
    {
      detail: "Wallet available",
      icon: WalletCards,
      label: "Available Balance",
      tone: "bg-cyan-50 text-cyan-700",
      value: formatUsdt(summary.availableUsdt)
    },
    {
      detail: `${summary.rejectedCount} rejected`,
      icon: HandCoins,
      label: "Generated Rewards",
      tone: "bg-violet-50 text-violet-700",
      value: formatUsdt(summary.totalGeneratedUsdt)
    }
  ];
  const kindCards = useMemo(
    () =>
      (["weekly", "level", "salary_royalty"] as EarningKind[]).map((item) => ({
        ...summary.byKind[item],
        icon: getKindIcon(item),
        kind: item,
        label: getKindLabel(item)
      })),
    [summary.byKind]
  );

  return (
    <section className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#08152e] via-[#0d5c80] to-[#22d3ee] px-4 py-4 text-white shadow-[0_18px_50px_rgba(8,21,46,0.18)] sm:px-5">
        <div className="absolute -right-10 -top-12 size-36 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-cyan-100/82 sm:text-xs">
            User Panel
          </p>
          <h1 className="mt-1 text-[1.35rem] font-black leading-tight tracking-tight sm:text-2xl">
            Earnings
          </h1>
          <p className="mt-1 max-w-2xl text-[13px] font-semibold leading-relaxed text-cyan-50/88 sm:text-sm">
            Track credited rewards, pending payouts, and reward history.
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metrics.map((item) => {
          const Icon = item.icon;

          return (
            <Card className="form-motion-off rounded-2xl border-slate-200 bg-white text-slate-950 shadow-sm" key={item.label}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-500">{item.label}</p>
                  <p className="mt-1 truncate text-sm font-black text-slate-950 sm:text-lg">{isLoading ? "Loading..." : item.value}</p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-400">{item.detail}</p>
                </div>
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", item.tone)}>
                  <Icon className="size-4" />
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {kindCards.map((item) => {
          const Icon = item.icon;

          return (
            <Card className="form-motion-off border-slate-200 bg-white text-slate-950 shadow-sm" key={item.kind}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-950">{item.label}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      {item.totalCount ? "Activity available" : "No activity yet"}
                    </p>
                  </div>
                  <span className="grid size-10 place-items-center rounded-xl bg-cyan-50 text-cyan-700">
                    <Icon className="size-4" />
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-emerald-50 px-3 py-2">
                    <p className="text-[11px] font-black text-emerald-700">Credited</p>
                    <p className="mt-1 text-xs font-black text-slate-950">{formatUsdt(item.approvedUsdt)}</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 px-3 py-2">
                    <p className="text-[11px] font-black text-amber-700">Pending</p>
                    <p className="mt-1 text-xs font-black text-slate-950">{formatUsdt(item.pendingUsdt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="form-motion-off border-slate-200 bg-white text-slate-950 shadow-sm">
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_auto]">
          <label className="block">
            <span className="mb-2 block text-xs font-black text-slate-500">Reward Type</span>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 shadow-sm outline-none transition-colors focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
              onChange={(event) => setKind(event.target.value as (typeof EARNING_KINDS)[number])}
              value={kind}
            >
              <option value="all">All rewards</option>
              <option value="weekly">Weekly return</option>
              <option value="level">Level income</option>
              <option value="salary_royalty">Royalty</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-black text-slate-500">Status</span>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold capitalize text-slate-700 shadow-sm outline-none transition-colors focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
              onChange={(event) => setStatus(event.target.value as (typeof EARNING_STATUSES)[number])}
              value={status}
            >
              {EARNING_STATUSES.map((option) => (
                <option className="capitalize" key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <Button
              className="h-11 w-full rounded-xl md:w-auto"
              onClick={() => {
                setKind("all");
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
        </CardContent>
      </Card>

      <Card className="form-motion-off border-slate-200 bg-white text-slate-950 shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-slate-100 p-4">
          <div>
            <CardTitle className="text-base">Reward Records</CardTitle>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Showing {firstRow}-{lastRow} of {pagination.total}
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
              Page {pagination.page}/{pagination.totalPages}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-50/80 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-black">Reward</th>
                  <th className="px-4 py-3 font-black">Amount</th>
                  <th className="px-4 py-3 font-black">Status</th>
                  <th className="px-4 py-3 font-black">Source</th>
                  <th className="px-4 py-3 font-black">Period</th>
                  <th className="px-4 py-3 font-black">Created</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, rowIndex) => (
                    <tr className="border-t border-slate-100" key={rowIndex}>
                      {Array.from({ length: 6 }).map((__, cellIndex) => (
                        <td className="px-4 py-4" key={cellIndex}>
                          <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : rewards.length ? (
                  rewards.map((reward) => {
                    const Icon = getKindIcon(reward.payoutKind);

                    return (
                      <tr className="border-t border-slate-100 hover:bg-cyan-50/30" key={reward.id}>
                        <td className="px-4 py-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cyan-50 text-cyan-700">
                              <Icon className="size-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="font-black text-slate-950">
                                {getKindLabel(reward.payoutKind)}
                              </p>
                              <p className="truncate text-xs font-semibold text-slate-500">
                                {reward.payoutTier ?? "Reward"}
                                {reward.payoutPercent !== null ? ` · ${formatPercent(reward.payoutPercent)}` : ""}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 font-black text-slate-950">{formatUsdt(reward.amountUsdt)}</td>
                        <td className="px-4 py-4">
                          <span
                            className={cn(
                              "rounded-full px-3 py-1 text-xs font-black capitalize ring-1",
                              statusTone(reward.status)
                            )}
                          >
                            {reward.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-xs font-bold text-slate-500">{getSourceLabel(reward)}</td>
                        <td className="px-4 py-4 text-xs font-semibold text-slate-500">{getPeriodLabel(reward)}</td>
                        <td className="px-4 py-4 text-xs font-semibold text-slate-500">
                          {formatDate(reward.createdAt)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="px-4 py-10 text-center text-sm font-semibold text-slate-500" colSpan={6}>
                      No reward records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4">
            <p className="text-xs font-semibold text-slate-500">
              {pagination.total ? `Showing ${firstRow}-${lastRow} rewards` : "No rewards yet"}
            </p>
            <div className="flex items-center gap-2">
              <Button
                className="h-9 rounded-xl"
                disabled={!pagination.hasPreviousPage || isLoading}
                onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                type="button"
                variant="outline"
              >
                <ChevronLeft className="size-4" />
                Prev
              </Button>
              <Button
                className="h-9 rounded-xl"
                disabled={!pagination.hasNextPage || isLoading}
                onClick={() => setPage((currentPage) => currentPage + 1)}
                type="button"
                variant="outline"
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
