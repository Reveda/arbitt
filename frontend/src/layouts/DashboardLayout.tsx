import { useEffect, useState, type ComponentType } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  ClipboardList,
  BarChart3,
  Bell,
  CircleDollarSign,
  CreditCard,
  FileText,
  HandCoins,
  Headphones,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
  UserRound,
  UserCog,
  UsersRound,
  Wallet,
  WalletCards,
  X
} from "lucide-react";
import arbitrumMark from "@/assets/arbitrum-mark-clean.png";
import { APP_ROUTES } from "@/api/endpoints";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLogoutAccount } from "@/hooks/useAuthActions";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { cn } from "@/lib/utils";
import { adminService } from "@/services/admin.service";

type DashboardRole = "user" | "admin" | "super_admin";

type DashboardLayoutProps = {
  role: DashboardRole;
};

type AdminPendingCountKey = "pendingDeposits" | "pendingPlanPurchases" | "pendingWithdrawals" | "pendingPayouts";

type DashboardNavLink = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  end?: boolean;
  badgeKey?: AdminPendingCountKey;
  badge?: string;
};

const userLinks = [
  { to: APP_ROUTES.user.dashboard, label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: APP_ROUTES.user.profile, label: "My Profile", icon: UserRound },
  { to: APP_ROUTES.user.team, label: "My Team", icon: UsersRound },
  { to: APP_ROUTES.user.earnings, label: "Earnings", icon: CircleDollarSign },
  { to: APP_ROUTES.user.deposit, label: "Deposit", icon: ArrowDownLeft },
  { to: APP_ROUTES.user.withdraw, label: "Withdraw", icon: ArrowUpRight },
  { to: APP_ROUTES.user.transactions, label: "Transactions", icon: Activity },
  { to: APP_ROUTES.user.support, label: "Support", icon: Headphones }
];

const adminLinks: DashboardNavLink[] = [
  { to: APP_ROUTES.admin.dashboard, label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: APP_ROUTES.admin.users, label: "User Management", icon: UserCog },
  { to: APP_ROUTES.admin.deposits, label: "Wallet Top-ups", icon: WalletCards },
  { to: APP_ROUTES.admin.withdrawals, label: "Withdrawal Approval", icon: CreditCard, badgeKey: "pendingWithdrawals" },
  { to: APP_ROUTES.admin.payouts, label: "Payouts", icon: HandCoins, badgeKey: "pendingPayouts" },
  { to: APP_ROUTES.admin.referrals, label: "Referral Network", icon: Network },
  { to: APP_ROUTES.admin.wallets, label: "Wallet Control", icon: Wallet },
  { to: APP_ROUTES.admin.transactions, label: "Transactions", icon: Activity },
  { to: APP_ROUTES.admin.plans, label: "Plan Management", icon: FileText, badgeKey: "pendingPlanPurchases" },
  { to: APP_ROUTES.admin.analytics, label: "Revenue Analytics", icon: BarChart3 },
  { to: APP_ROUTES.admin.support, label: "Support Tickets", icon: LifeBuoy },
  { to: APP_ROUTES.admin.notifications, label: "Notifications", icon: Bell }
];

const superAdminLinks: DashboardNavLink[] = [
  { to: APP_ROUTES.superAdmin.dashboard, label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: APP_ROUTES.superAdmin.admins, label: "Admin Management", icon: UserCog },
  { to: APP_ROUTES.superAdmin.auditLogs, label: "Audit Logs", icon: ClipboardList },
  { to: APP_ROUTES.superAdmin.platformSettings, label: "Platform Settings", icon: Settings },
  { to: APP_ROUTES.superAdmin.payoutCorrections, label: "Payout Corrections", icon: HandCoins },
  { to: APP_ROUTES.superAdmin.transactions, label: "Transaction Review", icon: Activity },
  { to: APP_ROUTES.superAdmin.security, label: "Security Control", icon: ShieldCheck },
  { to: APP_ROUTES.superAdmin.roles, label: "Roles & Permissions", icon: UsersRound },
  { to: APP_ROUTES.superAdmin.notifications, label: "Notifications", icon: Bell },
  { to: APP_ROUTES.superAdmin.support, label: "Support Escalations", icon: LifeBuoy }
];

