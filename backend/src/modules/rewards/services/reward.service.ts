import { Types } from "mongoose";
import { planRepository } from "../../plans/repositories/plan.repository";
import { UserPlanPurchaseModel } from "../../plans/models/user-plan-purchase.model";
import { ReferralModel } from "../../referrals/models/referral.model";
import { TransactionModel } from "../../transactions/models/transaction.model";
import { UserModel } from "../../users/models/user.model";
import { getSalaryRoyaltyPeriod } from "../utils/salaryRoyalty";

type RuleSetRecord = Awaited<ReturnType<typeof planRepository.ensureDefaultRuleSet>>;
type InvestmentTier = RuleSetRecord["investmentTiers"][number];

type DepositRewardInput = {
  transactionId: string;
  userId: string;
  amountUsdt: number;
};

type SalaryRoyaltyRewardInput = {
  periodEnd?: Date;
  periodStart?: Date;
  userIds?: string[];
  royaltyCutoff?: Date;
};

type WalletWithUser = {
  userId: unknown;
  lifetimeDepositsUsdt?: number;
  user?: {
    _id?: unknown;
    role?: string;
    status?: string;
  };
};

type ReferralRecord = {
  userId?: unknown;
  parentUserId?: unknown;
  path?: unknown[];
};

type ExistingSalaryRewardRecord = {
  userId?: unknown;
  payoutTier?: string | null;
  payoutPeriodEnd?: Date | string | null;
  payoutPeriodStart?: Date | string | null;
};

type RewardCapTotalRecord = {
  _id?: unknown;
  amountUsdt?: number;
  principalUsdt?: number;
};

const TOTAL_REWARD_EARNING_MULTIPLIER = 3;
const TOTAL_REWARD_PAYOUT_KINDS = ["weekly", "level", "salary_royalty"];
const TOTAL_REWARD_CAP_STATUSES = ["pending", "approved", "completed"];
const ROYALTY_RANK_REQUIREMENTS = [
  {
    directRequired: 10,
    rank: 1,
    requiredQualifiedLegs: 0,
    requiredSubtreeRank: 0,
    targetBusinessUsdt: 50000,
  },
  {
    directRequired: 0,
    rank: 2,
    requiredQualifiedLegs: 2,
    requiredSubtreeRank: 1,
    targetBusinessUsdt: 150000,
  },
  {
    directRequired: 0,
    rank: 3,
    requiredQualifiedLegs: 2,
    requiredSubtreeRank: 2,
    targetBusinessUsdt: 500000,
  },
  {
    directRequired: 0,
    rank: 4,
    requiredQualifiedLegs: 2,
    requiredSubtreeRank: 3,
    targetBusinessUsdt: 2000000,
  },
  {
    directRequired: 0,
    rank: 5,
    requiredQualifiedLegs: 2,
    requiredSubtreeRank: 4,
    targetBusinessUsdt: 5000000,
  },
] as const;

function roundUsdt(value: number) {
  return Math.round(value * 100) / 100;
}

function toObjectId(value: unknown) {
  return new Types.ObjectId(String(value));
}

function getActiveInvestmentTiers(ruleSet: RuleSetRecord) {
  return [...ruleSet.investmentTiers]
    .filter((tier) => tier.isActive !== false)
    .sort((tierA, tierB) => tierA.minUsdt - tierB.minUsdt);
}

function getTierForAmount(amountUsdt: number, tiers: InvestmentTier[]) {
  const highestTier = tiers[tiers.length - 1];

  return (
    tiers.find((tier) => amountUsdt >= tier.minUsdt && amountUsdt <= tier.maxUsdt) ??
    (highestTier && amountUsdt > highestTier.maxUsdt ? highestTier : null)
  );
}

function getTierRank(tierName: string | null | undefined, tiers: InvestmentTier[]) {
  if (!tierName) {
    return -1;
  }

  return tiers.findIndex((tier) => tier.tier === tierName);
}

