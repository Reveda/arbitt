import { useEffect, useState } from "react";
import {
  Activity,
  ArrowDownCircle,
  ArrowUpCircle,

  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Loader2,
  TrendingDown,
  TrendingUp,
  Wallet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminService, type AdminDeposit, type AdminWithdrawalRequest } from "@/services/admin.service";
import { AdminCard, AdminPageHeader } from "./admin.components";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

function formatUsdt(value: number) {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    useGrouping: false
  }).format(value)} USDT`;
}

function formatDate(value: string | null) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export function AdminRevenueAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<"deposits" | "withdrawals" | "liquidity">("deposits");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Data states
  const [deposits, setDeposits] = useState<AdminDeposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawalRequest[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Helper to fetch data
  const fetchData = async () => {
    setIsLoading(true);
    const fromFilter = fromDate || undefined;
    const toFilter = toDate || undefined;

    try {
      if (activeTab === "deposits") {
        const response = await adminService.listDeposits({
          page,
          limit: PAGE_SIZE,
          fromDate: fromFilter,
          toDate: toFilter,
          status: "completed"
        });
        setDeposits(response.data.deposits);
        setTotalCount(response.data.pagination.total);
        setTotalPages(response.data.pagination.totalPages);
      } else if (activeTab === "withdrawals") {
        const response = await adminService.listWithdrawals({
          page,
          limit: PAGE_SIZE,
          fromDate: fromFilter,
          toDate: toFilter,
          status: "completed"
        });
        setWithdrawals(response.data.withdrawals);
        setTotalCount(response.data.pagination.total);
        setTotalPages(response.data.pagination.totalPages);
      } else {
        const response = await adminService.getOverview({
          fromDate: fromFilter,
          toDate: toFilter
        });
        setOverview(response.data);
      }
    } catch (error) {
      console.error("Error loading analytics data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Re-fetch when filter, tab, or page changes
  useEffect(() => {
    fetchData();
  }, [activeTab, fromDate, toDate, page]);

  // Reset page when switching tabs or date filters
  useEffect(() => {
    setPage(1);
  }, [activeTab, fromDate, toDate]);

  // Presets handlers
  const handlePreset = (type: "today" | "week" | "month" | "all") => {
    const today = new Date();
    const toStr = today.toISOString().slice(0, 10);
    setToDate(toStr);

    if (type === "today") {
      setFromDate(toStr);
    } else if (type === "week") {
      const past = new Date(today);
      past.setDate(today.getDate() - 7);
      setFromDate(past.toISOString().slice(0, 10));
    } else if (type === "month") {
      const past = new Date(today);
      past.setMonth(today.getMonth() - 1);
      setFromDate(past.toISOString().slice(0, 10));
    } else {
      setFromDate("");
      setToDate("");
    }
  };

  // Export handler for Liquidity summary and transactions
  const handleExportLiquidity = async () => {
    setIsExporting(true);
    const fromFilter = fromDate || undefined;
    const toFilter = toDate || undefined;

    try {
      const [depRes, withRes, overviewRes] = await Promise.all([
        adminService.listDeposits({ page: 1, limit: 1000, fromDate: fromFilter, toDate: toFilter, status: "completed" }),
        adminService.listWithdrawals({ page: 1, limit: 1000, fromDate: fromFilter, toDate: toFilter, status: "completed" }),
        adminService.getOverview({ fromDate: fromFilter, toDate: toFilter })
      ]);

      const depositsData = depRes.data?.deposits ?? [];
      const withdrawalsData = withRes.data?.withdrawals ?? [];
      const overviewData = overviewRes.data;

      let csv = "Liquidity & Finance Report\n";
      csv += `Date Range,${fromDate || "All Time"} to ${toDate || "All Time"}\n`;
      csv += `Generated At,${new Date().toLocaleString()}\n\n`;

      csv += "FINANCIAL SUMMARY\n";
      csv += `Total Deposits,${overviewData.totalDepositsUsdt.toFixed(2)} USDT\n`;
      csv += `Total Package Sells,${overviewData.totalPackagesSellUsdt.toFixed(2)} USDT\n`;
      csv += `Total Withdrawals,${overviewData.totalWithdrawalsUsdt.toFixed(2)} USDT\n`;
      csv += `Total Rewards Paid,${overviewData.earningsPaidUsdt.toFixed(2)} USDT\n`;
      csv += `Net Liquidity Flow (Deposits - Withdrawals - Rewards),${(overviewData.totalDepositsUsdt - overviewData.totalWithdrawalsUsdt - overviewData.earningsPaidUsdt).toFixed(2)} USDT\n\n`;

      csv += "DETAILED TRANSACTIONS LOG\n";
      csv += "Type,User,Date,Amount (USDT),Status,Network,Txn Hash/Fee (USDT)\n";

      depositsData.forEach((d: any) => {
        csv += `Deposit,${d.user?.username ?? "Unknown"},${new Date(d.createdAt).toLocaleString()},${d.amountUsdt.toFixed(2)},${d.status},${d.network},"${d.txnHash ?? ""}"\n`;
      });

      withdrawalsData.forEach((w: any) => {
        csv += `Withdrawal,${w.user?.username ?? "Unknown"},${new Date(w.createdAt).toLocaleString()},${w.amountUsdt.toFixed(2)},${w.status},${w.network},"${w.chargeUsdt ? w.chargeUsdt.toFixed(2) + " Fee" : ""}"\n`;
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `liquidity-report-${fromDate || "start"}-to-${toDate || "end"}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      alert("Failed to export liquidity report.");
    } finally {
      setIsExporting(false);
    }
  };

  const netLiquidity = overview
    ? overview.totalDepositsUsdt - overview.totalWithdrawalsUsdt - overview.earningsPaidUsdt
    : 0;

  return (
    <section className="space-y-4">
      <AdminPageHeader
        description="Monitor user deposits, processed withdrawals, and system net liquidity flows with calendar-level control."
        title="Revenue & Finance Analytics"
      />

      {/* Calendar Filter Panel */}
      <AdminCard>
        <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-3 w-full lg:w-auto sm:flex-row sm:items-end">
            <div className="grid grid-cols-2 gap-3 w-full sm:w-auto">
              <div className="w-full sm:w-44">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                  From Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 pr-10 text-sm font-bold text-slate-700 outline-none transition-all focus:border-cyan-400 focus:ring-2 focus:ring-cyan-50"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                  <Calendar className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="w-full sm:w-44">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                  To Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 pr-10 text-sm font-bold text-slate-700 outline-none transition-all focus:border-cyan-400 focus:ring-2 focus:ring-cyan-50"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                  <Calendar className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Presets Quick Filters */}
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-start">
              <Button
                type="button"
                variant="outline"
                className="h-10 flex-1 sm:flex-none rounded-xl px-3 text-xs font-bold border-slate-200 bg-white hover:bg-slate-50"
                onClick={() => handlePreset("today")}
              >
                Today
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 flex-1 sm:flex-none rounded-xl px-3 text-xs font-bold border-slate-200 bg-white hover:bg-slate-50"
                onClick={() => handlePreset("week")}
              >
                7 Days
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 flex-1 sm:flex-none rounded-xl px-3 text-xs font-bold border-slate-200 bg-white hover:bg-slate-50"
                onClick={() => handlePreset("month")}
              >
                30 Days
              </Button>
              {(fromDate || toDate) && (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 flex-1 sm:flex-none rounded-xl px-3 text-xs font-bold text-rose-600 hover:bg-rose-50"
                  onClick={() => handlePreset("all")}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {activeTab === "liquidity" && (
            <Button
              className="h-10 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 gap-2 w-full lg:w-auto"
              disabled={isExporting || isLoading || !overview}
              onClick={handleExportLiquidity}
            >
              {isExporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="size-4" />
              )}
              Export Liquidity Report
            </Button>
          )}
        </div>
      </AdminCard>

      {/* Tabs Selector */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("deposits")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-black transition-all outline-none",
            activeTab === "deposits"
              ? "border-cyan-600 text-cyan-700"
              : "border-transparent text-slate-500 hover:text-slate-900"
          )}
        >
          <ArrowDownCircle className="size-4" />
          Deposit Monitor
        </button>
        <button
          onClick={() => setActiveTab("withdrawals")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-black transition-all outline-none",
            activeTab === "withdrawals"
              ? "border-cyan-600 text-cyan-700"
              : "border-transparent text-slate-500 hover:text-slate-900"
          )}
        >
          <ArrowUpCircle className="size-4" />
          Withdrawal Monitor
        </button>
        <button
          onClick={() => setActiveTab("liquidity")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-black transition-all outline-none",
            activeTab === "liquidity"
              ? "border-cyan-600 text-cyan-700"
              : "border-transparent text-slate-500 hover:text-slate-900"
          )}
        >
          <Activity className="size-4" />
          Liquidity System
        </button>
      </div>

      {/* Loader */}
      {isLoading && (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-100 bg-white">
          <Loader2 className="size-8 animate-spin text-cyan-600" />
        </div>
      )}

      {/* Deposit Monitor Content */}
      {!isLoading && activeTab === "deposits" && (
        <div className="space-y-4">
          <AdminCard>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-slate-950">Deposit Records</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Showing transactions filtered by range.
                </p>
              </div>
              <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">
                Total: {totalCount}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase text-slate-500">
                    <th className="px-4 py-3 font-black">User</th>
                    <th className="px-4 py-3 font-black">Amount</th>
                    <th className="px-4 py-3 font-black">Network</th>
                    <th className="px-4 py-3 font-black">Transaction Hash</th>
                    <th className="px-4 py-3 font-black">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.length ? (
                    deposits.map((item) => (
                      <tr className="border-b border-slate-100 last:border-0" key={item.id}>
                        <td className="px-4 py-4">
                          <p className="font-black text-slate-950">{item.user?.username ?? "Unknown"}</p>
                          <p className="text-xs text-slate-400 font-semibold">{item.user?.email ?? ""}</p>
                        </td>
                        <td className="px-4 py-4 font-black text-slate-950">{formatUsdt(item.amountUsdt)}</td>
                        <td className="px-4 py-4 font-semibold text-slate-500">{item.network}</td>
                        <td className="px-4 py-4 font-mono text-xs text-slate-500 select-all max-w-[200px] truncate">
                          {item.txnHash ?? "-"}
                        </td>
                        <td className="px-4 py-4 text-xs font-bold text-slate-400">{formatDate(item.createdAt)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-sm font-semibold text-slate-400">
                        No deposits found in the selected date range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 p-4">
                <p className="text-xs font-semibold text-slate-500">
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="h-9 rounded-xl px-3 text-xs"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="size-4" />
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9 rounded-xl px-3 text-xs"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </AdminCard>
        </div>
      )}

      {/* Withdrawal Monitor Content */}
      {!isLoading && activeTab === "withdrawals" && (
        <div className="space-y-4">
          <AdminCard>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-slate-950">Withdrawal Records</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Showing processed withdrawals filtered by range.
                </p>
              </div>
              <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">
                Total: {totalCount}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase text-slate-500">
                    <th className="px-4 py-3 font-black">User</th>
                    <th className="px-4 py-3 font-black">Gross Amount</th>
                    <th className="px-4 py-3 font-black">Charge (Fee)</th>
                    <th className="px-4 py-3 font-black">Net Amount</th>
                    <th className="px-4 py-3 font-black">Network</th>
                    <th className="px-4 py-3 font-black">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.length ? (
                    withdrawals.map((item) => (
                      <tr className="border-b border-slate-100 last:border-0" key={item.id}>
                        <td className="px-4 py-4">
                          <p className="font-black text-slate-950">{item.user?.username ?? "Unknown"}</p>
                          <p className="text-xs text-slate-400 font-semibold">{item.user?.email ?? ""}</p>
                        </td>
                        <td className="px-4 py-4 font-black text-slate-500">{formatUsdt(item.grossAmountUsdt)}</td>
                        <td className="px-4 py-4 text-xs font-bold text-rose-600">
                          {formatUsdt(item.chargeUsdt)} ({item.withdrawalChargePercent}%)
                        </td>
                        <td className="px-4 py-4 font-black text-emerald-600">{formatUsdt(item.amountUsdt)}</td>
                        <td className="px-4 py-4 font-semibold text-slate-500">{item.network}</td>
                        <td className="px-4 py-4 text-xs font-bold text-slate-400">{formatDate(item.createdAt)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-sm font-semibold text-slate-400">
                        No withdrawals found in the selected date range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 p-4">
                <p className="text-xs font-semibold text-slate-500">
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="h-9 rounded-xl px-3 text-xs"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="size-4" />
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9 rounded-xl px-3 text-xs"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </AdminCard>
        </div>
      )}

      {/* Liquidity System Content */}
      {!isLoading && activeTab === "liquidity" && overview && (
        <div className="space-y-4 animate-fade-in">
          {/* Overview Cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <AdminCard className="rounded-xl">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Deposits</p>
                  <p className="mt-1 text-base font-black text-slate-950 sm:text-lg">
                    {formatUsdt(overview.totalDepositsUsdt)}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-400 font-semibold">Total capital inflow</p>
                </div>
                <span className="grid size-10 place-items-center rounded-xl bg-cyan-50 text-cyan-700">
                  <TrendingUp className="size-4" />
                </span>
              </div>
            </AdminCard>

            <AdminCard className="rounded-xl">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Package Sales</p>
                  <p className="mt-1 text-base font-black text-slate-950 sm:text-lg">
                    {formatUsdt(overview.totalPackagesSellUsdt)}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-400 font-semibold">Plans purchased by users</p>
                </div>
                <span className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-700">
                  <Wallet className="size-4" />
                </span>
              </div>
            </AdminCard>

            <AdminCard className="rounded-xl">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Withdrawals</p>
                  <p className="mt-1 text-base font-black text-slate-950 sm:text-lg">
                    {formatUsdt(overview.totalWithdrawalsUsdt)}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-400 font-semibold">Capital outflow</p>
                </div>
                <span className="grid size-10 place-items-center rounded-xl bg-rose-50 text-rose-700">
                  <TrendingDown className="size-4" />
                </span>
              </div>
            </AdminCard>

            <AdminCard className="rounded-xl">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payouts Paid</p>
                  <p className="mt-1 text-base font-black text-slate-950 sm:text-lg">
                    {formatUsdt(overview.earningsPaidUsdt)}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-400 font-semibold">ROI, Level & Royalty paid</p>
                </div>
                <span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-700">
                  <Download className="size-4" />
                </span>
              </div>
            </AdminCard>
          </div>

          {/* Premium Liquidity Flow Indicator */}
          <AdminCard>
            <div className="p-5 flex flex-col items-center justify-between gap-4 md:flex-row">
              <div className="space-y-1">
                <p className="text-sm font-black text-slate-950">Net Liquidity Flow</p>
                <p className="text-xs font-semibold text-slate-500">
                  Calculated as: <span className="font-mono text-[11px]">Total Deposits - Total Withdrawals - Payouts Paid</span> for the selected date range.
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className={cn(
                    "text-xl md:text-2xl font-black tracking-tight",
                    netLiquidity >= 0 ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {netLiquidity >= 0 ? "+" : ""}
                    {formatUsdt(netLiquidity)}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {netLiquidity >= 0 ? "Surplus Cash Flow" : "System deficit"}
                  </p>
                </div>

                <span className={cn(
                  "grid size-12 place-items-center rounded-2xl shrink-0",
                  netLiquidity >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                )}>
                  {netLiquidity >= 0 ? (
                    <TrendingUp className="size-6 animate-pulse" />
                  ) : (
                    <TrendingDown className="size-6" />
                  )}
                </span>
              </div>
            </div>
          </AdminCard>
        </div>
      )}
    </section>
  );
}
