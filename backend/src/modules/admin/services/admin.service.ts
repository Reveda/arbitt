import { HTTP_STATUS } from "../../../constants/http";
import { ApiError } from "../../../utils/ApiError";
import { buildDateRangeFilter } from "../../../utils/dateRange";
import { walletRepository } from "../../wallet/repositories/wallet.repository";
import { planRepository } from "../../plans/repositories/plan.repository";
import { UserPlanPurchaseModel } from "../../plans/models/user-plan-purchase.model";
import { rewardService, calculateUserRoyaltyRanks } from "../../rewards/services/reward.service";
import { getSalaryRoyaltyPeriod } from "../../rewards/utils/salaryRoyalty";
import { adminRepository } from "../repositories/admin.repository";
import { getPlatformPaymentWallet, updatePlatformPaymentWallet } from "./payment-wallet.service";
import { toSafeUser } from "../../auth/dtos/auth.dto";
import { ReferralModel } from "../../referrals/models/referral.model";
import { getTeamBusinessMap, getSelfBusinessMap } from "../../referrals/services/referral.service";
import { UserModel } from "../../users/models/user.model";
import { TransactionModel } from "../../transactions/models/transaction.model";
import { Types } from "mongoose";
import { cleanTransactionNotes } from "../../transactions/dtos/transaction.dto";
import { authRepository } from "../../auth/repositories/auth.repository";

type PopulatedAdminUser = {
  _id?: unknown;
  email?: string;
  username?: string | null;
  role?: string;
  status?: string;
  referralCode?: string | null;
  invitedBy?: unknown;
  emailVerifiedAt?: Date | string | null;
  createdAt?: Date | string | null;
};

type AdminReferralRecord = {
  _id?: unknown;
  userId?: unknown;
  parentUserId?: unknown;
  level?: number;
  path?: unknown[];
  directCount?: number;
  activeTeamCount?: number;
  createdAt?: Date | string | null;
};

type AdminReferralLevelSummary = {
  level: number;
  count: number;
  samples: Array<{
    id?: unknown;
    email?: string;
    username?: string | null;
    status?: string;
  }>;
};

type AdminDepositRecord = {
  _id?: unknown;
  userId?: unknown;
  amountUsdt?: number;
  status?: string;
  txnHash?: string | null;
  network?: string | null;
  notes?: string | null;
  reviewedBy?: unknown;
  reviewedAt?: Date | string | null;
  createdAt?: Date | string | null;
};

type AdminPayoutRecord = AdminDepositRecord & {
  payoutKind?: string | null;
  payoutLevel?: number | null;
  payoutPeriodStart?: Date | string | null;
  payoutPeriodEnd?: Date | string | null;
  payoutTier?: string | null;
  payoutPercent?: number | null;
  payoutPrincipalUsdt?: number | null;
  payoutSourceTransactionId?: unknown;
  payoutSourceUserId?: unknown;
  updatedAt?: Date | string | null;
};

type AdminPlanPurchaseRecord = AdminPayoutRecord;
type AdminWithdrawalRecord = AdminPayoutRecord;

type AdminWalletRecord = {
  _id?: unknown;
  userId?: unknown;
  availableUsdt?: number;
  topUpBalance?: number;
  lockedUsdt?: number;
  lifetimeDepositsUsdt?: number;
  lifetimeWithdrawalsUsdt?: number;
  lifetimeRewardsUsdt?: number;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
};

const TOTAL_REWARD_EARNING_MULTIPLIER = 3;
const TOTAL_REWARD_PAYOUT_KINDS = ["weekly", "level", "salary_royalty"];
const TOTAL_REWARD_GENERATION_STATUSES = ["pending", "approved", "completed"];
const TOTAL_REWARD_APPROVAL_STATUSES = ["approved", "completed"];

function getPopulatedUser(value: unknown): PopulatedAdminUser | null {
  if (!value || typeof value !== "object" || !("_id" in value)) {
    return null;
  }

  return value as PopulatedAdminUser;
}

function toUserSummary(value: unknown, userRoyaltyRankMap?: Map<string, number>) {
  const user = getPopulatedUser(value);

  if (!user) {
    return null;
  }

  const userIdStr = String(user._id);
  const rankNum = userRoyaltyRankMap?.get(userIdStr) ?? 0;
  const rank = rankNum > 0 ? `M${rankNum}` : null;

  return {
    id: userIdStr,
    email: null,
    username: user.username ?? null,
    role: user.role ?? "user",
    status: user.status ?? "unknown",
    referralCode: user.referralCode ?? null,
    emailVerified: Boolean(user.emailVerifiedAt),
    joinedAt: user.createdAt ?? null,
    rank,
  };
}

function toReferralNode(
  record: AdminReferralRecord,
  teamBusinessMap?: Map<string, number>,
  selfBusinessMap?: Map<string, number>,
  userRoyaltyRankMap?: Map<string, number>,
) {
  const user = toUserSummary(record.userId, userRoyaltyRankMap);
  const parent = toUserSummary(record.parentUserId, userRoyaltyRankMap);
  const userIdStr = user?.id;

  return {
    id: String(record._id),
    user,
    parent,
    parentUserId: parent?.id ?? null,
    level: record.level ?? 0,
    path: (record.path ?? []).map((entry) => String(entry)),
    directCount: record.directCount ?? 0,
    activeTeamCount: record.activeTeamCount ?? 0,
    teamBusinessUsdt: userIdStr && teamBusinessMap ? (teamBusinessMap.get(userIdStr) ?? 0) : 0,
    selfBusinessUsdt: userIdStr && selfBusinessMap ? (selfBusinessMap.get(userIdStr) ?? 0) : 0,
    createdAt: record.createdAt ?? null,
  };
}

