import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Copy,
  LockKeyhole,
  Loader2,
  Plus,
  ShoppingBag,
  WalletCards,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { Input } from "@/components/ui/input";
import { ToastMessage, type ToastMessageValue } from "@/components/ui/toast-message";
import {
  walletService,
  type DepositRequest,
  type UserDeposit,
  type WalletDepositsResponse,
  type WalletSummary
} from "@/services/wallet.service";
import {
  planService,
  type InvestmentTierRule,
  type PlanPurchase,
  type PlanRuleSet
} from "@/services/plan.service";
import {
  paymentService,
  type PaymentIntent,
  type PaymentNetwork
} from "@/services/payment.service";
import { cn } from "@/lib/utils";

const DEPOSITS_PAGE_SIZE = 10;
const MIN_DEPOSIT_USDT = 100;
const modalOverlayClass =
  "fixed inset-0 z-50 flex items-end justify-center overflow-hidden bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4";
const modalPanelClass =
  "flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-b-none rounded-t-2xl border-slate-200 bg-white text-slate-950 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl";
const modalHeaderClass =
  "flex shrink-0 flex-row items-start justify-between gap-3 border-b border-slate-100 p-4 sm:p-5";
const modalBodyClass = "min-h-0 flex-1";
const modalContentClass = "p-4 sm:p-5";
const modalFooterClass =
  "sticky bottom-0 -mx-4 -mb-4 mt-auto border-t border-slate-100 bg-white/95 p-4 backdrop-blur sm:-mx-5 sm:-mb-5 sm:p-5";
const compactMetricCardClass = "min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4";

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

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function isPaymentIntentFinal(intent: PaymentIntent | null) {
  return Boolean(intent && ["completed", "expired", "failed"].includes(intent.status));
}

