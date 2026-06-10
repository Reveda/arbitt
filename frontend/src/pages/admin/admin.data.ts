import {
  BadgeDollarSign,
  CircleDollarSign,
  HandCoins,
  UserRoundCheck,
  WalletCards
} from "lucide-react";

export const adminMetrics = [
  { title: "Total Users", value: "25,430", icon: UserRoundCheck, tone: "violet" },
  { title: "Total Top-ups", value: "1245678 USDT", icon: WalletCards, tone: "emerald" },
  { title: "Total Withdrawals", value: "856230 USDT", icon: HandCoins, tone: "orange" },
  { title: "Platform Earnings", value: "0 USDT", icon: CircleDollarSign, tone: "cyan" },
  { title: "Earnings Paid", value: "389448 USDT", icon: BadgeDollarSign, tone: "pink" }
];

export const recentDeposits = [
  { name: "John Doe", amount: "100 USDT", date: "12 Jul 2024", tone: "blue" },
  { name: "Jane Smith", amount: "250 USDT", date: "12 Jul 2024", tone: "violet" },
  { name: "Robert", amount: "500 USDT", date: "11 Jul 2024", tone: "rose" },
  { name: "Michael", amount: "1000 USDT", date: "11 Jul 2024", tone: "amber" }
];

export const adminUsers = [
  { name: "John Doe", username: "john", status: "Active" },
  { name: "Jane Smith", username: "jane", status: "Active" },
  { name: "Robert", username: "robert", status: "Inactive" },
  { name: "Michael", username: "michael", status: "Active" }
];

export const adminTransactions = [
  { type: "Deposit", amount: "100 USDT", user: "John Doe", date: "12 Jul 2024", status: "Completed" },
  { type: "Withdraw", amount: "200 USDT", user: "Jane Smith", date: "12 Jul 2024", status: "Completed" },
  { type: "Referral Bonus", amount: "50 USDT", user: "Robert", date: "11 Jul 2024", status: "Completed" },
  { type: "Level Bonus", amount: "120 USDT", user: "Michael", date: "11 Jul 2024", status: "Completed" }
];

export const adminPlans = [
  { tier: "INITIAL", name: "Initial Pool", minUsdt: 100, maxUsdt: 999, returnMinPercent: 2, returnMaxPercent: 2, status: "Active" },
  { tier: "GROWTH", name: "Growth Pool", minUsdt: 1000, maxUsdt: 2499, returnMinPercent: 3, returnMaxPercent: 3, status: "Active" },
  { tier: "PREMIUM", name: "Premium Pool", minUsdt: 2500, maxUsdt: 4999, returnMinPercent: 4, returnMaxPercent: 4, status: "Active" },
  { tier: "APEX", name: "Apex Pool", minUsdt: 5000, maxUsdt: 9999, returnMinPercent: 5, returnMaxPercent: 5, status: "Active" },
  { tier: "ELITE", name: "Elite Pool", minUsdt: 10000, maxUsdt: 50000, returnMinPercent: 7, returnMaxPercent: 7, status: "Active" }
];

export const levelIncomeRules = [
  { level: "L1", percent: 5, status: "Active" },
  { level: "L2", percent: 2, status: "Active" },
  { level: "L3", percent: 1, status: "Active" },
  { level: "L4", percent: 0.5, status: "Active" },
  { level: "L5", percent: 0.5, status: "Active" },
  { level: "L6", percent: 0.5, status: "Active" },
  { level: "L7", percent: 0.5, status: "Active" }
];

export const salaryRoyaltyRules = [
  { tier: "INITIAL", royaltyPool: "M1", directRequired: 10, requiredDirectTier: null, bonusUsdt: 50, status: "Active" },
  { tier: "GROWTH", royaltyPool: "M2", directRequired: 0, requiredDirectTier: null, bonusUsdt: 150, status: "Active" },
  { tier: "PREMIUM", royaltyPool: "M3", directRequired: 0, requiredDirectTier: null, bonusUsdt: 600, status: "Active" },
  { tier: "APEX", royaltyPool: "M4", directRequired: 0, requiredDirectTier: null, bonusUsdt: 1500, status: "Active" },
  { tier: "ELITE", royaltyPool: "M5", directRequired: 0, requiredDirectTier: null, bonusUsdt: 10000, status: "Active" }
];

export const toneClasses: Record<string, string> = {
  violet: "bg-violet-50 text-violet-600",
  emerald: "bg-emerald-50 text-emerald-600",
  cyan: "bg-cyan-50 text-cyan-700",
  orange: "bg-orange-50 text-orange-600",
  pink: "bg-pink-50 text-pink-600",
  blue: "bg-blue-50 text-blue-600",
  rose: "bg-rose-50 text-rose-600",
  amber: "bg-amber-50 text-amber-600"
};
