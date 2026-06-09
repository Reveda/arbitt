import { NotificationModel } from "../models/notification.model";
import type { NotificationRepositoryRecord } from "../types/notification.repository.types";

export class NotificationRepository {
  async findByUserId(userId: string, limit = 25): Promise<NotificationRepositoryRecord[]> {
    return NotificationModel.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();
  }

  countUnread(userId: string): Promise<number> {
    return NotificationModel.countDocuments({ userId, readAt: null });
  }
}

export const notificationRepository = new NotificationRepository();
