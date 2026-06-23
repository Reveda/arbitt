import type { PaginationDto } from "../../../utils/ApiResponse";

export type ReferralMemberDto = {
  id: string;
  userId: string;
  email: string | null;
  username: string | null;
  status: string;
  referralCode: string | null;
  emailVerified: boolean;
  joinedAt: Date | string | null;
  parentUserId: string | null;
  level: number;
  relativeLevel: number;
  directCount: number;
  activeTeamCount: number;
  teamBusinessUsdt: number;
  selfBusinessUsdt: number;
  createdAt: Date | string | null;
  rank: string | null;
};

export type ReferralTreeResponseDto = {
  root: {
    level?: number;
    directCount?: number;
    activeTeamCount?: number;
    path?: unknown[];
  } | null;
  summary: {
    directCount: number;
    totalTeamMembers: number;
    activeTeamCount: number;
    selfBusinessUsdt: number;
    teamBusinessUsdt: number;
  };
  directMembers: ReferralMemberDto[];
  teamMembers: ReferralMemberDto[];
  levels: Record<string, ReferralMemberDto[]>;
};

export type ReferralSummaryResponseDto = {
  directCount: number;
  activeTeamCount: number;
  totalTeamMembers: number;
  totalRewardsUsdt: number;
};

export type ListTeamMembersResponseDto = {
  teamMembers: ReferralMemberDto[];
  pagination: PaginationDto;
};
