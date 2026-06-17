import { apiRequest } from "@/api/apiClient";
import { API_ENDPOINTS } from "@/api/endpoints";

export type ReferralMember = {
  id: string;
  userId: string;
  email: string | null;
  username: string | null;
  status: string;
  referralCode: string | null;
  emailVerified: boolean;
  joinedAt: string | null;
  parentUserId: string | null;
  level: number;
  relativeLevel: number;
  directCount: number;
  activeTeamCount: number;
  teamBusinessUsdt: number;
  selfBusinessUsdt: number;
  createdAt: string | null;
};

export type ReferralSummary = {
  directCount: number;
  activeTeamCount: number;
  totalTeamMembers: number;
  totalRewardsUsdt: number;
  selfBusinessUsdt: number;
  teamBusinessUsdt: number;
};

export type ReferralTree = {
  root: {
    level: number;
    directCount: number;
    activeTeamCount: number;
    path: string[];
  } | null;
  summary: ReferralSummary;
  directMembers: ReferralMember[];
  teamMembers: ReferralMember[];
  levels: Record<string, ReferralMember[]>;
};

export type ReferralMembersParams = {
  page: number;
  limit: number;
  search?: string;
};

export type ReferralMembersResponse = {
  teamMembers: ReferralMember[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

let referralTreeRequest: Promise<Awaited<ReturnType<typeof apiRequest<ReferralTree>>>> | null = null;

function buildReferralMembersPath(params: ReferralMembersParams) {
  const query = new URLSearchParams({
    limit: String(params.limit),
    page: String(params.page)
  });

  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }

  return `${API_ENDPOINTS.referrals.members}?${query.toString()}`;
}

export const referralService = {
  getTree() {
    if (referralTreeRequest) {
      return referralTreeRequest;
    }

    referralTreeRequest = apiRequest<ReferralTree>(API_ENDPOINTS.referrals.tree).finally(() => {
      referralTreeRequest = null;
    });

    return referralTreeRequest;
  },

  getSummary() {
    return apiRequest<ReferralSummary>(API_ENDPOINTS.referrals.summary);
  },

  listMembers(params: ReferralMembersParams) {
    return apiRequest<ReferralMembersResponse>(buildReferralMembersPath(params));
  }
};
