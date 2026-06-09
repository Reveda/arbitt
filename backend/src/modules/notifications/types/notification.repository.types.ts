export type NotificationRepositoryRecord = {
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