function getRequiredDirectCount(
  directUserIds: string[],
  userTierMap: Map<string, string>,
  requiredDirectTier: string | null | undefined,
  tiers: InvestmentTier[],
) {
  if (!requiredDirectTier) {
    return directUserIds.filter((userId) => userTierMap.has(userId)).length;
  }

  const requiredRank = getTierRank(requiredDirectTier, tiers);

  return directUserIds.filter((userId) => {
    const directTier = userTierMap.get(userId);
    return getTierRank(directTier, tiers) === requiredRank;
  }).length;
}

function getSingleLegCappedBusiness(legVolumes: number[], targetBusinessUsdt: number) {
  const singleLegCapUsdt = targetBusinessUsdt / 2;

  return legVolumes.reduce((sum, volume) => sum + Math.min(volume, singleLegCapUsdt), 0);
}

function getPeriodKey(
  periodStart: Date | string | null | undefined,
  periodEnd: Date | string | null | undefined,
) {
  if (!periodStart || !periodEnd) {
    return "legacy";
  }

  return `${new Date(periodStart).toISOString()}:${new Date(periodEnd).toISOString()}`;
}

async function getRemainingRewardCapacityByUserId(userIds: string[]) {
  const uniqueUserIds = [...new Set(userIds)];

  if (!uniqueUserIds.length) {
    return new Map<string, number>();
  }

  const userObjectIds = uniqueUserIds.map(toObjectId);
  const [principalTotals, rewardTotals] = await Promise.all([
    UserPlanPurchaseModel.aggregate<RewardCapTotalRecord>([
      {
        $match: {
          amountUsdt: { $gt: 0 },
          status: "active",
          userId: { $in: userObjectIds },
        },
      },
      {
        $group: {
          _id: "$userId",
          principalUsdt: { $sum: "$amountUsdt" },
        },
      },
    ]),
    TransactionModel.aggregate<RewardCapTotalRecord>([
      {
        $match: {
          payoutKind: { $in: TOTAL_REWARD_PAYOUT_KINDS },
          status: { $in: TOTAL_REWARD_CAP_STATUSES },
          type: "reward",
          userId: { $in: userObjectIds },
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
  const principalByUserId = new Map(
    principalTotals.map((total) => [String(total._id), total.principalUsdt ?? 0]),
  );
  const rewardsByUserId = new Map(
    rewardTotals.map((total) => [String(total._id), total.amountUsdt ?? 0]),
  );

  return new Map<string, number>(
    uniqueUserIds.map((userId) => {
      const capUsdt = (principalByUserId.get(userId) ?? 0) * TOTAL_REWARD_EARNING_MULTIPLIER;
      const earnedOrQueuedUsdt = rewardsByUserId.get(userId) ?? 0;

      return [userId, roundUsdt(Math.max(0, capUsdt - earnedOrQueuedUsdt))] as const;
    }),
  );
}

async function insertRewardRows(rows: Array<Record<string, unknown>>) {
  if (!rows.length) {
    return [];
  }

  try {
    return await TransactionModel.insertMany(rows, { ordered: false });
  } catch (caughtError) {
    if (
      caughtError &&
      typeof caughtError === "object" &&
      "insertedDocs" in caughtError &&
      Array.isArray(caughtError.insertedDocs)
    ) {
      return caughtError.insertedDocs;
    }

    throw caughtError;
  }
}

export async function calculateUserRoyaltyRanks(royaltyCutoff?: Date) {
  const referrals = await ReferralModel.find().lean();
  const activePurchasesQuery: Record<string, any> = { status: "active" };
  if (royaltyCutoff) {
    activePurchasesQuery.purchasedAt = { $lt: royaltyCutoff };
  }
  const activePurchases = await UserPlanPurchaseModel.find(activePurchasesQuery).lean();

  const purchaseMap = new Map<string, number>();
  for (const p of activePurchases) {
    const uId = String(p.userId);
    purchaseMap.set(uId, (purchaseMap.get(uId) ?? 0) + (p.amountUsdt ?? 0));
  }

  const childrenMap = new Map<string, any[]>();
  for (const ref of referrals) {
    if (ref.parentUserId) {
      const pId = String(ref.parentUserId);
      if (!childrenMap.has(pId)) {
        childrenMap.set(pId, []);
      }
      childrenMap.get(pId)!.push(ref);
    }
  }

  const teamVolumeWithOwnMap = new Map<string, number>();
  const sortedReferrals = [...referrals].sort((a, b) => (b.level ?? 0) - (a.level ?? 0));

  for (const ref of sortedReferrals) {
    const userIdStr = String(ref.userId);
    const ownVolume = purchaseMap.get(userIdStr) ?? 0;
    const children = childrenMap.get(userIdStr) ?? [];
    let totalSubtreeVolume = ownVolume;
    for (const child of children) {
      totalSubtreeVolume += teamVolumeWithOwnMap.get(String(child.userId)) ?? 0;
    }
    teamVolumeWithOwnMap.set(userIdStr, totalSubtreeVolume);
  }

  const userRoyaltyRankMap = new Map<string, number>();
  const maxRoyaltyInSubtreeMap = new Map<string, number>();

  for (const ref of sortedReferrals) {
    const userIdStr = String(ref.userId);
    const children = childrenMap.get(userIdStr) ?? [];
    const legVolumes = children.map((child) => teamVolumeWithOwnMap.get(String(child.userId)) ?? 0);
    const directCount = children.filter(
      (child) => (purchaseMap.get(String(child.userId)) ?? 0) > 0,
    ).length;

    let qualifiedRank = 0;

    for (const requirement of ROYALTY_RANK_REQUIREMENTS) {
      const cappedTeamBusiness = getSingleLegCappedBusiness(
        legVolumes,
        requirement.targetBusinessUsdt,
      );
      const qualifiedLegs =
        requirement.requiredSubtreeRank > 0
          ? children.filter(
              (child) =>
                (maxRoyaltyInSubtreeMap.get(String(child.userId)) ?? 0) >=
                requirement.requiredSubtreeRank,
            ).length
          : 0;

      if (
        directCount >= requirement.directRequired &&
        qualifiedLegs >= requirement.requiredQualifiedLegs &&
        cappedTeamBusiness >= requirement.targetBusinessUsdt
      ) {
        qualifiedRank = requirement.rank;
      }
    }

    userRoyaltyRankMap.set(userIdStr, qualifiedRank);

    let maxSubtreeRank = qualifiedRank;
    for (const child of children) {
      maxSubtreeRank = Math.max(
        maxSubtreeRank,
        maxRoyaltyInSubtreeMap.get(String(child.userId)) ?? 0,
      );
    }
    maxRoyaltyInSubtreeMap.set(userIdStr, maxSubtreeRank);
  }

  return {
    userRoyaltyRankMap,
    childrenMap,
    teamVolumeWithOwnMap,
  };
}

export class RewardService {
  async createLevelIncomeRewardsForPlanPurchase(input: DepositRewardInput) {
    const [ruleSet, referral, existingRewards] = await Promise.all([
      planRepository.ensureDefaultRuleSet(),
      ReferralModel.findOne({ userId: input.userId }).lean<ReferralRecord | null>(),
      TransactionModel.find({
        payoutKind: "level",
        payoutSourceTransactionId: input.transactionId,
        type: "reward",
      })
        .select("userId")
        .lean(),
    ]);
    const levelRules = [...ruleSet.levelIncomeRules]
      .filter((rule) => rule.isActive !== false)
      .sort((ruleA, ruleB) => ruleA.level - ruleB.level);
    const maxLevel = Math.max(0, ...levelRules.map((rule) => rule.level));
    const path = (referral?.path ?? []).map((entry) => String(entry));
    const existingUserIds = new Set(existingRewards.map((reward) => String(reward.userId)));
    const sponsorLevels = path
      .slice()
      .reverse()
      .slice(0, maxLevel)
      .map((sponsorUserId, index) => ({
        level: index + 1,
        sponsorUserId,
      }))
      .filter((entry) => !existingUserIds.has(entry.sponsorUserId));

    if (!sponsorLevels.length) {
      return [];
    }

    const activeSponsorIds = new Set(
      (
        await UserModel.find({
          _id: { $in: sponsorLevels.map((entry) => toObjectId(entry.sponsorUserId)) },
          role: "user",
          status: "active",
        })
          .select("_id")
          .lean()
      ).map((user) => String(user._id)),
    );
    const rewardCapacityByUserId = await getRemainingRewardCapacityByUserId([...activeSponsorIds]);

    const rewardRows = sponsorLevels
      .map((entry) => {
        const rule = levelRules.find((candidate) => candidate.level === entry.level);

        if (!rule || !activeSponsorIds.has(entry.sponsorUserId)) {
          return null;
        }

        const uncappedAmountUsdt = roundUsdt((input.amountUsdt * rule.percent) / 100);
        const remainingCapacityUsdt = rewardCapacityByUserId.get(entry.sponsorUserId) ?? 0;
        const amountUsdt = roundUsdt(Math.min(uncappedAmountUsdt, remainingCapacityUsdt));

        if (amountUsdt <= 0) {
          return null;
        }

        rewardCapacityByUserId.set(
          entry.sponsorUserId,
          roundUsdt(remainingCapacityUsdt - amountUsdt),
        );

        const capNote =
          amountUsdt < uncappedAmountUsdt
            ? ` Capped by ${TOTAL_REWARD_EARNING_MULTIPLIER}x total earning limit.`
            : "";

        return {
          amountUsdt,
          network: "SYSTEM",
          notes: `Level L${entry.level} income from plan purchase (${rule.percent}%).${capNote}`,
          payoutKind: "level",
          payoutLevel: entry.level,
          payoutPercent: rule.percent,
          payoutPrincipalUsdt: input.amountUsdt,
          payoutSourceTransactionId: input.transactionId,
          payoutSourceUserId: input.userId,
          payoutTier: `L${entry.level}`,
          status: "pending",
          type: "reward",
          userId: entry.sponsorUserId,
        };
      })
      .filter(Boolean) as Array<Record<string, unknown>>;

    return insertRewardRows(rewardRows);
  }

  async generateSalaryRoyaltyRewards(input: SalaryRoyaltyRewardInput = {}) {
    const royaltyPeriod = input.periodStart
      ? {
          end: input.periodEnd ?? getSalaryRoyaltyPeriod(input.periodStart).end,
          start: input.periodStart,
        }
      : getSalaryRoyaltyPeriod();
    const ruleSet = await planRepository.ensureDefaultRuleSet();
    const tiers = getActiveInvestmentTiers(ruleSet);
    const minimumTierAmount = tiers[0]?.minUsdt;

    if (!minimumTierAmount) {
      return [];
    }

    const daysInPeriod =
      Math.round(
        (Date.UTC(
          royaltyPeriod.end.getUTCFullYear(),
          royaltyPeriod.end.getUTCMonth(),
          royaltyPeriod.end.getUTCDate(),
        ) -
          Date.UTC(
            royaltyPeriod.start.getUTCFullYear(),
            royaltyPeriod.start.getUTCMonth(),
            royaltyPeriod.start.getUTCDate(),
          )) /
          (1000 * 60 * 60 * 24),
      ) + 1;

    const walletMatch: Record<string, any> = {
      status: "active",
      amountUsdt: { $gt: 0 },
    };
    if (input.royaltyCutoff) {
      walletMatch.purchasedAt = { $lt: input.royaltyCutoff };
    }

    const wallets = await UserPlanPurchaseModel.aggregate<WalletWithUser>([
      {
        $match: walletMatch,
      },
      {
        $group: {
          _id: "$userId",
          lifetimeDepositsUsdt: { $sum: "$amountUsdt" },
          userId: { $first: "$userId" },
        },
      },
      {
        $match: {
          lifetimeDepositsUsdt: { $gte: minimumTierAmount },
        },
      },
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
          "user.status": "active",
        },
      },
      {
        $project: {
          lifetimeDepositsUsdt: 1,
          userId: 1,
          user: {
            _id: "$user._id",
            role: "$user.role",
            status: "$user.status",
          },
        },
      },
    ]);
    const candidateUserIds = new Set<string>();
    const targetUserIds = input.userIds?.length ? new Set(input.userIds) : null;

    for (const wallet of wallets) {
      const userId = String(wallet.userId);
      if (!targetUserIds || targetUserIds.has(userId)) {
        candidateUserIds.add(userId);
      }
    }

    if (!candidateUserIds.size && !input.userIds?.length) {
      return [];
    }

    const { userRoyaltyRankMap, childrenMap, teamVolumeWithOwnMap } =
      await calculateUserRoyaltyRanks(input.royaltyCutoff);

    const activeSalaryRules = [...ruleSet.salaryRoyaltyRules].filter(
      (rule) => rule.isActive !== false,
    );

    const existingSalaryRewards = await TransactionModel.find({
      payoutKind: "salary_royalty",
      payoutPeriodStart: { $gte: royaltyPeriod.start, $lte: royaltyPeriod.end },
      type: "reward",
    })
      .select("userId")
      .lean<ExistingSalaryRewardRecord[]>();

    const existingUserIds = new Set(
      existingSalaryRewards.map((reward) => String(reward.userId)),
    );

    const qualifiedCandidates = [...candidateUserIds].filter((userId) => {
      const rank = userRoyaltyRankMap.get(userId) ?? 0;
      return rank >= 1;
    });

    if (!qualifiedCandidates.length) {
      return [];
    }

    const rewardCapacityByUserId = await getRemainingRewardCapacityByUserId(qualifiedCandidates);
    const rewardRows: Array<Record<string, unknown>> = [];

    for (const userId of qualifiedCandidates) {
      const rank = userRoyaltyRankMap.get(userId) ?? 0;
      const rule = activeSalaryRules.find((r) => r.royaltyPool === `M${rank}`);

      if (!rule) {
        continue;
      }

      const payoutTier = rule.royaltyPool;
      const tierName = `M${rank}`;
      if (existingUserIds.has(userId)) {
        continue;
      }

      const remainingCapacityUsdt = rewardCapacityByUserId.get(userId) ?? 0;
      const uncappedAmountUsdt = roundUsdt(rule.bonusUsdt * daysInPeriod);
      const amountUsdt = roundUsdt(Math.min(uncappedAmountUsdt, remainingCapacityUsdt));

      if (amountUsdt <= 0) {
        continue;
      }

      rewardCapacityByUserId.set(userId, roundUsdt(remainingCapacityUsdt - amountUsdt));

      const capNote =
        amountUsdt < uncappedAmountUsdt
          ? ` Capped by ${TOTAL_REWARD_EARNING_MULTIPLIER}x total earning limit.`
          : "";

      const children = childrenMap.get(userId) ?? [];
      const totalTeamBusiness = children.reduce(
        (sum, child) => sum + (teamVolumeWithOwnMap.get(String(child.userId)) ?? 0),
        0,
      );

      rewardRows.push({
        amountUsdt,
        network: "SYSTEM",
        notes: `Royalty ${payoutTier} (${tierName}) ${royaltyPeriod.start.toISOString().slice(0, 7)}: Qualified for ${tierName} with total team business ${roundUsdt(totalTeamBusiness)} USDT.${capNote}`,
        payoutKind: "salary_royalty",
        payoutPeriodEnd: royaltyPeriod.end,
        payoutPeriodStart: royaltyPeriod.start,
        payoutPrincipalUsdt: totalTeamBusiness,
        payoutTier,
        status: "pending",
        type: "reward",
        userId: toObjectId(userId),
      });

      existingUserIds.add(userId);
    }

    return insertRewardRows(rewardRows);
  }
}

export const rewardService = new RewardService();
