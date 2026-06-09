import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  RefreshCw,
  ShoppingBag,
  WalletCards
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import {
  transactionService,
  type UserTransaction,
  type UserTransactionsResponse
} from "@/services/transaction.service";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;
const transactionTypes: Array<"all" | UserTransaction["type"]> = [
  "all",
  "deposit",
  "withdrawal",
  "reward",
  "plan_purchase",
  "adjustment"
];
const transactionStatuses: Array<"all" | UserTransaction["status"]> = [
  "all",
  "pending",
  "approved",
  "completed",
  "rejected",
  "failed"
];

function formatUsdt(value: number) {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
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

function typeIcon(type: UserTransaction["type"]) {
  if (type === "deposit") {
    return ArrowDownLeft;
  }

  if (type === "withdrawal") {
    return ArrowUpRight;
  }

  if (type === "reward") {
    return CircleDollarSign;
  }

  if (type === "plan_purchase") {
    return ShoppingBag;
  }

  return RefreshCw;
}

const emptyPagination: UserTransactionsResponse["pagination"] = {
  page: 1,
  limit: PAGE_SIZE,
  total: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false
};

export function TransactionsPage() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState<(typeof transactionTypes)[number]>("all");
  const [status, setStatus] = useState<(typeof transactionStatuses)[number]>("all");
  const [transactions, setTransactions] = useState<UserTransaction[]>([]);
  const [pagination, setPagination] = useState<UserTransactionsResponse["pagination"]>(emptyPagination);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    setPage(1);
  }, [fromDate, status, toDate, type]);

  useEffect(() => {
    let active = true;

    setIsLoading(true);

    transactionService
      .listTransactions({
        page,
        limit: PAGE_SIZE,
        type: type === "all" ? undefined : type,
        status: status === "all" ? undefined : status,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined
      })
      .then((response) => {
        if (!active) {
          return;
        }

        setTransactions(response.data.transactions);
        setPagination(response.data.pagination);
        setError(null);
      })
      .catch((caughtError) => {
        if (!active) {
          return;
        }

        setError(caughtError instanceof Error ? caughtError.message : "Unable to load transactions.");
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [fromDate, page, status, toDate, type]);

  const currentPageTotal = useMemo(
    () => transactions.reduce((total, transaction) => total + transaction.amountUsdt, 0),
    [transactions]
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
            Transactions
          </h1>
          <p className="mt-1 max-w-2xl text-[13px] font-semibold leading-relaxed text-cyan-50/88 sm:text-sm">
            Review your deposits, withdrawals, rewards, and wallet ledger records.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {[
          { label: "Total Records", value: String(pagination.total), icon: WalletCards, tone: "bg-cyan-50 text-cyan-700" },
          { label: "This Page", value: String(transactions.length), icon: RefreshCw, tone: "bg-violet-50 text-violet-700" },
          { label: "Page Volume", value: formatUsdt(currentPageTotal), icon: CircleDollarSign, tone: "bg-emerald-50 text-emerald-700" }
        ].map((item) => {
          const Icon = item.icon;

          return (
            <Card className="form-motion-off border-slate-200 bg-white text-slate-950 shadow-sm" key={item.label}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-500">{item.label}</p>
                  <p className="mt-1 truncate text-base font-black text-slate-950 sm:text-lg">{item.value}</p>
                </div>
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", item.tone)}>
                  <Icon className="size-4" />
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="form-motion-off border-slate-200 bg-white text-slate-950 shadow-sm">
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_auto]">
          <label className="block">
            <span className="mb-2 block text-xs font-black text-slate-500">Type</span>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold capitalize text-slate-700 shadow-sm outline-none transition-colors focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
              onChange={(event) => setType(event.target.value as (typeof transactionTypes)[number])}
              value={type}
            >
              {transactionTypes.map((option) => (
                <option className="capitalize" key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-black text-slate-500">Status</span>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold capitalize text-slate-700 shadow-sm outline-none transition-colors focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
              onChange={(event) => setStatus(event.target.value as (typeof transactionStatuses)[number])}
              value={status}
            >
              {transactionStatuses.map((option) => (
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
                setType("all");
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
            <CardTitle className="text-base">My Transactions</CardTitle>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Showing {transactions.length} of {pagination.total}
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
          {error ? (
            <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
              {error}
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50/80 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-black">Type</th>
                  <th className="px-4 py-3 font-black">Amount</th>
                  <th className="px-4 py-3 font-black">Status</th>
                  <th className="px-4 py-3 font-black">Network</th>
                  <th className="px-4 py-3 font-black">TX Hash</th>
                  <th className="px-4 py-3 font-black">Date</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <tr className="border-t border-slate-100" key={index}>
                      {Array.from({ length: 6 }).map((__, cellIndex) => (
                        <td className="px-4 py-4" key={cellIndex}>
                          <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : transactions.length ? (
                  transactions.map((transaction) => {
                    const Icon = typeIcon(transaction.type);

                    return (
                      <tr className="border-t border-slate-100 hover:bg-cyan-50/30" key={transaction.id}>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <span className="grid size-9 place-items-center rounded-xl bg-cyan-50 text-cyan-700">
                              <Icon className="size-4" />
                            </span>
                            <span className="font-black capitalize text-slate-950">
                              {transaction.type.replace(/_/g, " ")}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 font-black text-slate-950">
                          {formatUsdt(transaction.amountUsdt)}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={cn(
                              "rounded-full px-3 py-1 text-xs font-black capitalize ring-1",
                              statusTone(transaction.status)
                            )}
                          >
                            {transaction.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-xs font-bold text-slate-500">{transaction.network}</td>
                        <td className="max-w-[220px] truncate px-4 py-4 font-mono text-xs font-bold text-slate-500">
                          {transaction.txnHash ?? "Not added"}
                        </td>
                        <td className="px-4 py-4 text-xs font-semibold text-slate-500">
                          {formatDate(transaction.createdAt)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="px-4 py-10 text-center text-sm font-semibold text-slate-500" colSpan={6}>
                      No transactions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4">
            <p className="text-xs font-semibold text-slate-500">
              {pagination.total ? "Transaction history is ready" : "No transaction history yet"}
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
