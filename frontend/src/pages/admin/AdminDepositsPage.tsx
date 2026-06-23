import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  WalletCards
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { Input } from "@/components/ui/input";
import { useAdminDeposits } from "@/hooks/useAdminQueries";
import { cn } from "@/lib/utils";
import type { AdminDeposit } from "@/services/admin.service";
import { AdminCard, AdminPageHeader } from "./admin.components";

const PAGE_SIZE = 10;

const STATUS_FILTERS = [
  { label: "All status", value: "all" },
  { label: "Approved", value: "approved" },
  { label: "Completed", value: "completed" },
  { label: "Pending", value: "pending" },
  { label: "Rejected", value: "rejected" },
  { label: "Failed", value: "failed" }
];

function formatUsdt(value: number) {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    useGrouping: false
  }).format(value)} USDT`;
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

function getUserName(deposit: AdminDeposit) {
  return deposit.user?.username ?? "Unknown user";
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

export function AdminDepositsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [status, setStatus] = useState("all");
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    const timerId = window.setTimeout(() => setDebouncedSearch(searchValue.trim()), 350);
    return () => window.clearTimeout(timerId);
  }, [searchValue]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, fromDate, status, toDate]);

  const depositsQuery = useAdminDeposits({
    page,
    limit,
    search: debouncedSearch || undefined,
    status: status === "all" ? undefined : status,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined
  });
  const data = depositsQuery.data?.data;
  const deposits = data?.deposits ?? [];
  const pagination = data?.pagination ?? {
    hasNextPage: false,
    hasPreviousPage: false,
    limit,
    page,
    total: 0,
    totalPages: 1
  };
  const firstRow = pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const lastRow = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <section className="space-y-4">
      <AdminPageHeader
        description="Review wallet top-up records. User wallet balance is credited automatically."
        title="Wallet Top-ups"
      />

      {depositsQuery.error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
          {depositsQuery.error}
        </div>
      ) : null}

      <AdminCard>
        <div className="grid gap-3 p-4 lg:grid-cols-[1fr_180px_auto]">
          <label className="relative block">
            <span className="sr-only">Search deposits</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-10 text-slate-900 placeholder:text-slate-400"
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search user or notes"
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
            <p className="text-sm font-black text-slate-950">Wallet Top-up Records</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Showing {firstRow}-{lastRow} of {pagination.total}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-white text-xs text-slate-500 shadow-[0_1px_0_#e2e8f0]">
              <tr>
                <th className="px-4 py-3 font-black">User</th>
                <th className="px-4 py-3 font-black">Amount</th>
                <th className="px-4 py-3 font-black">Notes</th>
                <th className="px-4 py-3 font-black">Status</th>
                <th className="px-4 py-3 font-black">Date</th>
                <th className="px-4 py-3 text-right font-black">Record</th>
              </tr>
            </thead>
            <tbody>
              {depositsQuery.isLoading ? (
                Array.from({ length: 5 }, (_, rowIndex) => (
                  <tr className="border-b border-slate-100 last:border-0" key={rowIndex}>
                    {Array.from({ length: 6 }, (_, cellIndex) => (
                      <td className="px-4 py-4" key={cellIndex}>
                        <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : deposits.length ? (
                deposits.map((deposit) => (
                  <tr className="border-b border-slate-100 bg-white last:border-0 hover:bg-cyan-50/40" key={deposit.id}>
                    <td className="px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cyan-50 text-sm font-black uppercase text-cyan-700 ring-1 ring-cyan-100">
                          {getUserName(deposit).charAt(0)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-950">{getUserName(deposit)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-black text-slate-900">{formatUsdt(deposit.amountUsdt)}</td>
                    <td className="max-w-[220px] px-4 py-3">
                      <p className="truncate text-xs font-bold text-slate-500">{deposit.notes || "Wallet top-up"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full px-3 py-1 text-xs font-black capitalize ring-1", getStatusTone(deposit.status))}>
                        {deposit.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-500">{formatDate(deposit.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <WalletCards className="size-4 text-slate-300" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-12 text-center text-sm font-semibold text-slate-500" colSpan={6}>
                    No wallet top-ups found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4">
          <p className="text-xs font-semibold text-slate-500">
            {pagination.total ? `Showing ${firstRow}-${lastRow} of ${pagination.total}` : "No wallet top-ups yet"}
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
              disabled={!pagination.hasPreviousPage || depositsQuery.isLoading}
              onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
              type="button"
              variant="outline"
            >
              <ChevronLeft className="size-4" />
              Prev
            </Button>
            <Button
              className="h-9 rounded-xl border-slate-200 bg-white text-slate-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-100"
              disabled={!pagination.hasNextPage || depositsQuery.isLoading}
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

    </section>
  );
}
