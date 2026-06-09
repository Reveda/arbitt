import { notificationRepository } from "../repositories/notification.repository";
import type { ListNotificationsResponseDto, NotificationDto } from "../dtos/notification.dto";

type NotificationRecord = {
  _id?: unknown;
  userId?: unknown;
  type?: string;
  title?: string;
  message?: string;
  readAt?: Date | string | null;
  metadata?: unknown;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
};

function toNotificationDto(record: NotificationRecord): NotificationDto {
  return {
    id: String(record._id),
    userId: String(record.userId),
    type: record.type ?? "system",
    title: record.title ?? "Notification",
    message: record.message ?? "",
    readAt: record.readAt ?? null,
    metadata: record.metadata ?? {},
    createdAt: record.createdAt ?? null,
    updatedAt: record.updatedAt ?? null,
  };
}

export class NotificationService {
  async listNotifications(userId: string): Promise<ListNotificationsResponseDto> {
    const [notifications, unreadCount] = await Promise.all([
      notificationRepository.findByUserId(userId),
      notificationRepository.countUnread(userId),
    ]);

    return {
      unreadCount,
      notifications: notifications.map((notification) =>
        toNotificationDto(notification as NotificationRecord),
      ),
    };
  }
}

export const notificationService = new NotificationService();
