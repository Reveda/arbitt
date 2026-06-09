import type { PipelineStage } from "mongoose";
import { Types } from "mongoose";
import { ReferralModel } from "../models/referral.model";
import type {
  ListTeamMembersRepositoryResult,
  ReferralRepositoryRecord,
} from "../types/referral.repository.types";

type CreateReferralInput = {
  userId: string;
  parentUserId: string | null;
  level: number;
  path: string[];
};

type ListTeamMembersInput = {
  userId: string;
  search?: string;
  skip: number;
  limit: number;
};

type TeamMemberAggregationResult = {
  counts: Array<{ total?: number }>;
  data: unknown[];
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export class ReferralRepository {
  async findByUserId(userId: string): Promise<ReferralRepositoryRecord | null> {
    return ReferralModel.findOne({ userId }).lean();
  }

  async findDirectMembers(userId: string): Promise<ReferralRepositoryRecord[]> {
    return ReferralModel.find({ parentUserId: userId })
      .populate({
        path: "userId",
        select: "username status referralCode emailVerifiedAt createdAt",
      })
      .sort({ createdAt: -1 })
      .lean();
  }

  async findTeamMembers(userId: string): Promise<ReferralRepositoryRecord[]> {
    return ReferralModel.find({ path: userId })
      .populate({
        path: "userId",
        select: "username status referralCode emailVerifiedAt createdAt",
      })
      .sort({ level: 1, createdAt: -1 })
      .lean();
  }

  async listTeamMembers(input: ListTeamMembersInput): Promise<ListTeamMembersRepositoryResult> {
    const rootUserObjectId = new Types.ObjectId(input.userId);
    const search = input.search?.trim();
    const pipeline: PipelineStage[] = [
      { $match: { path: rootUserObjectId } },
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
        $addFields: {
          relativeLevel: {
            $subtract: [{ $size: "$path" }, { $indexOfArray: ["$path", rootUserObjectId] }],
          },
        },
      },
    ];

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      const levelMatch = search.match(/^l?(\d+)$/i);
      const searchConditions: Record<string, unknown>[] = [
        { "user.username": regex },
        { "user.status": regex },
        { "user.referralCode": regex },
      ];

      if (levelMatch) {
        searchConditions.push({ relativeLevel: Number(levelMatch[1]) });
      }

      pipeline.push({ $match: { $or: searchConditions } });
    }

    pipeline.push(
      { $sort: { relativeLevel: 1, createdAt: -1 } },
      {
        $facet: {
          counts: [{ $count: "total" }],
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
                parentUserId: 1,
                path: 1,
                userId: {
                  _id: "$user._id",
                  createdAt: "$user.createdAt",
                  emailVerifiedAt: "$user.emailVerifiedAt",
                  referralCode: "$user.referralCode",
                  status: "$user.status",
                  username: "$user.username",
                },
              },
            },
          ],
        },
      },
    );

    const [result] = await ReferralModel.aggregate<TeamMemberAggregationResult>(pipeline);

    return {
      teamMembers: (result?.data ?? []) as ReferralRepositoryRecord[],
      total: result?.counts[0]?.total ?? 0,
    };
  }

  async createReferral(input: CreateReferralInput): Promise<ReferralRepositoryRecord> {
    const referral = await ReferralModel.create(input);
    return referral.toObject() as ReferralRepositoryRecord;
  }

  async incrementParentStats(parentUserId: string): Promise<ReferralRepositoryRecord | null> {
    return ReferralModel.findOneAndUpdate(
      { userId: parentUserId },
      { $inc: { directCount: 1, activeTeamCount: 1 } },
      { new: true },
    ).lean();
  }
}

export const referralRepository = new ReferralRepository();
