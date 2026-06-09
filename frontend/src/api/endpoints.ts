export const API_ENDPOINTS = {
  auth: {
    register: "/auth/register",
    login: "/auth/login",
    forgotPassword: "/auth/forgot-password",
    requestEmailVerification: "/auth/email-verification/request",
    verifyEmail: "/auth/email-verification/verify",
    resetPassword: "/auth/reset-password",
    refreshToken: "/auth/refresh-token",
    logout: "/auth/logout"
  },
  users: {
    me: "/users/me",
    transactionPassword: "/users/profile/transaction-password",
    walletAddress: "/users/profile/wallet-address"
  },
  admin: {
    overview: "/admin/overview",
    users: "/admin/users",
    referrals: "/admin/referrals",
    deposits: "/admin/deposits",
    planPurchases: "/admin/plan-purchases",
    payouts: "/admin/payouts",
    wallets: "/admin/wallets",
    paymentWallet: "/admin/payment-wallet"
  },
  wallet: {
    summary: "/wallet/summary",
    deposits: "/wallet/deposits"
  },
  payments: {
    depositIntents: "/payments/deposit-intents",
    planIntents: "/payments/plan-intents",
    intent: (intentId: string) => `/payments/intents/${intentId}`,
    intentTxHash: (intentId: string) => `/payments/intents/${intentId}/tx-hash`
  },
  plans: {
    purchases: "/plans/purchases",
    rules: "/plans/rules"
  },
  transactions: {
    list: "/transactions"
  },
  reports: {
    dashboard: "/reports/dashboard",
    earnings: "/reports/earnings"
  },
  superAdmin: {
    admins: "/super-admin/admins",
    apiActivity: "/super-admin/api-activity",
    auditLogs: "/super-admin/audit-logs",
    notifications: "/super-admin/notifications",
    overview: "/super-admin/overview",
    settings: "/super-admin/settings",
    transactions: "/super-admin/transactions"
  },
  referrals: {
    members: "/referrals/members",
    summary: "/referrals/summary",
    tree: "/referrals/tree"
  }
} as const;

export const AUTH_REFRESH_EXCLUDED_ENDPOINTS = [
  API_ENDPOINTS.auth.login,
  API_ENDPOINTS.auth.register,
  API_ENDPOINTS.auth.requestEmailVerification,
  API_ENDPOINTS.auth.verifyEmail,
  API_ENDPOINTS.auth.resetPassword,
  API_ENDPOINTS.auth.refreshToken,
  API_ENDPOINTS.auth.forgotPassword,
  API_ENDPOINTS.auth.logout
] as const;

export const APP_ROUTES = {
  public: {
    home: "/",
    login: "/login",
    register: "/register",
    forgotPassword: "/forgot-password",
    verifyEmail: "/verify-email"
  },
  user: {
    dashboard: "/dashboard",
    profile: "/dashboard/profile",
    network: "/dashboard/network",
    team: "/dashboard/team",
    wallet: "/dashboard/wallet",
    earnings: "/dashboard/earnings",
    deposit: "/dashboard/deposit",
    withdraw: "/dashboard/withdraw",
    transactions: "/dashboard/transactions",
    support: "/dashboard/support"
  },
  admin: {
    dashboard: "/admin",
    profile: "/admin/profile",
    users: "/admin/users",
    deposits: "/admin/deposits",
    payouts: "/admin/payouts",
    withdrawals: "/admin/withdrawals",
    referrals: "/admin/referrals",
    wallets: "/admin/wallets",
    transactions: "/admin/transactions",
    plans: "/admin/plans",
    analytics: "/admin/analytics",
    auditLogs: "/admin/audit-logs",
    support: "/admin/support",
    notifications: "/admin/notifications",
    settings: "/admin/settings"
  },
  superAdmin: {
    dashboard: "/super-admin",
    profile: "/super-admin/profile",
    admins: "/super-admin/admins",
    auditLogs: "/super-admin/audit-logs",
    platformSettings: "/super-admin/platform-settings",
    payoutCorrections: "/super-admin/payout-corrections",
    transactions: "/super-admin/transactions",
    security: "/super-admin/security",
    notifications: "/super-admin/notifications",
    support: "/super-admin/support",
    roles: "/super-admin/roles"
  }
} as const;
