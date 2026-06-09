export type NotificationDto = {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  readAt: Date | string | null;
  metadata: unknown;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
};

export type ListNotificationsResponseDto = {
  unreadCount: number;
  notifications: NotificationDto[];
};
