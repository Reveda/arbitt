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
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { Input } from "@/components/ui/input";
import { useAdminWithdrawals } from "@/hooks/useAdminQueries";
import { adminService, type AdminWithdrawalRequest } from "@/services/admin.service";
import { cn } from "@/lib/utils";
import { AdminCard, AdminPageHeader } from "./admin.components";
import { ToastMessage, type ToastMessageValue } from "@/components/ui/toast-message";

const PAGE_SIZE = 10;

const STATUS_FILTERS = [
  { label: "All status", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Completed", value: "completed" },
  { label: "Rejected", value: "rejected" },
  { label: "Failed", value: "failed" }
];

const modalOverlayClass =
  "fixed inset-0 z-50 flex items-end justify-center overflow-hidden bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4";
const modalPanelClass =
  "flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-b-none rounded-t-2xl border-slate-200 bg-white text-slate-950 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl";
const modalHeaderClass =
  "flex shrink-0 flex-row items-start justify-between gap-3 border-b border-slate-100 p-4 sm:p-5";
const modalBodyClass = "min-h-0 flex-1 overflow-y-auto";
const modalContentClass = "p-4 sm:p-5";
const modalFooterClass =
  "shrink-0 border-t border-slate-100 bg-slate-50 p-4 sm:p-5";

function formatUsdt(value: number) {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 18,
    minimumFractionDigits: 0,
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

export function AdminWithdrawalsPage() {
  const [page, setPage] = useState(1);
  const limit = PAGE_SIZE;
  const [status, setStatus] = useState("all");
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Review Modal State
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<AdminWithdrawalRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Approval Confirmation Screen states
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [isConfirmedCheckbox, setIsConfirmedCheckbox] = useState(false);
  
  // Toast state
  const [toastMessage, setToastMessage] = useState<ToastMessageValue | null>(null);
  const [copiedTarget, setCopiedTarget] = useState<string | null>(null);

  useEffect(() => {
    const timerId = window.setTimeout(() => setDebouncedSearch(searchValue.trim()), 350);
    return () => window.clearTimeout(timerId);
  }, [searchValue]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, fromDate, status, toDate]);

  const withdrawalsQuery = useAdminWithdrawals({
    page,
    limit,
    search: debouncedSearch || undefined,
    status: status === "all" ? undefined : status,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined
  });

  const data = withdrawalsQuery.data?.data;
  const withdrawals = data?.withdrawals ?? [];
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

  const handleCloseModal = () => {
    setSelectedWithdrawal(null);
    setReviewNotes("");
    setTxHash("");
    setIsConfirmedCheckbox(false);
    setShowApproveConfirm(false);
    setReviewError(null);
  };

  const handleReviewAction = async (action: "approve" | "reject") => {
    if (!selectedWithdrawal) return;
    setIsReviewing(true);
    setReviewError(null);

    const notesPayload = action === "approve"
      ? `TxHash: ${txHash.trim()}`
      : reviewNotes.trim();

    try {
      await adminService.reviewWithdrawal(selectedWithdrawal.id, action, notesPayload);
      
      setToastMessage({
        text: `Withdrawal request successfully ${action === "approve" ? "approved" : "rejected"}.`,
        tone: "success"
      });

      handleCloseModal();
      withdrawalsQuery.refetch();
    } catch (err: any) {
      setReviewError(err instanceof Error ? err.message : `Failed to ${action} withdrawal request.`);
    } finally {
      setIsReviewing(false);
    }
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
        description="Approve, reject, and monitor user withdrawal requests securely."
        title="Withdrawal Approval Queue"
      />

      {/* Filtering Section */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between relative z-30">
        
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              className={cn(
                "rounded-xl px-4 py-1.5 text-xs font-bold transition-all",
                status === filter.value
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              )}
              onClick={() => setStatus(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Date Filters */}
        <DateRangeFilter
          fromDate={fromDate}
          toDate={toDate}
          onApply={({ fromDate, toDate }) => {
            setFromDate(fromDate);
            setToDate(toDate);
          }}
        />
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <Search className="size-4" />
        </span>
        <Input
          placeholder="Search by username, notes, receiving address..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="bg-white border-slate-200 pl-9 pr-4 text-xs focus-visible:ring-slate-950"
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

      {/* Main List Table */}
      <AdminCard>
        {withdrawalsQuery.isLoading && withdrawals.length === 0 ? (
          <div className="flex h-56 flex-col items-center justify-center">
            <Loader2 className="size-8 animate-spin text-slate-600" />
            <span className="mt-2 text-xs font-bold text-slate-500">Loading withdrawal queue...</span>
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center text-center">
            <WalletCards className="size-10 text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-500">No withdrawal requests match your filters.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-50/50">
                    <th className="pb-3 pt-2 pr-2 pl-4">User details</th>
                    <th className="pb-3 pt-2 px-2">Net payout</th>
                    <th className="pb-3 pt-2 px-2">Requested gross / Fee</th>
                    <th className="pb-3 pt-2 px-2">Target Address</th>
                    <th className="pb-3 pt-2 px-2">Date Requested</th>
                    <th className="pb-3 pt-2 px-2 text-center">Status</th>
                    <th className="pb-3 pt-2 pl-2 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {withdrawals.map((request) => {
                    const gross = request.grossAmountUsdt;
                    const fee = request.chargeUsdt;
                    const net = request.amountUsdt;

                    return (
                      <tr key={request.id} className="hover:bg-slate-50/50 transition-colors">
                        
                        {/* User Details with Avatar Badge */}
                        <td className="py-4 pr-2 pl-4">
                          <div className="flex items-center gap-3">
                            <div className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-xs font-black uppercase text-white shadow-sm shrink-0">
                              {request.user?.username ? request.user.username[0] : "?"}
                            </div>
                            <div className="font-bold text-slate-900">
                              {request.user?.username || "Unknown"}
                            </div>
                          </div>
                        </td>

                        {/* Net Payout Green Pill */}
                        <td className="py-4 px-2">
                          <span className="inline-flex items-center rounded-xl bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-600 ring-1 ring-inset ring-emerald-600/10">
                            {formatUsdt(net)}
                          </span>
                        </td>

                        {/* Gross Amount & Fee */}
                        <td className="py-4 px-2 text-slate-500">
                          <div className="text-xs font-bold text-slate-700">Gross: {formatUsdt(gross)}</div>
                          <div className="text-[10px] text-rose-500 font-semibold mt-0.5">
                            Fee: {formatUsdt(fee)} ({request.withdrawalChargePercent}%)
                          </div>
                        </td>

                        {/* Target wallet address with copy pill capsule */}
                        <td className="py-4 px-2 max-w-[220px]">
                          {request.walletAddress ? (
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/60 rounded-xl px-2.5 py-1.5 w-fit">
                              <span className="font-mono text-[10px] text-slate-600 truncate max-w-[120px]" title={request.walletAddress}>
                                {request.walletAddress}
                              </span>
                              <button
                                onClick={() => copyAddress(request.walletAddress!)}
                                className="text-slate-400 hover:text-slate-700 shrink-0 transition-colors"
                              >
                                {copiedTarget === request.walletAddress ? (
                                  <CheckCircle2 className="size-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="size-3.5" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No target saved</span>
                          )}
                          <div className="text-[9px] font-black text-cyan-600 bg-cyan-50 border border-cyan-200/50 px-1.5 py-0.5 rounded-lg inline-block mt-1">
                            {request.network}
                          </div>
                        </td>

                        {/* Date */}
                        <td className="py-4 px-2 text-slate-500 text-xs font-medium">
                          {formatDate(request.createdAt)}
                        </td>

                        {/* Status badge */}
                        <td className="py-4 px-2 text-center">
                          <span className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase ring-1 ring-inset",
                            getStatusTone(request.status)
                          )}>
                            {request.status}
                          </span>
                        </td>

                        {/* Action buttons */}
                        <td className="py-4 pl-2 pr-4 text-right">
                          {request.status === "pending" ? (
                            <Button
                              className="bg-cyan-700 hover:bg-cyan-800 text-white rounded-xl text-[10px] font-bold h-8 px-4 shadow-sm shadow-cyan-700/10 transition-all hover:scale-[1.02]"
                              onClick={() => {
                                setSelectedWithdrawal(request);
                                setReviewError(null);
                                setReviewNotes("");
                              }}
                            >
                              Review
                            </Button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
                              Reviewed
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
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <p className="text-[11px] font-bold text-slate-500">
                  Showing request {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} requests
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-7 rounded-lg border-slate-200 hover:bg-slate-50"
                    disabled={!pagination.hasPreviousPage || withdrawalsQuery.isLoading}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    <ChevronLeft className="size-4 text-slate-600" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-7 rounded-lg border-slate-200 hover:bg-slate-50"
                    disabled={!pagination.hasNextPage || withdrawalsQuery.isLoading}
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

      {/* Review Request Modal */}
      {selectedWithdrawal && (
        <div className={modalOverlayClass}>
          <div className={modalPanelClass}>
            
            {!showApproveConfirm ? (
              <>
                {/* Modal Header */}
                <div className={modalHeaderClass}>
                  <div>
                    <h3 className="text-base font-black tracking-tight text-slate-900">
                      Review Withdrawal Request
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-400">
                      Approve blockchain payout or reject request back to user balance.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="-mr-1.5 size-7 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                    onClick={handleCloseModal}
                  >
                    <X className="size-4" />
                  </Button>
                </div>

                {/* Modal Body */}
                <div className={modalBodyClass}>
                  <div className={modalContentClass}>
                    
                    {/* Information panel */}
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3 font-semibold text-slate-700 text-xs mb-4">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Username:</span>
                        <span className="font-bold text-slate-900">{selectedWithdrawal.user?.username || "N/A"}</span>
                      </div>
                      <hr className="border-slate-200" />
                      <div className="flex justify-between">
                        <span className="text-slate-400">Requested Amount (Gross):</span>
                        <span className="font-bold text-slate-900">{formatUsdt(selectedWithdrawal.grossAmountUsdt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Administrative Fee (10%):</span>
                        <span className="font-bold text-rose-600">-{formatUsdt(selectedWithdrawal.chargeUsdt)}</span>
                      </div>
                      <hr className="border-slate-200" />
                      <div className="flex justify-between text-sm py-0.5">
                        <span className="font-bold text-slate-900">Net Blockchain Payout:</span>
                        <span className="font-black text-emerald-600">{formatUsdt(selectedWithdrawal.amountUsdt)}</span>
                      </div>
                      <hr className="border-slate-200" />
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Receiving BEP20 Wallet Address:</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-5 rounded"
                            onClick={() => copyAddress(selectedWithdrawal.walletAddress ?? "")}
                          >
                            {copiedTarget === selectedWithdrawal.walletAddress ? (
                              <CheckCircle2 className="size-3 text-emerald-600" />
                            ) : (
                              <Copy className="size-3 text-slate-400 hover:text-slate-600" />
                            )}
                          </Button>
                        </div>
                        <span className="font-mono font-bold text-slate-900 bg-white border border-slate-200 rounded-lg p-2 block break-all text-[11px]">
                          {selectedWithdrawal.walletAddress || "No target address specified"}
                        </span>
                      </div>
                      {selectedWithdrawal.notes && (
                        <div className="space-y-1">
                          <span className="text-slate-400 block">User Notes/Remarks:</span>
                          <span className="italic text-slate-600 font-medium">"{selectedWithdrawal.notes}"</span>
                        </div>
                      )}
                    </div>

                    {/* Review Notes field */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Admin Review Notes / Rejection Reason
                      </label>
                      <Input
                        placeholder="Enter approval details or rejection reason..."
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        className="border-slate-200 bg-slate-50 text-xs focus-visible:ring-slate-950"
                      />
                    </div>

                    {/* Internal modal errors */}
                    {reviewError && (
                      <div className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 mt-4 flex items-center gap-2">
                        <AlertCircle className="size-4 shrink-0" />
                        <span>{reviewError}</span>
                      </div>
                    )}

                  </div>
                </div>

                {/* Modal Footer */}
                <div className={modalFooterClass}>
                  <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-end">
                    <Button
                      variant="outline"
                      className="w-full rounded-xl font-bold hover:bg-slate-50 border border-slate-200 order-3 sm:order-1 sm:w-auto sm:px-6"
                      onClick={handleCloseModal}
                      disabled={isReviewing}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="w-full rounded-xl bg-rose-600 font-bold text-white hover:bg-rose-700 order-2 sm:order-2 sm:w-auto sm:px-6"
                      onClick={() => handleReviewAction("reject")}
                      disabled={isReviewing}
                    >
                      {isReviewing ? (
                        <Loader2 className="size-4 animate-spin mx-auto" />
                      ) : (
                        "Reject & Return"
                      )}
                    </Button>
                    <Button
                      className="w-full rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700 order-1 sm:order-3 sm:w-auto sm:px-6"
                      onClick={() => setShowApproveConfirm(true)}
                      disabled={isReviewing}
                    >
                      Approve Payout
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Modal Header */}
                <div className={modalHeaderClass}>
                  <div>
                    <h3 className="text-base font-black tracking-tight text-slate-900">
                      Verify Manual Transfer
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-400">
                      Confirm on-chain transaction hash before finalizing approval.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="-mr-1.5 size-7 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                    onClick={handleCloseModal}
                  >
                    <X className="size-4" />
                  </Button>
                </div>

                {/* Modal Body */}
                <div className={modalBodyClass}>
                  <div className={modalContentClass + " space-y-4"}>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3 font-semibold text-slate-700 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Destination Address:</span>
                        <span className="font-mono font-bold text-slate-950 break-all text-right max-w-[180px]">{selectedWithdrawal.walletAddress}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Net Amount to Transfer:</span>
                        <span className="font-black text-emerald-600">{formatUsdt(selectedWithdrawal.amountUsdt)}</span>
                      </div>
                    </div>

                    {/* TxHash input */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Blockchain Transaction Hash (TxHash)
                      </label>
                      <Input
                        placeholder="Enter transaction hash (0x...)"
                        value={txHash}
                        onChange={(e) => setTxHash(e.target.value)}
                        className="border-slate-200 bg-slate-50 font-mono text-xs focus-visible:ring-slate-950 font-bold text-slate-800"
                        required
                      />
                      <p className="text-[10px] leading-relaxed text-slate-400">
                        Input the transaction hash generated from your MetaMask or blockchain transfer as auditing proof.
                      </p>
                    </div>

                    {/* Checkbox confirmation */}
                    <div className="flex items-start gap-2.5 rounded-xl border border-slate-150 bg-slate-50 p-3">
                      <input
                        type="checkbox"
                        id="confirm_checkbox"
                        checked={isConfirmedCheckbox}
                        onChange={(e) => setIsConfirmedCheckbox(e.target.checked)}
                        className="mt-0.5 size-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                      />
                      <label htmlFor="confirm_checkbox" className="text-[11px] font-semibold text-slate-600 leading-tight select-none cursor-pointer">
                        I confirm that I have manually transferred exactly {formatUsdt(selectedWithdrawal.amountUsdt)} on-chain to the wallet address shown above.
                      </label>
                    </div>

                    {reviewError && (
                      <div className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 flex items-center gap-2">
                        <AlertCircle className="size-4 shrink-0" />
                        <span>{reviewError}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className={modalFooterClass}>
                  <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-end">
                    <Button
                      variant="outline"
                      className="w-full rounded-xl font-bold hover:bg-slate-50 border border-slate-200 order-3 sm:order-1 sm:w-auto sm:px-6"
                      onClick={() => {
                        setShowApproveConfirm(false);
                        setTxHash("");
                        setIsConfirmedCheckbox(false);
                      }}
                      disabled={isReviewing}
                    >
                      Back to Review
                    </Button>
                    <Button
                      className="w-full rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700 order-1 sm:order-2 sm:w-auto sm:px-6"
                      onClick={() => handleReviewAction("approve")}
                      disabled={isReviewing || !isConfirmedCheckbox || !txHash.trim()}
                    >
                      {isReviewing ? (
                        <Loader2 className="size-4 animate-spin mx-auto" />
                      ) : (
                        "Confirm & Complete"
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      )}

    </section>
  );
}
