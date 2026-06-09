import { Bot, Coins, Globe2, Layers, LifeBuoy, Lock, Network, ShieldCheck, Sparkles, Users } from "lucide-react";
import type { AboutHighlight, FeatureItem, LandingStat, StepItem, WhyChooseItem } from "@/features/landing/types";

export const landingStats: LandingStat[] = [
  { label: "Total Users", value: "25K+" },
  { label: "Total Deposits (USDT)", value: "$4.2M+" },
  { label: "Total Payouts (USDT)", value: "$2.8M+" },
  { label: "Success Rate", value: "99.6%" }
];

export const aboutHighlights: AboutHighlight[] = [
  { title: "Our Mission", description: "Enable trusted decentralized earning for everyone." },
  { title: "Our Vision", description: "Create a globally connected referral ecosystem." }
];

export const landingFeatures: FeatureItem[] = [
  { title: "Blockchain Security", icon: Lock },
  { title: "Low Operational Fees", icon: Coins },
  { title: "Instant Team Insights", icon: Users },
  { title: "Multi-Level Logic", icon: Network },
  { title: "24/7 Support", icon: LifeBuoy },
  { title: "Transparent Tracking", icon: Bot },
  { title: "Global Availability", icon: Globe2 },
  { title: "Regular Upgrades", icon: Sparkles }
];

export const onboardingSteps: StepItem[] = [
  { id: "01", title: "Register", note: "Create your account with referral linkage." },
  { id: "02", title: "Make Deposit", note: "Submit USDT payment details and TXN hash." },
  { id: "03", title: "Earn & Grow", note: "Track direct and level rewards from your network." },
  { id: "04", title: "Withdraw", note: "Request secure withdrawals from your wallet dashboard." }
];

export const whyChooseItems: WhyChooseItem[] = [
  {
    title: "Decentralized Layer",
    description: "Built on a blockchain-first approach for transparent ecosystem growth.",
    icon: Layers
  },
  {
    title: "Secure & Trusted",
    description: "Strong wallet and session controls for secure user operations.",
    icon: ShieldCheck
  },
  {
    title: "High Potential Returns",
    description: "Referral earning logic designed for structured growth and retention.",
    icon: Coins
  },
  {
    title: "Global Reach",
    description: "Cross-region performance for global ventures.",
    icon: Globe2
  }
];
