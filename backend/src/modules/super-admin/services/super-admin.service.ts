import { env } from "../../../config/env";
import { Types, type PipelineStage } from "mongoose";
import { AuditLogModel } from "../../admin/models/audit-log.model";
import { PlatformSettingModel } from "../../admin/models/platform-setting.model";
import { NotificationModel } from "../../notifications/models/notification.model";
import { PlanRuleSetModel } from "../../plans/models/plan-rule-set.model";
import { TransactionModel } from "../../transactions/models/transaction.model";
import { UserModel } from "../../users/models/user.model";
import { WalletModel } from "../../wallet/models/wallet.model";
import { ApiActivityModel } from "../models/api-activity.model";
import { cleanTransactionNotes } from "../../transactions/dtos/transaction.dto";
import { walletRepository } from "../../wallet/repositories/wallet.repository";
import { ApiError } from "../../../utils/ApiError";
import { HTTP_STATUS } from "../../../constants/http";
import { UserPlanPurchaseModel } from "../../plans/models/user-plan-purchase.model";
import { ReferralModel } from "../../referrals/models/referral.model";
import { planRepository } from "../../plans/repositories/plan.repository";
import { calculateUserRoyaltyRanks } from "../../rewards/services/reward.service";
import { getSalaryRoyaltyPeriod } from "../../rewards/utils/salaryRoyalty";

const DAY_MS = 24 * 60 * 60 * 1000;

type StatusAggregate = {
  _id: string;
  amountUsdt: number;
  count: number;
};

type TypeAggregate = {
  _id: string;
  amountUsdt: number;
  count: number;
};

type DailyAggregate = {
  _id: string;
  approvedCount: number;
  depositsUsdt: number;
  failedCount: number;
  pendingCount: number;
  rewardsUsdt: number;
  totalCount: number;
  withdrawalsUsdt: number;
};

type TransactionRecord = {
  _id: unknown;
  amountUsdt: number;
  createdAt?: Date | string;
  network?: string | null;
  status: string;
  type: string;
  user?: {
    email?: string;
    username?: string | null;
  } | null;
  userId?: {
    email?: string;
    username?: string | null;
  } | null;
};

type AuditRecord = {
  _id: unknown;
  action: string;
  createdAt?: Date | string;
  entityType: string;
  ipAddress?: string | null;
};

type UserWalletCountAggregate = {
  total: number;
};

type WorkflowStepStatus = "attention" | "blocked" | "healthy" | "idle";

type DateRangeFilter = {
  $gte?: Date;
  $lt?: Date;
};

type PaginationInput = {
  limit: number;
  page: number;
  search?: string;
};

type PaginatedAggregationResult<T> = {
  counts: Array<{ total?: number; totalAmountUsdt?: number }>;
  data: T[];
};

type SuperAdminTransactionListInput = PaginationInput & {
  fromDate?: string;
  status?: string;
  toDate?: string;
  type?: string;
};

type SuperAdminAuditLogListInput = PaginationInput & {
  action?: string;
  entityType?: string;
  fromDate?: string;
  toDate?: string;
};

type SuperAdminAdminListInput = PaginationInput & {
  role?: string;
  status?: string;
};

type SuperAdminSettingListInput = PaginationInput;

type SuperAdminNotificationListInput = PaginationInput & {
  fromDate?: string;
  readStatus?: "read" | "unread";
  toDate?: string;
  type?: string;
};

type SuperAdminApiActivityListInput = PaginationInput & {
  action?: string;
  fromDate?: string;
  method?: string;
  routeGroup?: string;
  statusCode?: number;
  success?: boolean;
  toDate?: string;
};

type SuperAdminListTransactionRecord = TransactionRecord & {
  notes?: string | null;
  reviewedAt?: Date | string | null;
  txnHash?: string | null;
  updatedAt?: Date | string | null;
  user?: {
    email?: string;
    username?: string | null;
  } | null;
};

type SuperAdminListAuditRecord = AuditRecord & {
  actor?: {
    email?: string;
    username?: string | null;
  } | null;
  entityId?: string;
};

type SuperAdminListAdminRecord = {
  _id: unknown;
  createdAt?: Date | string | null;
  email?: string;
  emailVerifiedAt?: Date | string | null;
  lastLoginAt?: Date | string | null;
  role?: string;
  status?: string;
  username?: string | null;
};

type SuperAdminListSettingRecord = {
  _id: unknown;
  createdAt?: Date | string | null;
  key?: string;
  updatedAt?: Date | string | null;
  value?: unknown;
};

type SuperAdminListNotificationRecord = {
  _id: unknown;
  createdAt?: Date | string | null;
  message?: string;
  readAt?: Date | string | null;
  title?: string;
  type?: string;
  user?: {
    email?: string;
    username?: string | null;
  } | null;
};

type SuperAdminListApiActivityRecord = {
  _id: unknown;
  action?: string;
  createdAt?: Date | string | null;
  durationMs?: number;
  ipAddress?: string | null;
  method?: string;
  path?: string;
  routeGroup?: string;
  statusCode?: number;
  success?: boolean;
  user?: {
    email?: string;
    username?: string | null;
  } | null;
  userRole?: string | null;
};

function roundUsdt(value: number) {
  return Number(value.toFixed(2));
}

function getUtcDayStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function getDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getLastSevenDayKeys() {
  const today = getUtcDayStart(new Date());

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today.getTime() - (6 - index) * DAY_MS);
    return getDateKey(date);
  });
}

