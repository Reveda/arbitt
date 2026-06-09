export type ReferralUserRepositoryRecord = {
  _id?: unknown;
  email?: string;
  username?: string | null;
  status?: string;
  referralCode?: string | null;
  emailVerifiedAt?: Date | string | null;
  createdAt?: Date | string | null;
};

export type ReferralRepositoryRecord = {
  _id?: unknown;
  userId?: unknown | ReferralUserRepositoryRecord;
  parentUserId?: unknown;
  level?: number;
  path?: unknown[];
  directCount?: number;
  activeTeamCount?: number;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
};

export type ListTeamMembersRepositoryResult = {
  teamMembers: ReferralRepositoryRecord[];
  total: number;
};