function statusTone(status: string) {
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

const emptyDepositsPagination: WalletDepositsResponse["pagination"] = {
  page: 1,
  limit: DEPOSITS_PAGE_SIZE,
  total: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false
};

export function DepositPage() {
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [ruleSet, setRuleSet] = useState<PlanRuleSet | null>(null);
  const [planPurchases, setPlanPurchases] = useState<PlanPurchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlansLoading, setIsPlansLoading] = useState(true);
  const [isDepositsLoading, setIsDepositsLoading] = useState(true);
  const [depositPage, setDepositPage] = useState(1);
  const [depositLimit, setDepositLimit] = useState(DEPOSITS_PAGE_SIZE);
  const [deposits, setDeposits] = useState<UserDeposit[]>([]);
  const [depositsPagination, setDepositsPagination] =
    useState<WalletDepositsResponse["pagination"]>({
      ...emptyDepositsPagination,
      limit: DEPOSITS_PAGE_SIZE
    });
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [depositsError, setDepositsError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<InvestmentTierRule | null>(null);
  const [purchaseAmountUsdt, setPurchaseAmountUsdt] = useState("");
  const [isPurchasingPlan, setIsPurchasingPlan] = useState(false);
  const [amountUsdt, setAmountUsdt] = useState(String(MIN_DEPOSIT_USDT));
  const [depositNetwork, setDepositNetwork] = useState<PaymentNetwork>("BEP20");
  const [depositIntent, setDepositIntent] = useState<PaymentIntent | null>(null);
  const [depositTxHash, setDepositTxHash] = useState("");
  const [isSubmittingDepositTxHash, setIsSubmittingDepositTxHash] = useState(false);
  const [isCheckingDepositPayment, setIsCheckingDepositPayment] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<ToastMessageValue | null>(null);
  const [latestDeposit, setLatestDeposit] = useState<DepositRequest | null>(null);

  const activeInvestmentTiers = useMemo(
    () => (ruleSet?.investmentTiers ?? []).filter((tier) => tier.status !== "Inactive"),
    [ruleSet?.investmentTiers]
  );
  const availableWalletBalance = wallet?.topUpBalance ?? wallet?.availableUsdt ?? 0;
  const currentPurchaseAmount = Number(purchaseAmountUsdt);
  const hasValidPurchaseAmount = selectedPlan
    ? Number.isFinite(currentPurchaseAmount) &&
      currentPurchaseAmount >= selectedPlan.minUsdt &&
      currentPurchaseAmount <= selectedPlan.maxUsdt
    : false;
  const hasEnoughBalanceForPurchase = hasValidPurchaseAmount && currentPurchaseAmount <= availableWalletBalance;
  const showToast = (text: string, tone: ToastMessageValue["tone"] = "info") => {
    setToastMessage({ text, tone });
  };

  useEffect(() => {
    setDepositPage(1);
  }, [fromDate, toDate, depositLimit]);

  useEffect(() => {
    let active = true;

    walletService
      .getSummary()
      .then((response) => {
        if (!active) {
          return;
        }

        setWallet(response.data);
        setError(null);
      })
      .catch((caughtError) => {
        if (!active) {
          return;
        }

        const message = caughtError instanceof Error ? caughtError.message : "Unable to load wallet.";
        setError(message);
        showToast(message, "error");
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    setIsPlansLoading(true);

    Promise.all([planService.getRuleSet(), planService.listPurchases()])
      .then(([rulesResponse, purchasesResponse]) => {
        if (!active) {
          return;
        }

        setRuleSet(rulesResponse.data.ruleSet);
        setPlanPurchases(purchasesResponse.data.purchases);
      })
      .catch((caughtError) => {
        if (!active) {
          return;
        }

        showToast(caughtError instanceof Error ? caughtError.message : "Unable to load plans.", "error");
      })
      .finally(() => {
        if (active) {
          setIsPlansLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    setIsDepositsLoading(true);

    walletService
      .listDeposits({
        page: depositPage,
        limit: depositLimit,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined
      })
      .then((response) => {
        if (!active) {
          return;
        }

        setDeposits(response.data.deposits);
        setDepositsPagination(response.data.pagination);
        setDepositsError(null);
      })
      .catch((caughtError) => {
        if (!active) {
          return;
        }

        const message = caughtError instanceof Error ? caughtError.message : "Unable to load deposits.";
        setDepositsError(message);
        showToast(message, "error");
      })
      .finally(() => {
        if (active) {
          setIsDepositsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [depositPage, fromDate, toDate, depositLimit]);

  const closeModal = () => {
    if (isSubmitting || isSubmittingDepositTxHash) {
      return;
    }

    setIsModalOpen(false);
    setDepositIntent(null);
    setDepositTxHash("");
    setToastMessage(null);
  };

  const getDefaultPurchaseAmount = (plan: InvestmentTierRule) => {
    return String(plan.minUsdt);
  };

  const openPurchaseModal = () => {
    const firstPlan = activeInvestmentTiers[0];

    if (!firstPlan) {
      showToast("No active plan is available right now.", "error");
      return;
    }

    setSelectedPlan(firstPlan);
    setPurchaseAmountUsdt(getDefaultPurchaseAmount(firstPlan));
    setToastMessage(null);
  };

  const handleSelectedPlanChange = (tier: string) => {
    const nextPlan = activeInvestmentTiers.find((plan) => plan.tier === tier) ?? null;

    setSelectedPlan(nextPlan);
    setPurchaseAmountUsdt(nextPlan ? getDefaultPurchaseAmount(nextPlan) : "");
    setToastMessage(null);
  };

  const closePurchaseModal = () => {
    if (isPurchasingPlan) {
      return;
    }

    setSelectedPlan(null);
    setPurchaseAmountUsdt("");
    setToastMessage(null);
  };

  const openAddBalanceFromPurchase = () => {
    if (isPurchasingPlan) {
      return;
    }

    const amount = Number(purchaseAmountUsdt);
    const requiredTopUp = Number.isFinite(amount)
      ? Math.max(amount - availableWalletBalance, MIN_DEPOSIT_USDT)
      : MIN_DEPOSIT_USDT;

    setAmountUsdt(String(requiredTopUp));
    setDepositIntent(null);
    setDepositTxHash("");
    setSelectedPlan(null);
    setPurchaseAmountUsdt("");
    setIsModalOpen(true);
    setToastMessage(null);
  };

  const refreshWalletAndDeposits = async () => {
    const [walletResponse, depositsResponse] = await Promise.all([
      walletService.getSummary(),
      walletService.listDeposits({
        page: 1,
        limit: depositLimit,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined
      })
    ]);

    setWallet(walletResponse.data);
    setDepositPage(1);
    setDeposits(depositsResponse.data.deposits);
    setDepositsPagination(depositsResponse.data.pagination);
    setLatestDeposit(depositsResponse.data.deposits[0] ?? null);
  };

  const refreshDepositIntent = async (options?: { silent?: boolean }) => {
    if (!depositIntent) {
      return;
    }

    if (!options?.silent) {
      setIsCheckingDepositPayment(true);
    }

    try {
      const response = await paymentService.getIntent(depositIntent.id);
      setDepositIntent(response.data.intent);

      if (response.data.intent.status === "completed") {
        await refreshWalletAndDeposits();
        showToast("Payment confirmed. Wallet balance credited.", "success");
      } else if (!options?.silent) {
        showToast("Payment status refreshed.", "info");
      }
    } catch (caughtError) {
      if (!options?.silent) {
        showToast(caughtError instanceof Error ? caughtError.message : "Unable to refresh payment.", "error");
      }
    } finally {
      if (!options?.silent) {
        setIsCheckingDepositPayment(false);
      }
    }
  };

  useEffect(() => {
    if (!depositIntent || isPaymentIntentFinal(depositIntent)) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshDepositIntent({ silent: true });
    }, 10_000);

    return () => window.clearInterval(intervalId);
  }, [depositIntent?.id, depositIntent?.status]);

  const submitDeposit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(amountUsdt);

    if (!Number.isFinite(amount) || amount < MIN_DEPOSIT_USDT) {
      showToast(`Minimum deposit amount is ${formatUsdt(MIN_DEPOSIT_USDT)}.`, "error");
      return;
    }

    setIsSubmitting(true);
    setToastMessage(null);

    try {
      const response = await paymentService.createDepositIntent({
        amountUsdt: amount,
        network: depositNetwork
      });

      setDepositIntent(response.data.intent);
      setDepositTxHash(response.data.intent.txnHash ?? "");
      showToast("Payment instructions generated. Send exact USDT, then paste tx hash.", "info");
    } catch (caughtError) {
      showToast(
        caughtError instanceof Error ? caughtError.message : "Unable to generate payment instructions.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitPlanPurchase = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await purchasePlanFromWalletBalance();
  };

  const purchasePlanFromWalletBalance = async () => {
    if (!selectedPlan) {
      return;
    }

    const amount = Number(purchaseAmountUsdt);

    if (!Number.isFinite(amount) || amount < selectedPlan.minUsdt || amount > selectedPlan.maxUsdt) {
      showToast(
        `${selectedPlan.name} purchase amount must be between ${formatUsdt(selectedPlan.minUsdt)} and ${formatUsdt(selectedPlan.maxUsdt)}.`,
        "error",
      );
      return;
    }

    if (amount > (wallet?.availableUsdt ?? 0)) {
      showToast("Available wallet balance is not enough for this plan.", "error");
      return;
    }

    setIsPurchasingPlan(true);
    setToastMessage(null);

    try {
      const response = await planService.purchasePlan({
        amountUsdt: amount,
        tier: selectedPlan.tier
      });

      setWallet((current) =>
        current
          ? {
              ...current,
              availableUsdt: response.data.wallet.availableUsdt,
              lockedUsdt: response.data.wallet.lockedUsdt,
              lifetimeDepositsUsdt: response.data.wallet.lifetimeDepositsUsdt,
              lifetimeRewardsUsdt: response.data.wallet.lifetimeRewardsUsdt,
              lifetimeWithdrawalsUsdt: response.data.wallet.lifetimeWithdrawalsUsdt
            }
          : current
      );

      if (response.data.purchase) {
        setPlanPurchases((current) => [response.data.purchase!, ...current]);
      }

      setSelectedPlan(null);
      setPurchaseAmountUsdt("");
      showToast(`${selectedPlan.name} purchased from wallet balance.`, "success");
    } catch (caughtError) {
      showToast(caughtError instanceof Error ? caughtError.message : "Unable to purchase plan from wallet.", "error");
    } finally {
      setIsPurchasingPlan(false);
    }
  };

  const submitDepositTxHash = async () => {
    if (!depositIntent) {
      return;
    }

    setIsSubmittingDepositTxHash(true);
    setToastMessage(null);

    try {
      const response = await paymentService.submitIntentTxHash(depositIntent.id, depositTxHash.trim());
      let currentIntent = response.data.intent;
      setDepositIntent(currentIntent);
      showToast("Transaction hash linked. Querying blockchain RPC nodes...", "info");

      let attempts = 0;
      const maxAttempts = 6;

      while (
        attempts < maxAttempts &&
        (currentIntent.status === "pending" || currentIntent.status === "detected")
      ) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const refreshResponse = await paymentService.getIntent(depositIntent.id);
        currentIntent = refreshResponse.data.intent;
        setDepositIntent(currentIntent);
        attempts++;
      }

      if (currentIntent.status === "completed") {
        await refreshWalletAndDeposits();
        showToast("Payment confirmed successfully! Wallet balance credited.", "success");
      } else if (currentIntent.status === "failed") {
        showToast(currentIntent.failureReason || "Transaction verification failed on-chain.", "error");
      } else {
        showToast("Verification is taking longer than expected. You can check again later.", "info");
      }
    } catch (caughtError) {
      showToast(caughtError instanceof Error ? caughtError.message : "Unable to link transaction hash.", "error");
    } finally {
      setIsSubmittingDepositTxHash(false);
    }
  };

  const copyPaymentText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast(`${label} copied.`, "success");
    } catch {
      showToast(`Copy failed. Select and copy the ${label.toLowerCase()} manually.`, "error");
    }
  };

  return (
    <section className="space-y-4">
      <ToastMessage message={toastMessage} onClose={() => setToastMessage(null)} />

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#08152e] via-[#0d5c80] to-[#22d3ee] px-4 py-4 text-white shadow-[0_18px_50px_rgba(8,21,46,0.18)] sm:px-5">
        <div className="absolute -right-10 -top-12 size-36 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.32em] text-cyan-100/82 sm:text-xs">User Panel</p>
            <h1 className="mt-1 text-[1.35rem] font-black leading-tight tracking-tight sm:text-2xl">Wallet Top Up</h1>
            <p className="mt-1 max-w-2xl text-[13px] font-semibold leading-relaxed text-cyan-50/88 sm:text-sm">
              Add wallet balance or purchase plans with on-chain USDT verified directly on-chain.
            </p>
          </div>
          <Button
            className="h-11 rounded-xl bg-white text-cyan-900 shadow-sm hover:bg-cyan-50"
            onClick={() => {
              setDepositIntent(null);
              setDepositTxHash("");
              setDepositNetwork("BEP20");
              setToastMessage(null);
              setIsModalOpen(true);
            }}
            type="button"
          >
            <Plus className="size-4" />
            Add Balance
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="form-motion-off border-slate-200 bg-white text-slate-950 shadow-sm">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-xs font-bold text-slate-500">Top Up Wallet</p>
              <p className="mt-1 text-lg font-black text-slate-950">
                {isLoading ? "Loading..." : formatUsdt(wallet?.availableUsdt ?? 0)}
              </p>
            </div>
            <span className="grid size-10 place-items-center rounded-xl bg-cyan-50 text-cyan-700">
              <WalletCards className="size-4" />
            </span>
          </CardContent>
        </Card>

        <Card className="form-motion-off border-slate-200 bg-white text-slate-950 shadow-sm">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-xs font-bold text-slate-500">Locked Plan Balance</p>
              <p className="mt-1 text-lg font-black text-slate-950">
                {isLoading ? "Loading..." : formatUsdt(wallet?.lockedPlanUsdt ?? 0)}
              </p>
            </div>
            <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700">
              <LockKeyhole className="size-4" />
            </span>
          </CardContent>
        </Card>
      </div>

      <Card className="form-motion-off border-slate-200 bg-white text-slate-950 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">Purchase Plan</CardTitle>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-3 py-1 text-[11px] font-black text-cyan-700">
                <ShoppingBag className="size-3.5" />
                {isPlansLoading ? "Loading" : `${activeInvestmentTiers.length} pools`}
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Use confirmed wallet balance. Add balance first, then purchase without a second blockchain payment.
            </p>
          </div>
          <Button
            className="h-11 rounded-xl bg-cyan-600 px-5 text-white hover:bg-cyan-700 sm:w-auto"
            disabled={isPlansLoading || !activeInvestmentTiers.length}
            onClick={openPurchaseModal}
            type="button"
          >
            <ShoppingBag className="size-4" />
            Purchase Plan
          </Button>
        </CardContent>
      </Card>

      {/*
      {currentActiveTier && wallet?.lockedUsdt ? (
        <Card className="form-motion-off border-emerald-200 bg-emerald-50/70 text-slate-950 shadow-sm">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-white text-emerald-700">
                <BadgeCheck className="size-5" />
              </span>
              <div>
                <p className="text-sm font-black text-slate-950">
                  Active Tier: {currentActiveTier.name} · {formatUsdt(wallet.lockedUsdt)}
                </p>
                <p className="text-xs font-semibold text-slate-500">
                  Weekly ROI: {currentActiveTier.returnMaxPercent}%
                </p>
              </div>
            </div>
            <span className="w-fit rounded-full bg-white px-3 py-1 text-[11px] font-black capitalize text-emerald-700">
              Active
            </span>
          </CardContent>
        </Card>
      ) : latestPlanPurchase ? (
        <Card className="form-motion-off border-emerald-200 bg-emerald-50/70 text-slate-950 shadow-sm">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-white text-emerald-700">
                <BadgeCheck className="size-5" />
              </span>
              <div>
                <p className="text-sm font-black text-slate-950">
                  Active: {latestPlanPurchase.name} · {formatUsdt(latestPlanPurchase.amountUsdt)}
                </p>
                <p className="text-xs font-semibold text-slate-500">
                  Weekly ROI: {latestPlanPurchase.weeklyReturnPercent}%
                </p>
              </div>
            </div>
            <span className="w-fit rounded-full bg-white px-3 py-1 text-[11px] font-black capitalize text-emerald-700">
              {latestPlanPurchase.status}
            </span>
          </CardContent>
        </Card>
      ) : null}
      */}

      {latestDeposit ? (
        <Card className="form-motion-off border-cyan-200 bg-cyan-50/60 text-slate-950 shadow-sm">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-white text-cyan-700">
                <CheckCircle2 className="size-5" />
              </span>
              <div>
                <p className="text-sm font-black text-slate-950">{formatUsdt(latestDeposit.amountUsdt)}</p>
                <p className="text-xs font-semibold text-slate-500">Status: {latestDeposit.status}</p>
              </div>
            </div>
            <p className="truncate text-xs font-bold text-slate-500">ID: {latestDeposit.id}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="form-motion-off border-slate-200 bg-white text-slate-950 shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-slate-100 p-4">
          <div>
            <CardTitle className="text-base">Plan Purchase History</CardTitle>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Showing {planPurchases.length} plan purchase{planPurchases.length === 1 ? "" : "s"}
            </p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-700">
            Auto Active
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50/80 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-black">Plan</th>
                  <th className="px-4 py-3 font-black">Amount</th>
                  <th className="px-4 py-3 font-black">Weekly ROI</th>
                  <th className="px-4 py-3 font-black">Status</th>
                  <th className="px-4 py-3 font-black">Date</th>
                </tr>
              </thead>
              <tbody>
                {isPlansLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <tr className="border-t border-slate-100" key={index}>
                      {Array.from({ length: 5 }).map((__, cellIndex) => (
                        <td className="px-4 py-4" key={cellIndex}>
                          <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : planPurchases.length ? (
                  planPurchases.map((purchase) => (
                    <tr className="border-t border-slate-100 hover:bg-blue-50/30" key={purchase.id}>
                      <td className="px-4 py-4">
                        <p className="font-black text-slate-950">{purchase.name || purchase.tier || "Investment Pool"}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{purchase.tier || "Plan purchase"}</p>
                      </td>
                      <td className="px-4 py-4 font-black text-slate-950">{formatUsdt(purchase.amountUsdt)}</td>
                      <td className="px-4 py-4 text-xs font-black text-emerald-700">
                        {purchase.weeklyReturnPercent}% weekly
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-black capitalize ring-1",
                            statusTone(purchase.status)
                          )}
                        >
                          {purchase.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs font-semibold text-slate-500">
                        {formatDate(purchase.purchasedAt ?? purchase.createdAt)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-10 text-center text-sm font-semibold text-slate-500" colSpan={5}>
                      No plan purchases yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 p-4">
            <p className="text-xs font-semibold text-slate-500">
              {planPurchases.length
                ? "Plan purchase history is ready"
                : "Purchased plans will appear here"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="form-motion-off border-slate-200 bg-white text-slate-950 shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-slate-100 p-4">
          <div>
            <CardTitle className="text-base">Wallet Top-up History</CardTitle>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Showing {deposits.length} of {depositsPagination.total}
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
              Page {depositsPagination.page}/{depositsPagination.totalPages}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {depositsError ? (
            <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
              {depositsError}
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-50/80 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-black">Amount</th>
                  <th className="px-4 py-3 font-black">Status</th>
                  <th className="px-4 py-3 font-black">Notes</th>
                  <th className="px-4 py-3 font-black">Date</th>
                </tr>
              </thead>
              <tbody>
                {isDepositsLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <tr className="border-t border-slate-100" key={index}>
                      {Array.from({ length: 4 }).map((__, cellIndex) => (
                        <td className="px-4 py-4" key={cellIndex}>
                          <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : deposits.length ? (
                  deposits.map((deposit) => (
                    <tr className="border-t border-slate-100 hover:bg-cyan-50/30" key={deposit.id}>
                      <td className="px-4 py-4 font-black text-slate-950">{formatUsdt(deposit.amountUsdt)}</td>
                      <td className="px-4 py-4">
                        <span
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-black capitalize ring-1",
                            statusTone(deposit.status)
                          )}
                        >
                          {deposit.status}
                        </span>
                      </td>
                      <td className="max-w-[280px] truncate px-4 py-4 text-xs font-bold text-slate-500">
                        {deposit.notes || "Wallet top-up"}
                      </td>
                      <td className="px-4 py-4 text-xs font-semibold text-slate-500">
                        {formatDate(deposit.createdAt)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-10 text-center text-sm font-semibold text-slate-500" colSpan={4}>
                      No wallet top-ups yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4">
            <p className="text-xs font-semibold text-slate-500">
              {depositsPagination.total ? "Wallet top-up history is ready" : "No wallet top-ups yet"}
            </p>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mr-2">
                <span>Show rows:</span>
                <select
                  value={depositLimit}
                  onChange={(e) => {
                    setDepositLimit(Number(e.target.value));
                    setDepositPage(1);
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
                className="h-9 rounded-xl"
                disabled={!depositsPagination.hasPreviousPage || isDepositsLoading}
                onClick={() => setDepositPage((page) => Math.max(1, page - 1))}
                type="button"
                variant="outline"
              >
                <ChevronLeft className="size-4" />
                Prev
              </Button>
              <Button
                className="h-9 rounded-xl"
                disabled={!depositsPagination.hasNextPage || isDepositsLoading}
                onClick={() => setDepositPage((page) => page + 1)}
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

      {selectedPlan ? (
        <div className={modalOverlayClass}>
          <Card aria-labelledby="purchase-plan-title" aria-modal="true" className={modalPanelClass} role="dialog">
            <div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-slate-200 sm:hidden" />
            <CardHeader className={modalHeaderClass}>
              <div>
                <CardTitle className="text-base" id="purchase-plan-title">Purchase {selectedPlan.name}</CardTitle>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Uses confirmed wallet balance. No second blockchain payment is needed.
                </p>
              </div>
              <button
                aria-label="Close purchase plan modal"
                className="grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50"
                onClick={closePurchaseModal}
                type="button"
              >
                <X className="size-4" />
              </button>
            </CardHeader>
            <div className={cn("overflow-y-auto", modalBodyClass)}>
              <CardContent className={modalContentClass}>
                <form className="flex min-h-full flex-col gap-4" onSubmit={submitPlanPurchase}>
                  <label className="block">
                    <span className="text-xs font-black text-slate-600">Select Plan</span>
                    <select
                      className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-800 shadow-sm outline-none transition-colors focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
                      onChange={(event) => handleSelectedPlanChange(event.target.value)}
                      required
                      value={selectedPlan.tier}
                    >
                      {activeInvestmentTiers.map((plan) => (
                        <option key={plan.tier} value={plan.tier}>
                          {plan.name} ({formatUsdt(plan.minUsdt)} - {formatUsdt(plan.maxUsdt)})
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className={compactMetricCardClass}>
                      <p className="text-[11px] font-black uppercase text-slate-400">Range</p>
                      <p className="mt-1 text-sm font-black text-slate-950">
                        {formatUsdt(selectedPlan.minUsdt)} - {formatUsdt(selectedPlan.maxUsdt)}
                      </p>
                    </div>
                    <div className="min-w-0 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                      <p className="text-[11px] font-black uppercase text-emerald-600">Weekly ROI</p>
                      <p className="mt-1 text-sm font-black text-emerald-700">{selectedPlan.returnMaxPercent}% weekly</p>
                    </div>
                    <div className={compactMetricCardClass}>
                      <p className="text-[11px] font-black uppercase text-slate-400">Wallet Balance</p>
                      <p className="mt-1 text-sm font-black text-slate-950">{formatUsdt(availableWalletBalance)}</p>
                    </div>
                  </div>

                  <label className="block">
                    <span className="text-xs font-black text-slate-600">Purchase Amount</span>
                    <Input
                      className="mt-2 h-11 rounded-xl border-slate-200 bg-slate-50"
                      max={selectedPlan.maxUsdt}
                      min={selectedPlan.minUsdt}
                      onChange={(event) => setPurchaseAmountUsdt(event.target.value)}
                      required
                      step="0.01"
                      type="number"
                      value={purchaseAmountUsdt}
                    />
                  </label>

                  {hasValidPurchaseAmount && !hasEnoughBalanceForPurchase ? (
                    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                      <p className="text-xs font-bold text-amber-700">
                        Wallet balance is low. Add {formatUsdt(Math.max(currentPurchaseAmount - availableWalletBalance, 0))} more,
                        then purchase the plan from balance.
                      </p>
                    </div>
                  ) : null}

                <div className={modalFooterClass}>
                  {!hasEnoughBalanceForPurchase ? (
                    <div className="flex flex-col gap-2 w-full sm:flex-row sm:justify-end sm:items-center">
                      <div className="grid grid-cols-2 gap-2 w-full order-2 sm:order-1 sm:w-auto sm:flex sm:gap-2">
                        <Button
                          className="h-11 rounded-xl px-4 flex-1 sm:flex-none sm:w-32 transition-all hover:scale-[1.02] active:scale-[0.98] font-bold"
                          onClick={closePurchaseModal}
                          type="button"
                          variant="outline"
                        >
                          Cancel
                        </Button>
                        <Button
                          className="h-11 rounded-xl px-4 flex-1 sm:flex-none sm:w-40 transition-all hover:scale-[1.02] active:scale-[0.98] text-slate-400 bg-slate-50 border-slate-200 font-bold"
                          disabled
                          type="button"
                          variant="outline"
                        >
                          <WalletCards className="size-4 text-slate-400" />
                          Low Balance
                        </Button>
                      </div>
                      <Button
                        className="h-11 w-full rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-600 text-white font-bold shadow-md hover:shadow-lg order-1 sm:order-2 sm:w-auto sm:px-6 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        disabled={isPurchasingPlan}
                        onClick={openAddBalanceFromPurchase}
                        type="button"
                      >
                        <ArrowDownLeft className="size-4" />
                        Add Balance
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto sm:justify-end sm:gap-2">
                      <Button
                        className="h-11 rounded-xl px-4 w-full sm:w-32 transition-all hover:scale-[1.02] active:scale-[0.98] font-bold"
                        onClick={closePurchaseModal}
                        type="button"
                        variant="outline"
                      >
                        Cancel
                      </Button>
                      <Button
                        className="h-11 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-600 text-white font-bold shadow-md hover:shadow-lg w-full sm:w-auto sm:px-6 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        disabled={isPurchasingPlan || !hasValidPurchaseAmount}
                        type="submit"
                      >
                        {isPurchasingPlan ? <Loader2 className="size-4 animate-spin" /> : <WalletCards className="size-4" />}
                        Purchase
                      </Button>
                    </div>
                  )}
                </div>
                </form>
              </CardContent>
            </div>
          </Card>
        </div>
      ) : null}

      {isModalOpen ? (
        <div className={modalOverlayClass}>
          <Card aria-labelledby="add-balance-title" aria-modal="true" className={modalPanelClass} role="dialog">
            <div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-slate-200 sm:hidden" />
            <CardHeader className={modalHeaderClass}>
              <div>
                <CardTitle className="text-base" id="add-balance-title">Add Balance</CardTitle>
                <p className="mt-1 text-xs font-semibold text-slate-500">Minimum {MIN_DEPOSIT_USDT} USDT</p>
              </div>
              <button
                aria-label="Close add balance modal"
                className="grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50"
                onClick={closeModal}
                type="button"
              >
                <X className="size-4" />
              </button>
            </CardHeader>
            <div className={cn("overflow-y-auto", modalBodyClass)}>
              <CardContent className={modalContentClass}>
                <form className="flex min-h-full flex-col gap-4" onSubmit={submitDeposit}>
                {!depositIntent ? (
                  <>
                    <label className="block">
                      <span className="text-xs font-black text-slate-600">Amount</span>
                      <Input
                        className="mt-2 h-11 rounded-xl border-slate-200 bg-slate-50"
                        min={MIN_DEPOSIT_USDT}
                        onChange={(event) => setAmountUsdt(event.target.value)}
                        required
                        step="0.01"
                        type="number"
                        value={amountUsdt}
                      />
                    </label>

                    <label className="block">
                      <span className="text-xs font-black text-slate-600">Network</span>
                      <select
                        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-800 shadow-sm outline-none transition-colors focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
                        onChange={(event) => setDepositNetwork(event.target.value as PaymentNetwork)}
                        value={depositNetwork}
                      >
                        <option value="BEP20">BEP20</option>
                      </select>
                    </label>
                  </>
                ) : isSubmittingDepositTxHash || isCheckingDepositPayment ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-4">
                    <div className="relative flex items-center justify-center">
                      <div className="size-16 rounded-full border-4 border-cyan-100 border-t-cyan-600 animate-spin" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900">Verifying on Blockchain</h3>
                      <p className="mt-2 text-xs font-semibold text-slate-500 max-w-sm leading-relaxed">
                        Connecting to live public RPC nodes to verify your USDT transfer. Please do not close or reload this page.
                      </p>
                    </div>
                    {depositTxHash && (
                      <div className="w-full max-w-xs bg-slate-50 border border-slate-100 rounded-xl p-3 text-[11px] font-mono break-all text-slate-400">
                        Hash: {depositTxHash}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-cyan-100 bg-cyan-50/70 p-5">
                      <p className="text-[11px] font-black uppercase tracking-wider text-cyan-600">Pay Exactly</p>
                      <p className="mt-1 text-2xl font-black text-slate-950">{formatUsdt(depositIntent.amountUsdt)}</p>
                    </div>

                    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
                      <div className="text-center">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Scan QR to Pay</p>
                      </div>
                      <div className="relative p-2 rounded-2xl bg-slate-50 border border-slate-100/80">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${depositIntent.receiverAddress}`}
                          alt="USDT Deposit QR"
                          className="size-36 rounded-xl"
                        />
                      </div>
                      <div className="w-full pt-2 border-t border-slate-100 flex flex-col items-center">
                        <div className="flex w-full items-center justify-between gap-3 bg-slate-50 rounded-xl p-2 border border-slate-100">
                          <p className="font-mono text-[11px] font-bold text-slate-600 break-all select-all flex-1 text-center pl-2">
                            {depositIntent.receiverAddress}
                          </p>
                          <Button
                            className="size-8 shrink-0 rounded-lg p-0 bg-white hover:bg-slate-50 border border-slate-200"
                            onClick={() => void copyPaymentText(depositIntent.receiverAddress, "Wallet address")}
                            type="button"
                            variant="outline"
                          >
                            <Copy className="size-3 text-slate-500" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <label className="block">
                      <span className="text-xs font-black text-slate-600">Transaction Hash</span>
                      <Input
                        className="mt-2 h-11 rounded-xl border-slate-200 bg-slate-50 font-mono text-xs"
                        disabled={depositIntent.status === "completed"}
                        onChange={(event) => setDepositTxHash(event.target.value)}
                        placeholder="0x..."
                        value={depositTxHash}
                      />
                    </label>

                    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                      <p className="text-xs font-bold text-amber-700">
                        Expires: {formatDateTime(depositIntent.expiresAt)}. Send exact amount on the selected network only.
                      </p>
                      {depositIntent.failureReason ? (
                        <p className="mt-2 text-xs font-bold text-rose-600">{depositIntent.failureReason}</p>
                      ) : null}
                    </div>
                  </div>
                )}

                {!(isSubmittingDepositTxHash || isCheckingDepositPayment) && (
                  <div className={modalFooterClass}>
                    {depositIntent ? (
                      <div className="flex flex-col gap-2 w-full sm:flex-row sm:justify-end sm:items-center">
                        <div className="grid grid-cols-2 gap-2 w-full order-2 sm:order-1 sm:w-auto sm:flex sm:gap-2">
                          <Button
                            className="h-11 rounded-xl px-4 flex-1 sm:flex-none sm:w-32 transition-all hover:scale-[1.02] active:scale-[0.98] font-bold"
                            onClick={closeModal}
                            type="button"
                            variant="outline"
                          >
                            Cancel
                          </Button>
                          <Button
                            className="h-11 rounded-xl px-4 flex-1 sm:flex-none sm:w-32 transition-all hover:scale-[1.02] active:scale-[0.98] font-bold"
                            disabled={isCheckingDepositPayment}
                            onClick={() => void refreshDepositIntent()}
                            type="button"
                            variant="outline"
                          >
                            {isCheckingDepositPayment ? (
                              <Loader2 className="size-4 animate-spin text-cyan-600" />
                            ) : (
                              <CheckCircle2 className="size-4 text-cyan-600" />
                            )}
                            Check
                          </Button>
                        </div>
                        <Button
                          className="h-11 w-full rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-600 text-white font-bold shadow-md hover:shadow-lg order-1 sm:order-2 sm:w-auto sm:px-6 transition-all hover:scale-[1.02] active:scale-[0.98]"
                          disabled={
                            isSubmittingDepositTxHash ||
                            depositIntent.status === "completed" ||
                            !depositTxHash.trim()
                          }
                          onClick={() => void submitDepositTxHash()}
                          type="button"
                        >
                          {isSubmittingDepositTxHash ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Copy className="size-4" />
                          )}
                          Save Tx Hash
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto sm:justify-end sm:gap-2">
                        <Button
                          className="h-11 rounded-xl px-4 w-full sm:w-32 transition-all hover:scale-[1.02] active:scale-[0.98] font-bold"
                          onClick={closeModal}
                          type="button"
                          variant="outline"
                        >
                          Cancel
                        </Button>
                        <Button
                          className="h-11 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-600 text-white font-bold shadow-md hover:shadow-lg w-full sm:w-auto sm:px-6 transition-all hover:scale-[1.02] active:scale-[0.98]"
                          disabled={isSubmitting}
                          type="submit"
                        >
                          {isSubmitting ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <ArrowDownLeft className="size-4" />
                          )}
                          Proceed
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                </form>
              </CardContent>
            </div>
          </Card>
        </div>
      ) : null}
    </section>
  );
}
