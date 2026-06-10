import { createBrowserRouter, Navigate } from "react-router-dom";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bell,
  ClipboardList,
  CreditCard,
  Headphones,
  HandCoins,
  LifeBuoy,
  Settings,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { GuestRoute } from "@/components/auth/GuestRoute";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { APP_ROUTES } from "@/api/endpoints";
import { PublicLayout } from "@/layouts/PublicLayout";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { HomePage } from "@/pages/public/HomePage";
import { AboutPage } from "@/pages/public/AboutPage";
import { ContactUsPage } from "@/pages/public/ContactUsPage";
import { HelpCenterPage } from "@/pages/public/HelpCenterPage";
import { PrivacyPolicyPage } from "@/pages/public/PrivacyPolicyPage";
import { TermsConditionsPage } from "@/pages/public/TermsConditionsPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { VerifyEmailPage } from "@/pages/auth/VerifyEmailPage";
import { UserDashboardPage } from "@/pages/dashboard/UserDashboardPage";
import { TeamPage } from "@/pages/dashboard/TeamPage";
import { UserModulePage } from "@/pages/dashboard/UserModulePage";
import { UserProfilePage } from "@/pages/dashboard/UserProfilePage";
import { WalletPage } from "@/pages/dashboard/WalletPage";
import { DepositPage } from "@/pages/dashboard/DepositPage";
import { EarningsPage } from "@/pages/dashboard/EarningsPage";
import { TransactionsPage } from "@/pages/dashboard/TransactionsPage";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { AdminModulePage } from "@/pages/admin/AdminModulePage";
import { AdminProfilePage } from "@/pages/admin/AdminProfilePage";
import { AdminDepositsPage } from "@/pages/admin/AdminDepositsPage";
import { AdminPayoutsPage } from "@/pages/admin/AdminPayoutsPage";
import { AdminPlansPage } from "@/pages/admin/AdminPlansPage";
import { AdminReferralNetworkPage } from "@/pages/admin/AdminReferralNetworkPage";
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage";
import { AdminWalletsPage } from "@/pages/admin/AdminWalletsPage";
import { SuperAdminDashboardPage } from "@/pages/super-admin/SuperAdminDashboardPage";
import { SuperAdminModulePage } from "@/pages/super-admin/SuperAdminModulePage";
import { NotFoundPage } from "@/pages/shared/NotFoundPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "about", element: <AboutPage /> },
      { path: "contact-us", element: <ContactUsPage /> },
      { path: "help-center", element: <HelpCenterPage /> },
      { path: "privacy-policy", element: <PrivacyPolicyPage /> },
      { path: "terms-and-conditions", element: <TermsConditionsPage /> },
      {
        path: "login",
        element: (
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        )
      },
      {
        path: "register",
        element: (
          <GuestRoute>
            <RegisterPage />
          </GuestRoute>
        )
      },
      {
        path: "forgot-password",
        element: (
          <GuestRoute>
            <ForgotPasswordPage />
          </GuestRoute>
        )
      },
      {
        path: "verify-email",
        element: (
          <GuestRoute>
            <VerifyEmailPage />
          </GuestRoute>
        )
      }
    ]
  },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute allowedRoles={["user"]}>
        <DashboardLayout role="user" />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <UserDashboardPage /> },
      { path: "profile", element: <UserProfilePage /> },
      {
        path: "network",
        element: <Navigate replace to={APP_ROUTES.user.team} />
      },
      { path: "team", element: <TeamPage /> },
      { path: "wallet", element: <WalletPage /> },
      {
        path: "earnings",
        element: <EarningsPage />
      },
      {
        path: "deposit",
        element: <DepositPage />
      },
      {
        path: "withdraw",
        element: <UserModulePage description="Request secure withdrawals and monitor approval status." icon={ArrowUpRight} title="Withdraw" />
      },
      {
        path: "transactions",
        element: <TransactionsPage />
      },
      {
        path: "support",
        element: <UserModulePage description="Raise account, payment, and platform support requests." icon={Headphones} title="Support" />
      }
    ]
  },
  {
    path: "/admin",
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        <DashboardLayout role="admin" />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: "profile", element: <AdminProfilePage /> },
      { path: "users", element: <AdminUsersPage /> },
      {
        path: "deposits",
        element: <AdminDepositsPage />
      },
      {
        path: "withdrawals",
        element: <AdminModulePage description="Approve, reject, and track user withdrawal requests securely." icon={CreditCard} title="Withdrawal Approval" />
      },
      {
        path: "payouts",
        element: <AdminPayoutsPage />
      },
      {
        path: "referrals",
        element: <AdminReferralNetworkPage />
      },
      {
        path: "wallets",
        element: <AdminWalletsPage />
      },
      {
        path: "transactions",
        element: <AdminModulePage description="Browse all deposits, withdrawals, referral bonuses, and system ledger events." icon={Activity} title="Transactions" />
      },
      {
        path: "plans",
        element: <AdminPlansPage />
      },
      {
        path: "analytics",
        element: <AdminModulePage description="Track revenue, user growth, deposit flow, withdrawals, and operational KPIs." icon={BarChart3} title="Revenue Analytics" />
      },
      {
        path: "support",
        element: <AdminModulePage description="Handle contact requests, account issues, payment support, and ticket queues." icon={LifeBuoy} title="Support Tickets" />
      },
      {
        path: "notifications",
        element: <AdminModulePage description="Manage deposit alerts, withdrawal updates, referral events, and security messages." icon={Bell} title="Notifications" />
      }
    ]
  },
  {
    path: "/super-admin",
    element: (
      <ProtectedRoute allowedRoles={["super_admin"]}>
        <DashboardLayout role="super_admin" />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <SuperAdminDashboardPage /> },
      {
        path: "profile",
        element: <SuperAdminModulePage description="Review Super Admin account security, sessions, and governance access." icon={ShieldCheck} moduleKey="profile" title="Super Admin Profile" />
      },
      {
        path: "admins",
        element: <SuperAdminModulePage description="Manage admin accounts, promotions, suspensions, and access boundaries." icon={UserCog} items={["Create or promote admin", "Suspend admin access", "Review admin sessions"]} moduleKey="admins" title="Admin Management" />
      },
      {
        path: "audit-logs",
        element: <SuperAdminModulePage description="Review immutable records for auth, deposits, payouts, wallet changes, and admin actions." icon={ClipboardList} items={["Action timeline", "Actor filters", "Correction history"]} moduleKey="auditLogs" title="Audit Logs" />
      },
      {
        path: "platform-settings",
        element: <SuperAdminModulePage description="Set platform-level policies, wallet rules, payout windows, limits, and security switches." icon={Settings} items={["Wallet policy", "Payout policy", "Rate-limit policy"]} moduleKey="platformSettings" title="Platform Settings" />
      },
      {
        path: "payout-corrections",
        element: <SuperAdminModulePage description="Handle rejected payout reopen/reversal requests with required reason and full audit trail." icon={HandCoins} items={["Rejected payout review", "Correction reason", "Reversal ledger"]} moduleKey="payoutCorrections" title="Payout Corrections" />
      },
      {
        path: "transactions",
        element: <SuperAdminModulePage description="Review sensitive transaction history across deposits, withdrawals, rewards, and adjustments." icon={Activity} moduleKey="transactions" title="Transaction Review" />
      },
      {
        path: "security",
        element: <SuperAdminModulePage description="Manage high-risk security controls, session reviews, and account lock decisions." icon={ShieldCheck} items={["Session control", "Admin lock", "Security alerts"]} moduleKey="security" title="Security Control" />
      },
      {
        path: "roles",
        element: <SuperAdminModulePage description="Control role permissions, admin capabilities, and future RBAC expansion." icon={UserCog} items={["Role matrix", "Permission groups", "Access history"]} moduleKey="roles" title="Roles & Permissions" />
      },
      {
        path: "notifications",
        element: <SuperAdminModulePage description="Govern platform notification templates, critical alerts, and escalation messages." icon={Bell} moduleKey="notifications" title="Notifications" />
      },
      {
        path: "support",
        element: <SuperAdminModulePage description="Review escalated support cases that need platform-level decision making." icon={LifeBuoy} moduleKey="support" title="Support Escalations" />
      }
    ]
  },
  {
    path: "*",
    element: <NotFoundPage />
  }
]);