function toDepositNode(record: AdminDepositRecord) {
  return {
    id: String(record._id),
    user: toUserSummary(record.userId),
    amountUsdt: record.amountUsdt ?? 0,
    status: record.status ?? "pending",
    txnHash: record.txnHash ?? null,
    network: record.network ?? "BEP20",
    notes: cleanTransactionNotes(record.notes),
    reviewedBy: record.reviewedBy ? String(record.reviewedBy) : null,
    reviewedAt: record.reviewedAt ?? null,
    createdAt: record.createdAt ?? null,
  };
}

function toPayoutNode(record: AdminPayoutRecord) {
  return {
    id: String(record._id),
    user: toUserSummary(record.userId),
    amountUsdt: record.amountUsdt ?? 0,
    status: record.status ?? "pending",
    network: record.network ?? "SYSTEM",
    notes: cleanTransactionNotes(record.notes),
    reviewedBy: record.reviewedBy ? String(record.reviewedBy) : null,
    reviewedAt: record.reviewedAt ?? null,
    payoutKind: record.payoutKind ?? "weekly",
    payoutLevel: record.payoutLevel ?? null,
    payoutPeriodStart: record.payoutPeriodStart ?? null,
    payoutPeriodEnd: record.payoutPeriodEnd ?? null,
    payoutTier: record.payoutTier ?? null,
    payoutPercent: record.payoutPercent ?? null,
    payoutPrincipalUsdt: record.payoutPrincipalUsdt ?? null,
    payoutSourceTransactionId: record.payoutSourceTransactionId
      ? String(record.payoutSourceTransactionId)
      : null,
    payoutSourceUserId: record.payoutSourceUserId ? String(record.payoutSourceUserId) : null,
    createdAt: record.createdAt ?? null,
    updatedAt: record.updatedAt ?? null,
  };
}

function toPlanPurchaseRequestNode(record: AdminPlanPurchaseRecord) {
  const planName =
    cleanTransactionNotes(record.notes).replace(/^Plan purchase (request|approved):\s*/i, "") ?? "";

  return {
    id: String(record._id),
    user: toUserSummary(record.userId),
    amountUsdt: record.amountUsdt ?? 0,
    status: record.status ?? "pending",
    network: record.network ?? "SYSTEM",
    notes: cleanTransactionNotes(record.notes),
    reviewedBy: record.reviewedBy ? String(record.reviewedBy) : null,
    reviewedAt: record.reviewedAt ?? null,
    planName,
    tier: record.payoutTier ?? null,
    weeklyReturnPercent: record.payoutPercent ?? null,
    createdAt: record.createdAt ?? null,
    updatedAt: record.updatedAt ?? null,
  };
}

function toWithdrawalRequestNode(record: AdminWithdrawalRecord) {
  const grossAmountUsdt = record.payoutPrincipalUsdt ?? record.amountUsdt ?? 0;
  const withdrawalChargePercent = record.payoutPercent ?? 0;
  const chargeUsdt = roundUsdt(grossAmountUsdt - (record.amountUsdt ?? 0));

  return {
    id: String(record._id),
    user: toUserSummary(record.userId),
    amountUsdt: record.amountUsdt ?? 0,
    grossAmountUsdt,
    chargeUsdt,
    withdrawalChargePercent,
    status: record.status ?? "pending",
    network: record.network ?? "BEP20",
    notes: cleanTransactionNotes(record.notes),
    reviewedBy: record.reviewedBy ? String(record.reviewedBy) : null,
    reviewedAt: record.reviewedAt ?? null,
    createdAt: record.createdAt ?? null,
    updatedAt: record.updatedAt ?? null,
  };
}

function toWalletNode(record: AdminWalletRecord) {
  return {
    id: String(record._id),
    user: toUserSummary(record.userId),
    availableUsdt: record.availableUsdt ?? 0,
    topUpBalance: record.topUpBalance ?? 0,
    lockedUsdt: record.lockedUsdt ?? 0,
    lifetimeDepositsUsdt: record.lifetimeDepositsUsdt ?? 0,
    lifetimeWithdrawalsUsdt: record.lifetimeWithdrawalsUsdt ?? 0,
    lifetimeRewardsUsdt: record.lifetimeRewardsUsdt ?? 0,
    createdAt: record.createdAt ?? null,
    updatedAt: record.updatedAt ?? null,
  };
}

function roundUsdt(value: number) {
  return Math.round(value * 100) / 100;
}

async function ensurePlatformReserveForDebit(amountUsdt: number, actionLabel: string) {
  const requiredUsdt = roundUsdt(amountUsdt);

  if (requiredUsdt <= 0) {
    return;
  }

  const availableUsdt = roundUsdt(await walletRepository.getPrimaryAdminAvailableUsdt());

  if (availableUsdt < requiredUsdt) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      `Platform reserve is ${availableUsdt} USDT. Need ${requiredUsdt} USDT before approving this ${actionLabel}.`,
    );
  }
}

function getPayoutWeekStart(value?: string) {
  const start = value ? new Date(`${value}T00:00:00.000Z`) : new Date();
  const normalizedStart = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
  );
  const daysSinceMonday = (normalizedStart.getUTCDay() + 6) % 7;
  normalizedStart.setUTCDate(normalizedStart.getUTCDate() - daysSinceMonday);

  return normalizedStart;
}