function getWorkflowStatus(input: {
  blocked?: boolean;
  healthy?: boolean;
  pending?: number;
  total?: number;
}): WorkflowStepStatus {
  if (input.blocked) {
    return "blocked";
  }

  if ((input.pending ?? 0) > 0) {
    return "attention";
  }

  if (input.healthy || (input.total ?? 0) > 0) {
    return "healthy";
  }

  return "idle";
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getPagination(input: PaginationInput) {
  return {
    limit: input.limit,
    page: input.page,
    skip: (input.page - 1) * input.limit,
  };
}

function getPaginationNode(input: { limit: number; page: number; total: number }) {
  const totalPages = Math.max(1, Math.ceil(input.total / input.limit));

  return {
    page: input.page,
    limit: input.limit,
    total: input.total,
    totalPages,
    hasNextPage: input.page < totalPages,
    hasPreviousPage: input.page > 1,
  };
}

function buildDateRangeFilter(input: { fromDate?: string; toDate?: string }) {
  const filter: DateRangeFilter = {};

  if (input.fromDate) {
    filter.$gte = new Date(`${input.fromDate}T00:00:00.000Z`);
  }

  if (input.toDate) {
    const end = new Date(`${input.toDate}T00:00:00.000Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    filter.$lt = end;
  }

  return Object.keys(filter).length ? filter : undefined;
}

function toStatusNode(record: StatusAggregate) {
  return {
    amountUsdt: roundUsdt(record.amountUsdt ?? 0),
    count: record.count ?? 0,
    status: record._id,
  };
}

function toTypeNode(record: TypeAggregate) {
  return {
    amountUsdt: roundUsdt(record.amountUsdt ?? 0),
    count: record.count ?? 0,
    type: record._id,
  };
}

function toTransactionNode(record: TransactionRecord) {
  const user = record.user ?? record.userId;

  return {
    id: String(record._id),
    amountUsdt: roundUsdt(record.amountUsdt ?? 0),
    createdAt: record.createdAt ?? null,
    network: record.network ?? null,
    status: record.status,
    type: record.type,
    user: user
      ? {
          email: null,
          username: user.username ?? null,
        }
      : null,
  };
}

function toAuditNode(record: AuditRecord) {
  return {
    id: String(record._id),
    action: record.action,
    createdAt: record.createdAt ?? null,
    entityType: record.entityType,
    ipAddress: record.ipAddress ?? null,
  };
}

function toTransactionListNode(record: SuperAdminListTransactionRecord) {
  return {
    ...toTransactionNode(record),
    notes: cleanTransactionNotes(record.notes),
    reviewedAt: record.reviewedAt ?? null,
    txnHash: record.txnHash ?? null,
    updatedAt: record.updatedAt ?? null,
  };
}

function toAuditListNode(record: SuperAdminListAuditRecord) {
  return {
    ...toAuditNode(record),
    actor: record.actor
      ? {
          email: null,
          username: record.actor.username ?? null,
        }
      : null,
    entityId: record.entityId ?? "",
  };
}

function toAdminListNode(record: SuperAdminListAdminRecord) {
  return {
    id: String(record._id),
    email: null,
    emailVerified: Boolean(record.emailVerifiedAt),
    joinedAt: record.createdAt ?? null,
    lastLoginAt: record.lastLoginAt ?? null,
    role: record.role ?? "admin",
    status: record.status ?? "unknown",
    username: record.username ?? null,
  };
}

function toSettingListNode(record: SuperAdminListSettingRecord) {
  return {
    id: String(record._id),
    createdAt: record.createdAt ?? null,
    key: record.key ?? "unknown",
    updatedAt: record.updatedAt ?? null,
    valueType: Array.isArray(record.value) ? "array" : typeof record.value,
  };
}

function toNotificationListNode(record: SuperAdminListNotificationRecord) {
  return {
    id: String(record._id),
    createdAt: record.createdAt ?? null,
    message: record.message ?? "",
    readAt: record.readAt ?? null,
    title: record.title ?? "Notification",
    type: record.type ?? "system",
    user: record.user
      ? {
          email: null,
          username: record.user.username ?? null,
        }
      : null,
  };
}

function toApiActivityListNode(record: SuperAdminListApiActivityRecord) {
  return {
    id: String(record._id),
    action: record.action ?? "api.request",
    createdAt: record.createdAt ?? null,
    durationMs: record.durationMs ?? 0,
    ipAddress: record.ipAddress ?? "",
    method: record.method ?? "GET",
    path: record.path ?? "",
    routeGroup: record.routeGroup ?? "unknown",
    statusCode: record.statusCode ?? 0,
    success: Boolean(record.success),
    user: record.user
      ? {
          email: null,
          username: record.user.username ?? null,
        }
      : null,
    userRole: record.userRole ?? null,
  };
}

export class SuperAdminService {
  async listTransactions(input: SuperAdminTransactionListInput) {
    const { limit, page, skip } = getPagination(input);
    const dateRange = buildDateRangeFilter(input);
    const pipeline: PipelineStage[] = [];
    const indexedMatch: Record<string, unknown> = {};

    if (input.status) {
      indexedMatch.status = input.status;
    }

    if (input.type) {
      indexedMatch.type = input.type;
    }

    if (dateRange) {
      indexedMatch.createdAt = dateRange;
    }

    if (Object.keys(indexedMatch).length) {
      pipeline.push({ $match: indexedMatch });
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
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    );

    if (input.search?.trim()) {
      const regex = new RegExp(escapeRegex(input.search.trim()), "i");
      pipeline.push({
        $match: {
          $or: [
            { "user.username": regex },
            { network: regex },
            { notes: regex },
            { txnHash: regex },
          ],
        },
      });
    }

    pipeline.push(
      { $sort: { createdAt: -1, _id: -1 } },
      {
        $facet: {
          counts: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                totalAmountUsdt: { $sum: "$amountUsdt" },
              },
            },
          ],
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                amountUsdt: 1,
                createdAt: 1,
                network: 1,
                notes: 1,
                reviewedAt: 1,
                status: 1,
                txnHash: 1,
                type: 1,
                updatedAt: 1,
                user: {
                  username: "$user.username",
                },
              },
            },
          ],
        },
      },
    );

    const [result] =
      await TransactionModel.aggregate<PaginatedAggregationResult<SuperAdminListTransactionRecord>>(
        pipeline,
      );
    const stats = result?.counts[0] ?? {};
    const total = stats.total ?? 0;

    return {
      summary: {
        total,
        totalAmountUsdt: roundUsdt(stats.totalAmountUsdt ?? 0),
      },
      records: (result?.data ?? []).map(toTransactionListNode),
      pagination: getPaginationNode({ limit, page, total }),
    };
  }

  async listAuditLogs(input: SuperAdminAuditLogListInput) {
    const { limit, page, skip } = getPagination(input);
    const dateRange = buildDateRangeFilter(input);
    const pipeline: PipelineStage[] = [{ $match: { action: { $ne: "auth.token_refreshed" } } }];
    const indexedMatch: Record<string, unknown> = {};

    if (input.action) {
      indexedMatch.action = new RegExp(escapeRegex(input.action), "i");
    }

    if (input.entityType) {
      indexedMatch.entityType = new RegExp(escapeRegex(input.entityType), "i");
    }

    if (dateRange) {
      indexedMatch.createdAt = dateRange;
    }

    if (Object.keys(indexedMatch).length) {
      pipeline.push({ $match: indexedMatch });
    }

    pipeline.push(
      {
        $lookup: {
          as: "actor",
          foreignField: "_id",
          from: "users",
          localField: "actorUserId",
        },
      },
      { $unwind: { path: "$actor", preserveNullAndEmptyArrays: true } },
    );

    if (input.search?.trim()) {
      const regex = new RegExp(escapeRegex(input.search.trim()), "i");
      pipeline.push({
        $match: {
          $or: [
            { action: regex },
            { entityType: regex },
            { entityId: regex },
            { ipAddress: regex },
            { "actor.username": regex },
          ],
        },
      });
    }

    pipeline.push(
      { $sort: { createdAt: -1, _id: -1 } },
      {
        $facet: {
          counts: [{ $count: "total" }],
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                action: 1,
                actor: {
                  username: "$actor.username",
                },
                createdAt: 1,
                entityId: 1,
                entityType: 1,
                ipAddress: 1,
              },
            },
          ],
        },
      },
    );

    const [result] =
      await AuditLogModel.aggregate<PaginatedAggregationResult<SuperAdminListAuditRecord>>(
        pipeline,
      );
    const total = result?.counts[0]?.total ?? 0;

    return {
      records: (result?.data ?? []).map(toAuditListNode),
      pagination: getPaginationNode({ limit, page, total }),
    };
  }

  async listAdmins(input: SuperAdminAdminListInput) {
    const { limit, page, skip } = getPagination(input);
    const filter: Record<string, unknown> = {
      role: input.role ? input.role : { $in: ["admin", "super_admin"] },
    };

    if (input.status) {
      filter.status = input.status;
    }

    if (input.search?.trim()) {
      const regex = new RegExp(escapeRegex(input.search.trim()), "i");
      filter.$or = [{ username: regex }, { referralCode: regex }];
    }

    const [records, total] = await Promise.all([
      UserModel.find(filter)
        .select("username role status emailVerifiedAt lastLoginAt createdAt")
        .sort({ role: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<SuperAdminListAdminRecord[]>(),
      UserModel.countDocuments(filter),
    ]);

    return {
      records: records.map(toAdminListNode),
      pagination: getPaginationNode({ limit, page, total }),
    };
  }

  async listSettings(input: SuperAdminSettingListInput) {
    const { limit, page, skip } = getPagination(input);
    const filter: Record<string, unknown> = { deletedAt: null };

    if (input.search?.trim()) {
      filter.key = new RegExp(escapeRegex(input.search.trim()), "i");
    }

    const [records, total] = await Promise.all([
      PlatformSettingModel.find(filter)
        .select("key value createdAt updatedAt")
        .sort({ updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<SuperAdminListSettingRecord[]>(),
      PlatformSettingModel.countDocuments(filter),
    ]);

    return {
      records: records.map(toSettingListNode),
      pagination: getPaginationNode({ limit, page, total }),
    };
  }

  async listNotifications(input: SuperAdminNotificationListInput) {
    const { limit, page, skip } = getPagination(input);
    const dateRange = buildDateRangeFilter(input);
    const pipeline: PipelineStage[] = [];
    const indexedMatch: Record<string, unknown> = {};

    if (input.type) {
      indexedMatch.type = input.type;
    }

    if (input.readStatus === "read") {
      indexedMatch.readAt = { $ne: null };
    }

    if (input.readStatus === "unread") {
      indexedMatch.readAt = null;
    }

    if (dateRange) {
      indexedMatch.createdAt = dateRange;
    }

    if (Object.keys(indexedMatch).length) {
      pipeline.push({ $match: indexedMatch });
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
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    );

    if (input.search?.trim()) {
      const regex = new RegExp(escapeRegex(input.search.trim()), "i");
      pipeline.push({
        $match: {
          $or: [{ message: regex }, { title: regex }, { type: regex }, { "user.username": regex }],
        },
      });
    }

    pipeline.push(
      { $sort: { createdAt: -1, _id: -1 } },
      {
        $facet: {
          counts: [{ $count: "total" }],
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                createdAt: 1,
                message: 1,
                readAt: 1,
                title: 1,
                type: 1,
                user: {
                  username: "$user.username",
                },
              },
            },
          ],
        },
      },
    );

    const [result] =
      await NotificationModel.aggregate<
        PaginatedAggregationResult<SuperAdminListNotificationRecord>
      >(pipeline);
    const total = result?.counts[0]?.total ?? 0;

    return {
      records: (result?.data ?? []).map(toNotificationListNode),
      pagination: getPaginationNode({ limit, page, total }),
    };
  }

  async listApiActivity(input: SuperAdminApiActivityListInput) {
    const { limit, page, skip } = getPagination(input);
    const dateRange = buildDateRangeFilter(input);
    const pipeline: PipelineStage[] = [];
    const indexedMatch: Record<string, unknown> = {};

    if (input.action) {
      indexedMatch.action = new RegExp(escapeRegex(input.action), "i");
    }

    if (input.method) {
      indexedMatch.method = input.method.toUpperCase();
    }

    if (input.routeGroup) {
      indexedMatch.routeGroup = input.routeGroup;
    }

    if (typeof input.statusCode === "number") {
      indexedMatch.statusCode = input.statusCode;
    }

    if (typeof input.success === "boolean") {
      indexedMatch.success = input.success;
    }

    if (dateRange) {
      indexedMatch.createdAt = dateRange;
    }

    if (Object.keys(indexedMatch).length) {
      pipeline.push({ $match: indexedMatch });
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
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    );

    if (input.search?.trim()) {
      const regex = new RegExp(escapeRegex(input.search.trim()), "i");
      pipeline.push({
        $match: {
          $or: [
            { action: regex },
            { method: regex },
            { path: regex },
            { routeGroup: regex },
            { "user.username": regex },
          ],
        },
      });
    }

    pipeline.push(
      { $sort: { createdAt: -1, _id: -1 } },
      {
        $facet: {
          counts: [{ $count: "total" }],
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                action: 1,
                createdAt: 1,
                durationMs: 1,
                ipAddress: 1,
                method: 1,
                path: 1,
                routeGroup: 1,
                statusCode: 1,
                success: 1,
                user: {
                  username: "$user.username",
                },
                userRole: 1,
              },
            },
          ],
        },
      },
    );

    const [result] =
      await ApiActivityModel.aggregate<PaginatedAggregationResult<SuperAdminListApiActivityRecord>>(
        pipeline,
      );
    const total = result?.counts[0]?.total ?? 0;

    return {
      records: (result?.data ?? []).map(toApiActivityListNode),
      pagination: getPaginationNode({ limit, page, total }),
    };
  }

  async getOverview() {
    const dayKeys = getLastSevenDayKeys();
    const dailyStart = new Date(`${dayKeys[0]}T00:00:00.000Z`);
    const last24Hours = new Date(Date.now() - DAY_MS);

    const [
      totalTransactions,
      failedTransactions,
      pendingTransactions,
      successfulTransactions,
      activeAdmins,
      activeSuperAdmins,
      auditEvents24h,
      activeSettings,
      activePlanRuleSets,
      adminAuditEvents,
      apiActivity24h,
      authAuditEvents,
      failedApiActivity24h,
      paymentWalletSetting,
      securityNotifications,
      totalNotifications,
      unreadNotifications,
      pendingDeposits,
      approvedDeposits,
      rejectedDeposits,
      pendingPayouts,
      approvedPayouts,
      rejectedPayouts,
      weeklyPayouts,
      levelIncomePayouts,
      salaryRoyaltyPayouts,
      pendingWithdrawals,
      userWalletCount,
      paymentWalletAuditEvents,
      depositAuditEvents,
      payoutAuditEvents,
      statusBreakdown,
      typeBreakdown,
      dailyFlow,
      recentExceptions,
      recentAuditLogs,
    ] = await Promise.all([
      TransactionModel.countDocuments(),
      TransactionModel.countDocuments({ status: { $in: ["failed", "rejected"] } }),
      TransactionModel.countDocuments({ status: "pending" }),
      TransactionModel.countDocuments({ status: { $in: ["approved", "completed"] } }),
      UserModel.countDocuments({ role: "admin", status: "active" }),
      UserModel.countDocuments({ role: "super_admin", status: "active" }),
      AuditLogModel.countDocuments({
        action: { $ne: "auth.token_refreshed" },
        createdAt: { $gte: last24Hours },
      }),
      PlatformSettingModel.countDocuments({ deletedAt: null }),
      PlanRuleSetModel.countDocuments({ isActive: true }),
      AuditLogModel.countDocuments({ action: { $regex: /^admin\./ } }),
      ApiActivityModel.countDocuments({ createdAt: { $gte: last24Hours } }),
      AuditLogModel.countDocuments({
        action: { $ne: "auth.token_refreshed", $regex: /^auth\./ },
      }),
      ApiActivityModel.countDocuments({ createdAt: { $gte: last24Hours }, success: false }),
      PlatformSettingModel.exists({ key: "payment_wallet", deletedAt: null }),
      NotificationModel.countDocuments({ type: "security" }),
      NotificationModel.countDocuments(),
      NotificationModel.countDocuments({ readAt: null }),
      TransactionModel.countDocuments({ status: "pending", type: "deposit" }),
      TransactionModel.countDocuments({
        status: { $in: ["approved", "completed"] },
        type: "deposit",
      }),
      TransactionModel.countDocuments({ status: "rejected", type: "deposit" }),
      TransactionModel.countDocuments({ status: "pending", type: "reward" }),
      TransactionModel.countDocuments({
        status: { $in: ["approved", "completed"] },
        type: "reward",
      }),
      TransactionModel.countDocuments({ status: "rejected", type: "reward" }),
      TransactionModel.countDocuments({ payoutKind: "weekly", type: "reward" }),
      TransactionModel.countDocuments({ payoutKind: "level", type: "reward" }),
      TransactionModel.countDocuments({ payoutKind: "salary_royalty", type: "reward" }),
      TransactionModel.countDocuments({ status: "pending", type: "withdrawal" }),
      WalletModel.aggregate<UserWalletCountAggregate>([
        {
          $lookup: {
            as: "user",
            foreignField: "_id",
            from: "users",
            localField: "userId",
          },
        },
        { $unwind: "$user" },
        { $match: { "user.role": "user" } },
        { $count: "total" },
      ]),
      AuditLogModel.countDocuments({ action: "admin.payment_wallet.updated" }),
      AuditLogModel.countDocuments({
        action: {
          $in: [
            "admin.deposit.approved",
            "admin.deposit.rejected",
            "admin.plan_purchase.approved",
            "admin.plan_purchase.rejected",
          ],
        },
      }),
      AuditLogModel.countDocuments({
        action: { $in: ["admin.payout.approved", "admin.payout.rejected"] },
      }),
      TransactionModel.aggregate<StatusAggregate>([
        {
          $group: {
            _id: "$status",
            amountUsdt: { $sum: "$amountUsdt" },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
      TransactionModel.aggregate<TypeAggregate>([
        {
          $group: {
            _id: "$type",
            amountUsdt: { $sum: "$amountUsdt" },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
      TransactionModel.aggregate<DailyAggregate>([
        { $match: { createdAt: { $gte: dailyStart } } },
        {
          $group: {
            _id: {
              $dateToString: {
                date: "$createdAt",
                format: "%Y-%m-%d",
                timezone: "UTC",
              },
            },
            approvedCount: {
              $sum: { $cond: [{ $in: ["$status", ["approved", "completed"]] }, 1, 0] },
            },
            depositsUsdt: {
              $sum: { $cond: [{ $eq: ["$type", "deposit"] }, "$amountUsdt", 0] },
            },
            failedCount: {
              $sum: { $cond: [{ $in: ["$status", ["failed", "rejected"]] }, 1, 0] },
            },
            pendingCount: {
              $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
            },
            rewardsUsdt: {
              $sum: { $cond: [{ $eq: ["$type", "reward"] }, "$amountUsdt", 0] },
            },
            totalCount: { $sum: 1 },
            withdrawalsUsdt: {
              $sum: { $cond: [{ $eq: ["$type", "withdrawal"] }, "$amountUsdt", 0] },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      TransactionModel.find({ status: { $in: ["failed", "rejected"] } })
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(6)
        .populate({ path: "userId", select: "username" })
        .lean<TransactionRecord[]>(),
      AuditLogModel.find({ action: { $ne: "auth.token_refreshed" } })
        .sort({ createdAt: -1 })
        .limit(6)
        .lean<AuditRecord[]>(),
    ]);

    const dailyFlowByDate = new Map(dailyFlow.map((record) => [record._id, record]));
    const userWallets = userWalletCount[0]?.total ?? 0;
    const dailySeries = dayKeys.map((date) => {
      const record = dailyFlowByDate.get(date);

      return {
        date,
        approvedCount: record?.approvedCount ?? 0,
        depositsUsdt: roundUsdt(record?.depositsUsdt ?? 0),
        failedCount: record?.failedCount ?? 0,
        pendingCount: record?.pendingCount ?? 0,
        rewardsUsdt: roundUsdt(record?.rewardsUsdt ?? 0),
        totalCount: record?.totalCount ?? 0,
        withdrawalsUsdt: roundUsdt(record?.withdrawalsUsdt ?? 0),
      };
    });

    return {
      metrics: {
        activeAdmins,
        activeSettings,
        activeSuperAdmins,
        adminAuditEvents,
        apiActivity24h,
        auditEvents24h,
        authAuditEvents,
        approvedDeposits,
        approvedPayouts,
        depositAuditEvents,
        failedApiActivity24h,
        failedTransactions,
        levelIncomePayouts,
        paymentWalletAuditEvents,
        pendingTransactions,
        pendingDeposits,
        pendingPayouts,
        pendingWithdrawals,
        payoutAuditEvents,
        rejectedDeposits,
        rejectedPayouts,
        salaryRoyaltyPayouts,
        securityNotifications,
        successfulTransactions,
        totalNotifications,
        totalTransactions,
        unreadNotifications,
        userWallets,
        weeklyPayouts,
      },
      configurationHealth: [
        {
          key: "payment_wallet",
          label: "Admin USDT Wallet",
          status: paymentWalletSetting ? "configured" : "required",
          value: paymentWalletSetting ? "Encrypted wallet configured" : "Wallet address missing",
        },
        {
          key: "plan_rules",
          label: "Plan Rules",
          status: activePlanRuleSets > 0 ? "active" : "required",
          value: `${activePlanRuleSets} active rule set${activePlanRuleSets === 1 ? "" : "s"}`,
        },
        {
          key: "rate_limits",
          label: "Rate Limits",
          status: "active",
          value: `${env.API_RATE_LIMIT_MAX}/min API, ${env.FINANCIAL_RATE_LIMIT_MAX}/min financial`,
        },
        {
          key: "payout_policy",
          label: "Payout Policy",
          status: "active",
          value: "Weekly Monday-Saturday window",
        },
        {
          key: "audit_logs",
          label: "Audit Logging",
          status: "active",
          value: `${auditEvents24h} events in last 24h`,
        },
      ],
      dailySeries,
      workflowSteps: [
        {
          key: "payment-wallet",
          label: "Platform USDT Wallet",
          metric: paymentWalletSetting ? "Configured" : "Missing",
          status: getWorkflowStatus({
            blocked: !paymentWalletSetting,
            healthy: Boolean(paymentWalletSetting),
          }),
          text: paymentWalletSetting
            ? "Platform wallet is configured for plan purchase accounting."
            : "Platform wallet is missing for plan purchase accounting.",
        },
        {
          key: "deposit-request",
          label: "Wallet Top-up Records",
          metric: `${pendingDeposits} pending`,
          status: getWorkflowStatus({
            pending: pendingDeposits,
            total: approvedDeposits + rejectedDeposits,
          }),
          text: `${approvedDeposits} completed and ${rejectedDeposits} rejected legacy top-up records tracked.`,
        },
        {
          key: "deposit-review",
          label: "Plan Purchase Activation",
          metric: `${successfulTransactions} successful transactions`,
          status: getWorkflowStatus({
            healthy: successfulTransactions > 0,
          }),
          text: "Wallet-funded plan purchases activate automatically and remain visible in transaction history.",
        },
        {
          key: "wallet-credit",
          label: "User Wallet Credit",
          metric: `${userWallets} user wallets`,
          status: getWorkflowStatus({
            blocked: approvedDeposits > 0 && userWallets === 0,
            healthy: userWallets > 0,
          }),
          text: "Wallet top-ups credit user wallets automatically; plan purchases move value into locked active plan balance immediately.",
        },
        {
          key: "weekly-payout",
          label: "Weekly Payout Generation",
          metric: `${pendingPayouts} pending`,
          status: getWorkflowStatus({
            pending: pendingPayouts,
            total: weeklyPayouts,
          }),
          text: `${weeklyPayouts} weekly, ${levelIncomePayouts} level, and ${salaryRoyaltyPayouts} royalty rewards exist.`,
        },
        {
          key: "payout-review",
          label: "Payout Approval Credit",
          metric: `${approvedPayouts} approved`,
          status: getWorkflowStatus({
            pending: pendingPayouts,
            total: approvedPayouts + rejectedPayouts,
          }),
          text: `${rejectedPayouts} rejected payout rows remain available for Super Admin correction review.`,
        },
        {
          key: "withdrawal-queue",
          label: "Withdrawal Queue",
          metric: `${pendingWithdrawals} pending`,
          status: getWorkflowStatus({ pending: pendingWithdrawals }),
          text: "Withdrawal records are tracked separately from deposit and reward ledgers.",
        },
        {
          key: "audit-trail",
          label: "Audit Trail",
          metric: `${payoutAuditEvents + depositAuditEvents + paymentWalletAuditEvents} events`,
          status: getWorkflowStatus({
            blocked:
              approvedDeposits + approvedPayouts + rejectedDeposits + rejectedPayouts > 0 &&
              payoutAuditEvents + depositAuditEvents + paymentWalletAuditEvents === 0,
            healthy: payoutAuditEvents + depositAuditEvents + paymentWalletAuditEvents > 0,
          }),
          text: "Critical wallet, deposit, and payout actions are visible to Super Admin.",
        },
      ],
      recentAuditLogs: recentAuditLogs.map(toAuditNode),
      recentExceptions: recentExceptions.map(toTransactionNode),
      statusBreakdown: statusBreakdown.map(toStatusNode),
      typeBreakdown: typeBreakdown.map(toTypeNode),
    };
  }

  async fixTransactionStatus(transactionId: string, status: string, notes?: string, adminUserId?: string) {
    const transaction = await TransactionModel.findById(transactionId);
    if (!transaction) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Transaction not found.");
    }

    const previousStatus = transaction.status;
    if (previousStatus === status) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Transaction is already in the requested status.");
    }

    // Process status transition side-effects (wallet changes)
    if (transaction.type === "deposit") {
      if (status === "completed" && previousStatus !== "completed") {
        await walletRepository.creditDeposit(String(transaction.userId), transaction.amountUsdt);
      } else if (previousStatus === "completed" && status !== "completed") {
        await walletRepository.creditDeposit(String(transaction.userId), -transaction.amountUsdt);
      }
    } else if (transaction.type === "withdrawal") {
      if (status === "completed" && previousStatus === "pending") {
        await walletRepository.completeWithdrawalAmount(String(transaction.userId), transaction.amountUsdt);
      } else if ((status === "rejected" || status === "failed") && previousStatus === "pending") {
        await walletRepository.unlockWithdrawalAmount(String(transaction.userId), transaction.amountUsdt);
      } else if (status === "pending" && previousStatus === "completed") {
        await walletRepository.lockWithdrawalAmount(String(transaction.userId), transaction.amountUsdt);
      } else if ((status === "rejected" || status === "failed") && previousStatus === "completed") {
        await walletRepository.creditDeposit(String(transaction.userId), transaction.amountUsdt);
      }
    }

    transaction.status = status as any;
    if (notes) {
      transaction.notes = `${transaction.notes || ""}\n[SUPER_ADMIN Override]: ${notes}`.trim();
    }
    if (adminUserId) {
      transaction.reviewedBy = adminUserId as any;
      transaction.reviewedAt = new Date();
    }

    await transaction.save();
    return transaction.toObject();
  }

  async getPayoutSummary() {
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const endOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

    const rewards = await TransactionModel.find({
      type: "reward",
      createdAt: { $gte: startOfToday, $lte: endOfToday }
    }).lean();

    let totalAmountGenerated = 0;
    let totalAmountSent = 0;
    const uniqueUsers = new Set<string>();

    let levelCount = 0;
    let levelAmount = 0;
    let weeklyCount = 0;
    let weeklyAmount = 0;
    let royaltyCount = 0;
    let royaltyAmount = 0;

    let latestCreated: any = null;
    let latestCredited: any = null;

    rewards.forEach((r) => {
      totalAmountGenerated += r.amountUsdt;
      uniqueUsers.add(String(r.userId));

      if (r.status === "completed" || r.status === "approved") {
        totalAmountSent += r.amountUsdt;
        if (r.updatedAt) {
          const updatedDate = new Date(r.updatedAt);
          if (!latestCredited || updatedDate > latestCredited) {
            latestCredited = updatedDate;
          }
        }
      }

      if (r.createdAt) {
        const createdDate = new Date(r.createdAt);
        if (!latestCreated || createdDate > latestCreated) {
          latestCreated = createdDate;
        }
      }

      const kind = r.payoutKind;
      if (kind === "level") {
        levelCount++;
        levelAmount += r.amountUsdt;
      } else if (kind === "weekly") {
        weeklyCount++;
        weeklyAmount += r.amountUsdt;
      } else if (kind === "salary_royalty") {
        royaltyCount++;
        royaltyAmount += r.amountUsdt;
      }
    });

    return {
      todayStats: {
        totalAmountGenerated: roundUsdt(totalAmountGenerated),
        totalAmountSent: roundUsdt(totalAmountSent),
        usersCount: uniqueUsers.size,
        totalCount: rewards.length,
      },
      breakdown: {
        level: { count: levelCount, amount: roundUsdt(levelAmount) },
        weekly: { count: weeklyCount, amount: roundUsdt(weeklyAmount) },
        royalty: { count: royaltyCount, amount: roundUsdt(royaltyAmount) },
      },
      timing: {
        createdTime: latestCreated ? latestCreated.toISOString() : null,
        creditedTime: latestCredited ? latestCredited.toISOString() : null,
      }
    };
  }

  async detectSkippedPayouts() {
    const TOTAL_REWARD_PAYOUT_KINDS = ["weekly", "level", "salary_royalty"];
    const TOTAL_REWARD_CAP_STATUSES = ["pending", "approved", "completed"];
    const TOTAL_REWARD_EARNING_MULTIPLIER = 3;
    const toObjectId = (value: unknown) => new Types.ObjectId(String(value));

    // Helper capacity calculation
    const getRemainingRewardCapacityByUserId = async (userIds: string[]) => {
      const uniqueUserIds = [...new Set(userIds)];
      if (!uniqueUserIds.length) {
        return new Map<string, number>();
      }
      const userObjectIds = uniqueUserIds.map(toObjectId);
      const [principalTotals, rewardTotals] = await Promise.all([
        UserPlanPurchaseModel.aggregate<any>([
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
        TransactionModel.aggregate<any>([
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
        principalTotals.map((total: any) => [String(total._id), total.principalUsdt ?? 0]),
      );
      const rewardsByUserId = new Map(
        rewardTotals.map((total: any) => [String(total._id), total.amountUsdt ?? 0]),
      );

      return new Map<string, number>(
        uniqueUserIds.map((userId) => {
          const capUsdt = (principalByUserId.get(userId) ?? 0) * TOTAL_REWARD_EARNING_MULTIPLIER;
          const earnedOrQueuedUsdt = rewardsByUserId.get(userId) ?? 0;
          return [userId, roundUsdt(Math.max(0, capUsdt - earnedOrQueuedUsdt))] as const;
        }),
      );
    };

    // 1. Get recent Friday for ROI
    const now = new Date();
    const payoutDate = new Date();
    const day = payoutDate.getUTCDay();
    const diffToFriday = day >= 5 ? day - 5 : day + 2;
    payoutDate.setUTCDate(payoutDate.getUTCDate() - diffToFriday);

    const periodStart = new Date(Date.UTC(payoutDate.getUTCFullYear(), payoutDate.getUTCMonth(), payoutDate.getUTCDate()));
    const periodEnd = new Date(Date.UTC(payoutDate.getUTCFullYear(), payoutDate.getUTCMonth(), payoutDate.getUTCDate(), 23, 59, 59, 999));
    const eligibleUntil = new Date(periodStart.getTime() - 7 * 24 * 60 * 60 * 1000);

    const skippedList: any[] = [];

    // --- A. Weekly ROI Skipped ---
    const activePurchases = await UserPlanPurchaseModel.find({ status: "active", purchasedAt: { $lte: eligibleUntil } })
      .populate("userId", "username email")
      .lean();

    const generatedRoiTxns = await TransactionModel.find({
      type: "reward",
      payoutKind: "weekly",
      payoutPeriodEnd: periodEnd,
    }).lean();
    const generatedRoiSourceIds = new Set(generatedRoiTxns.map(t => String(t.payoutSourceTransactionId)));

    const allUserIds = [...new Set(activePurchases.map(p => String(p.userId)))];
    const userCaps = await getRemainingRewardCapacityByUserId(allUserIds);

    for (const p of activePurchases) {
      const uId = String(p.userId);
      const user = p.userId as any;
      if (!user) continue;

      const remainingCap = userCaps.get(uId) ?? 0;
      const alreadyHasRoi = generatedRoiSourceIds.has(String(p.sourceTransactionId));

      if (!alreadyHasRoi && remainingCap > 0) {
        skippedList.push({
          userId: uId,
          username: user.username || "Unknown",
          email: user.email || "No email",
          payoutKind: "weekly",
          description: `Skipped Weekly ROI for plan "${p.name || p.tier}" ($${p.amountUsdt} USDT)`,
          amountUsdt: roundUsdt(Math.min((p.amountUsdt * p.weeklyReturnPercent) / 100, remainingCap)),
          sourceId: String(p.sourceTransactionId),
          details: `Plan purchased: ${new Date(p.purchasedAt).toLocaleDateString()}, ROI %: ${p.weeklyReturnPercent}%, Remaining Cap: $${remainingCap} USDT`
        });
      }
    }

    // --- B. Level Income Skipped ---
    const completedPurchases = await TransactionModel.find({ type: "plan_purchase", status: "completed" })
      .populate("userId", "username")
      .lean();

    const recentPurchases = completedPurchases.slice(-100);

    for (const pur of recentPurchases) {
      const purchaseUser = pur.userId as any;
      const ref = await ReferralModel.findOne({ userId: pur.userId }).lean();
      if (!ref || !ref.path || !ref.path.length) continue;

      const generatedLevelTxns = await TransactionModel.find({
        type: "reward",
        payoutKind: "level",
        payoutSourceTransactionId: pur._id
      }).lean();
      const generatedSponsorIds = new Set(generatedLevelTxns.map(t => String(t.userId)));

      const path = ref.path.map(id => String(id)).reverse();
      const ruleSet = await planRepository.ensureDefaultRuleSet();
      const levelRules = [...ruleSet.levelIncomeRules]
        .filter((rule) => rule.isActive !== false)
        .sort((ruleA, ruleB) => ruleA.level - ruleB.level);

      const maxLevel = Math.max(0, ...levelRules.map((rule) => rule.level));
      const activeSponsors = await UserModel.find({
        _id: { $in: path.slice(0, maxLevel).map(toObjectId) },
        role: "user",
        status: "active"
      }).lean();
      const activeSponsorIds = new Set(activeSponsors.map(u => String(u._id)));
      const sponsorCaps = await getRemainingRewardCapacityByUserId([...activeSponsorIds]);

      for (let i = 0; i < Math.min(path.length, maxLevel); i++) {
        const sponsorId = path[i];
        const levelNum = i + 1;
        const rule = levelRules.find(r => r.level === levelNum);
        if (!rule) continue;

        if (activeSponsorIds.has(sponsorId) && !generatedSponsorIds.has(sponsorId)) {
          const sponsorUser = activeSponsors.find(u => String(u._id) === sponsorId);
          const remainingCap = sponsorCaps.get(sponsorId) ?? 0;
          const levelAmount = roundUsdt((pur.amountUsdt * rule.percent) / 100);
          const claimableAmount = roundUsdt(Math.min(levelAmount, remainingCap));

          if (claimableAmount > 0) {
            skippedList.push({
              userId: sponsorId,
              username: sponsorUser?.username || "Unknown",
              email: sponsorUser?.email || "No email",
              payoutKind: "level",
              description: `Skipped Level L${levelNum} Income from downline "${purchaseUser?.username || 'user'}" purchase ($${pur.amountUsdt} USDT)`,
              amountUsdt: claimableAmount,
              sourceId: String(pur._id),
              details: `Level %: ${rule.percent}%, Downline Purchase Date: ${new Date(pur.createdAt).toLocaleDateString()}, Remaining Cap: $${remainingCap} USDT`
            });
          }
        }
      }
    }

    // --- C. Salary & Royalty Skipped ---
    const royaltyPeriod = getSalaryRoyaltyPeriod();
    const { userRoyaltyRankMap } = await calculateUserRoyaltyRanks();
    const qualifiedUserIds = [...userRoyaltyRankMap.keys()].filter(id => (userRoyaltyRankMap.get(id) ?? 0) >= 1);

    if (qualifiedUserIds.length > 0) {
      const existingSalaryRewards = await TransactionModel.find({
        payoutKind: "salary_royalty",
        payoutPeriodStart: { $gte: royaltyPeriod.start, $lte: royaltyPeriod.end },
        type: "reward",
      }).lean();
      const rewardedUserIds = new Set(existingSalaryRewards.map(t => String(t.userId)));

      const ruleSet = await planRepository.ensureDefaultRuleSet();
      const activeSalaryRules = [...ruleSet.salaryRoyaltyRules].filter(rule => rule.isActive !== false);

      const daysInPeriod = Math.round((royaltyPeriod.end.getTime() - royaltyPeriod.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const qualifiedUsers = await UserModel.find({ _id: { $in: qualifiedUserIds.map(toObjectId) }, role: "user", status: "active" }).lean();
      const userCaps = await getRemainingRewardCapacityByUserId(qualifiedUsers.map(u => String(u._id)));

      for (const u of qualifiedUsers) {
        const uId = String(u._id);
        const rank = userRoyaltyRankMap.get(uId) ?? 0;
        const rule = activeSalaryRules.find((r) => r.royaltyPool === `M${rank}`);
        if (!rule) continue;

        const alreadyHasSalary = rewardedUserIds.has(uId);
        const remainingCap = userCaps.get(uId) ?? 0;

        if (!alreadyHasSalary && remainingCap > 0) {
          const salaryAmount = roundUsdt(rule.bonusUsdt * daysInPeriod);
          const claimableAmount = roundUsdt(Math.min(salaryAmount, remainingCap));

          if (claimableAmount > 0) {
            skippedList.push({
              userId: uId,
              username: u.username || "Unknown",
              email: u.email || "No email",
              payoutKind: "salary_royalty",
              description: `Skipped Monthly Salary/Royalty for rank "M${rank}"`,
              amountUsdt: claimableAmount,
              sourceId: `SR-${royaltyPeriod.start.toISOString().slice(0, 7)}`,
              details: `Monthly Rank: M${rank}, Qualified Days: ${daysInPeriod}, Remaining Cap: $${remainingCap} USDT`
            });
          }
        }
      }
    }

    return skippedList;
  }

  async processSkippedPayout(input: {
    userId: string;
    payoutKind: string;
    amountUsdt: number;
    sourceId: string;
    notes?: string;
    adminUserId?: string;
  }) {
    const user = await UserModel.findById(input.userId);
    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found.");
    }

    let notes = input.notes || `Manually processed missing payout (${input.payoutKind})`;
    let payoutTier: string | null = null;

    if (input.payoutKind === "level") {
      payoutTier = "LEVEL";
    }

    const tx = new TransactionModel({
      userId: input.userId,
      type: "reward",
      status: "completed",
      amountUsdt: input.amountUsdt,
      payoutKind: input.payoutKind,
      payoutTier,
      notes,
      reviewedBy: input.adminUserId,
      reviewedAt: new Date(),
      txnHash: `SYS-MAN-${new Types.ObjectId().toString().toUpperCase()}`
    });

    if (input.payoutKind === "weekly" || input.payoutKind === "level") {
      tx.payoutSourceTransactionId = input.sourceId as any;
    }

    await tx.save();

    await Promise.all([
      walletRepository.creditReward(input.userId, input.amountUsdt),
      walletRepository.debitAdminPayout(input.amountUsdt),
    ]);

    return tx.toObject();
  }
}

export const superAdminService = new SuperAdminService();
