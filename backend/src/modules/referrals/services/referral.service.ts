import { referralRepository } from "../repositories/referral.repository";
import { buildPaginationDto } from "../../../utils/ApiResponse";
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

function toReferralMember(record: ReferralRecord, rootUserId: string): ReferralMemberDto {
  const user = getPopulatedUser(record.userId);

  return {
    id: String(record._id),
    userId: toObjectIdString(user?._id ?? record.userId) ?? "",
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
    createdAt: record.createdAt ?? null,
  };
}

export class ReferralService {
  async getReferralTree(userId: string): Promise<ReferralTreeResponseDto> {
    const [root, directRecords, teamRecords] = await Promise.all([
      referralRepository.findByUserId(userId),
      referralRepository.findDirectMembers(userId),
      referralRepository.findTeamMembers(userId),
    ]);
    const directMembers = directRecords.map((record) =>
      toReferralMember(record as ReferralRecord, userId),
    );
    const teamMembers = teamRecords.map((record) =>
      toReferralMember(record as ReferralRecord, userId),
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
      },
      directMembers,
      teamMembers,
      levels,
    };
  }

  async getReferralSummary(userId: string): Promise<ReferralSummaryResponseDto> {
    const [referral, teamRecords] = await Promise.all([
      referralRepository.findByUserId(userId),
      referralRepository.findTeamMembers(userId),
    ]);
    const teamMembers = teamRecords.map((record) =>
      toReferralMember(record as ReferralRecord, userId),
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
    const { teamMembers, total } = await referralRepository.listTeamMembers({
      userId: input.userId,
      search: input.search,
      skip,
      limit,
    });

    return {
      teamMembers: teamMembers.map((record) =>
        toReferralMember(record as ReferralRecord, input.userId),
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