export function DashboardLayout({ role }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const logoutMutation = useLogoutAccount();
  const currentUserQuery = useCurrentUser();
  const [isAdminSidebarCollapsed, setIsAdminSidebarCollapsed] = useState(false);
  const [isAdminMobileMenuOpen, setIsAdminMobileMenuOpen] = useState(false);
  const [isUserSidebarCollapsed, setIsUserSidebarCollapsed] = useState(false);
  const [isUserMobileMenuOpen, setIsUserMobileMenuOpen] = useState(false);
  const [adminPendingCounts, setAdminPendingCounts] = useState({
    pendingDeposits: 0,
    pendingPlanPurchases: 0,
    pendingPayouts: 0,
    pendingWithdrawals: 0
  });
  const isControlPanel = role !== "user";
  const controlPanelLabel = role === "super_admin" ? "Super Admin" : "Admin";
  const controlPanelSubtitle = role === "super_admin" ? "Governance Console" : "Management Console";
  const controlProfileRoute = role === "super_admin" ? APP_ROUTES.superAdmin.profile : APP_ROUTES.admin.profile;
  const controlInitial = role === "super_admin" ? "S" : "A";
  const controlNavigationBase = role === "super_admin" ? superAdminLinks : adminLinks;
  const adminNavigationLinks = controlNavigationBase.map((item) => ({
    ...item,
    badge: item.badgeKey ? String(adminPendingCounts[item.badgeKey]) : undefined
  }));

  const handleLogout = async () => {
    try {
      await logoutMutation.mutate(undefined);
      navigate(APP_ROUTES.public.login, { replace: true });
      return true;
    } catch {
      // The sidebar shows the logout error so the user knows the session was not cleared.
      return false;
    }
  };

  const handleMobileLogout = async () => {
    const didLogout = await handleLogout();
    if (didLogout) {
      setIsAdminMobileMenuOpen(false);
      setIsUserMobileMenuOpen(false);
    }
  };

  useEffect(() => {
    const isMenuOpen = isControlPanel ? isAdminMobileMenuOpen : isUserMobileMenuOpen;

    if (!isMenuOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isAdminMobileMenuOpen, isControlPanel, isUserMobileMenuOpen]);

  useEffect(() => {
    if (!isControlPanel) {
      return undefined;
    }

    let active = true;

    const loadCounts = () => {
      adminService
        .getOverview()
        .then((response) => {
          if (!active) {
            return;
          }

          setAdminPendingCounts({
            pendingDeposits: response.data.pendingDeposits,
            pendingPlanPurchases: response.data.pendingPlanPurchases,
            pendingPayouts: response.data.pendingPayouts,
            pendingWithdrawals: response.data.pendingWithdrawals
          });
        })
        .catch(() => undefined);
    };

    const handleFocus = () => loadCounts();
    loadCounts();
    window.addEventListener("focus", handleFocus);
    const intervalId = window.setInterval(loadCounts, 30_000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [isControlPanel]);

  if (isControlPanel) {
    return (
      <div
        className={cn(
          "min-h-screen bg-[#eef5ff] text-slate-950 transition-[grid-template-columns] duration-300 lg:grid",
          isAdminSidebarCollapsed ? "lg:grid-cols-[84px_minmax(0,1fr)]" : "lg:grid-cols-[286px_minmax(0,1fr)]"
        )}
      >
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-cyan-300/20 bg-gradient-to-r from-[#020918] via-[#061225] to-[#07324a] px-4 py-3 text-white shadow-[0_18px_46px_rgba(2,8,23,0.34)] lg:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-cyan-300/35 bg-cyan-300/10 shadow-[0_0_24px_rgba(34,211,238,0.24)]">
              <img alt="ARBITRUM" className="size-7 object-contain" src={arbitrumMark} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-black leading-none tracking-wide text-white drop-shadow">
                ARBITRUM {controlPanelLabel.toUpperCase()}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-cyan-100/80">{controlPanelSubtitle}</p>
            </div>
          </div>
          <button
            aria-expanded={isAdminMobileMenuOpen}
            aria-label={`Open ${controlPanelLabel.toLowerCase()} menu`}
            className="grid size-10 place-items-center rounded-xl border border-cyan-300/35 bg-cyan-300/10 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.12)] transition-colors active:bg-cyan-300/18"
            onClick={() => setIsAdminMobileMenuOpen(true)}
            type="button"
          >
            <Menu className="size-5" />
          </button>
        </header>

        {isAdminMobileMenuOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              aria-label={`Close ${controlPanelLabel.toLowerCase()} menu overlay`}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
              onClick={() => setIsAdminMobileMenuOpen(false)}
              type="button"
            />
            <aside className="absolute right-0 top-0 flex h-[100dvh] w-[min(88vw,360px)] flex-col border-l border-cyan-300/15 bg-[#020918] text-white shadow-[-28px_0_80px_rgba(2,8,23,0.42)]">
              <div className="flex items-center justify-between gap-3 border-b border-cyan-300/10 px-4 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-cyan-300/35 bg-cyan-300/10 shadow-[0_0_24px_rgba(34,211,238,0.24)]">
                    <img alt="ARBITRUM" className="size-7 object-contain" src={arbitrumMark} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold leading-none tracking-wide">{controlPanelLabel} Menu</p>
                    <p className="mt-1 text-[11px] font-medium text-cyan-100/65">Tap a module to open</p>
                  </div>
                </div>
                <button
                  aria-label={`Close ${controlPanelLabel.toLowerCase()} menu`}
                  className="grid size-10 shrink-0 place-items-center rounded-xl border border-cyan-300/20 bg-white/[0.04] text-cyan-100 transition-colors active:bg-cyan-300/10"
                  onClick={() => setIsAdminMobileMenuOpen(false)}
                  type="button"
                >
                  <X className="size-5" />
                </button>
              </div>

              <ScrollArea className="min-h-0 flex-1">
                <nav className="grid gap-2 px-4 py-4">
                  {adminNavigationLinks.map((item) => {
                    const Icon = item.icon;

                    return (
                      <NavLink
                        key={item.label}
                        end={item.end}
                        onClick={() => setIsAdminMobileMenuOpen(false)}
                        to={item.to}
                        className={({ isActive }) =>
                          cn(
                            "group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-all duration-200",
                            isActive
                              ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-[0_14px_32px_rgba(34,211,238,0.22)]"
                              : "text-slate-300 active:bg-cyan-300/[0.08]"
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <Icon className={cn("size-4 shrink-0", isActive ? "text-slate-950" : "text-cyan-100/78")} />
                            <span className="min-w-0 flex-1 truncate">{item.label}</span>
                            {item.badge ? (
                              <span
                                className={cn(
                                  "rounded-full border px-2 py-0.5 text-[10px]",
                                  isActive ? "border-slate-950/20 text-slate-950/80" : "border-cyan-300/25 text-cyan-100/80"
                                )}
                              >
                                {item.badge}
                              </span>
                            ) : null}
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                  <button
                    className="group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-300 transition-all duration-200 active:bg-rose-400/10 active:text-rose-100 disabled:pointer-events-none disabled:opacity-70"
                    disabled={logoutMutation.isLoading}
                    onClick={handleMobileLogout}
                    type="button"
                  >
                    <LogOut className="size-4 shrink-0 text-cyan-100/78" />
                    <span className="min-w-0 flex-1 truncate">{logoutMutation.isLoading ? "Logging out..." : "Logout"}</span>
                  </button>
                  {logoutMutation.error ? <p className="px-3 text-[11px] font-medium text-rose-200">{logoutMutation.error}</p> : null}
                </nav>
              </ScrollArea>

              <div className="border-t border-cyan-300/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <NavLink
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-2xl border p-3 transition-all duration-200",
                      isActive
                        ? "border-cyan-300/45 bg-cyan-300/12 shadow-[0_16px_34px_rgba(34,211,238,0.18)]"
                        : "border-cyan-300/15 bg-[#061225] active:bg-cyan-300/[0.08]"
                    )
                  }
                  onClick={() => setIsAdminMobileMenuOpen(false)}
                  to={controlProfileRoute}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-cyan-300 to-blue-500 text-sm font-black text-slate-950">
                    {controlInitial}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-white">{controlPanelLabel} Account</p>
                    <p className="truncate text-[11px] text-cyan-100/55">Secure governance access</p>
                  </div>
                  <ShieldCheck className="ml-auto size-4 text-emerald-300" />
                </NavLink>
              </div>
            </aside>
          </div>
        ) : null}

        <aside className="sticky top-0 z-40 hidden flex-col border-b border-cyan-300/15 bg-[#020918] text-white shadow-[0_20px_70px_rgba(2,8,23,0.28)] lg:flex lg:h-screen lg:border-b-0 lg:border-r lg:border-cyan-300/15">
          <div
            className={cn(
              "flex items-center gap-3 border-b border-cyan-300/10 px-4 py-4",
              isAdminSidebarCollapsed ? "lg:flex-col lg:gap-2 lg:px-3 lg:py-3" : "justify-between"
            )}
          >
            <div className={cn("flex min-w-0 items-center gap-3", isAdminSidebarCollapsed && "lg:flex-col lg:justify-center lg:gap-1")}>
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-cyan-300/35 bg-cyan-300/10 shadow-[0_0_24px_rgba(34,211,238,0.24)]">
                <img alt="ARBITRUM" className="size-7 object-contain" src={arbitrumMark} />
              </span>
              <div className={cn("min-w-0", isAdminSidebarCollapsed && "lg:hidden")}>
                <p className="truncate text-sm font-bold leading-none tracking-wide">
                  ARBITRUM {controlPanelLabel.toUpperCase()}
                </p>
                <p className="mt-1 text-[11px] font-medium text-cyan-100/65">{controlPanelSubtitle}</p>
              </div>
            </div>
            <button
              aria-label={
                isAdminSidebarCollapsed
                  ? `Expand ${controlPanelLabel.toLowerCase()} sidebar`
                  : `Collapse ${controlPanelLabel.toLowerCase()} sidebar`
              }
              className={cn(
                "hidden size-9 shrink-0 place-items-center rounded-xl border border-cyan-300/20 bg-white/[0.04] text-cyan-100 transition-colors hover:bg-cyan-300/10 lg:grid",
                isAdminSidebarCollapsed && "lg:size-8"
              )}
              onClick={() => setIsAdminSidebarCollapsed((prev) => !prev)}
              type="button"
            >
              {isAdminSidebarCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            </button>
          </div>

          <ScrollArea className="min-h-0 flex-1 lg:h-[calc(100vh-15.5rem)]">
            <nav className="flex gap-2 px-3 py-3 sm:grid sm:grid-cols-2 lg:grid-cols-1 lg:py-4 lg:pr-4">
              {adminNavigationLinks.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.label}
                    end={item.end}
                    title={isAdminSidebarCollapsed ? item.label : undefined}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        "group flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-all duration-200 sm:shrink lg:w-full",
                        isAdminSidebarCollapsed && "lg:justify-center lg:px-0",
                        isActive
                          ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-[0_14px_32px_rgba(34,211,238,0.22)]"
                          : "text-slate-300 hover:bg-cyan-300/[0.08] hover:text-white"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={cn("size-4 shrink-0", isActive ? "text-slate-950" : "text-cyan-100/78 group-hover:text-cyan-100")} />
                        <span className={cn("min-w-0 flex-1 truncate", isAdminSidebarCollapsed && "lg:hidden")}>{item.label}</span>
                        {item.badge ? (
                          <span
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-[10px]",
                              isActive ? "border-slate-950/20 text-slate-950/80" : "border-cyan-300/25 text-cyan-100/80",
                              isAdminSidebarCollapsed && "lg:hidden"
                            )}
                          >
                            {item.badge}
                          </span>
                        ) : null}
                      </>
                    )}
                  </NavLink>
                );
              })}
              <button
                className={cn(
                  "group flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-slate-300 transition-all duration-200 hover:bg-rose-400/10 hover:text-rose-100 sm:shrink lg:w-full",
                  isAdminSidebarCollapsed && "lg:justify-center lg:px-0",
                  logoutMutation.isLoading && "pointer-events-none opacity-70"
                )}
                disabled={logoutMutation.isLoading}
                onClick={handleLogout}
                title={isAdminSidebarCollapsed ? "Logout" : undefined}
                type="button"
              >
                <LogOut className="size-4 shrink-0 text-cyan-100/78 group-hover:text-rose-100" />
                <span className={cn("min-w-0 flex-1 truncate", isAdminSidebarCollapsed && "lg:hidden")}>
                  {logoutMutation.isLoading ? "Logging out..." : "Logout"}
                </span>
              </button>
              {logoutMutation.error ? (
                <p className={cn("px-3 text-[11px] font-medium text-rose-200", isAdminSidebarCollapsed && "lg:hidden")}>
                  {logoutMutation.error}
                </p>
              ) : null}
            </nav>
          </ScrollArea>

          <div className={cn("border-t border-cyan-300/10 p-3", isAdminSidebarCollapsed && "lg:px-2")}>
            <NavLink
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-2xl border p-3 transition-all duration-200",
                  isAdminSidebarCollapsed && "lg:justify-center lg:p-2",
                  isActive
                    ? "border-cyan-300/45 bg-cyan-300/12 shadow-[0_16px_34px_rgba(34,211,238,0.18)]"
                    : "border-cyan-300/15 bg-[#061225] hover:bg-cyan-300/[0.08]"
                )
              }
              title={isAdminSidebarCollapsed ? `${controlPanelLabel} Profile` : undefined}
              to={controlProfileRoute}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-cyan-300 to-blue-500 text-sm font-black text-slate-950">
                {controlInitial}
              </span>
              <div className={cn("min-w-0", isAdminSidebarCollapsed && "lg:hidden")}>
                <p className="truncate text-xs font-bold text-white">{controlPanelLabel} Account</p>
                <p className="truncate text-[11px] text-cyan-100/55">Secure access active</p>
              </div>
              <ShieldCheck className={cn("ml-auto size-4 text-emerald-300", isAdminSidebarCollapsed && "lg:hidden")} />
            </NavLink>
          </div>
        </aside>
        <section className="min-w-0 p-2.5 sm:p-5 lg:p-6">
          <Outlet />
        </section>
      </div>
    );
  }

  const currentUser = currentUserQuery.user;
  const userDisplayName = currentUser?.username ?? "User Account";
  const userInitial = userDisplayName.charAt(0).toUpperCase();
  const userAccountLabel = "Secure member access";

  return (
    <div
      className={cn(
        "min-h-screen bg-[#eef5ff] text-slate-950 transition-[grid-template-columns] duration-300 lg:grid",
        isUserSidebarCollapsed ? "lg:grid-cols-[84px_minmax(0,1fr)]" : "lg:grid-cols-[286px_minmax(0,1fr)]"
      )}
    >
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-cyan-300/20 bg-gradient-to-r from-[#020918] via-[#061225] to-[#07324a] px-4 py-3 text-white shadow-[0_18px_46px_rgba(2,8,23,0.34)] lg:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-cyan-300/35 bg-cyan-300/10 shadow-[0_0_24px_rgba(34,211,238,0.24)]">
            <img alt="ARBITRUM" className="size-7 object-contain" src={arbitrumMark} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black leading-none tracking-wide text-white drop-shadow">ARBITRUM</p>
            <p className="mt-1 text-[11px] font-semibold text-cyan-100/80 truncate">{userDisplayName}</p>
          </div>
        </div>
        <button
          aria-expanded={isUserMobileMenuOpen}
          aria-label="Open user menu"
          className="grid size-10 place-items-center rounded-xl border border-cyan-300/35 bg-cyan-300/10 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.12)] transition-colors active:bg-cyan-300/18"
          onClick={() => setIsUserMobileMenuOpen(true)}
          type="button"
        >
          <Menu className="size-5" />
        </button>
      </header>

      {isUserMobileMenuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close user menu overlay"
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setIsUserMobileMenuOpen(false)}
            type="button"
          />
          <aside className="absolute right-0 top-0 flex h-[100dvh] w-[min(88vw,360px)] flex-col border-l border-cyan-300/15 bg-[#020918] text-white shadow-[-28px_0_80px_rgba(2,8,23,0.42)]">
            <div className="flex items-center justify-between gap-3 border-b border-cyan-300/10 px-4 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-cyan-300/35 bg-cyan-300/10 shadow-[0_0_24px_rgba(34,211,238,0.24)]">
                  <img alt="ARBITRUM" className="size-7 object-contain" src={arbitrumMark} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold leading-none tracking-wide">User Menu</p>
                  <p className="mt-1 text-[11px] font-medium text-cyan-100/65">Manage account activity</p>
                </div>
              </div>
              <button
                aria-label="Close user menu"
                className="grid size-10 shrink-0 place-items-center rounded-xl border border-cyan-300/20 bg-white/[0.04] text-cyan-100 transition-colors active:bg-cyan-300/10"
                onClick={() => setIsUserMobileMenuOpen(false)}
                type="button"
              >
                <X className="size-5" />
              </button>
            </div>

            <ScrollArea className="min-h-0 flex-1">
              <nav className="grid gap-2 px-4 py-4">
                {userLinks.map((item) => {
                  const Icon = item.icon;

                  return (
                    <NavLink
                      key={item.label}
                      end={item.end}
                      onClick={() => setIsUserMobileMenuOpen(false)}
                      to={item.to}
                      className={({ isActive }) =>
                        cn(
                          "group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-all duration-200",
                          isActive
                            ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-[0_14px_32px_rgba(34,211,238,0.22)]"
                            : "text-slate-300 active:bg-cyan-300/[0.08]"
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon className={cn("size-4 shrink-0", isActive ? "text-slate-950" : "text-cyan-100/78")} />
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  );
                })}
                <button
                  className="group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-300 transition-all duration-200 active:bg-rose-400/10 active:text-rose-100 disabled:pointer-events-none disabled:opacity-70"
                  disabled={logoutMutation.isLoading}
                  onClick={handleMobileLogout}
                  type="button"
                >
                  <LogOut className="size-4 shrink-0 text-cyan-100/78" />
                  <span className="min-w-0 flex-1 truncate">{logoutMutation.isLoading ? "Logging out..." : "Logout"}</span>
                </button>
                {logoutMutation.error ? <p className="px-3 text-[11px] font-medium text-rose-200">{logoutMutation.error}</p> : null}
              </nav>
            </ScrollArea>

            <div className="border-t border-cyan-300/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <NavLink
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-2xl border p-3 transition-all duration-200",
                    isActive
                      ? "border-cyan-300/45 bg-cyan-300/12 shadow-[0_16px_34px_rgba(34,211,238,0.18)]"
                      : "border-cyan-300/15 bg-[#061225] active:bg-cyan-300/[0.08]"
                  )
                }
                onClick={() => setIsUserMobileMenuOpen(false)}
                to={APP_ROUTES.user.profile}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-cyan-300 to-blue-500 text-sm font-black text-slate-950">
                  {userInitial}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-white">{userDisplayName}</p>
                  <p className="truncate text-[11px] text-cyan-100/55">{userAccountLabel}</p>
                </div>
                <ShieldCheck className="ml-auto size-4 text-emerald-300" />
              </NavLink>
            </div>
          </aside>
        </div>
      ) : null}

      <aside className="sticky top-0 z-40 hidden h-screen flex-col border-r border-cyan-300/15 bg-[#020918] text-white shadow-[0_20px_70px_rgba(2,8,23,0.28)] lg:flex">
        <div
          className={cn(
            "flex items-center gap-3 border-b border-cyan-300/10 px-4 py-4",
            isUserSidebarCollapsed ? "lg:flex-col lg:gap-2 lg:px-3 lg:py-3" : "justify-between"
          )}
        >
          <div className={cn("flex min-w-0 items-center gap-3", isUserSidebarCollapsed && "lg:flex-col lg:justify-center lg:gap-1")}>
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-cyan-300/35 bg-cyan-300/10 shadow-[0_0_24px_rgba(34,211,238,0.24)]">
              <img alt="ARBITRUM" className="size-7 object-contain" src={arbitrumMark} />
            </span>
            <div className={cn("min-w-0", isUserSidebarCollapsed && "lg:hidden")}>
              <p className="truncate text-sm font-bold leading-none tracking-wide">ARBITRUM</p>
              <p className="mt-1 text-[11px] font-medium text-cyan-100/65 truncate">{userDisplayName}</p>
            </div>
          </div>
          <button
            aria-label={isUserSidebarCollapsed ? "Expand user sidebar" : "Collapse user sidebar"}
            className={cn(
              "hidden size-9 shrink-0 place-items-center rounded-xl border border-cyan-300/20 bg-white/[0.04] text-cyan-100 transition-colors hover:bg-cyan-300/10 lg:grid",
              isUserSidebarCollapsed && "lg:size-8"
            )}
            onClick={() => setIsUserSidebarCollapsed((prev) => !prev)}
            type="button"
          >
            {isUserSidebarCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        </div>

        <ScrollArea className="min-h-0 flex-1 lg:h-[calc(100vh-13rem)]">
          <nav className={cn("grid gap-2 px-3 py-4 pr-4", isUserSidebarCollapsed && "lg:px-2")}>
            {userLinks.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.label}
                  end={item.end}
                  title={isUserSidebarCollapsed ? item.label : undefined}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-all duration-200",
                      isUserSidebarCollapsed && "lg:justify-center lg:px-0",
                      isActive
                        ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-[0_14px_32px_rgba(34,211,238,0.22)]"
                        : "text-slate-300 hover:bg-cyan-300/[0.08] hover:text-white"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={cn("size-4 shrink-0", isActive ? "text-slate-950" : "text-cyan-100/78 group-hover:text-cyan-100")} />
                      <span className={cn("min-w-0 flex-1 truncate", isUserSidebarCollapsed && "lg:hidden")}>{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
            <button
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-slate-300 transition-all duration-200 hover:bg-rose-400/10 hover:text-rose-100 disabled:pointer-events-none disabled:opacity-70",
                isUserSidebarCollapsed && "lg:justify-center lg:px-0"
              )}
              disabled={logoutMutation.isLoading}
              onClick={handleLogout}
              title={isUserSidebarCollapsed ? "Logout" : undefined}
              type="button"
            >
              <LogOut className="size-4 shrink-0 text-cyan-100/78 group-hover:text-rose-100" />
              <span className={cn("min-w-0 flex-1 truncate", isUserSidebarCollapsed && "lg:hidden")}>
                {logoutMutation.isLoading ? "Logging out..." : "Logout"}
              </span>
            </button>
            {logoutMutation.error ? (
              <p className={cn("px-3 text-[11px] font-medium text-rose-200", isUserSidebarCollapsed && "lg:hidden")}>
                {logoutMutation.error}
              </p>
            ) : null}
          </nav>
        </ScrollArea>

        <div className={cn("border-t border-cyan-300/10 p-3", isUserSidebarCollapsed && "lg:px-2")}>
          <NavLink
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-2xl border p-3 transition-all duration-200",
                isUserSidebarCollapsed && "lg:justify-center lg:p-2",
                isActive
                  ? "border-cyan-300/45 bg-cyan-300/12 shadow-[0_16px_34px_rgba(34,211,238,0.18)]"
                  : "border-cyan-300/15 bg-[#061225] hover:bg-cyan-300/[0.08]"
              )
            }
            title={isUserSidebarCollapsed ? userDisplayName : undefined}
            to={APP_ROUTES.user.profile}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-cyan-300 to-blue-500 text-sm font-black text-slate-950">
              {userInitial}
            </span>
            <div className={cn("min-w-0", isUserSidebarCollapsed && "lg:hidden")}>
              <p className="truncate text-xs font-bold text-white">{userDisplayName}</p>
            </div>
            <ShieldCheck className={cn("ml-auto size-4 text-emerald-300", isUserSidebarCollapsed && "lg:hidden")} />
          </NavLink>
        </div>
      </aside>

      <section className="min-w-0 p-2.5 sm:p-5 lg:p-6">
        <Outlet />
      </section>
    </div>
  );
}
