import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  LockKeyhole,
  Loader2,
  Wallet,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ToastMessage, type ToastMessageValue } from "@/components/ui/toast-message";
import { walletService, type WalletSummary } from "@/services/wallet.service";
import { transactionService, type UserTransaction, type UserTransactionsResponse } from "@/services/transaction.service";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { cn } from "@/lib/utils";
import { authService } from "@/services/auth.service";

const WITHDRAWALS_PAGE_SIZE = 10;
const MIN_WITHDRAW_USDT = 10;
const WITHDRAWAL_CHARGE_PERCENT = 10;
const USER_WALLET_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

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
const compactMetricCardClass = "min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4";

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
  if (status === "approved" || status === "completed" || status === "active") {
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

const emptyWithdrawalsPagination: UserTransactionsResponse["pagination"] = {
  page: 1,
  limit: WITHDRAWALS_PAGE_SIZE,
  total: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false
};

export function WithdrawPage() {
  const { user, refetch: refetchUser } = useCurrentUser();
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWithdrawalsLoading, setIsWithdrawalsLoading] = useState(true);
  
  // Withdrawal Form State
  const [amountUsdt, setAmountUsdt] = useState("");
  const [targetAddress, setTargetAddress] = useState("");
  const [notes, setNotes] = useState("");
  
  // Confirmation Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  
  // Transaction Password State
  const [transactionPasswordConfirm, setTransactionPasswordConfirm] = useState("");
  const [newTransactionPassword, setNewTransactionPassword] = useState("");
  const [confirmTransactionPassword, setConfirmTransactionPassword] = useState("");
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [passwordSetError, setPasswordSetError] = useState<string | null>(null);
  
  // Pagination & List state
  const [withdrawPage, setWithdrawPage] = useState(1);
  const [withdrawals, setWithdrawals] = useState<UserTransaction[]>([]);
  const [withdrawalsPagination, setWithdrawalsPagination] = useState<UserTransactionsResponse["pagination"]>({
    ...emptyWithdrawalsPagination
  });
  
  // Toast state
  const [toastMessage, setToastMessage] = useState<ToastMessageValue | null>(null);

  // Set default wallet address from user profile when loaded
  useEffect(() => {
    if (user?.walletAddress) {
      setTargetAddress(user.walletAddress);
    }
  }, [user]);

  // Load wallet summary
  const loadWalletSummary = async () => {
    try {
      const summary = await walletService.getSummary();
      setWallet(summary.data);
    } catch (err: any) {
      console.error("Failed to load wallet summary:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load withdrawals (using transactions list filtered by type=withdrawal)
  const loadWithdrawals = async (page: number) => {
    setIsWithdrawalsLoading(true);
    try {
      const response = await transactionService.listTransactions({
        page,
        limit: WITHDRAWALS_PAGE_SIZE,
        type: "withdrawal"
      });
      setWithdrawals(response.data.transactions);
      setWithdrawalsPagination(response.data.pagination);
    } catch (err: any) {
      console.error("Failed to load withdrawal history:", err);
    } finally {
      setIsWithdrawalsLoading(false);
    }
  };

  useEffect(() => {
    loadWalletSummary();
  }, []);

  useEffect(() => {
    loadWithdrawals(withdrawPage);
  }, [withdrawPage]);

  const handleOpenConfirmation = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    const val = parseFloat(amountUsdt);
    if (isNaN(val) || val <= 0) {
      setFormError("Enter a valid positive number.");
      return;
    }

    if (val < MIN_WITHDRAW_USDT) {
      setFormError(`Minimum withdrawal amount is ${MIN_WITHDRAW_USDT} USDT.`);
      return;
    }

    if (val > 50000) {
      setFormError("Maximum withdrawal limit per request is 50,000 USDT.");
      return;
    }

    const available = wallet?.availableUsdt ?? 0;
    if (val > available) {
      setFormError(`Insufficient balance. Max withdrawable amount is ${formatUsdt(available)}.`);
      return;
    }

    const cleanedAddress = targetAddress.trim();
    if (!USER_WALLET_ADDRESS_PATTERN.test(cleanedAddress)) {
      setFormError("Please enter a valid BEP20 (Binance Smart Chain) address starting with 0x.");
      return;
    }

    setModalError(null);
    setTransactionPasswordConfirm("");
    setNewTransactionPassword("");
    setConfirmTransactionPassword("");
    setPasswordSetError(null);
    setIsModalOpen(true);
  };

  const handleSetTransactionPassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordSetError(null);
    setIsSettingPassword(true);

    const pass = newTransactionPassword.trim();
    const conf = confirmTransactionPassword.trim();

    if (pass.length < 6) {
      setPasswordSetError("Transaction password must be at least 6 characters.");
      setIsSettingPassword(false);
      return;
    }

    if (pass !== conf) {
      setPasswordSetError("Transaction passwords do not match.");
      setIsSettingPassword(false);
      return;
    }

    try {
      await authService.updateTransactionPassword({
        transactionPassword: pass,
        confirmTransactionPassword: conf
      });

      await refetchUser();
      
      setNewTransactionPassword("");
      setConfirmTransactionPassword("");
      setToastMessage({
        text: "Transaction password set successfully. You can now confirm your withdrawal.",
        tone: "success"
      });
    } catch (err: any) {
      setPasswordSetError(err instanceof Error ? err.message : "Failed to set transaction password.");
    } finally {
      setIsSettingPassword(false);
    }
  };

  const handleConfirmSubmit = async () => {
    setModalError(null);

    const pw = transactionPasswordConfirm.trim();
    if (!pw) {
      setModalError("Transaction password is required.");
      return;
    }

    setIsSubmitting(true);
    setToastMessage(null);
    const grossVal = parseFloat(amountUsdt);
    const cleanedAddress = targetAddress.trim();

    try {
      await walletService.createWithdrawal({
        amountUsdt: grossVal,
        network: "BEP20",
        walletAddress: cleanedAddress,
        notes: notes.trim(),
        transactionPassword: pw
      } as any);

      setToastMessage({
        text: `Withdrawal request of ${formatUsdt(grossVal)} submitted successfully for admin approval.`,
        tone: "success"
      });
      
      setAmountUsdt("");
      setNotes("");
      setTransactionPasswordConfirm("");
      setIsModalOpen(false);

      loadWalletSummary();
      setWithdrawPage(1);
      loadWithdrawals(1);
    } catch (err: any) {
      setModalError(err instanceof Error ? err.message : "Failed to submit withdrawal request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculations
  const grossVal = parseFloat(amountUsdt) || 0;
  const chargeVal = grossVal * (WITHDRAWAL_CHARGE_PERCENT / 100);
  const netVal = Math.max(0, grossVal - chargeVal);

  return (
    <section className="space-y-4">
      {/* Dynamic Toast Message */}
      {toastMessage && (
        <ToastMessage
          message={toastMessage}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#08152e] via-[#0d5c80] to-[#22d3ee] px-4 py-4 text-white shadow-[0_18px_50px_rgba(8,21,46,0.18)] sm:px-5">
        <div className="absolute -right-10 -top-12 size-36 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-cyan-100/82 sm:text-xs">
            Financial Dashboard
          </p>
          <h1 className="mt-1 text-[1.35rem] font-black leading-tight tracking-tight sm:text-2xl">
            Withdraw Funds
          </h1>
          <p className="mt-1 max-w-2xl text-[13px] font-semibold leading-relaxed text-cyan-50/88 sm:text-sm">
            Request secure withdrawals and monitor approval status.
          </p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={compactMetricCardClass}>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-cyan-50 text-cyan-700">
              <Wallet className="size-5" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Available (Withdrawable)
              </p>
              <p className="text-base font-black text-slate-950 sm:text-lg">
                {isLoading ? (
                  <Loader2 className="mt-1 size-4 animate-spin text-slate-400" />
                ) : (
                  formatUsdt(wallet?.availableUsdt ?? 0)
                )}
              </p>
            </div>
          </div>
        </div>

        <div className={compactMetricCardClass}>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-700">
              <LockKeyhole className="size-5" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Locked in Pending
              </p>
              <p className="text-base font-black text-slate-950 sm:text-lg">
                {isLoading ? (
                  <Loader2 className="mt-1 size-4 animate-spin text-slate-400" />
                ) : (
                  formatUsdt(wallet?.lockedUsdt ?? 0)
                )}
              </p>
            </div>
          </div>
        </div>

        <div className={compactMetricCardClass}>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
              <ArrowUpRight className="size-5" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Lifetime Withdrawn
              </p>
              <p className="text-base font-black text-slate-950 sm:text-lg">
                {isLoading ? (
                  <Loader2 className="mt-1 size-4 animate-spin text-slate-400" />
                ) : (
                  formatUsdt(wallet?.lifetimeWithdrawalsUsdt ?? 0)
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stacked Layout: Create Request then History below */}
      <div className="flex flex-col gap-6">
        
        {/* Request Form */}
        <Card className="border-slate-200 bg-white text-slate-950 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-black tracking-tight">
              Create Withdrawal Request
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleOpenConfirmation} className="space-y-4">
              
              {/* Amount field */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Withdrawal Amount (USDT)
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min={MIN_WITHDRAW_USDT}
                    placeholder="Enter amount (e.g. 100)"
                    value={amountUsdt}
                    onChange={(e) => setAmountUsdt(e.target.value)}
                    className="border-slate-200 bg-slate-50 font-bold focus-visible:ring-cyan-500"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    USDT
                  </span>
                </div>
                <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                  <span>Min: {MIN_WITHDRAW_USDT} USDT</span>
                  <span>Fee: {WITHDRAWAL_CHARGE_PERCENT}%</span>
                </div>
              </div>

              {/* Withdrawal fee field */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Withdrawal Fee (10%)
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    value={chargeVal > 0 ? String(chargeVal) : "0"}
                    className="border-slate-200 bg-slate-100 font-bold text-slate-500 cursor-not-allowed"
                    disabled
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    USDT
                  </span>
                </div>
              </div>

              {/* Final Payable Amount field */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Final Payout Amount (Net)
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    value={netVal > 0 ? String(netVal) : "0"}
                    className="border-slate-200 bg-slate-100 font-black text-emerald-600 cursor-not-allowed"
                    disabled
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    USDT
                  </span>
                </div>
              </div>

              {/* Wallet Address field */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Receiving BEP20 Wallet Address
                </label>
                <Input
                  type="text"
                  placeholder="0x..."
                  value={targetAddress}
                  onChange={(e) => setTargetAddress(e.target.value)}
                  className="border-slate-200 bg-slate-50 font-mono text-xs focus-visible:ring-cyan-500"
                  required
                />
                <p className="text-[10px] leading-relaxed text-slate-400">
                  Ensure the target address is correct. Withdrawals made to incorrect addresses cannot be recovered.
                </p>
              </div>

              {/* Remarks/Notes */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Remarks / Notes (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Personal savings"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="border-slate-200 bg-slate-50 focus-visible:ring-cyan-500"
                />
              </div>

              {/* Validation Error */}
              {formError && (
                <div className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                  {formError}
                </div>
              )}

              {/* Submit button */}
              <Button
                type="submit"
                className="w-full rounded-2xl bg-cyan-700 font-bold text-white hover:bg-cyan-800"
                disabled={isLoading}
              >
                Continue to Review
              </Button>

            </form>
          </CardContent>
        </Card>

        {/* History Table */}
        <Card className="border-slate-200 bg-white text-slate-950 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-black tracking-tight">
              Withdrawal History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isWithdrawalsLoading && withdrawals.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center">
                <Loader2 className="size-8 animate-spin text-cyan-600" />
                <span className="mt-2 text-xs font-bold text-slate-400">Loading history...</span>
              </div>
            ) : withdrawals.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200">
                <p className="text-sm font-semibold text-slate-400">No withdrawal records found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="pb-3 pr-2">Date</th>
                        <th className="pb-3 px-2">Net Payout</th>
                        <th className="pb-3 px-2">Total Request</th>
                        <th className="pb-3 pl-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {withdrawals.map((item) => {
                        const netAmount = item.amountUsdt;
                        const grossMatch = item.notes?.match(/gross\s+([\d.]+)/i);
                        const grossVal = grossMatch ? parseFloat(grossMatch[1]) : netAmount / 0.9;
                        
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="py-3 pr-2">
                              <div>{formatDate(item.createdAt)}</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.network}</div>
                            </td>
                            <td className="py-3 px-2 font-bold text-slate-900">
                              {formatUsdt(netAmount)}
                            </td>
                            <td className="py-3 px-2 text-slate-500">
                              {formatUsdt(grossVal)}
                            </td>
                            <td className="py-3 pl-2">
                              <span className={cn(
                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ring-1 ring-inset",
                                getStatusTone(item.status)
                              )}>
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination footer */}
                {withdrawalsPagination.totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                    <p className="text-[11px] font-bold text-slate-500">
                      Showing Page {withdrawalsPagination.page} of {withdrawalsPagination.totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-7 rounded-lg border-slate-200 hover:bg-slate-50"
                        disabled={!withdrawalsPagination.hasPreviousPage || isWithdrawalsLoading}
                        onClick={() => setWithdrawPage((prev) => Math.max(1, prev - 1))}
                      >
                        <ChevronLeft className="size-4 text-slate-600" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-7 rounded-lg border-slate-200 hover:bg-slate-50"
                        disabled={!withdrawalsPagination.hasNextPage || isWithdrawalsLoading}
                        onClick={() => setWithdrawPage((prev) => prev + 1)}
                      >
                        <ChevronRight className="size-4 text-slate-600" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Confirmation Modal */}
      {isModalOpen && (
        <div className={modalOverlayClass}>
          <div className={modalPanelClass}>
            
            {!user?.hasTransactionPassword ? (
              <form onSubmit={handleSetTransactionPassword} className="min-h-0 flex-1 flex flex-col">
                {/* Modal Header */}
                <div className={modalHeaderClass}>
                  <div>
                    <h3 className="text-base font-black tracking-tight text-slate-900">
                      Set Transaction Password
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-400">
                      You must set a secure transaction password before withdrawing
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="-mr-1.5 size-7 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                    onClick={() => setIsModalOpen(false)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>

                {/* Modal Body */}
                <div className={modalBodyClass}>
                  <div className={modalContentClass + " space-y-4"}>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        New Transaction Password
                      </label>
                      <Input
                        type="password"
                        placeholder="Minimum 6 characters"
                        value={newTransactionPassword}
                        onChange={(e) => setNewTransactionPassword(e.target.value)}
                        className="border-slate-200 bg-slate-50 focus-visible:ring-cyan-500 font-bold"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Confirm New Transaction Password
                      </label>
                      <Input
                        type="password"
                        placeholder="Repeat new password"
                        value={confirmTransactionPassword}
                        onChange={(e) => setConfirmTransactionPassword(e.target.value)}
                        className="border-slate-200 bg-slate-50 focus-visible:ring-cyan-500 font-bold"
                        required
                      />
                    </div>

                    {passwordSetError && (
                      <div className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                        {passwordSetError}
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className={modalFooterClass}>
                  <div className="flex flex-col-reverse gap-3 sm:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full rounded-xl border-slate-200 font-bold hover:bg-slate-50 sm:flex-1"
                      onClick={() => setIsModalOpen(false)}
                      disabled={isSettingPassword}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="w-full rounded-xl bg-cyan-700 font-bold text-white hover:bg-cyan-800 sm:flex-1"
                      disabled={isSettingPassword}
                    >
                      {isSettingPassword ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Set Password & Proceed"
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="min-h-0 flex-1 flex flex-col">
                {/* Modal Header */}
                <div className={modalHeaderClass}>
                  <div>
                    <h3 className="text-base font-black tracking-tight text-slate-900">
                      Confirm Withdrawal Request
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-400">
                      Please review the payout details before continuing
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="-mr-1.5 size-7 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                    onClick={() => setIsModalOpen(false)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>

                {/* Modal Body */}
                <div className={modalBodyClass}>
                  <div className={modalContentClass + " space-y-4"}>
                    
                    {/* Receiving Wallet Address */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Receiving Wallet Address (BEP20)
                      </label>
                      <div className="font-mono font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl p-3 break-all text-xs">
                        {targetAddress}
                      </div>
                    </div>

                    {/* Confirm Transaction Password field */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Confirm Transaction Password
                      </label>
                      <Input
                        type="password"
                        placeholder="Enter transaction password to confirm"
                        value={transactionPasswordConfirm}
                        onChange={(e) => setTransactionPasswordConfirm(e.target.value)}
                        className="border-slate-200 bg-slate-50 focus-visible:ring-cyan-500 font-bold"
                        required
                      />
                    </div>

                    {modalError && (
                      <div className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                        {modalError}
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className={modalFooterClass}>
                  <div className="flex flex-col-reverse gap-3 sm:flex-row">
                    <Button
                      variant="outline"
                      className="w-full rounded-xl border-slate-200 font-bold hover:bg-slate-50 sm:flex-1"
                      onClick={() => setIsModalOpen(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="w-full rounded-xl bg-cyan-700 font-bold text-white hover:bg-cyan-800 sm:flex-1"
                      onClick={handleConfirmSubmit}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Confirm & Submit"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </section>
  );
}
