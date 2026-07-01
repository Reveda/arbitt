import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  WalletCards,
  X,
  Loader2,
  Copy,
  CheckCircle2,
  CalendarDays,
  FileSpreadsheet,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { Input } from "@/components/ui/input";
import { useAdminTransactions } from "@/hooks/useAdminQueries";
import { adminService, type AdminTransaction } from "@/services/admin.service";
import { cn } from "@/lib/utils";
import { AdminCard, AdminPageHeader } from "./admin.components";
import { ToastMessage, type ToastMessageValue } from "@/components/ui/toast-message";

const TYPE_FILTERS = [
  { label: "All Types", value: "all" },
  { label: "Deposit", value: "deposit" },
  { label: "Withdrawal", value: "withdrawal" },
  { label: "Reward", value: "reward" },
  { label: "Plan Purchase", value: "plan_purchase" },
  { label: "Adjustment", value: "adjustment" }
];

const STATUS_FILTERS = [
  { label: "All Statuses", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Completed", value: "completed" },
  { label: "Rejected", value: "rejected" },
  { label: "Failed", value: "failed" }
];

const LIMIT_OPTIONS = [10, 25, 50, 100];

function formatUsdt(value: number) {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    useGrouping: false
  }).format(value)} USDT`;
}

function formatDate(value: string | null) {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function getTypeBadgeStyle(type: AdminTransaction["type"]) {
  switch (type) {
    case "deposit":
      return "bg-blue-50 text-blue-700 ring-blue-600/20";
    case "withdrawal":
      return "bg-rose-50 text-rose-700 ring-rose-600/20";
    case "reward":
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
    case "plan_purchase":
      return "bg-indigo-50 text-indigo-700 ring-indigo-600/20";
    case "adjustment":
      return "bg-amber-50 text-amber-700 ring-amber-600/20";
    default:
      return "bg-slate-50 text-slate-700 ring-slate-600/20";
  }
}

function getStatusTone(status: AdminTransaction["status"]) {
  switch (status) {
    case "completed":
    case "approved":
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
    case "pending":
      return "bg-amber-50 text-amber-700 ring-amber-600/20";
    case "rejected":
    case "failed":
      return "bg-rose-50 text-rose-700 ring-rose-600/20";
    default:
      return "bg-slate-50 text-slate-700 ring-slate-600/20";
  }
}

export function AdminTransactionsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [copiedTarget, setCopiedTarget] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<ToastMessageValue | null>(null);

  useEffect(() => {
    const timerId = window.setTimeout(() => setDebouncedSearch(searchValue.trim()), 350);
    return () => window.clearTimeout(timerId);
  }, [searchValue]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, fromDate, toDate, status, type, limit]);

  const transactionsQuery = useAdminTransactions({
    page,
    limit,
    search: debouncedSearch || undefined,
    status: status === "all" ? undefined : (status as any),
    type: type === "all" ? undefined : (type as any),
    fromDate: fromDate || undefined,
    toDate: toDate || undefined
  });

  const data = transactionsQuery.data?.data;
  const transactions = data?.transactions ?? [];
  const pagination = data?.pagination ?? {
    hasNextPage: false,
    hasPreviousPage: false,
    limit,
    page,
    total: 0,
    totalPages: 1
  };

  const copyAddress = async (address: string) => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopiedTarget(address);
    window.setTimeout(() => setCopiedTarget(null), 1600);
  };

  return (
    <section className="space-y-4">
      {/* Toast Alert */}
      {toastMessage && (
        <ToastMessage
          message={toastMessage}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Page Header */}
      <AdminPageHeader
        description="Browse all deposits, withdrawals, referral bonuses, and system ledger events."
        title="Transaction History Ledger"
      />

      {/* Filtering Section */}
      <div className="flex flex-col gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        
        {/* Row 1: Search & Date filter */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Search className="size-4" />
            </span>
            <Input
              placeholder="Search by username, notes, transaction hash..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="bg-slate-50 border-slate-200/80 pl-9 pr-8 text-xs focus-visible:ring-slate-950 rounded-xl"
            />
            {searchValue.trim() && (
              <button
                onClick={() => setSearchValue("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* Date Picker & Limits */}
          <div className="flex flex-wrap items-center gap-3">
            <DateRangeFilter
              fromDate={fromDate}
              toDate={toDate}
              onApply={({ fromDate, toDate }) => {
                setFromDate(fromDate);
                setToDate(toDate);
              }}
            />

            {/* Limit selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Show:</span>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                {LIMIT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt} rows
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Row 2: Type Filters */}
        <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-3">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Filter by Type:</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {TYPE_FILTERS.map((filter) => (
              <button
                key={filter.value}
                className={cn(
                  "rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all",
                  type === filter.value
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-50 text-slate-600 border border-slate-200/60 hover:bg-slate-100/60"
                )}
                onClick={() => setType(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 3: Status Filters */}
        <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-3">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Filter by Status:</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                className={cn(
                  "rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all",
                  status === filter.value
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-50 text-slate-600 border border-slate-200/60 hover:bg-slate-100/60"
                )}
                onClick={() => setStatus(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Main List Table */}
      <AdminCard>
        {transactionsQuery.isLoading && transactions.length === 0 ? (
          <div className="flex h-56 flex-col items-center justify-center">
            <Loader2 className="size-8 animate-spin text-slate-600" />
            <span className="mt-2 text-xs font-bold text-slate-500">Loading transaction ledger...</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center text-center">
            <WalletCards className="size-10 text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-500">No transaction records match your filters.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-50/50">
                    <th className="pb-3 pt-2 pr-2 pl-4">User details</th>
                    <th className="pb-3 pt-2 px-2">Type</th>
                    <th className="pb-3 pt-2 px-2 text-right">Net Amount</th>
                    <th className="pb-3 pt-2 px-2 text-right">Gross / Fee</th>
                    <th className="pb-3 pt-2 px-2">Target Address</th>
                    <th className="pb-3 pt-2 px-2">Status</th>
                    <th className="pb-3 pt-2 px-2">Date & Time</th>
                    <th className="pb-3 pt-2 pl-2 pr-4">Details / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {transactions.map((txn) => {
                    const isPositive = txn.type === "deposit" || txn.type === "reward" || (txn.type === "adjustment" && txn.amountUsdt > 0);
                    
                    return (
                      <tr key={txn.id} className="hover:bg-slate-50/50 transition-colors">
                        
                        {/* User Details with Avatar Badge */}
                        <td className="py-4 pr-2 pl-4">
                          <div className="flex items-center gap-3">
                            <div className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-xs font-black uppercase text-white shadow-sm shrink-0">
                              {txn.user?.username ? txn.user.username[0] : "?"}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">
                                {txn.user?.username || "Unknown"}
                              </div>
                              <div className="text-[9px] font-black text-slate-400 uppercase tracking-wide">
                                {txn.user?.role || "user"}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Transaction Type */}
                        <td className="py-4 px-2">
                          <span className={cn(
                            "inline-flex items-center rounded-xl px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ring-1 ring-inset",
                            getTypeBadgeStyle(txn.type)
                          )}>
                            {txn.type.replace("_", " ")}
                          </span>
                        </td>

                        {/* Net Amount */}
                        <td className="py-4 px-2 text-right">
                          <span className={cn(
                            "text-xs font-extrabold",
                            isPositive ? "text-emerald-600" : "text-rose-600"
                          )}>
                            {isPositive ? "+" : ""}{formatUsdt(txn.amountUsdt)}
                          </span>
                        </td>

                        {/* Gross / Fee */}
                        <td className="py-4 px-2 text-right text-slate-500 text-[11px]">
                          <div>G: {txn.grossAmountUsdt.toFixed(2)}</div>
                          <div className="text-[10px] text-rose-500">F: {txn.chargeUsdt.toFixed(2)}</div>
                        </td>

                        {/* Destination Wallet address */}
                        <td className="py-4 px-2 max-w-[200px]">
                          {txn.txnHash ? (
                            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/60 rounded-xl px-2.5 py-1 w-fit">
                              <span className="font-mono text-[10px] text-slate-600 truncate max-w-[100px]" title={txn.txnHash}>
                                {txn.txnHash}
                              </span>
                              <button
                                onClick={() => copyAddress(txn.txnHash!)}
                                className="text-slate-400 hover:text-slate-700 shrink-0 transition-colors"
                              >
                                {copiedTarget === txn.txnHash ? (
                                  <CheckCircle2 className="size-3 text-emerald-600" />
                                ) : (
                                  <Copy className="size-3" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No hash</span>
                          )}
                          {txn.network && (
                            <div className="text-[9px] font-black text-cyan-600 bg-cyan-50 border border-cyan-200/50 px-1.5 py-0.5 rounded-lg inline-block mt-1">
                              {txn.network}
                            </div>
                          )}
                        </td>

                        {/* Status badge */}
                        <td className="py-4 px-2">
                          <span className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase ring-1 ring-inset",
                            getStatusTone(txn.status)
                          )}>
                            {txn.status}
                          </span>
                        </td>

                        {/* Date Requested */}
                        <td className="py-4 px-2 text-slate-500 text-[11px] font-medium">
                          {formatDate(txn.createdAt)}
                        </td>

                        {/* Details / Notes */}
                        <td className="py-4 pl-2 pr-4 max-w-[220px]">
                          <p className="text-[11px] leading-relaxed text-slate-600 font-medium break-words">
                            {txn.notes || "—"}
                          </p>
                          {txn.payoutKind && (
                            <span className="inline-block mt-1 text-[8px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-150">
                              {txn.payoutKind.replace("_", " ")}
                            </span>
                          )}
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 pt-4 px-4 pb-2">
                <p className="text-[11px] font-bold text-slate-500">
                  Showing request {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} transactions
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-7 rounded-lg border-slate-200 hover:bg-slate-50"
                    disabled={!pagination.hasPreviousPage || transactionsQuery.isLoading}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    <ChevronLeft className="size-4 text-slate-600" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-7 rounded-lg border-slate-200 hover:bg-slate-50"
                    disabled={!pagination.hasNextPage || transactionsQuery.isLoading}
                    onClick={() => setPage((prev) => prev + 1)}
                  >
                    <ChevronRight className="size-4 text-slate-600" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </AdminCard>

    </section>
  );
}