function getPeriodEnd(periodStart: Date) {
  const periodEnd = new Date(periodStart);
  periodEnd.setUTCDate(periodEnd.getUTCDate() + 5);
  return periodEnd;
}

function getPeriodCutoff(periodEnd: Date) {
  const cutoff = new Date(periodEnd);
  cutoff.setUTCHours(23, 59, 59, 999);
  return cutoff;
}

function formatPeriodDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function hasWeeklyPayoutChanged(
  record: AdminPayoutRecord,
  payout: {
    amountUsdt: number;
    payoutPercent: number;
    payoutPrincipalUsdt: number;
    payoutTier: string;
  },
) {
  return (
    roundUsdt(record.amountUsdt ?? 0) !== payout.amountUsdt ||
    roundUsdt(record.payoutPrincipalUsdt ?? 0) !== payout.payoutPrincipalUsdt ||
    roundUsdt(record.payoutPercent ?? 0) !== payout.payoutPercent ||
    record.payoutTier !== payout.payoutTier
  );
}

export class AdminService {
  getOverview(filter?: { fromDate?: string; toDate?: string }) {
    return adminRepository.getOverviewCounts(filter);
  }

  async listUsers(input: { page: number; limit: number; search?: string }) {
    const page = input.page;
    const limit = input.limit;
    const skip = (page - 1) * limit;
    const { users, total } = await adminRepository.listUsers({
      search: input.search,
      skip,
      limit,
    });
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      users: users.map((user) => ({
        ...toSafeUser(user),
        email: "",
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async listDeposits(input: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    const page = input.page;
    const limit = input.limit;
    const skip = (page - 1) * limit;
    const { deposits, total } = await adminRepository.listDeposits({
      search: input.search,
      status: input.status,
      dateRange: buildDateRangeFilter({ fromDate: input.fromDate, toDate: input.toDate }),
      skip,
      limit,
    });
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      deposits: deposits.map((deposit) => toDepositNode(deposit as AdminDepositRecord)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async listPlanPurchases(input: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    const page = input.page;
    const limit = input.limit;
    const skip = (page - 1) * limit;
    const { planPurchases, total } = await adminRepository.listPlanPurchases({
      search: input.search,
      status: input.status,
      dateRange: buildDateRangeFilter({ fromDate: input.fromDate, toDate: input.toDate }),
      skip,
      limit,
    });
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      planPurchases: planPurchases.map((purchase) =>
        toPlanPurchaseRequestNode(purchase as AdminPlanPurchaseRecord),
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async listWithdrawals(input: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    const page = input.page;
    const limit = input.limit;
    const skip = (page - 1) * limit;
    const { total, withdrawals } = await adminRepository.listWithdrawals({
      search: input.search,
      status: input.status,
      dateRange: buildDateRangeFilter({ fromDate: input.fromDate, toDate: input.toDate }),
      skip,
      limit,
    });
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      withdrawals: withdrawals.map((withdrawal) =>
        toWithdrawalRequestNode(withdrawal as AdminWithdrawalRecord),
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async listWallets(input: { page: number; limit: number; search?: string }) {
    const page = input.page;
    const limit = input.limit;
    const skip = (page - 1) * limit;
    const { summary, wallets } = await adminRepository.listWallets({
      search: input.search,
      skip,
      limit,
    });
    const totalPages = Math.max(1, Math.ceil(summary.total / limit));

    return {
      summary,
      wallets: wallets.map((wallet) => toWalletNode(wallet as AdminWalletRecord)),
      pagination: {
        page,
        limit,
        total: summary.total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async listPayouts(input: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    payoutKind?: string;
    fromDate?: string;
    weekStart?: string;
    toDate?: string;
  }) {
    const page = input.page;
    const limit = input.limit;
    const skip = (page - 1) * limit;
    const payoutPeriodStart = input.weekStart ? getPayoutWeekStart(input.weekStart) : null;
    const payoutPeriodEnd = payoutPeriodStart ? getPeriodEnd(payoutPeriodStart) : null;
    const { payouts, summary, total } = await adminRepository.listPayouts({
      search: input.search,
      status: input.status,
      payoutKind: input.payoutKind,
      dateRange: buildDateRangeFilter({ fromDate: input.fromDate, toDate: input.toDate }),
      payoutPeriod:
        payoutPeriodStart && payoutPeriodEnd
          ? {
              end: payoutPeriodEnd,
              start: payoutPeriodStart,
            }
          : undefined,
      skip,
      limit,
    });
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      payouts: payouts.map((payout) => toPayoutNode(payout as AdminPayoutRecord)),
      summary: {
        pendingCount: summary.pendingCount ?? 0,
        approvedCount: summary.approvedCount ?? 0,
        rejectedCount: summary.rejectedCount ?? 0,
        totalPayoutUsdt: summary.totalPayoutUsdt ?? 0,
        totalPendingUsdt: summary.totalPendingUsdt ?? 0,
        totalApprovedUsdt: summary.totalApprovedUsdt ?? 0,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async exportPayoutsCsv(input: {
    search?: string;
    status?: string;
    payoutKind?: string;
    fromDate?: string;
    toDate?: string;
    weekStart?: string;
  }) {
    const payoutPeriodStart = input.weekStart ? getPayoutWeekStart(input.weekStart) : null;
    const payoutPeriodEnd = payoutPeriodStart ? getPeriodEnd(payoutPeriodStart) : null;
    const { payouts } = await adminRepository.listPayouts({
      search: input.search,
      status: input.status,
      payoutKind: input.payoutKind,
      dateRange: buildDateRangeFilter({ fromDate: input.fromDate, toDate: input.toDate }),
      payoutPeriod:
        payoutPeriodStart && payoutPeriodEnd
          ? {
              end: payoutPeriodEnd,
              start: payoutPeriodStart,
            }
          : undefined,
      skip: 0,
      limit: 100000,
    });

    const headers = [
      "Username",
      "Type",
      "Amount (USDT)",
      "Tier",
      "Principal (USDT)",
      "Percent (%)",
      "Period Start",
      "Period End",
      "Status",
      "Notes",
    ];

    const rows = payouts.map((payout) => {
      const u = toPayoutNode(payout as AdminPayoutRecord);
      const userObj = payout.userId as any;
      const username = userObj?.username ?? "Unknown";

      const periodStartStr = u.payoutPeriodStart
        ? new Date(u.payoutPeriodStart).toISOString().slice(0, 10)
        : "";
      const periodEndStr = u.payoutPeriodEnd
        ? new Date(u.payoutPeriodEnd).toISOString().slice(0, 10)
        : "";

      return [
        username,
        u.payoutKind,
        u.amountUsdt.toFixed(2),
        u.payoutTier ?? "",
        u.payoutPrincipalUsdt !== null ? u.payoutPrincipalUsdt.toFixed(2) : "",
        u.payoutPercent !== null ? u.payoutPercent.toFixed(2) : "",
        periodStartStr,
        periodEndStr,
        u.status,
        `"${(u.notes ?? "").replace(/"/g, '""')}"`,
      ];
    });

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  }

  async generateWeeklyPayouts(input: {
    weekStart?: string;
    payoutType?: "roi" | "level" | "royalty";
    adminUserId?: string;
    ipAddress?: string;
    autoApprove?: boolean;
  }) {
    let adminUserId = input.adminUserId;
    if (!adminUserId) {
      const admin = await UserModel.findOne({ role: "admin", status: "active" })
        .sort({ createdAt: 1 })
        .select("_id")
        .lean();
      adminUserId = admin ? String(admin._id) : undefined;
    }

    if (!adminUserId) {
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "No active admin user found for payout generation.",
      );
    }

    const payoutDate = input.weekStart ? new Date(`${input.weekStart}T00:00:00.000Z`) : new Date();
    const periodStart = new Date(
      Date.UTC(payoutDate.getUTCFullYear(), payoutDate.getUTCMonth(), payoutDate.getUTCDate()),
    );
    const periodEnd = new Date(
      Date.UTC(
        payoutDate.getUTCFullYear(),
        payoutDate.getUTCMonth(),
        payoutDate.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );
    const periodCutoff = periodEnd;
    const eligibleUntil = periodStart;

    if (periodStart.getTime() > Date.now()) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Payout period is in the future. Select a completed or current date.",
      );
    }

    const payoutType = input.payoutType ?? "roi";
    const isFriday = periodStart.getUTCDay() === 5;

    if (payoutType === "roi" && !isFriday) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Pool Return (Daily ROI) payouts can only be generated on Fridays.",
      );
    }

    const ruleSet = await planRepository.ensureDefaultRuleSet();
    const activeTiers = [...ruleSet.investmentTiers]
      .filter((tier) => tier.isActive !== false)
      .sort((tierA, tierB) => tierA.minUsdt - tierB.minUsdt);
    const minimumPrincipalUsdt = activeTiers[0]?.minUsdt;

    if (!minimumPrincipalUsdt) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "No active investment tiers are configured.");
    }

    // 1. Fetch eligible wallets
    const eligibleWallets = await adminRepository.listPayoutEligibleWallets({
      eligibleUntil,
      minimumPrincipalUsdt,
    });

    const rewardPayoutTotalsByUserId = await adminRepository.sumRewardPayoutsByUserIds({
      payoutKinds: TOTAL_REWARD_PAYOUT_KINDS,
      statuses: TOTAL_REWARD_GENERATION_STATUSES,
      userIds: eligibleWallets.map((wallet) => String(wallet.userId)),
    });

    const highestTier = activeTiers[activeTiers.length - 1];

    const createdPayouts: any[] = [];
    const updatedPayouts: any[] = [];
    let allRoiPayouts: any[] = [];

    // 1. Generate Daily ROI (7 days of the week ending on the selected Friday)
    if (payoutType === "roi") {
      const remainingCapacityMap = new Map<string, number>();
      for (const wallet of eligibleWallets) {
        const userId = String(wallet.userId);
        const lifetimeDepositsUsdt = wallet.lifetimeDepositsUsdt ?? 0;
        const maxEarningUsdt = roundUsdt(lifetimeDepositsUsdt * TOTAL_REWARD_EARNING_MULTIPLIER);
        const earnedOrQueuedUsdt = rewardPayoutTotalsByUserId.get(userId) ?? 0;
        const remainingEarningUsdt = Math.max(0, roundUsdt(maxEarningUsdt - earnedOrQueuedUsdt));
        remainingCapacityMap.set(userId, remainingEarningUsdt);
      }

      for (let d = 0; d < 7; d++) {
        const dayDate = new Date(periodStart);
        dayDate.setUTCDate(dayDate.getUTCDate() - (6 - d));

        const dayStart = new Date(dayDate);
        dayStart.setUTCHours(0, 0, 0, 0);
        const dayEnd = new Date(dayDate);
        dayEnd.setUTCHours(23, 59, 59, 999);

        // Fetch existing payouts for this specific day to avoid double generation
        const dayWeeklyPayouts = await adminRepository.listWeeklyPayoutsForPeriod({
          payoutPeriodEnd: dayEnd,
          payoutPeriodStart: dayStart,
        });
        const dayWeeklyPayoutByUserId = new Map(
          dayWeeklyPayouts.map((payout) => [String(payout.userId), payout as AdminPayoutRecord]),
        );

        const payoutCandidates = eligibleWallets
          .map((wallet) => {
            const userId = String(wallet.userId);
            const lifetimeDepositsUsdt = wallet.lifetimeDepositsUsdt ?? 0;
            const existingPayout = dayWeeklyPayoutByUserId.get(userId);

            const existingAmount = existingPayout?.amountUsdt ?? 0;
            const remainingEarningUsdt = roundUsdt(
              (remainingCapacityMap.get(userId) ?? 0) + existingAmount,
            );

            const tier =
              activeTiers.find(
                (candidate) =>
                  lifetimeDepositsUsdt >= candidate.minUsdt &&
                  lifetimeDepositsUsdt <= candidate.maxUsdt,
              ) ?? (highestTier && lifetimeDepositsUsdt > highestTier.maxUsdt ? highestTier : null);

            if (!tier) {
              return null;
            }

            const payoutPercent = tier.weeklyReturnMaxPercent;
            const payoutPrincipalUsdt = Math.min(lifetimeDepositsUsdt, tier.maxUsdt);
            const dailyRoiPercent = payoutPercent / 7;
            const uncappedAmountUsdt = roundUsdt((payoutPrincipalUsdt * dailyRoiPercent) / 100);
            const amountUsdt = roundUsdt(Math.min(uncappedAmountUsdt, remainingEarningUsdt));

            if (amountUsdt <= 0) {
              return null;
            }

            remainingCapacityMap.set(userId, roundUsdt(remainingEarningUsdt - amountUsdt));

            const capNote =
              amountUsdt < uncappedAmountUsdt
                ? ` Capped by ${TOTAL_REWARD_EARNING_MULTIPLIER}x total earning limit.`
                : "";

            return {
              amountUsdt,
              notes: `Daily ROI ${tier.tier} ${formatPeriodDate(dayStart)} (${dailyRoiPercent.toFixed(4)}%).${capNote}`,
              payoutPercent: roundUsdt(dailyRoiPercent),
              payoutPeriodEnd: dayEnd,
              payoutPeriodStart: dayStart,
              payoutPrincipalUsdt,
              payoutTier: tier.tier,
              userId,
            };
          })
          .filter((payout): payout is NonNullable<typeof payout> => Boolean(payout));

        const payoutsToCreate: typeof payoutCandidates = [];
        const payoutsToUpdate: Array<
          (typeof payoutCandidates)[number] & { transactionId: string }
        > = [];

        for (const payout of payoutCandidates) {
          const existingPayout = dayWeeklyPayoutByUserId.get(payout.userId);

          if (!existingPayout) {
            payoutsToCreate.push(payout);
            continue;
          }

          if (
            existingPayout.status === "pending" &&
            hasWeeklyPayoutChanged(existingPayout, payout)
          ) {
            payoutsToUpdate.push({
              ...payout,
              transactionId: String(existingPayout._id),
            });
          }
        }

        const [created, updatedResults] = await Promise.all([
          payoutsToCreate.length ? adminRepository.createPayoutTransactions(payoutsToCreate) : [],
          Promise.all(
            payoutsToUpdate.map((payout) => adminRepository.updatePendingWeeklyPayout(payout)),
          ),
        ]);

        createdPayouts.push(...created);
        updatedPayouts.push(...updatedResults.filter(Boolean));
      }
      allRoiPayouts = [...createdPayouts, ...updatedPayouts];
    }

    // 2. Generate Daily Level Income
    const createdLevelPayouts: any[] = [];
    const updatedLevelPayouts: any[] = [];
    let allLevelPayouts: any[] = [];

    if (payoutType === "level") {
      const levelPeriodStart = new Date(periodStart);
      levelPeriodStart.setUTCDate(levelPeriodStart.getUTCDate() - 6);
      const levelPeriodEnd = periodEnd;

      // Find all completed plan purchases in the selected period (week)
      const allPurchasesForPeriod = await TransactionModel.find({
        type: "plan_purchase",
        status: "completed",
        createdAt: { $gte: levelPeriodStart, $lte: levelPeriodEnd },
      }).lean();

      for (const purchase of allPurchasesForPeriod) {
        const newlyCreated = await rewardService.createLevelIncomeRewardsForPlanPurchase({
          userId: String(purchase.userId),
          amountUsdt: purchase.amountUsdt ?? 0,
          transactionId: String(purchase._id),
        });
        createdLevelPayouts.push(...newlyCreated);
      }
      allLevelPayouts = createdLevelPayouts;
    }

    // 3. Generate Weekly Royalty
    let salaryRoyaltyPayouts: any[] = [];

    if (payoutType === "royalty") {
      const royaltyCutoff = periodEnd;

      const royaltyPeriodStart = periodStart;
      const royaltyPeriodEnd = periodEnd;

      salaryRoyaltyPayouts = await rewardService.generateSalaryRoyaltyRewards({
        periodStart: royaltyPeriodStart,
        periodEnd: royaltyPeriodEnd,
        royaltyCutoff,
      });
    }

    const allGeneratedPayouts = [...allRoiPayouts, ...allLevelPayouts, ...salaryRoyaltyPayouts];
    const skippedCount = eligibleWallets.length - createdPayouts.length - updatedPayouts.length;

    await adminRepository.recordAuditLog({
      actorUserId: adminUserId,
      action: "admin.payouts.generated",
      entityType: "weekly_payout",
      entityId: `${formatPeriodDate(periodStart)}`,
      ipAddress: input.ipAddress,
      metadata: {
        createdCount: allGeneratedPayouts.length,
        eligibleCount: eligibleWallets.length,
        salaryRoyaltyCreatedCount: salaryRoyaltyPayouts.length,
        levelCreatedCount: allLevelPayouts.length,
        skippedCount,
        weeklyCreatedCount: createdPayouts.length,
        weeklyUpdatedCount: updatedPayouts.length,
        eligibleUntil: eligibleUntil.toISOString(),
        periodCutoff: periodCutoff.toISOString(),

        weekStart: formatPeriodDate(periodStart),
      },
    });

    if (input.autoApprove !== false && allGeneratedPayouts.length > 0) {
      await this.approveAllPendingPayouts({
        adminUserId,
        ipAddress: input.ipAddress,
        transactionIds: allGeneratedPayouts.map((payout) => String(payout._id)),
      });
    }

    return {
      createdCount: allGeneratedPayouts.length,
      eligibleCount: eligibleWallets.length,
      salaryRoyaltyCreatedCount: salaryRoyaltyPayouts.length,
      levelCreatedCount: allLevelPayouts.length,
      skippedCount,
      updatedCount: updatedPayouts.length + updatedLevelPayouts.length,
      weeklyCreatedCount: createdPayouts.length,
      weeklyUpdatedCount: updatedPayouts.length,
      period: {
        start: periodStart,
        end: periodEnd,
      },
      payouts: allGeneratedPayouts.map((payout) => toPayoutNode(payout as AdminPayoutRecord)),
    };
  }

  getPaymentWallet() {
    return getPlatformPaymentWallet();
  }

  async updatePaymentWallet(input: {
    address: string;
    network: string;
    adminUserId: string;
    ipAddress?: string;
  }) {
    const wallet = await updatePlatformPaymentWallet({
      address: input.address,
      network: input.network,
      updatedBy: input.adminUserId,
    });

    await adminRepository.recordAuditLog({
      actorUserId: input.adminUserId,
      action: "admin.payment_wallet.updated",
      entityType: "platform_setting",
      entityId: "payment_wallet",
      ipAddress: input.ipAddress,
      metadata: {
        network: wallet.network,
      },
    });

    return { wallet };
  }

  async reviewPlanPurchase(input: {
    transactionId: string;
    adminUserId: string;
    action: "approve" | "reject";
    notes?: string;
    ipAddress?: string;
    autoApproveRewards?: boolean;
  }) {
    const reviewedPurchase =
      input.action === "approve"
        ? await adminRepository.approvePendingPlanPurchase(input)
        : await adminRepository.rejectPendingPlanPurchase(input);

    if (!reviewedPurchase) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Plan purchase request is not pending or was not found.",
      );
    }

    if (input.action === "approve") {
      const tier = [...(await planRepository.ensureDefaultRuleSet()).investmentTiers].find(
        (candidate) => candidate.tier === reviewedPurchase.payoutTier,
      );

      await Promise.all([
        UserPlanPurchaseModel.findOneAndUpdate(
          { sourceTransactionId: reviewedPurchase._id },
          {
            $set: {
              amountUsdt: reviewedPurchase.amountUsdt,
              name: tier?.name ?? reviewedPurchase.payoutTier ?? "Investment Pool",
              sourceTransactionId: reviewedPurchase._id,
              status: "active",
              tier: reviewedPurchase.payoutTier ?? tier?.tier ?? "POOL",
              userId: reviewedPurchase.userId,
              weeklyReturnPercent:
                reviewedPurchase.payoutPercent ?? tier?.weeklyReturnMaxPercent ?? 0,
            },
            $setOnInsert: {
              purchasedAt: new Date(),
            },
          },
          { new: true, upsert: true },
        ),
        walletRepository.creditAdminPlanPurchase(reviewedPurchase.amountUsdt),
      ]);

      await rewardService.createLevelIncomeRewardsForPlanPurchase({
        amountUsdt: reviewedPurchase.amountUsdt,
        transactionId: input.transactionId,
        userId: String(reviewedPurchase.userId),
      });

      if (input.autoApproveRewards !== false) {
        await this.approveAllPendingPayouts({
          adminUserId: input.adminUserId,
          ipAddress: input.ipAddress,
        });
      }
    } else {
      await walletRepository.unlockPlanAmount(
        String(reviewedPurchase.userId),
        reviewedPurchase.amountUsdt,
      );
    }

    await adminRepository.recordAuditLog({
      actorUserId: input.adminUserId,
      action: `admin.plan_purchase.${input.action === "approve" ? "approved" : "rejected"}`,
      entityType: "transaction",
      entityId: input.transactionId,
      ipAddress: input.ipAddress,
      metadata: {
        amountUsdt: reviewedPurchase.amountUsdt,
        payoutTier: reviewedPurchase.payoutTier,
        userId: String(reviewedPurchase.userId),
      },
    });

    const planPurchase = await adminRepository.findPlanPurchaseById(input.transactionId);

    return {
      planPurchase: planPurchase
        ? toPlanPurchaseRequestNode(planPurchase as AdminPlanPurchaseRecord)
        : toPlanPurchaseRequestNode(reviewedPurchase),
    };
  }

  async reviewWithdrawal(input: {
    transactionId: string;
    adminUserId: string;
    action: "approve" | "reject";
    notes?: string;
    ipAddress?: string;
  }) {
    const pendingWithdrawal = await adminRepository.findPendingWithdrawalById(input.transactionId);

    if (!pendingWithdrawal) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Withdrawal request is not pending or was not found.",
      );
    }

    const grossAmountUsdt = pendingWithdrawal.payoutPrincipalUsdt ?? pendingWithdrawal.amountUsdt;
    const netAmountUsdt = pendingWithdrawal.amountUsdt ?? 0;
    const userId = String(pendingWithdrawal.userId);
    let reviewedWithdrawal: AdminWithdrawalRecord | null = null;

    if (input.action === "approve") {
      await ensurePlatformReserveForDebit(netAmountUsdt, "withdrawal");

      const wallet = await walletRepository.completeWithdrawalAmount(userId, grossAmountUsdt);

      if (!wallet) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          "Withdrawal amount is no longer locked in the user wallet.",
        );
      }

      await walletRepository.debitAdminWithdrawal(netAmountUsdt);
      reviewedWithdrawal = await adminRepository.approvePendingWithdrawal(input);
    } else {
      const wallet = await walletRepository.unlockWithdrawalAmount(userId, grossAmountUsdt);

      if (!wallet) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          "Withdrawal amount is no longer locked in the user wallet.",
        );
      }

      reviewedWithdrawal = await adminRepository.rejectPendingWithdrawal(input);
    }

    if (!reviewedWithdrawal) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Withdrawal request is not pending or was not found.",
      );
    }

    await adminRepository.recordAuditLog({
      actorUserId: input.adminUserId,
      action: `admin.withdrawal.${input.action === "approve" ? "approved" : "rejected"}`,
      entityType: "transaction",
      entityId: input.transactionId,
      ipAddress: input.ipAddress,
      metadata: {
        chargeUsdt: roundUsdt(grossAmountUsdt - netAmountUsdt),
        grossAmountUsdt,
        netAmountUsdt,
        userId,
      },
    });

    const withdrawal = await adminRepository.findWithdrawalById(input.transactionId);

    return {
      withdrawal: withdrawal
        ? toWithdrawalRequestNode(withdrawal as AdminWithdrawalRecord)
        : toWithdrawalRequestNode(reviewedWithdrawal),
    };
  }

  async reviewPayout(input: {
    transactionId: string;
    adminUserId: string;
    action: "approve" | "reject";
    notes?: string;
    ipAddress?: string;
  }) {
    let reviewedPayout: AdminPayoutRecord | null = null;

    if (input.action === "approve") {
      const pendingPayout = await adminRepository.findPendingPayoutById(input.transactionId);

      if (!pendingPayout) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          "Payout request is not pending or was not found.",
        );
      }

      if (TOTAL_REWARD_PAYOUT_KINDS.includes(pendingPayout.payoutKind ?? "")) {
        const isWeeklyPayout = pendingPayout.payoutKind === "weekly";
        const periodStart =
          isWeeklyPayout && pendingPayout.payoutPeriodStart
            ? new Date(pendingPayout.payoutPeriodStart)
            : null;

        if (isWeeklyPayout && (!periodStart || Number.isNaN(periodStart.getTime()))) {
          throw new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            "Weekly payout period is missing or invalid.",
          );
        }

        const payoutCap = await adminRepository.getRewardPayoutCap({
          earningMultiplier: TOTAL_REWARD_EARNING_MULTIPLIER,
          eligibleUntil: periodStart ?? undefined,
          excludeTransactionId: input.transactionId,
          payoutKinds: TOTAL_REWARD_PAYOUT_KINDS,
          statuses: TOTAL_REWARD_APPROVAL_STATUSES,
          userId: String(pendingPayout.userId),
        });
        const remainingUsdt = roundUsdt(payoutCap.remainingUsdt);
        const payoutAmountUsdt = roundUsdt(pendingPayout.amountUsdt ?? 0);

        if (payoutAmountUsdt > remainingUsdt) {
          throw new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            `Payout exceeds ${TOTAL_REWARD_EARNING_MULTIPLIER}x total earning cap. Weekly, level, and royalty income combined can only use ${remainingUsdt} USDT remaining capacity for ${roundUsdt(payoutCap.principalUsdt)} USDT eligible principal.`,
          );
        }
      }

      await ensurePlatformReserveForDebit(pendingPayout.amountUsdt ?? 0, "payout");

      reviewedPayout = await adminRepository.approvePendingPayout(input);
    } else {
      reviewedPayout = await adminRepository.rejectPendingPayout(input);
    }

    if (!reviewedPayout) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Payout request is not pending or was not found.",
      );
    }

    const reviewedPayoutAmountUsdt = reviewedPayout.amountUsdt ?? 0;

    if (input.action === "approve") {
      await Promise.all([
        walletRepository.creditReward(String(reviewedPayout.userId), reviewedPayoutAmountUsdt),
        walletRepository.debitAdminPayout(reviewedPayoutAmountUsdt),
      ]);
    }

    await adminRepository.recordAuditLog({
      actorUserId: input.adminUserId,
      action: input.action === "approve" ? "admin.payout.approved" : "admin.payout.rejected",
      entityType: "transaction",
      entityId: input.transactionId,
      ipAddress: input.ipAddress,
      metadata: {
        amountUsdt: reviewedPayoutAmountUsdt,
        payoutPeriodStart: reviewedPayout.payoutPeriodStart,
        payoutTier: reviewedPayout.payoutTier,
        userId: String(reviewedPayout.userId),
      },
    });

    const payout = await adminRepository.findPayoutById(input.transactionId);

    return {
      payout: payout
        ? toPayoutNode(payout as AdminPayoutRecord)
        : toPayoutNode(reviewedPayout as AdminPayoutRecord),
    };
  }

  async listReferralNetwork(input: {
    page: number;
    limit: number;
    search?: string;
    parentUserId?: string;
    rootOnly?: boolean;
    level?: number;
    status?: string;
  }) {
    const page = input.page;
    const limit = input.limit;
    const skip = (page - 1) * limit;
    const {
      activeUsers,
      levelSummaries,
      linkedUsers,
      maxLevel,
      referrals,
      rootUsers,
      total,
      totalUsers,
    } = await adminRepository.listReferralNetwork({
      search: input.search,
      parentUserId: input.parentUserId,
      rootOnly: input.rootOnly,
      level: input.level,
      limit,
      skip,
      status: input.status,
    });
    const [teamBusinessMap, selfBusinessMap, { userRoyaltyRankMap }] = await Promise.all([
      getTeamBusinessMap(),
      getSelfBusinessMap(),
      calculateUserRoyaltyRanks(),
    ]);
    const nodes = referrals.map((record) =>
      toReferralNode(record as AdminReferralRecord, teamBusinessMap, selfBusinessMap, userRoyaltyRankMap),
    );
    const levels = nodes.reduce<Record<string, typeof nodes>>((levelMap, node) => {
      const key = `L${node.level}`;
      levelMap[key] = [...(levelMap[key] ?? []), node];
      return levelMap;
    }, {});
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      summary: {
        totalUsers,
        activeUsers,
        linkedUsers,
        rootUsers,
        totalReferralRecords: total,
        maxLevel,
      },
      nodes,
      levels,
      levelSummaries: (levelSummaries as AdminReferralLevelSummary[]).map((summary) => ({
        level: summary.level,
        key: `L${summary.level}`,
        count: summary.count,
        samples: summary.samples.map((sample) => ({
          id: String(sample.id),
          email: null,
          username: sample.username ?? null,
          status: sample.status ?? "unknown",
        })),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async approveAllPendingPayouts(input: {
    adminUserId?: string;
    ipAddress?: string;
    transactionIds?: string[];
  }) {
    let adminUserId = input.adminUserId;
    if (!adminUserId) {
      const admin = await UserModel.findOne({ role: "admin", status: "active" })
        .sort({ createdAt: 1 })
        .select("_id")
        .lean();
      adminUserId = admin ? String(admin._id) : undefined;
    }

    if (!adminUserId) {
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "No active admin user found for payout approval.",
      );
    }

    const query: Record<string, any> = {
      status: "pending",
      type: "reward",
      payoutKind: { $in: ["weekly", "level", "salary_royalty"] },
    };

    if (input.transactionIds && input.transactionIds.length > 0) {
      query._id = { $in: input.transactionIds };
    }

    const pendingPayouts = await TransactionModel.find(query).lean();

    let approvedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const payout of pendingPayouts) {
      try {
        await this.reviewPayout({
          transactionId: String(payout._id),
          adminUserId,
          action: "approve",
          ipAddress: input.ipAddress,
        });
        approvedCount++;
      } catch (err) {
        failedCount++;
        errors.push(`${payout._id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return {
      totalPending: pendingPayouts.length,
      approvedCount,
      failedCount,
      errors,
    };
  }

  async editUser(
    userId: string,
    update: { username?: string; role?: string; status?: string },
  ) {
    const user = await UserModel.findOne({ _id: userId, isDeleted: { $ne: true } });
    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found.");
    }

    if (update.username) {
      const usernameLower = update.username.toLowerCase().trim();
      const existing = await UserModel.findOne({
        username: usernameLower,
        _id: { $ne: user._id },
        isDeleted: { $ne: true },
      });
      if (existing) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Username is already taken.");
      }
      user.username = usernameLower;
    }

    if (update.role) {
      user.role = update.role as any;
    }

    if (update.status) {
      user.status = update.status as any;
    }

    await user.save();

    return user.toObject();
  }

  async deleteUser(userId: string, adminUserId: string) {
    const user = await UserModel.findOne({ _id: userId, isDeleted: { $ne: true } });
    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found.");
    }

    user.isDeleted = true;
    user.deletedAt = new Date();
    await user.save();

    // Revoke all sessions for the deleted user
    await authRepository.revokeUserSessions(userId);

    // Audit log
    await adminRepository.recordAuditLog({
      actorUserId: adminUserId,
      action: "admin.user.deleted",
      entityType: "user",
      entityId: userId,
      metadata: {
        username: user.username,
        email: user.email,
      },
    });

    return { success: true };
  }
}

export const adminService = new AdminService();
