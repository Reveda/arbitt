import { Types, type PipelineStage } from "mongoose";
import { UserPlanPurchaseModel } from "../../plans/models/user-plan-purchase.model";
import { ReferralModel } from "../../referrals/models/referral.model";
import { getSalaryRoyaltyPeriod } from "../../rewards/utils/salaryRoyalty";
import { TransactionModel } from "../../transactions/models/transaction.model";
import { UserModel } from "../../users/models/user.model";
import type { UserRepositoryRecord } from "../../users/types/user.repository.types";
import { WalletModel } from "../../wallet/models/wallet.model";
import { AuditLogModel } from "../models/audit-log.model";
import type {
  AdminAuditLogRepositoryRecord,
  AdminDepositListInput,
  AdminListDepositsRepositoryResult,
  AdminListPayoutsRepositoryResult,
  AdminListPlanPurchasesRepositoryResult,
  AdminListWithdrawalsRepositoryResult,
  AdminListUsersInput,
  AdminListUsersRepositoryResult,
  AdminListWalletsRepositoryResult,
  AdminOverviewRepositoryResult,
  AdminPayoutListInput,
  AdminPlanPurchaseListInput,
  AdminReferralListInput,
  AdminReferralNetworkRepositoryResult,
  AdminReferralRepositoryRecord,
  AdminTransactionRepositoryRecord,
  AdminWithdrawalListInput,
  AdminWalletListInput,
  AdminWalletRepositoryRecord,
  CreatePayoutTransactionInput,
  PayoutAggregationSummary,
  PayoutEligibleWalletRecord,
  ReferralLevelSummary,
  UpdateWeeklyPayoutInput,
} from "../types/admin.repository.types";

type ReferralAggregationStats = {
  totalReferralRecords?: number;
  linkedUsers?: number;
  rootUsers?: number;
  maxLevel?: number;
  activeUsers?: number;
};

type ReferralAggregationResult = {
  data: unknown[];
  counts: ReferralAggregationStats[];
  levelSummaries: ReferralLevelSummary[];
};

type AdminDepositOverviewStats = {
  monthApprovedCount?: number;
  monthApprovedUsdt?: number;
  pendingCount?: number;
  pendingUsdt?: number;
  todayApprovedCount?: number;
  todayApprovedUsdt?: number;
};

type DepositAggregationResult = {
  data: unknown[];
  counts: Array<{ total?: number }>;
};

type PayoutAggregationResult = {
  data: unknown[];
  counts: Array<{ total?: number }>;
  summary: PayoutAggregationSummary[];
};

type WalletAggregationStats = {
  total?: number;
  totalAvailableUsdt?: number;
  totalTopUpBalanceUsdt?: number;
  totalLockedUsdt?: number;
  totalLifetimeDepositsUsdt?: number;
  totalLifetimeWithdrawalsUsdt?: number;
  totalLifetimeRewardsUsdt?: number;
};

type WalletAggregationResult = {
  data: unknown[];
  counts: WalletAggregationStats[];
};

type PrincipalAggregationResult = {
  principalUsdt?: number;
};

