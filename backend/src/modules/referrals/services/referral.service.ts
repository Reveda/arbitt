import { referralRepository } from "../repositories/referral.repository";
import { buildPaginationDto } from "../../../utils/ApiResponse";
import { UserPlanPurchaseModel } from "../../plans/models/user-plan-purchase.model";
import { ReferralModel } from "../models/referral.model";
import { calculateUserRoyaltyRanks } from "../../rewards/services/reward.service";
import type {
  ListTeamMembersResponseDto,
  ReferralMemberDto,
  ReferralSummaryResponseDto,
  ReferralTreeResponseDto,
} from "../dtos/referral.dto";

type PopulatedReferralUser = {
  _id?: unknown;
  email?: string;
  username?: string | null;
  status?: string;
  referralCode?: string | null;
  emailVerifiedAt?: Date | string | null;
  createdAt?: Date | string | null;
};

type ReferralRecord = {
  _id?: unknown;
  userId?: unknown;
  parentUserId?: unknown;
  level?: number;
  path?: unknown[];
  directCount?: number;
  activeTeamCount?: number;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
};

function toObjectIdString(value: unknown) {
  if (!value) {
    return null;
  }

  if (typeof value === "object" && "_id" in value) {
    return String((value as { _id: unknown })._id);
  }

  return String(value);
}

function getPopulatedUser(value: unknown): PopulatedReferralUser | null {
  if (!value || typeof value !== "object" || !("_id" in value)) {
    return null;
  }

  return value as PopulatedReferralUser;
}

function getRelativeLevel(record: ReferralRecord, rootUserId: string) {
  const path = (record.path ?? []).map((entry) => String(entry));
  const rootIndex = path.findIndex((entry) => entry === rootUserId);

  if (rootIndex >= 0) {
    return path.length - rootIndex;
  }

  return record.level ?? 0;
}

export async function getTeamBusinessMap(): Promise<Map<string, number>> {
  const referrals = await ReferralModel.find().lean();
  const activePurchases = await UserPlanPurchaseModel.find({ status: "active" }).lean();

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

  const teamBusinessMap = new Map<string, number>();
  for (const ref of referrals) {
    const userIdStr = String(ref.userId);
    const subtreeVolume = teamVolumeWithOwnMap.get(userIdStr) ?? 0;
    const ownVolume = purchaseMap.get(userIdStr) ?? 0;
    teamBusinessMap.set(userIdStr, Math.max(0, subtreeVolume - ownVolume));
  }

  return teamBusinessMap;
}

export async function getSelfBusinessMap(): Promise<Map<string, number>> {
  const activePurchases = await UserPlanPurchaseModel.find({ status: "active" }).lean();
  const purchaseMap = new Map<string, number>();
  for (const p of activePurchases) {
    const uId = String(p.userId);
    purchaseMap.set(uId, (purchaseMap.get(uId) ?? 0) + (p.amountUsdt ?? 0));
  }
  return purchaseMap;
}

function toReferralMember(
  record: ReferralRecord,
  rootUserId: string,
  teamBusinessMap?: Map<string, number>,
  selfBusinessMap?: Map<string, number>,
  userRoyaltyRankMap?: Map<string, number>,
): ReferralMemberDto {
  const user = getPopulatedUser(record.userId);
  const userIdStr = toObjectIdString(user?._id ?? record.userId) ?? "";

  const rankNum = userRoyaltyRankMap?.get(userIdStr) ?? 0;
  const rank = rankNum > 0 ? `M${rankNum}` : null;

  return {
    id: String(record._id),
    userId: userIdStr,
    email: null,
    username: user?.username ?? null,
    status: user?.status ?? "unknown",
    referralCode: user?.referralCode ?? null,
    emailVerified: Boolean(user?.emailVerifiedAt),
    joinedAt: user?.createdAt ?? record.createdAt ?? null,
    parentUserId: toObjectIdString(record.parentUserId),
    level: record.level ?? 0,
    relativeLevel: getRelativeLevel(record, rootUserId),
    directCount: record.directCount ?? 0,
    activeTeamCount: record.activeTeamCount ?? 0,
    teamBusinessUsdt: teamBusinessMap ? (teamBusinessMap.get(userIdStr) ?? 0) : 0,
    selfBusinessUsdt: selfBusinessMap ? (selfBusinessMap.get(userIdStr) ?? 0) : 0,
    createdAt: record.createdAt ?? null,
    rank,
  };
}

