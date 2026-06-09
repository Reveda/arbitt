import type { AuthSessionDocument } from "../models/auth-session.model";

export type AuthSessionRepositoryRecord = AuthSessionDocument & {
  _id: unknown;
};
