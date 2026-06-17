import { Types } from "mongoose";
import { TransactionModel } from "../../transactions/models/transaction.model";
import { UserModel } from "../../users/models/user.model";
import { WalletModel } from "../../wallet/models/wallet.model";
import { ReferralModel } from "../../referrals/models/referral.model";
import { getTeamBusinessMap } from "../../referrals/services/referral.service";
import { UserPlanPurchaseModel } from "../../plans/models/user-plan-purchase.model";
import { rewardService } from "../../rewards/services/reward.service";
import { buildPaginationDto } from "../../../utils/ApiResponse";
import { cleanTransactionNotes } from "../../transactions/dtos/transaction.dto";
import type {
  EarningsResponseDto,
  RewardDto,
  UserDashboardMetricsResponseDto,
} from "../dtos/report.dto";

type DateRangeFilter = {
  $gte?: Date;
  $lt?: Date;
};

type EarningsListInput = {
  userId: string;
  page: number;
  limit: number;
  status?: string;
  kind?: string;
  dateRange?: DateRangeFilter;
};

type EarningsSummary = {
  approvedCount?: number;
  pendingCount?: number;
  rejectedCount?: number;
  totalApprovedUsdt?: number;
  totalGeneratedUsdt?: number;
  totalPendingUsdt?: number;
  totalRejectedUsdt?: number;
};

type EarningsKindSummary = {
  _id: string | null;
  approvedUsdt?: number;
  pendingUsdt?: number;
  totalCount?: number;
  totalUsdt?: number;
};

type DepositOverviewStats = {
  monthApprovedCount?: number;
  monthApprovedUsdt?: number;
  pendingCount?: number;
  pendingUsdt?: number;
  todayApprovedCount?: number;
  todayApprovedUsdt?: number;
};

type RewardRecord = {
  _id?: unknown;
  amountUsdt?: number;
  createdAt?: Date | string | null;
  network?: string | null;
  notes?: string | null;
  payoutKind?: string | null;
  payoutLevel?: number | null;
  payoutPercent?: number | null;
  payoutPeriodEnd?: Date | string | null;
  payoutPeriodStart?: Date | string | null;
  payoutPrincipalUsdt?: number | null;
  payoutSourceTransactionId?: unknown;
  payoutSourceUserId?: unknown;
  payoutTier?: string | null;
  reviewedAt?: Date | string | null;
  status?: string;
  updatedAt?: Date | string | null;
};