export class ReferralService {
  async getReferralTree(userId: string): Promise<ReferralTreeResponseDto> {
    const [root, directRecords, teamRecords, teamBusinessMap, userPurchases, selfBusinessMap, { userRoyaltyRankMap }] =
      await Promise.all([
        referralRepository.findByUserId(userId),
        referralRepository.findDirectMembers(userId),
        referralRepository.findTeamMembers(userId),
        getTeamBusinessMap(),
        UserPlanPurchaseModel.find({ userId, status: "active" }).lean(),
        getSelfBusinessMap(),
        calculateUserRoyaltyRanks(),
      ]);
    const selfBusinessUsdt = userPurchases.reduce((sum, p) => sum + (p.amountUsdt ?? 0), 0);
    const directMembers = directRecords.map((record) =>
      toReferralMember(record as ReferralRecord, userId, teamBusinessMap, selfBusinessMap, userRoyaltyRankMap),
    );
    const teamMembers = teamRecords.map((record) =>
      toReferralMember(record as ReferralRecord, userId, teamBusinessMap, selfBusinessMap, userRoyaltyRankMap),
    );
    const levels = teamMembers.reduce<Record<string, typeof teamMembers>>((levelMap, member) => {
      const key = `L${member.relativeLevel}`;
      levelMap[key] = [...(levelMap[key] ?? []), member];
      return levelMap;
    }, {});

    return {
      root: root
        ? {
            level: root.level,
            directCount: root.directCount,
            activeTeamCount: root.activeTeamCount,
            path: root.path,
          }
        : null,
      summary: {
        directCount: directMembers.length,
        totalTeamMembers: teamMembers.length,
        activeTeamCount: teamMembers.filter((member) => member.status === "active").length,
        selfBusinessUsdt,
        teamBusinessUsdt: teamBusinessMap.get(userId) ?? 0,
      },
      directMembers,
      teamMembers,
      levels,
    };
  }

  async getReferralSummary(userId: string): Promise<ReferralSummaryResponseDto> {
    const [referral, teamRecords, selfBusinessMap, { userRoyaltyRankMap }] = await Promise.all([
      referralRepository.findByUserId(userId),
      referralRepository.findTeamMembers(userId),
      getSelfBusinessMap(),
      calculateUserRoyaltyRanks(),
    ]);
    const teamMembers = teamRecords.map((record) =>
      toReferralMember(record as ReferralRecord, userId, undefined, selfBusinessMap, userRoyaltyRankMap),
    );

    return {
      directCount: referral?.directCount ?? 0,
      activeTeamCount: teamMembers.filter((member) => member.status === "active").length,
      totalTeamMembers: teamMembers.length,
      totalRewardsUsdt: 0,
    };
  }

  async listTeamMembers(input: {
    userId: string;
    page: number;
    limit: number;
    search?: string;
  }): Promise<ListTeamMembersResponseDto> {
    const page = input.page;
    const limit = input.limit;
    const skip = (page - 1) * limit;
    const [{ teamMembers, total }, teamBusinessMap, selfBusinessMap, { userRoyaltyRankMap }] = await Promise.all([
      referralRepository.listTeamMembers({
        userId: input.userId,
        search: input.search,
        skip,
        limit,
      }),
      getTeamBusinessMap(),
      getSelfBusinessMap(),
      calculateUserRoyaltyRanks(),
    ]);

    return {
      teamMembers: teamMembers.map((record) =>
        toReferralMember(record as ReferralRecord, input.userId, teamBusinessMap, selfBusinessMap, userRoyaltyRankMap),
      ),
      pagination: buildPaginationDto({
        page,
        limit,
        total,
      }),
    };
  }
}

export const referralService = new ReferralService();
