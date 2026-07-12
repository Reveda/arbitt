import { useEffect, useState, type FormEvent } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  TrendingDown,
  TrendingUp,
  Wallet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToastMessage, type ToastMessageValue } from "@/components/ui/toast-message";
import { useAdminWallets } from "@/hooks/useAdminQueries";
import { cn } from "@/lib/utils";
import { adminService, type AdminWallet } from "@/services/admin.service";
import type { PlatformDepositWallet } from "@/services/wallet.service";
import { AdminCard, AdminPageHeader, MetricCard } from "./admin.components";

const PAGE_SIZE = 12;
const WALLET_NETWORK_OPTIONS = ["BEP20"] as const;

function normalizeWalletNetwork(value?: string): (typeof WALLET_NETWORK_OPTIONS)[number] {
  return WALLET_NETWORK_OPTIONS.includes(value as (typeof WALLET_NETWORK_OPTIONS)[number])
    ? (value as (typeof WALLET_NETWORK_OPTIONS)[number])
    : "BEP20";
}

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

function getUserName(wallet: AdminWallet) {
  return wallet.user?.username ?? "Unknown user";
}

function getStatusTone(status?: string) {
  if (status === "active") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (status === "pending") {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }

  if (status === "suspended") {
    return "bg-rose-50 text-rose-700 ring-rose-100";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

export function AdminWalletsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [paymentWallet, setPaymentWallet] = useState<PlatformDepositWallet | null>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [walletNetwork, setWalletNetwork] = useState<(typeof WALLET_NETWORK_OPTIONS)[number]>("BEP20");
  const [isWalletLoading, setIsWalletLoading] = useState(true);
  const [isSavingWallet, setIsSavingWallet] = useState(false);
  const [walletMessage, setWalletMessage] = useState<ToastMessageValue | null>(null);

  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpTestHint, setOtpTestHint] = useState<string | null>(null);
  const [otpPendingAction, setOtpPendingAction] = useState<{
    address: string;
    network: string;
  } | null>(null);


  useEffect(() => {
    const timerId = window.setTimeout(() => setDebouncedSearch(searchValue.trim()), 350);
    return () => window.clearTimeout(timerId);
  }, [searchValue]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    let active = true;

    adminService
      .getPaymentWallet()
      .then((response) => {
        if (!active) {
          return;
        }

        setPaymentWallet(response.data);
        setWalletAddress(response.data.address);
        setWalletNetwork(normalizeWalletNetwork(response.data.network));
      })
      .catch((caughtError) => {
        if (!active) {
          return;
        }

        setWalletMessage({
          text: caughtError instanceof Error ? caughtError.message : "Unable to load payment wallet.",
          tone: "error"
        });
      })
      .finally(() => {
        if (active) {
          setIsWalletLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const walletsQuery = useAdminWallets({
    page,
    limit,
    search: debouncedSearch || undefined
  });
  const data = walletsQuery.data?.data;
  const wallets = data?.wallets ?? [];
  const summary = data?.summary ?? {
    platformAvailableUsdt: 0,
    platformLifetimeDepositsUsdt: 0,
    platformLifetimeRewardsUsdt: 0,
    platformLifetimeWithdrawalsUsdt: 0,
    platformLockedUsdt: 0,
    platformWalletCount: 0,
    total: 0,
    totalAvailableUsdt: 0,
    totalLockedUsdt: 0,
    totalLifetimeDepositsUsdt: 0,
    totalLifetimeWithdrawalsUsdt: 0,
    totalLifetimeRewardsUsdt: 0,
    totalPlanPurchasesUsdt: 0
  };
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
  const metricCards = [
    {
      label: "Platform Top-UP",
      value: walletsQuery.isLoading ? "Loading..." : formatUsdt(summary.platformLifetimeDepositsUsdt),
      caption: "Total platform deposits",
      icon: Wallet,
      tone: "cyan"
    },
    {
      label: "Total Payout Generated",
      value: walletsQuery.isLoading ? "Loading..." : formatUsdt(summary.totalLifetimeRewardsUsdt),
      caption: "Lifetime generated payouts",
      icon: TrendingUp,
      tone: "emerald"
    },
    {
      label: "Total Package Sell",
      value: walletsQuery.isLoading ? "Loading..." : formatUsdt(summary.totalPlanPurchasesUsdt),
      caption: "Completed package sales",
      icon: Wallet,
      tone: "violet"
    },
    {
      label: "Total Withdrawal",
      value: walletsQuery.isLoading ? "Loading..." : formatUsdt(summary.totalLifetimeWithdrawalsUsdt),
      caption: "Lifetime user withdrawals",
      icon: TrendingDown,
      tone: "rose"
    }
  ];

  const savePaymentWallet = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingWallet(true);
    setWalletMessage(null);
    setOtpError(null);
    setOtpTestHint(null);

    try {
      const address = walletAddress.trim();
      const network = walletNetwork;

      const otpResponse = await adminService.requestPaymentWalletOtp({
        address,
        network
      });
      const testHint = otpResponse.data.testOtp ?? null;
      setOtpTestHint(testHint);
      setOtpPendingAction({ address, network });
      setIsOtpModalOpen(true);
    } catch (caughtError) {
      setWalletMessage({
        text: caughtError instanceof Error ? caughtError.message : "Unable to request OTP code.",
        tone: "error"
      });
    } finally {
      setIsSavingWallet(false);
    }
  };

  const handleVerifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!otpPendingAction) return;

    setIsSavingWallet(true);
    setOtpError(null);

    try {
      const response = await adminService.updatePaymentWallet({
        address: otpPendingAction.address,
        network: otpPendingAction.network,
        otp: otpCode.trim()
      });

      setPaymentWallet(response.data.wallet);
      setWalletAddress(response.data.wallet.address);
      setWalletNetwork(normalizeWalletNetwork(response.data.wallet.network));
      setWalletMessage({
        text: "Admin USDT wallet saved. User deposits are now unlocked.",
        tone: "success"
      });
      setIsOtpModalOpen(false);
      setOtpCode("");
      setOtpPendingAction(null);
    } catch (caughtError) {
      setOtpError(caughtError instanceof Error ? caughtError.message : "Invalid or expired verification code.");
    } finally {
      setIsSavingWallet(false);
    }
  };

  return (
    <section className="space-y-4">
      <AdminPageHeader
        description="Inspect user wallet balances, deposits, rewards, withdrawals, and ledger health."
        title="Wallet Control"
      />

      {walletsQuery.error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
          {walletsQuery.error}
        </div>
      ) : null}

      <ToastMessage message={walletMessage} onClose={() => setWalletMessage(null)} />

      <AdminCard>
        <form className="grid gap-3 p-4 lg:grid-cols-[1fr_170px_auto]" onSubmit={savePaymentWallet}>
          <div>
            <div className="mb-2 flex h-5 items-center gap-2">
              <span className="text-xs font-black text-slate-500">Admin USDT Wallet</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-black",
                  paymentWallet?.configured
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                )}
              >
                {paymentWallet?.configured ? "Configured" : "Required"}
              </span>
            </div>
            <Input
              className="h-11 rounded-xl border-slate-200 bg-slate-50 font-mono text-xs"
              disabled={isWalletLoading || isSavingWallet}
              onChange={(event) => setWalletAddress(event.target.value)}
              placeholder="Paste admin USDT wallet address"
              required
              value={walletAddress}
            />
          </div>

          <div>
            <div className="mb-2 flex h-5 items-center">
              <span className="text-xs font-black text-slate-500">Network</span>
            </div>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 shadow-sm outline-none transition-colors focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
              disabled={isWalletLoading || isSavingWallet}
              onChange={(event) => setWalletNetwork(event.target.value as (typeof WALLET_NETWORK_OPTIONS)[number])}
              value={walletNetwork}
            >
              {WALLET_NETWORK_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <Button
              className="h-11 w-full rounded-xl bg-cyan-600 text-white hover:bg-cyan-700 lg:w-auto"
              disabled={isWalletLoading || isSavingWallet}
              type="submit"
            >
              {isSavingWallet ? <Loader2 className="size-4 animate-spin" /> : <Wallet className="size-4" />}
              Save Wallet
            </Button>
          </div>
        </form>
      </AdminCard>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metricCards.map((card) => (
          <MetricCard
            key={card.label}
            item={{
              title: card.label,
              value: card.value,
              caption: card.caption,
              tone: card.tone,
              icon: card.icon
            }}
          />
        ))}
      </div>

      <AdminCard>
        <div className="p-4">
          <label className="relative block">
            <span className="sr-only">Search wallets</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-10 text-slate-900 placeholder:text-slate-400"
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search user or referral code"
              type="search"
              value={searchValue}
            />
          </label>
        </div>
      </AdminCard>

      <AdminCard className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div>
            <p className="text-sm font-black text-slate-950">User Wallets</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Showing {firstRow}-{lastRow} of {pagination.total}
            </p>
          </div>
          <span className="rounded-full bg-cyan-50 px-3 py-1 text-[11px] font-black text-cyan-700">
            Page {pagination.page} / {pagination.totalPages}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-white text-xs text-slate-500 shadow-[0_1px_0_#e2e8f0]">
              <tr>
                <th className="px-4 py-3 font-black">User</th>
                <th className="px-4 py-3 font-black">Locked</th>
                <th className="px-4 py-3 font-black">Deposits</th>
                <th className="px-4 py-3 font-black">Rewards</th>
                <th className="px-4 py-3 font-black">Withdrawals</th>
                <th className="px-4 py-3 font-black">Status</th>
                <th className="px-4 py-3 font-black">Updated</th>
              </tr>
            </thead>
            <tbody>
              {walletsQuery.isLoading ? (
                Array.from({ length: 6 }, (_, rowIndex) => (
                  <tr className="border-b border-slate-100 last:border-0" key={rowIndex}>
                    {Array.from({ length: 7 }, (_, cellIndex) => (
                      <td className="px-4 py-4" key={cellIndex}>
                        <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : wallets.length ? (
                wallets.map((wallet) => (
                  <tr className="border-b border-slate-100 bg-white last:border-0 hover:bg-cyan-50/40" key={wallet.id}>
                    <td className="px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cyan-50 text-sm font-black uppercase text-cyan-700 ring-1 ring-cyan-100">
                          {getUserName(wallet).charAt(0)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-950">{getUserName(wallet)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-black text-slate-900">{formatUsdt(wallet.lockedUsdt)}</td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-500">{formatUsdt(wallet.lifetimeDepositsUsdt)}</td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-500">{formatUsdt(wallet.lifetimeRewardsUsdt)}</td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-500">{formatUsdt(wallet.lifetimeWithdrawalsUsdt)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full px-3 py-1 text-xs font-black capitalize ring-1", getStatusTone(wallet.user?.status))}>
                        {wallet.user?.status ?? "unknown"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-500">{formatDate(wallet.updatedAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-12 text-center text-sm font-semibold text-slate-500" colSpan={7}>
                    No wallets found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4">
          <p className="text-xs font-semibold text-slate-500">
            {pagination.total ? `Showing ${firstRow}-${lastRow} of ${pagination.total}` : "No wallets yet"}
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
              disabled={!pagination.hasPreviousPage || walletsQuery.isLoading}
              onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
              type="button"
              variant="outline"
            >
              <ChevronLeft className="size-4" />
              Prev
            </Button>
            <Button
              className="h-9 rounded-xl border-slate-200 bg-white text-slate-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-100"
              disabled={!pagination.hasNextPage || walletsQuery.isLoading}
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

      {/* OTP verification Modal dialog */}
      {isOtpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 text-slate-950 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-sm font-black text-slate-900">Admin Wallet Verification</h3>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 font-black text-sm"
                onClick={() => {
                  setIsOtpModalOpen(false);
                  setOtpCode("");
                }}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleVerifyOtp} className="mt-4 space-y-4">
              <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                Enter the 6-digit verification code sent to your admin email address to save the wallet.
              </p>

              {otpTestHint && (
                <div className="rounded-xl border border-cyan-200 bg-cyan-50/50 p-3 text-xs text-cyan-800 font-bold flex items-center justify-between">
                  <span>Testing Verification OTP:</span>
                  <span className="font-mono text-sm font-black tracking-wider bg-white border border-cyan-200 rounded px-2 py-0.5 select-all text-cyan-600">
                    {otpTestHint}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  6-Digit OTP Code
                </label>
                <Input
                  className="h-11 text-center font-mono text-base font-bold tracking-widest rounded-xl border-slate-200 bg-slate-50"
                  disabled={isSavingWallet}
                  maxLength={6}
                  onChange={(event) => setOtpCode(event.target.value)}
                  placeholder="000000"
                  required
                  type="text"
                  value={otpCode}
                />
              </div>

              {otpError && (
                <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-600 leading-normal">
                  {otpError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  disabled={isSavingWallet}
                  onClick={() => {
                    setIsOtpModalOpen(false);
                    setOtpCode("");
                  }}
                  type="button"
                >
                  Cancel
                </Button>
                <Button
                  className="h-11 w-full rounded-xl bg-cyan-600 text-white hover:bg-cyan-700"
                  disabled={isSavingWallet || otpCode.trim().length !== 6}
                  type="submit"
                >
                  {isSavingWallet ? <Loader2 className="size-4 animate-spin" /> : "Verify & Save"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