function buildLastMonthBuckets(totalMonths: number) {
  const now = new Date();
  const buckets = [];

  for (let offset = totalMonths - 1; offset >= 0; offset -= 1) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    const key = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`;
    const month = start.toLocaleString("en-US", { month: "short", timeZone: "UTC" });

    buckets.push({ end, key, month, start });
  }

  return buckets;
}

function toRewardNode(record: RewardRecord): RewardDto {
  return {
    id: String(record._id),
    amountUsdt: record.amountUsdt ?? 0,
    createdAt: record.createdAt ?? null,
    network: record.network ?? "SYSTEM",
    notes: cleanTransactionNotes(record.notes),
    payoutKind: record.payoutKind ?? "weekly",
    payoutLevel: record.payoutLevel ?? null,
    payoutPercent: record.payoutPercent ?? null,
    payoutPeriodEnd: record.payoutPeriodEnd ?? null,
    payoutPeriodStart: record.payoutPeriodStart ?? null,
    payoutPrincipalUsdt: record.payoutPrincipalUsdt ?? null,
    payoutSourceTransactionId: record.payoutSourceTransactionId
      ? String(record.payoutSourceTransactionId)
      : null,
    payoutSourceUserId: record.payoutSourceUserId ? String(record.payoutSourceUserId) : null,
    payoutTier: record.payoutTier ?? null,
    reviewedAt: record.reviewedAt ?? null,
    status: record.status ?? "pending",
    updatedAt: record.updatedAt ?? null,
  };
}

export class ReportRepository {
  async autoGenerateRoyalty(userId: string) {
    try {
      const today = new Date();
      const todayStart = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
      );
      const todayEnd = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999),
      );

      await rewardService.generateSalaryRoyaltyRewards({
        userIds: [userId],
        periodStart: todayStart,
        periodEnd: todayEnd,
        royaltyCutoff: todayEnd,
      });
    } catch (err) {
      console.error("Failed to auto-generate daily royalty reward:", err);
    }
  }

  async getDashboardMetrics(userId: string): Promise<UserDashboardMetricsResponseDto> {
    await this.autoGenerateRoyalty(userId);
    const userObjectId = new Types.ObjectId(userId);
    const monthBuckets = buildLastMonthBuckets(7);
    const firstBucketStart = monthBuckets[0]?.start ?? new Date();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const completedStatuses = ["approved", "completed"];

    const [
      totalTeamMembers,
      approvedDeposits,
      completedWithdrawals,
      approvedRewards,
      wallet,
      referral,
      recentTransactions,
      monthlyRewards,
      depositOverview,
      teamBusinessMap,
      principalTotals,
      rewardTotals,
    ] = await Promise.all([
      UserModel.countDocuments({ invitedBy: userId }),
      TransactionModel.aggregate([
        {
          $match: {
            userId: userObjectId,
            type: "deposit",
            status: { $in: ["approved", "completed"] },
          },
        },
        { $group: { _id: null, total: { $sum: "$amountUsdt" } } },
      ]),
      TransactionModel.aggregate([
        { $match: { userId: userObjectId, type: "withdrawal", status: "completed" } },
        { $group: { _id: null, total: { $sum: "$amountUsdt" } } },
      ]),
      TransactionModel.aggregate([
        {
          $match: {
            userId: userObjectId,
            type: "reward",
            status: { $in: ["approved", "completed"] },
          },
        },
        { $group: { _id: null, total: { $sum: "$amountUsdt" } } },
      ]),
      WalletModel.findOne({ userId }).lean(),
      ReferralModel.findOne({ userId }).lean(),
      TransactionModel.find({ userId }).sort({ createdAt: -1 }).limit(5).lean(),
      TransactionModel.aggregate<{ _id: { year: number; month: number }; total: number }>([
        {
          $match: {
            userId: userObjectId,
            type: "reward",
            status: { $in: ["approved", "completed"] },
            createdAt: { $gte: firstBucketStart },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            total: { $sum: "$amountUsdt" },
          },
        },
      ]),
      TransactionModel.aggregate<DepositOverviewStats>([
        {
          $match: {
            userId: userObjectId,
            type: "deposit",
          },
        },
        {
          $group: {
            _id: null,
            monthApprovedCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: ["$createdAt", monthStart] },
                      { $in: ["$status", completedStatuses] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            monthApprovedUsdt: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: ["$createdAt", monthStart] },
                      { $in: ["$status", completedStatuses] },
                    ],
                  },
                  "$amountUsdt",
                  0,
                ],
              },
            },
            pendingCount: {
              $sum: {
                $cond: [{ $eq: ["$status", "pending"] }, 1, 0],
              },
            },
            pendingUsdt: {
              $sum: {
                $cond: [{ $eq: ["$status", "pending"] }, "$amountUsdt", 0],
              },
            },
            todayApprovedCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: ["$createdAt", todayStart] },
                      { $in: ["$status", completedStatuses] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            todayApprovedUsdt: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: ["$createdAt", todayStart] },
                      { $in: ["$status", completedStatuses] },
                    ],
                  },
                  "$amountUsdt",
                  0,
                ],
              },
            },
          },
        },
      ]),
      getTeamBusinessMap(),
      UserPlanPurchaseModel.aggregate<{ _id: Types.ObjectId | null; principalUsdt?: number }>([
        {
          $match: {
            userId: userObjectId,
            amountUsdt: { $gt: 0 },
            status: "active",
          },
        },
        {
          $group: {
            _id: "$userId",
            principalUsdt: { $sum: "$amountUsdt" },
          },
        },
      ]),
      TransactionModel.aggregate<{ _id: Types.ObjectId | null; amountUsdt?: number }>([
        {
          $match: {
            userId: userObjectId,
            type: "reward",
            payoutKind: { $in: ["weekly", "level", "salary_royalty"] },
            status: { $in: ["pending", "approved", "completed"] },
          },
        },
        {
          $group: {
            _id: "$userId",
            amountUsdt: { $sum: "$amountUsdt" },
          },
        },
      ]),
    ]);
    const monthlyRewardMap = new Map(
      monthlyRewards.map((entry) => [
        `${entry._id.year}-${String(entry._id.month).padStart(2, "0")}`,
        entry.total,
      ]),
    );

    const principalUsdt = principalTotals[0]?.principalUsdt ?? 0;
    const earnedRewardsUsdt = rewardTotals[0]?.amountUsdt ?? 0;
    const availableLimitUsdt = Math.max(
      0,
      Math.round((principalUsdt * 3 - earnedRewardsUsdt) * 100) / 100,
    );

    return {
      wallet: {
        availableUsdt: Math.max(
          0,
          Math.round(
            ((wallet?.lifetimeRewardsUsdt ?? approvedRewards[0]?.total ?? 0) -
              (wallet?.lifetimeWithdrawalsUsdt ?? completedWithdrawals[0]?.total ?? 0)) *
              100,
          ) / 100,
        ),
        lockedUsdt: wallet?.lockedUsdt ?? 0,
        lifetimeDepositsUsdt: wallet?.lifetimeDepositsUsdt ?? approvedDeposits[0]?.total ?? 0,
        lifetimeWithdrawalsUsdt:
          wallet?.lifetimeWithdrawalsUsdt ?? completedWithdrawals[0]?.total ?? 0,
        lifetimeRewardsUsdt: wallet?.lifetimeRewardsUsdt ?? approvedRewards[0]?.total ?? 0,
      },
      availableLimitUsdt,
      referrals: {
        directCount: referral?.directCount ?? 0,
        activeTeamCount: referral?.activeTeamCount ?? totalTeamMembers,
      },
      totalTeamMembers,
      totalTeamBusinessUsdt: teamBusinessMap.get(userId) ?? 0,
      totalDepositsUsdt: approvedDeposits[0]?.total ?? 0,
      totalWithdrawalsUsdt: completedWithdrawals[0]?.total ?? 0,
      totalRewardsUsdt: approvedRewards[0]?.total ?? 0,
      depositOverview: {
        monthApprovedCount: depositOverview[0]?.monthApprovedCount ?? 0,
        monthApprovedUsdt: depositOverview[0]?.monthApprovedUsdt ?? 0,
        pendingCount: depositOverview[0]?.pendingCount ?? 0,
        pendingUsdt: depositOverview[0]?.pendingUsdt ?? 0,
        todayApprovedCount: depositOverview[0]?.todayApprovedCount ?? 0,
        todayApprovedUsdt: depositOverview[0]?.todayApprovedUsdt ?? 0,
        totalApprovedUsdt: approvedDeposits[0]?.total ?? 0,
      },
      earningOverview: monthBuckets.map((bucket) => ({
        month: bucket.month,
        amountUsdt: monthlyRewardMap.get(bucket.key) ?? 0,
      })),
      recentTransactions: recentTransactions.map((transaction) => ({
        id: String(transaction._id),
        type: transaction.type,
        status: transaction.status,
        amountUsdt: transaction.amountUsdt,
        createdAt: transaction.createdAt,
      })),
    };
  }

  async getEarnings(input: EarningsListInput): Promise<EarningsResponseDto> {
    await this.autoGenerateRoyalty(input.userId);
    const userObjectId = new Types.ObjectId(input.userId);
    const skip = (input.page - 1) * input.limit;
    const now = new Date();
    const visibleRewardMatch = {
      $and: [
        {
          $or: [
            { payoutPeriodEnd: { $exists: false } },
            { payoutPeriodEnd: null },
            { payoutPeriodEnd: { $lte: now } },
            { payoutKind: "salary_royalty" },
          ],
        },
        {
          $or: [
            { payoutKind: { $ne: "weekly" } },
            { $expr: { $gte: ["$createdAt", "$payoutPeriodEnd"] } },
          ],
        },
      ],
    };
    const baseMatch = {
      userId: userObjectId,
      type: "reward",
      payoutKind: { $in: ["weekly", "level", "salary_royalty"] },
      ...visibleRewardMatch,
    };
    const listMatch = {
      ...baseMatch,
      ...(input.kind ? { payoutKind: input.kind } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.dateRange ? { createdAt: input.dateRange } : {}),
    };

    const [wallet, summary, kindSummary, rewards, total, principalTotals, rewardTotals] =
      await Promise.all([
        WalletModel.findOne({ userId: input.userId }).lean(),
        TransactionModel.aggregate<EarningsSummary>([
          { $match: baseMatch },
          {
            $group: {
              _id: null,
              approvedCount: {
                $sum: { $cond: [{ $in: ["$status", ["approved", "completed"]] }, 1, 0] },
              },
              pendingCount: {
                $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
              },
              rejectedCount: {
                $sum: { $cond: [{ $in: ["$status", ["rejected", "failed"]] }, 1, 0] },
              },
              totalApprovedUsdt: {
                $sum: {
                  $cond: [{ $in: ["$status", ["approved", "completed"]] }, "$amountUsdt", 0],
                },
              },
              totalGeneratedUsdt: { $sum: "$amountUsdt" },
              totalPendingUsdt: {
                $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$amountUsdt", 0] },
              },
              totalRejectedUsdt: {
                $sum: {
                  $cond: [{ $in: ["$status", ["rejected", "failed"]] }, "$amountUsdt", 0],
                },
              },
            },
          },
        ]),
        TransactionModel.aggregate<EarningsKindSummary>([
          { $match: baseMatch },
          {
            $group: {
              _id: "$payoutKind",
              approvedUsdt: {
                $sum: {
                  $cond: [{ $in: ["$status", ["approved", "completed"]] }, "$amountUsdt", 0],
                },
              },
              pendingUsdt: {
                $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$amountUsdt", 0] },
              },
              totalCount: { $sum: 1 },
              totalUsdt: { $sum: "$amountUsdt" },
            },
          },
        ]),
        TransactionModel.find(listMatch)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(input.limit)
          .lean(),
        TransactionModel.countDocuments(listMatch),
        UserPlanPurchaseModel.aggregate<{ _id: Types.ObjectId | null; principalUsdt?: number }>([
          {
            $match: {
              userId: userObjectId,
              amountUsdt: { $gt: 0 },
              status: "active",
            },
          },
          {
            $group: {
              _id: "$userId",
              principalUsdt: { $sum: "$amountUsdt" },
            },
          },
        ]),
        TransactionModel.aggregate<{ _id: Types.ObjectId | null; amountUsdt?: number }>([
          {
            $match: {
              userId: userObjectId,
              type: "reward",
              payoutKind: { $in: ["weekly", "level", "salary_royalty"] },
              status: { $in: ["pending", "approved", "completed"] },
            },
          },
          {
            $group: {
              _id: "$userId",
              amountUsdt: { $sum: "$amountUsdt" },
            },
          },
        ]),
      ]);
    const summaryRecord = summary[0] ?? {};
    const byKind = ["weekly", "level", "salary_royalty"].reduce<
      Record<
        string,
        { approvedUsdt: number; pendingUsdt: number; totalCount: number; totalUsdt: number }
      >
    >((map, kind) => {
      const record = kindSummary.find((entry) => entry._id === kind);
      map[kind] = {
        approvedUsdt: record?.approvedUsdt ?? 0,
        pendingUsdt: record?.pendingUsdt ?? 0,
        totalCount: record?.totalCount ?? 0,
        totalUsdt: record?.totalUsdt ?? 0,
      };
      return map;
    }, {});

    const principalUsdt = principalTotals[0]?.principalUsdt ?? 0;
    const earnedRewardsUsdt = rewardTotals[0]?.amountUsdt ?? 0;
    const availableLimitUsdt = Math.max(
      0,
      Math.round((principalUsdt * 3 - earnedRewardsUsdt) * 100) / 100,
    );

    return {
      summary: {
        approvedCount: summaryRecord.approvedCount ?? 0,
        availableUsdt: Math.max(
          0,
          Math.round(
            ((wallet?.lifetimeRewardsUsdt ?? summaryRecord.totalApprovedUsdt ?? 0) -
              (wallet?.lifetimeWithdrawalsUsdt ?? 0)) *
              100,
          ) / 100,
        ),
        availableLimitUsdt,
        lifetimeRewardsUsdt: wallet?.lifetimeRewardsUsdt ?? summaryRecord.totalApprovedUsdt ?? 0,
        pendingCount: summaryRecord.pendingCount ?? 0,
        rejectedCount: summaryRecord.rejectedCount ?? 0,
        totalApprovedUsdt: summaryRecord.totalApprovedUsdt ?? 0,
        totalGeneratedUsdt: summaryRecord.totalGeneratedUsdt ?? 0,
        totalPendingUsdt: summaryRecord.totalPendingUsdt ?? 0,
        totalRejectedUsdt: summaryRecord.totalRejectedUsdt ?? 0,
        byKind,
      },
      rewards: rewards.map((reward) => toRewardNode(reward as RewardRecord)),
      pagination: buildPaginationDto({
        page: input.page,
        limit: input.limit,
        total,
      }),
    };
  }
}

export const reportRepository = new ReportRepository();
