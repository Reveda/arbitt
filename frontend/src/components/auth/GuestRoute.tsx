import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { APP_ROUTES } from "@/api/endpoints";
import { getDashboardRouteForUser } from "@/lib/authNavigation";
import { useCurrentUserQuery } from "@/store/api/authApi";

type GuestRouteProps = {
  children: ReactNode;
};

export function GuestRoute({ children }: GuestRouteProps) {
  const location = useLocation();
  const currentUserQuery = useCurrentUserQuery();
  const user = currentUserQuery.data?.data.user ?? null;

  if (currentUserQuery.isLoading) {
    return <div className="min-h-[20rem]" />;
  }

  if (user && !currentUserQuery.error) {
    if (!user.emailVerified) {
      if (location.pathname === APP_ROUTES.public.verifyEmail) {
        const routeState = (location.state ?? null) as {
          email?: string;
        } | null;

        if (!routeState?.email) {
          return (
            <Navigate
              replace
              state={{ email: user.email, from: location.pathname }}
              to={APP_ROUTES.public.verifyEmail}
            />
          );
        }

        return children;
      }

      return (
        <Navigate
          replace
          state={{ email: user.email, from: location.pathname }}
          to={APP_ROUTES.public.verifyEmail}
        />
      );
    }

    return <Navigate replace to={getDashboardRouteForUser(user)} />;
  }

  return children;
}