type RewardPayoutTotalAggregationResult = {
  _id?: unknown;
  amountUsdt?: number;
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

async function sumTransactionAmount(match: Record<string, unknown>): Promise<number> {
  const [result] = await TransactionModel.aggregate<{ total: number }>([
    { $match: match },
    { $group: { _id: null, total: { $sum: "$amountUsdt" } } },
  ]);

  return result?.total ?? 0;
}

type DateRangeFilter = Partial<Record<"$gte" | "$lte", Date>>;

async function countActiveUsersWithActivePlans(
  dateRangeFilter: DateRangeFilter | null,
): Promise<number> {
  const [result] = await UserPlanPurchaseModel.aggregate<{ total: number }>([
    { $match: { status: "active" } },
    { $group: { _id: "$userId" } },
    {
      $lookup: {
        as: "user",
        foreignField: "_id",
        from: "users",
        localField: "_id",
      },
    },
    { $unwind: "$user" },
    {
      $match: {
        "user.role": "user",
        "user.status": "active",
        ...(dateRangeFilter ? { "user.createdAt": dateRangeFilter } : {}),
      },
    },
    { $count: "total" },
  ]);

  return result?.total ?? 0;
}

export class AdminRepository {
  async getOverviewCounts(filter?: {
    fromDate?: string;
    toDate?: string;
  }): Promise<AdminOverviewRepositoryResult> {
    const completedStatuses = ["approved", "completed"];
    const monthBuckets = buildLastMonthBuckets(7);
    const firstBucketStart = monthBuckets[0]?.start ?? new Date();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Parse filter dates
    let dateRangeFilter: DateRangeFilter | null = null;
    if (filter?.fromDate || filter?.toDate) {
      dateRangeFilter = {};
      if (filter.fromDate) {
        const [y, m, d] = filter.fromDate.split("-").map(Number);
        dateRangeFilter.$gte = new Date(y, m - 1, d, 0, 0, 0, 0);
      }
      if (filter.toDate) {
        const [y, m, d] = filter.toDate.split("-").map(Number);
        dateRangeFilter.$lte = new Date(y, m - 1, d, 23, 59, 59, 999);
      }
    }

    const [
      totalUsers,
      activeUsers,
      pendingTransactions,
      pendingDeposits,
      pendingPlanPurchases,
      pendingWithdrawals,
      pendingPayouts,
      activePlans,
      totalDepositsUsdt,
      totalWithdrawalsUsdt,
      earningsPaidUsdt,
      totalPackagesSellUsdt,
      recentAuditLogs,
      recentDeposits,
      usersBeforeGrowthWindow,
      monthlyUsers,
      depositOverview,
      totalRoiGeneratedUsdt,
    ] = await Promise.all([
      UserModel.countDocuments(dateRangeFilter ? { createdAt: dateRangeFilter } : {}),
      countActiveUsersWithActivePlans(dateRangeFilter),
      TransactionModel.countDocuments({
        status: "pending",
        ...(dateRangeFilter ? { createdAt: dateRangeFilter } : {}),
      }),
      TransactionModel.countDocuments({
        type: "deposit",
        status: "pending",
        ...(dateRangeFilter ? { createdAt: dateRangeFilter } : {}),
      }),
      TransactionModel.countDocuments({
        type: "plan_purchase",
        status: "pending",
        ...(dateRangeFilter ? { createdAt: dateRangeFilter } : {}),
      }),
      TransactionModel.countDocuments({
        type: "withdrawal",
        status: "pending",
        ...(dateRangeFilter ? { createdAt: dateRangeFilter } : {}),
      }),
      TransactionModel.countDocuments({
        type: "reward",
        payoutKind: "weekly",
        status: "pending",
        ...(dateRangeFilter ? { createdAt: dateRangeFilter } : {}),
      }),
      UserPlanPurchaseModel.countDocuments({
        status: "active",
        ...(dateRangeFilter ? { purchasedAt: dateRangeFilter } : {}),
      }),
      sumTransactionAmount({
        type: "deposit",
        status: { $in: completedStatuses },
        ...(dateRangeFilter ? { createdAt: dateRangeFilter } : {}),
      }),
      sumTransactionAmount({
        type: "withdrawal",
        status: { $in: completedStatuses },
        ...(dateRangeFilter ? { createdAt: dateRangeFilter } : {}),
      }),
      sumTransactionAmount({
        type: "reward",
        status: { $in: completedStatuses },
        ...(dateRangeFilter ? { createdAt: dateRangeFilter } : {}),
      }),
      sumTransactionAmount({
        type: "plan_purchase",
        status: { $in: completedStatuses },
        ...(dateRangeFilter ? { createdAt: dateRangeFilter } : {}),
      }),
      AuditLogModel.find(dateRangeFilter ? { createdAt: dateRangeFilter } : {})
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      TransactionModel.find({
        type: "deposit",
        ...(dateRangeFilter ? { createdAt: dateRangeFilter } : {}),
      })
        .populate({ path: "userId", select: "username" })
        .sort({ createdAt: -1 })
        .limit(4)
        .lean(),
      UserModel.countDocuments({ createdAt: { $lt: firstBucketStart } }),
      UserModel.aggregate<{ _id: { year: number; month: number }; count: number }>([
        { $match: { createdAt: { $gte: firstBucketStart } } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
      ]),
      TransactionModel.aggregate<AdminDepositOverviewStats>([
        {
          $match: {
            type: "deposit",
            ...(dateRangeFilter ? { createdAt: dateRangeFilter } : {}),
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
      sumTransactionAmount({
        type: "reward",
        payoutKind: "weekly",
        status: { $in: ["pending", "approved", "completed"] },
      }),
    ]);

    const monthlyUserMap = new Map(
      monthlyUsers.map((entry) => [
        `${entry._id.year}-${String(entry._id.month).padStart(2, "0")}`,
        entry.count,
      ]),
    );
    let runningUsers = usersBeforeGrowthWindow;
    const userGrowth = monthBuckets.map((bucket) => {
      runningUsers += monthlyUserMap.get(bucket.key) ?? 0;

      return {
        month: bucket.month,
        users: runningUsers,
      };
    });
    const flowTotal = totalDepositsUsdt + totalWithdrawalsUsdt;
    const depositsPercent = flowTotal > 0 ? Math.round((totalDepositsUsdt / flowTotal) * 100) : 0;
    const platformEarningsUsdt = totalDepositsUsdt - totalWithdrawalsUsdt - earningsPaidUsdt;

    return {
      totalUsers,
      activeUsers,
      pendingTransactions,
      pendingDeposits,
      pendingPlanPurchases,
      pendingWithdrawals,
      pendingPayouts,
      activePlans,
      totalDepositsUsdt,
      totalPackagesSellUsdt,
      totalRoiGeneratedUsdt,
      depositOverview: {
        monthApprovedCount: depositOverview[0]?.monthApprovedCount ?? 0,
        monthApprovedUsdt: depositOverview[0]?.monthApprovedUsdt ?? 0,
        pendingCount: depositOverview[0]?.pendingCount ?? 0,
        pendingUsdt: depositOverview[0]?.pendingUsdt ?? 0,
        todayApprovedCount: depositOverview[0]?.todayApprovedCount ?? 0,
        todayApprovedUsdt: depositOverview[0]?.todayApprovedUsdt ?? 0,
        totalApprovedUsdt: totalDepositsUsdt,
      },
      totalWithdrawalsUsdt,
      earningsPaidUsdt,
      platformEarningsUsdt,
      depositWithdrawalFlow: {
        depositsUsdt: totalDepositsUsdt,
        withdrawalsUsdt: totalWithdrawalsUsdt,
        depositsPercent,
        withdrawalsPercent: flowTotal > 0 ? 100 - depositsPercent : 0,
      },
      userGrowth,
      recentDeposits: recentDeposits.map((transaction) => {
        const user = transaction.userId as unknown as {
          email?: string;
          username?: string | null;
        } | null;

        return {
          id: String(transaction._id),
          amountUsdt: transaction.amountUsdt,
          status: transaction.status,
          createdAt: transaction.createdAt,
          userEmail: null,
          userName: user?.username ?? "Unknown",
        };
      }),
      recentAuditLogs: recentAuditLogs as AdminAuditLogRepositoryRecord[],
    };
  }

  async listUsers(input: AdminListUsersInput): Promise<AdminListUsersRepositoryResult> {
    const search = input.search?.trim();
    const filter: Record<string, any> = {
      isDeleted: { $ne: true },
    };

    if (search) {
      filter.$or = [
        { username: new RegExp(escapeRegex(search), "i") },
        { referralCode: new RegExp(escapeRegex(search), "i") },
      ];
    }

    const [users, total] = await Promise.all([
      UserModel.find(filter)
        .select("-passwordHash")
        .sort({ createdAt: -1 })
        .skip(input.skip)
        .limit(input.limit)
        .lean(),
      UserModel.countDocuments(filter),
    ]);

    return { users: users as UserRepositoryRecord[], total };
  }

  async listDeposits(input: AdminDepositListInput): Promise<AdminListDepositsRepositoryResult> {
    const search = input.search?.trim();
    const match: Record<string, unknown> = { type: "deposit" };
    const pipeline: PipelineStage[] = [];

    if (input.status) {
      match.status = input.status;
    }

    if (input.dateRange) {
      match.createdAt = input.dateRange;
    }

    pipeline.push(
      { $match: match },
      {
        $lookup: {
          as: "user",
          foreignField: "_id",
          from: "users",
          localField: "userId",
        },
      },
      { $unwind: "$user" },
    );

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      pipeline.push({
        $match: {
          $or: [
            { "user.username": regex },
            { "user.referralCode": regex },
            { network: regex },
            { notes: regex },
            { txnHash: regex },
          ],
        },
      });
    }

    pipeline.push(
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          counts: [{ $count: "total" }],
          data: [
            { $skip: input.skip },
            { $limit: input.limit },
            {
              $project: {
                _id: 1,
                amountUsdt: 1,
                createdAt: 1,
                network: 1,
                notes: 1,
                reviewedAt: 1,
                reviewedBy: 1,
                status: 1,
                txnHash: 1,
                userId: {
                  _id: "$user._id",
                  createdAt: "$user.createdAt",
                  emailVerifiedAt: "$user.emailVerifiedAt",
                  referralCode: "$user.referralCode",
                  role: "$user.role",
                  status: "$user.status",
                  username: "$user.username",
                },
              },
            },
          ],
        },
      },
    );

    const [result] = await TransactionModel.aggregate<DepositAggregationResult>(pipeline);

    return {
      deposits: (result?.data ?? []) as AdminTransactionRepositoryRecord[],
      total: result?.counts[0]?.total ?? 0,
    };
  }

  async listPlanPurchases(
    input: AdminPlanPurchaseListInput,
  ): Promise<AdminListPlanPurchasesRepositoryResult> {
    const search = input.search?.trim();
    const match: Record<string, unknown> = { type: "plan_purchase" };
    const pipeline: PipelineStage[] = [];

    if (input.status) {
      match.status = input.status;
    }

    if (input.dateRange) {
      match.createdAt = input.dateRange;
    }

    pipeline.push(
      { $match: match },
      {
        $lookup: {
          as: "user",
          foreignField: "_id",
          from: "users",
          localField: "userId",
        },
      },
      { $unwind: "$user" },
    );

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      pipeline.push({
        $match: {
          $or: [
            { "user.username": regex },
            { "user.referralCode": regex },
            { notes: regex },
            { payoutTier: regex },
          ],
        },
      });
    }

    pipeline.push(
      { $sort: { updatedAt: -1, createdAt: -1 } },
      {
        $facet: {
          counts: [{ $count: "total" }],
          data: [
            { $skip: input.skip },
            { $limit: input.limit },
            {
              $project: {
                _id: 1,
                amountUsdt: 1,
                createdAt: 1,
                network: 1,
                notes: 1,
                payoutPercent: 1,
                payoutPrincipalUsdt: 1,
                payoutTier: 1,
                reviewedAt: 1,
                reviewedBy: 1,
                status: 1,
                updatedAt: 1,
                userId: {
                  _id: "$user._id",
                  createdAt: "$user.createdAt",
                  emailVerifiedAt: "$user.emailVerifiedAt",
                  referralCode: "$user.referralCode",
                  role: "$user.role",
                  status: "$user.status",
                  username: "$user.username",
                },
              },
            },
          ],
        },
      },
    );

    const [result] = await TransactionModel.aggregate<DepositAggregationResult>(pipeline);

    return {
      planPurchases: (result?.data ?? []) as AdminTransactionRepositoryRecord[],
      total: result?.counts[0]?.total ?? 0,
    };
  }

  async listWithdrawals(
    input: AdminWithdrawalListInput,
  ): Promise<AdminListWithdrawalsRepositoryResult> {
    const search = input.search?.trim();
    const match: Record<string, unknown> = { type: "withdrawal" };
    const pipeline: PipelineStage[] = [];

    if (input.status) {
      match.status = input.status;
    }

    if (input.dateRange) {
      match.createdAt = input.dateRange;
    }

    pipeline.push(
      { $match: match },
      {
        $lookup: {
          as: "user",
          foreignField: "_id",
          from: "users",
          localField: "userId",
        },
      },
      { $unwind: "$user" },
    );

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      pipeline.push({
        $match: {
          $or: [
            { "user.username": regex },
            { "user.referralCode": regex },
            { network: regex },
            { notes: regex },
          ],
        },
      });
    }

    pipeline.push(
      { $sort: { updatedAt: -1, createdAt: -1 } },
      {
        $facet: {
          counts: [{ $count: "total" }],
          data: [
            { $skip: input.skip },
            { $limit: input.limit },
            {
              $project: {
                _id: 1,
                amountUsdt: 1,
                createdAt: 1,
                network: 1,
                notes: 1,
                payoutPercent: 1,
                payoutPrincipalUsdt: 1,
                reviewedAt: 1,
                reviewedBy: 1,
                status: 1,
                updatedAt: 1,
                userId: {
                  _id: "$user._id",
                  createdAt: "$user.createdAt",
                  emailVerifiedAt: "$user.emailVerifiedAt",
                  referralCode: "$user.referralCode",
                  role: "$user.role",
                  status: "$user.status",
                  username: "$user.username",
                },
              },
            },
          ],
        },
      },
    );

    const [result] = await TransactionModel.aggregate<DepositAggregationResult>(pipeline);

    return {
      total: result?.counts[0]?.total ?? 0,
      withdrawals: (result?.data ?? []) as AdminTransactionRepositoryRecord[],
    };
  }

  async listPayouts(input: AdminPayoutListInput): Promise<AdminListPayoutsRepositoryResult> {
    const search = input.search?.trim();
    const match: Record<string, unknown> = {
      type: "reward",
    };
    if (input.payoutKind) {
      match.payoutKind = input.payoutKind;
    } else {
      match.payoutKind = { $in: ["weekly", "level", "salary_royalty"] };
    }
    const pipeline: PipelineStage[] = [];

    if (input.status) {
      match.status = input.status;
    }

    if (input.dateRange) {
      match.createdAt = input.dateRange;
    }

    if (input.payoutPeriod) {
      const salaryRoyaltyPeriod = getSalaryRoyaltyPeriod(input.payoutPeriod.start);
      delete match.payoutKind;
      if (input.payoutKind === "weekly") {
        match.payoutKind = "weekly";
        match.payoutPeriodEnd = input.payoutPeriod.end;
        match.payoutPeriodStart = input.payoutPeriod.start;
      } else if (input.payoutKind === "salary_royalty") {
        match.payoutKind = "salary_royalty";
        match.payoutPeriodEnd = salaryRoyaltyPeriod.end;
        match.payoutPeriodStart = salaryRoyaltyPeriod.start;
      } else if (input.payoutKind === "level") {
        match.payoutKind = "level";
      } else {
        match.$or = [
          {
            payoutKind: "weekly",
            payoutPeriodEnd: input.payoutPeriod.end,
            payoutPeriodStart: input.payoutPeriod.start,
          },
          {
            payoutKind: "salary_royalty",
            payoutPeriodEnd: salaryRoyaltyPeriod.end,
            payoutPeriodStart: salaryRoyaltyPeriod.start,
          },
        ];
      }
    }

    pipeline.push(
      { $match: match },
      {
        $lookup: {
          as: "user",
          foreignField: "_id",
          from: "users",
          localField: "userId",
        },
      },
      { $unwind: "$user" },
    );

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      pipeline.push({
        $match: {
          $or: [
            { "user.username": regex },
            { "user.referralCode": regex },
            { payoutTier: regex },
            { notes: regex },
          ],
        },
      });
    }

    pipeline.push(
      { $sort: { createdAt: -1, updatedAt: -1, payoutPeriodStart: -1 } },
      {
        $facet: {
          counts: [{ $count: "total" }],
          data: [
            { $skip: input.skip },
            { $limit: input.limit },
            {
              $project: {
                _id: 1,
                amountUsdt: 1,
                createdAt: 1,
                network: 1,
                notes: 1,
                payoutKind: 1,
                payoutLevel: 1,
                payoutPercent: 1,
                payoutPeriodEnd: 1,
                payoutPeriodStart: 1,
                payoutPrincipalUsdt: 1,
                payoutSourceTransactionId: 1,
                payoutSourceUserId: 1,
                payoutTier: 1,
                reviewedAt: 1,
                reviewedBy: 1,
                status: 1,
                txnHash: 1,
                updatedAt: 1,
                userId: {
                  _id: "$user._id",
                  createdAt: "$user.createdAt",
                  emailVerifiedAt: "$user.emailVerifiedAt",
                  referralCode: "$user.referralCode",
                  role: "$user.role",
                  status: "$user.status",
                  username: "$user.username",
                },
              },
            },
          ],
          summary: [
            {
              $group: {
                _id: null,
                approvedCount: {
                  $sum: {
                    $cond: [{ $in: ["$status", ["approved", "completed"]] }, 1, 0],
                  },
                },
                pendingCount: {
                  $sum: {
                    $cond: [{ $eq: ["$status", "pending"] }, 1, 0],
                  },
                },
                rejectedCount: {
                  $sum: {
                    $cond: [{ $in: ["$status", ["rejected", "failed"]] }, 1, 0],
                  },
                },
                totalApprovedUsdt: {
                  $sum: {
                    $cond: [{ $in: ["$status", ["approved", "completed"]] }, "$amountUsdt", 0],
                  },
                },
                totalPayoutUsdt: { $sum: "$amountUsdt" },
                totalPendingUsdt: {
                  $sum: {
                    $cond: [{ $eq: ["$status", "pending"] }, "$amountUsdt", 0],
                  },
                },
              },
            },
          ],
        },
      },
    );

    const [result] = await TransactionModel.aggregate<PayoutAggregationResult>(pipeline);

    return {
      payouts: (result?.data ?? []) as AdminTransactionRepositoryRecord[],
      summary: result?.summary[0] ?? {},
      total: result?.counts[0]?.total ?? 0,
    };
  }

  async listWallets(input: AdminWalletListInput): Promise<AdminListWalletsRepositoryResult> {
    const search = input.search?.trim();
    const pipeline: PipelineStage[] = [
      {
        $lookup: {
          as: "user",
          foreignField: "_id",
          from: "users",
          localField: "userId",
        },
      },
      { $unwind: "$user" },
      {
        $match: {
          "user.role": "user",
        },
      },
    ];

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      pipeline.push({
        $match: {
          $or: [{ "user.username": regex }, { "user.referralCode": regex }],
        },
      });
    }

    pipeline.push(
      {
        $lookup: {
          from: "userplanpurchases",
          let: { uId: "$userId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ["$userId", "$$uId"] }, { $eq: ["$status", "active"] }],
                },
              },
            },
            {
              $group: {
                _id: null,
                totalActivePlanAmount: { $sum: "$amountUsdt" },
              },
            },
          ],
          as: "activePlans",
        },
      },
      {
        $addFields: {
          activePlanSum: {
            $ifNull: [{ $arrayElemAt: ["$activePlans.totalActivePlanAmount", 0] }, 0],
          },
        },
      },
      {
        $addFields: {
          topUpBalance: {
            $min: [
              "$availableUsdt",
              {
                $max: [0, { $subtract: ["$lifetimeDepositsUsdt", "$activePlanSum"] }],
              },
            ],
          },
        },
      },
      { $sort: { updatedAt: -1, createdAt: -1 } },
      {
        $facet: {
          counts: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                totalAvailableUsdt: { $sum: "$availableUsdt" },
                totalTopUpBalanceUsdt: { $sum: "$topUpBalance" },
                totalLockedUsdt: { $sum: "$lockedUsdt" },
                totalLifetimeDepositsUsdt: { $sum: "$lifetimeDepositsUsdt" },
                totalLifetimeRewardsUsdt: { $sum: "$lifetimeRewardsUsdt" },
                totalLifetimeWithdrawalsUsdt: { $sum: "$lifetimeWithdrawalsUsdt" },
              },
            },
          ],
          data: [
            { $skip: input.skip },
            { $limit: input.limit },
            {
              $project: {
                _id: 1,
                availableUsdt: 1,
                topUpBalance: 1,
                createdAt: 1,
                lifetimeDepositsUsdt: 1,
                lifetimeRewardsUsdt: 1,
                lifetimeWithdrawalsUsdt: 1,
                lockedUsdt: 1,
                updatedAt: 1,
                userId: {
                  _id: "$user._id",
                  createdAt: "$user.createdAt",
                  emailVerifiedAt: "$user.emailVerifiedAt",
                  referralCode: "$user.referralCode",
                  role: "$user.role",
                  status: "$user.status",
                  username: "$user.username",
                },
              },
            },
          ],
        },
      },
    );

    const [walletStatsResult, platformFlowResult] = await Promise.all([
      WalletModel.aggregate<WalletAggregationResult>(pipeline),
      TransactionModel.aggregate<{
        totalDepositsUsdt: number;
        totalWithdrawalsUsdt: number;
        totalRewardsUsdt: number;
        totalPlanPurchasesUsdt: number;
      }>([
        {
          $match: {
            status: { $in: ["approved", "completed"] },
            type: { $in: ["deposit", "withdrawal", "reward", "plan_purchase"] },
          },
        },
        {
          $group: {
            _id: null,
            totalDepositsUsdt: {
              $sum: {
                $cond: [{ $eq: ["$type", "deposit"] }, "$amountUsdt", 0],
              },
            },
            totalWithdrawalsUsdt: {
              $sum: {
                $cond: [{ $eq: ["$type", "withdrawal"] }, "$amountUsdt", 0],
              },
            },
            totalRewardsUsdt: {
              $sum: {
                $cond: [{ $eq: ["$type", "reward"] }, "$amountUsdt", 0],
              },
            },
            totalPlanPurchasesUsdt: {
              $sum: {
                $cond: [{ $eq: ["$type", "plan_purchase"] }, "$amountUsdt", 0],
              },
            },
          },
        },
      ]),
    ]);
    const [result] = walletStatsResult;
    const stats = result?.counts[0] ?? {};
    const flow = platformFlowResult[0] ?? {
      totalDepositsUsdt: 0,
      totalWithdrawalsUsdt: 0,
      totalRewardsUsdt: 0,
      totalPlanPurchasesUsdt: 0,
    };
    const platformReserveUsdt =
      (flow.totalDepositsUsdt ?? 0) -
      (flow.totalWithdrawalsUsdt ?? 0) -
      (flow.totalRewardsUsdt ?? 0);

    return {
      wallets: (result?.data ?? []) as AdminWalletRepositoryRecord[],
      summary: {
        total: stats.total ?? 0,
        platformAvailableUsdt: Math.round(platformReserveUsdt * 100) / 100,
        platformLifetimeDepositsUsdt: flow.totalDepositsUsdt ?? 0,
        platformLifetimeRewardsUsdt: flow.totalRewardsUsdt ?? 0,
        platformLifetimeWithdrawalsUsdt: flow.totalWithdrawalsUsdt ?? 0,
        platformLockedUsdt: 0,
        platformWalletCount: 0,
        totalAvailableUsdt: stats.totalAvailableUsdt ?? 0,
        totalTopUpBalanceUsdt: stats.totalTopUpBalanceUsdt ?? 0,
        totalLockedUsdt: stats.totalLockedUsdt ?? 0,
        totalLifetimeDepositsUsdt: stats.totalLifetimeDepositsUsdt ?? 0,
        totalLifetimeWithdrawalsUsdt: stats.totalLifetimeWithdrawalsUsdt ?? 0,
        totalLifetimeRewardsUsdt: stats.totalLifetimeRewardsUsdt ?? 0,
        totalPlanPurchasesUsdt: flow.totalPlanPurchasesUsdt ?? 0,
      },
    };
  }

  async approvePendingPlanPurchase(input: {
    transactionId: string;
    adminUserId: string;
    notes?: string;
  }): Promise<AdminTransactionRepositoryRecord | null> {
    return TransactionModel.findOneAndUpdate(
      { _id: input.transactionId, type: "plan_purchase", status: "pending" },
      {
        $set: {
          status: "completed",
          reviewedAt: new Date(),
          reviewedBy: input.adminUserId,
          ...(input.notes ? { notes: input.notes } : {}),
        },
      },
      { new: true },
    ).lean() as Promise<AdminTransactionRepositoryRecord | null>;
  }

  async rejectPendingPlanPurchase(input: {
    transactionId: string;
    adminUserId: string;
    notes?: string;
  }): Promise<AdminTransactionRepositoryRecord | null> {
    return TransactionModel.findOneAndUpdate(
      { _id: input.transactionId, type: "plan_purchase", status: "pending" },
      {
        $set: {
          status: "rejected",
          reviewedAt: new Date(),
          reviewedBy: input.adminUserId,
          ...(input.notes ? { notes: input.notes } : {}),
        },
      },
      { new: true },
    ).lean() as Promise<AdminTransactionRepositoryRecord | null>;
  }

  async findPlanPurchaseById(
    transactionId: string,
  ): Promise<AdminTransactionRepositoryRecord | null> {
    return TransactionModel.findOne({ _id: transactionId, type: "plan_purchase" })
      .populate({
        path: "userId",
        select: "username role status referralCode emailVerifiedAt createdAt",
      })
      .lean() as Promise<AdminTransactionRepositoryRecord | null>;
  }

  findPendingWithdrawalById(
    transactionId: string,
  ): Promise<AdminTransactionRepositoryRecord | null> {
    return TransactionModel.findOne({
      _id: transactionId,
      status: "pending",
      type: "withdrawal",
    }).lean() as Promise<AdminTransactionRepositoryRecord | null>;
  }

  approvePendingWithdrawal(input: {
    transactionId: string;
    adminUserId: string;
    notes?: string;
  }): Promise<AdminTransactionRepositoryRecord | null> {
    return TransactionModel.findOneAndUpdate(
      { _id: input.transactionId, status: "pending", type: "withdrawal" },
      {
        $set: {
          status: "completed",
          reviewedAt: new Date(),
          reviewedBy: input.adminUserId,
          ...(input.notes ? { notes: input.notes } : {}),
        },
      },
      { new: true },
    ).lean() as Promise<AdminTransactionRepositoryRecord | null>;
  }

  rejectPendingWithdrawal(input: {
    transactionId: string;
    adminUserId: string;
    notes?: string;
  }): Promise<AdminTransactionRepositoryRecord | null> {
    return TransactionModel.findOneAndUpdate(
      { _id: input.transactionId, status: "pending", type: "withdrawal" },
      {
        $set: {
          status: "rejected",
          reviewedAt: new Date(),
          reviewedBy: input.adminUserId,
          ...(input.notes ? { notes: input.notes } : {}),
        },
      },
      { new: true },
    ).lean() as Promise<AdminTransactionRepositoryRecord | null>;
  }

  async findWithdrawalById(
    transactionId: string,
  ): Promise<AdminTransactionRepositoryRecord | null> {
    return TransactionModel.findOne({ _id: transactionId, type: "withdrawal" })
      .populate({
        path: "userId",
        select: "username role status referralCode emailVerifiedAt createdAt",
      })
      .lean() as Promise<AdminTransactionRepositoryRecord | null>;
  }

  async findDepositById(transactionId: string): Promise<AdminTransactionRepositoryRecord | null> {
    return TransactionModel.findOne({ _id: transactionId, type: "deposit" })
      .populate({
        path: "userId",
        select: "username role status referralCode emailVerifiedAt createdAt",
      })
      .lean() as Promise<AdminTransactionRepositoryRecord | null>;
  }

  async sumRewardPayoutsByUserIds(input: {
    userIds: string[];
    statuses: string[];
    payoutKinds: string[];
  }): Promise<Map<string, number>> {
    if (!input.userIds.length) {
      return new Map();
    }

    const totals = await TransactionModel.aggregate<RewardPayoutTotalAggregationResult>([
      {
        $match: {
          payoutKind: { $in: input.payoutKinds },
          status: { $in: input.statuses },
          type: "reward",
          userId: { $in: input.userIds.map((userId) => new Types.ObjectId(userId)) },
        },
      },
      {
        $group: {
          _id: "$userId",
          amountUsdt: { $sum: "$amountUsdt" },
        },
      },
    ]);

    return new Map(totals.map((total) => [String(total._id), total.amountUsdt ?? 0]));
  }

  async getRewardPayoutCap(input: {
    userId: string;
    eligibleUntil?: Date;
    earningMultiplier: number;
    statuses: string[];
    payoutKinds: string[];
    excludeTransactionId?: string;
  }) {
    const userObjectId = new Types.ObjectId(input.userId);
    const principalMatch: Record<string, unknown> = {
      amountUsdt: { $gt: 0 },
      status: "active",
      userId: userObjectId,
    };
    const rewardMatch: Record<string, unknown> = {
      payoutKind: { $in: input.payoutKinds },
      status: { $in: input.statuses },
      type: "reward",
      userId: userObjectId,
    };

    if (input.eligibleUntil) {
      principalMatch.purchasedAt = { $lte: input.eligibleUntil };
    }

    if (input.excludeTransactionId) {
      rewardMatch._id = { $ne: new Types.ObjectId(input.excludeTransactionId) };
    }

    const [principalResult, rewardResult] = await Promise.all([
      UserPlanPurchaseModel.aggregate<PrincipalAggregationResult>([
        { $match: principalMatch },
        {
          $group: {
            _id: null,
            principalUsdt: { $sum: "$amountUsdt" },
          },
        },
      ]),
      TransactionModel.aggregate<PrincipalAggregationResult>([
        { $match: rewardMatch },
        {
          $group: {
            _id: null,
            principalUsdt: { $sum: "$amountUsdt" },
          },
        },
      ]),
    ]);
    const principalUsdt = principalResult[0]?.principalUsdt ?? 0;
    const earnedUsdt = rewardResult[0]?.principalUsdt ?? 0;
    const capUsdt = principalUsdt * input.earningMultiplier;

    return {
      capUsdt,
      earnedUsdt,
      principalUsdt,
      remainingUsdt: Math.max(0, capUsdt - earnedUsdt),
    };
  }

  async listPayoutEligibleWallets(input: {
    minimumPrincipalUsdt: number;
    eligibleUntil: Date;
  }): Promise<PayoutEligibleWalletRecord[]> {
    return UserPlanPurchaseModel.aggregate<PayoutEligibleWalletRecord>([
      {
        $match: {
          amountUsdt: { $gt: 0 },
          purchasedAt: { $lte: input.eligibleUntil },
          status: "active",
        },
      },
      {
        $group: {
          _id: "$userId",
          latestEligibleDepositAt: { $max: "$purchasedAt" },
          lifetimeDepositsUsdt: { $sum: "$amountUsdt" },
        },
      },
      {
        $match: {
          lifetimeDepositsUsdt: { $gte: input.minimumPrincipalUsdt },
        },
      },
      {
        $lookup: {
          as: "user",
          foreignField: "_id",
          from: "users",
          localField: "_id",
        },
      },
      { $unwind: "$user" },
      {
        $match: {
          "user.role": "user",
          "user.status": "active",
        },
      },
      {
        $project: {
          _id: 1,
          latestEligibleDepositAt: 1,
          lifetimeDepositsUsdt: 1,
          user: {
            _id: "$user._id",
            role: "$user.role",
            status: "$user.status",
            username: "$user.username",
          },
          userId: "$_id",
        },
      },
    ]);
  }

  async findWeeklyPayoutUserIds(input: {
    payoutPeriodStart: Date;
    payoutPeriodEnd: Date;
  }): Promise<Set<string>> {
    const existingPayouts = await TransactionModel.find({
      payoutKind: "weekly",
      payoutPeriodEnd: input.payoutPeriodEnd,
      payoutPeriodStart: input.payoutPeriodStart,
      type: "reward",
    })
      .select("userId")
      .lean();

    return new Set(existingPayouts.map((payout) => String(payout.userId)));
  }

  async listWeeklyPayoutsForPeriod(input: {
    payoutPeriodStart: Date;
    payoutPeriodEnd: Date;
  }): Promise<AdminTransactionRepositoryRecord[]> {
    return TransactionModel.find({
      payoutKind: "weekly",
      payoutPeriodEnd: input.payoutPeriodEnd,
      payoutPeriodStart: input.payoutPeriodStart,
      type: "reward",
    })
      .select(
        "_id userId status amountUsdt notes payoutPercent payoutPrincipalUsdt payoutTier payoutPeriodStart payoutPeriodEnd createdAt updatedAt",
      )
      .lean() as Promise<AdminTransactionRepositoryRecord[]>;
  }

  createPayoutTransactions(
    payouts: CreatePayoutTransactionInput[],
  ): Promise<AdminTransactionRepositoryRecord[]> {
    return TransactionModel.insertMany(
      payouts.map((payout) => ({
        amountUsdt: payout.amountUsdt,
        network: "SYSTEM",
        notes: payout.notes,
        payoutKind: "weekly",
        payoutPercent: payout.payoutPercent,
        payoutPeriodEnd: payout.payoutPeriodEnd,
        payoutPeriodStart: payout.payoutPeriodStart,
        payoutPrincipalUsdt: payout.payoutPrincipalUsdt,
        payoutTier: payout.payoutTier,
        payoutSourceTransactionId: payout.payoutSourceTransactionId,
        status: "pending",
        type: "reward",
        userId: payout.userId,
      })),
      { ordered: false },
    ) as Promise<AdminTransactionRepositoryRecord[]>;
  }

  updatePendingWeeklyPayout(
    input: UpdateWeeklyPayoutInput,
  ): Promise<AdminTransactionRepositoryRecord | null> {
    return TransactionModel.findOneAndUpdate(
      { _id: input.transactionId, payoutKind: "weekly", status: "pending", type: "reward" },
      {
        $set: {
          amountUsdt: input.amountUsdt,
          notes: input.notes,
          payoutPercent: input.payoutPercent,
          payoutPeriodEnd: input.payoutPeriodEnd,
          payoutPeriodStart: input.payoutPeriodStart,
          payoutPrincipalUsdt: input.payoutPrincipalUsdt,
          payoutTier: input.payoutTier,
          payoutSourceTransactionId: input.payoutSourceTransactionId,
        },
      },
      { new: true },
    ).lean() as Promise<AdminTransactionRepositoryRecord | null>;
  }

  approvePendingPayout(input: {
    transactionId: string;
    adminUserId: string;
    notes?: string;
  }): Promise<AdminTransactionRepositoryRecord | null> {
    return TransactionModel.findOneAndUpdate(
      { _id: input.transactionId, status: "pending", type: "reward" },
      {
        $set: {
          status: "approved",
          reviewedAt: new Date(),
          reviewedBy: input.adminUserId,
          ...(input.notes ? { notes: input.notes } : {}),
        },
      },
      { new: true },
    ).lean() as Promise<AdminTransactionRepositoryRecord | null>;
  }

  rejectPendingPayout(input: {
    transactionId: string;
    adminUserId: string;
    notes?: string;
  }): Promise<AdminTransactionRepositoryRecord | null> {
    return TransactionModel.findOneAndUpdate(
      { _id: input.transactionId, status: "pending", type: "reward" },
      {
        $set: {
          status: "rejected",
          reviewedAt: new Date(),
          reviewedBy: input.adminUserId,
          ...(input.notes ? { notes: input.notes } : {}),
        },
      },
      { new: true },
    ).lean() as Promise<AdminTransactionRepositoryRecord | null>;
  }

  findPendingPayoutById(transactionId: string): Promise<AdminTransactionRepositoryRecord | null> {
    return TransactionModel.findOne({
      _id: transactionId,
      status: "pending",
      type: "reward",
    }).lean() as Promise<AdminTransactionRepositoryRecord | null>;
  }

  findPayoutById(transactionId: string): Promise<AdminTransactionRepositoryRecord | null> {
    return TransactionModel.findOne({ _id: transactionId, type: "reward" })
      .populate({
        path: "userId",
        select: "username role status referralCode emailVerifiedAt createdAt",
      })
      .lean() as Promise<AdminTransactionRepositoryRecord | null>;
  }

  recordAuditLog(input: {
    actorUserId: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
  }): Promise<AdminAuditLogRepositoryRecord> {
    return AuditLogModel.create(input) as Promise<AdminAuditLogRepositoryRecord>;
  }

  async listReferralNetwork(
    input: AdminReferralListInput,
  ): Promise<AdminReferralNetworkRepositoryResult> {
    const search = input.search?.trim();
    const referralMatch: Record<string, unknown> = {};
    const levelSummaryReferralMatch: Record<string, unknown> = {};
    const userConditions: Record<string, unknown>[] = [];

    if (input.parentUserId) {
      const parentUserId = new Types.ObjectId(input.parentUserId);
      referralMatch.parentUserId = parentUserId;
      levelSummaryReferralMatch.parentUserId = parentUserId;
    } else if (input.rootOnly) {
      referralMatch.parentUserId = null;
      levelSummaryReferralMatch.parentUserId = null;
    }

    if (typeof input.level === "number") {
      referralMatch.level = input.level;
    }

    if (input.status) {
      userConditions.push({ "user.status": input.status });
    }

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      userConditions.push({
        $or: [
          { "user.username": regex },
          { "user.referralCode": regex },
          { "parentUser.username": regex },
          { "parentUser.referralCode": regex },
        ],
      });
    }

    const pipeline: PipelineStage[] = [];

    if (Object.keys(referralMatch).length) {
      pipeline.push({ $match: referralMatch });
    }

    pipeline.push(
      {
        $lookup: {
          as: "user",
          foreignField: "_id",
          from: "users",
          localField: "userId",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          as: "parentUser",
          foreignField: "_id",
          from: "users",
          localField: "parentUserId",
        },
      },
      { $unwind: { path: "$parentUser", preserveNullAndEmptyArrays: true } },
    );

    if (userConditions.length) {
      pipeline.push({
        $match: userConditions.length === 1 ? userConditions[0] : { $and: userConditions },
      });
    }

    pipeline.push(
      { $sort: { level: 1, createdAt: -1 } },
      {
        $facet: {
          counts: [
            {
              $group: {
                _id: null,
                activeUsers: {
                  $sum: {
                    $cond: [{ $eq: ["$user.status", "active"] }, 1, 0],
                  },
                },
                linkedUsers: {
                  $sum: {
                    $cond: [{ $ifNull: ["$parentUserId", false] }, 1, 0],
                  },
                },
                maxLevel: { $max: "$level" },
                rootUsers: {
                  $sum: {
                    $cond: [{ $ifNull: ["$parentUserId", false] }, 0, 1],
                  },
                },
                totalReferralRecords: { $sum: 1 },
              },
            },
          ],
          data: [
            { $skip: input.skip },
            { $limit: input.limit },
            {
              $project: {
                _id: 1,
                activeTeamCount: 1,
                createdAt: 1,
                directCount: 1,
                level: 1,
                path: 1,
                parentUserId: {
                  $cond: [
                    { $ifNull: ["$parentUser._id", false] },
                    {
                      _id: "$parentUser._id",
                      createdAt: "$parentUser.createdAt",
                      emailVerifiedAt: "$parentUser.emailVerifiedAt",
                      referralCode: "$parentUser.referralCode",
                      role: "$parentUser.role",
                      status: "$parentUser.status",
                      username: "$parentUser.username",
                    },
                    null,
                  ],
                },
                userId: {
                  _id: "$user._id",
                  createdAt: "$user.createdAt",
                  emailVerifiedAt: "$user.emailVerifiedAt",
                  invitedBy: "$user.invitedBy",
                  referralCode: "$user.referralCode",
                  role: "$user.role",
                  status: "$user.status",
                  username: "$user.username",
                },
              },
            },
          ],
          levelSummaries: [
            {
              $group: {
                _id: "$level",
                count: { $sum: 1 },
                samples: {
                  $push: {
                    email: null,
                    id: "$user._id",
                    status: "$user.status",
                    username: "$user.username",
                  },
                },
              },
            },
            { $sort: { _id: 1 } },
            {
              $project: {
                _id: 0,
                count: 1,
                level: "$_id",
                samples: { $slice: ["$samples", 8] },
              },
            },
          ],
        },
      },
    );

    const levelSummaryPipeline: PipelineStage[] = [];

    if (Object.keys(levelSummaryReferralMatch).length) {
      levelSummaryPipeline.push({ $match: levelSummaryReferralMatch });
    }

    levelSummaryPipeline.push(
      {
        $lookup: {
          as: "user",
          foreignField: "_id",
          from: "users",
          localField: "userId",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          as: "parentUser",
          foreignField: "_id",
          from: "users",
          localField: "parentUserId",
        },
      },
      { $unwind: { path: "$parentUser", preserveNullAndEmptyArrays: true } },
    );

    if (userConditions.length) {
      levelSummaryPipeline.push({
        $match: userConditions.length === 1 ? userConditions[0] : { $and: userConditions },
      });
    }

    levelSummaryPipeline.push(
      {
        $group: {
          _id: "$level",
          count: { $sum: 1 },
          samples: {
            $push: {
              email: null,
              id: "$user._id",
              status: "$user.status",
              username: "$user.username",
            },
          },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          count: 1,
          level: "$_id",
          samples: { $slice: ["$samples", 8] },
        },
      },
    );

    const [networkResult, totalUsers, allLevelSummaries] = await Promise.all([
      ReferralModel.aggregate<ReferralAggregationResult>(pipeline),
      UserModel.countDocuments(),
      ReferralModel.aggregate<ReferralLevelSummary>(levelSummaryPipeline),
    ]);
    const result = networkResult[0] ?? { counts: [], data: [], levelSummaries: [] };
    const stats = result.counts[0] ?? {};

    return {
      activeUsers: stats.activeUsers ?? 0,
      linkedUsers: stats.linkedUsers ?? 0,
      maxLevel: stats.maxLevel ?? 0,
      referrals: result.data as AdminReferralRepositoryRecord[],
      rootUsers: stats.rootUsers ?? 0,
      total: stats.totalReferralRecords ?? 0,
      totalUsers,
      levelSummaries: allLevelSummaries,
    };
  }
}

export const adminRepository = new AdminRepository();
