import { env } from "../../../config/env";
import type { PipelineStage } from "mongoose";
import { AuditLogModel } from "../../admin/models/audit-log.model";
import { PlatformSettingModel } from "../../admin/models/platform-setting.model";
import { NotificationModel } from "../../notifications/models/notification.model";
import { PlanRuleSetModel } from "../../plans/models/plan-rule-set.model";
import { TransactionModel } from "../../transactions/models/transaction.model";
import { UserModel } from "../../users/models/user.model";
import { WalletModel } from "../../wallet/models/wallet.model";
import { ApiActivityModel } from "../models/api-activity.model";

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
    notes: record.notes ?? "",
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
}

export const superAdminService = new SuperAdminService();
