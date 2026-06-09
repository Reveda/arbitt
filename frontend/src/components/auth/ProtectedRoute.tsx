import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { APP_ROUTES } from "@/api/endpoints";
import { getDashboardRouteForUser } from "@/lib/authNavigation";
import type { AuthUser } from "@/services/auth.service";
import { useCurrentUserQuery } from "@/store/api/authApi";

type ProtectedRouteProps = {
  allowedRoles: AuthUser["role"][];
  children: ReactNode;
};

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const location = useLocation();
  const currentUserQuery = useCurrentUserQuery();
  const [showLoader, setShowLoader] = useState(false);
  const allowedRolesKey = allowedRoles.join("|");
  const allowedRoleSet = useMemo(() => new Set(allowedRoles), [allowedRolesKey]);
  const user = currentUserQuery.data?.data.user ?? null;
  const isChecking = currentUserQuery.isLoading || currentUserQuery.isFetching;

  useEffect(() => {
    if (!isChecking) {
      setShowLoader(false);
      return undefined;
    }

    const timerId = window.setTimeout(() => setShowLoader(true), 240);
    return () => window.clearTimeout(timerId);
  }, [isChecking]);

  if (isChecking) {
    if (!showLoader) {
      return <div className="min-h-screen bg-[#eef5ff]" />;
    }

    return (
      <div className="min-h-screen bg-[#eef5ff] p-4 sm:p-6">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="h-16 animate-pulse rounded-2xl bg-white shadow-sm" />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="h-28 animate-pulse rounded-2xl bg-white shadow-sm" />
            <div className="h-28 animate-pulse rounded-2xl bg-white shadow-sm" />
            <div className="h-28 animate-pulse rounded-2xl bg-white shadow-sm" />
          </div>
          <div className="h-64 animate-pulse rounded-2xl bg-white shadow-sm" />
        </div>
      </div>
    );
  }

  if (!user || currentUserQuery.error) {
    return <Navigate replace state={{ from: location.pathname }} to={APP_ROUTES.public.login} />;
  }

  if (!user.emailVerified) {
    return <Navigate replace state={{ email: user.email, from: location.pathname }} to={APP_ROUTES.public.verifyEmail} />;
  }

  if (!allowedRoleSet.has(user.role)) {
    return <Navigate replace to={getDashboardRouteForUser({ role: user.role })} />;
  }

  return children;
}
