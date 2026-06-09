import { APP_ROUTES } from "@/api/endpoints";
import type { AuthUser } from "@/services/auth.service";

export function getDashboardRouteForUser(user: Pick<AuthUser, "role">) {
  if (user.role === "super_admin") {
    return APP_ROUTES.superAdmin.dashboard;
  }

  return user.role === "admin" ? APP_ROUTES.admin.dashboard : APP_ROUTES.user.dashboard;
}
