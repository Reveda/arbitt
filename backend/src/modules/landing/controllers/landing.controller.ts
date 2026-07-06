import type { Request, Response, NextFunction } from "express";
import { HTTP_STATUS } from "../../../constants/http";
import { PlatformSettingModel } from "../../admin/models/platform-setting.model";export const defaultLandingContent = {
  heroTitle: "Ecosystem Earning Made Simple & Transparent",
  heroSubtitle: "Join a transparent and secure earning ecosystem built on Arbitrum blockchain infrastructure. Build, secure and automate digital asset solutions at scale. Monitor teams, monitor wallet flows and scale your earnings with confidence.",
  copyrightText: "© 2026 Arbitrum. All rights reserved.",
  privacyPolicy: "This Privacy Policy describes how our Platform collects, uses, and protects your personal and financial information when you participate in our Arbitrum-based USDT referral network.\n\n1. Wallet & Transaction Information\nWe collect your public blockchain wallet address and submitted transaction hashes to verify deposits and process withdrawals on the Arbitrum network. We do not collect, access, or store your wallet's private keys or recovery seed phrases.\n\n2. Team & Referral Hierarchy\nTo calculate multi-level network rewards and royalty bonuses, our system tracks connections between your account (username/email) and the sponsor who referred you, as well as the users you refer.\n\n3. Account & Verification Records\nWe store your account registration details (username, email, account status) and platform logs (such as login times and transaction approvals) to maintain account security, ensure accurate rewards tracking, and prevent fraud.\n\n4. Security & Data Protection\nWe use industry-standard security measures (such as encrypted data transfer and session locks) to protect your account from unauthorized access. Your data is used exclusively to facilitate your earnings, deposits, withdrawals, and platform support.",
  termsConditions: "These Terms & Conditions govern the use of our services.\n\n1. Account Eligibility & Security\nUsers are responsible for maintaining the confidentiality of their login credentials. Any unauthorized access attempts or suspicious session behavior will result in automatic session termination to protect user assets.\n\n2. Deposits & Plan Activation\nAll plan activations require USDT deposits sent over the Arbitrum network. You must provide a valid transaction hash matching the transfer. Submitting false, duplicate, or incorrect transaction hashes constitutes a violation of these terms and may lead to temporary or permanent account suspension.\n\n3. Referral Logic & Earnings\nMulti-level team rewards, weekly ROI payouts, and salary royalty club eligibility are calculated automatically based on team volumes and active plans. The platform reserves the right to correct calculations errors and adjust account records accordingly.\n\n4. Withdrawal Processing\nWhen you request a withdrawal, the funds are temporarily locked in your wallet balance to prevent duplicate transfers. Withdrawals are processed safely following administrator verification. The processing times may vary based on blockchain network congestion.\n\n5. Fair Use & Policy Violations\nAttempting to manipulate the referral system, exploit system glitches, or register duplicate accounts to artificially gain bonuses is strictly prohibited and will result in permanent account termination and forfeiture of remaining balances.",
  stats: [
    { label: "Total Users", value: "25K+" },
    { label: "Total Deposits (USDT)", value: "$4.2M+" },
    { label: "Total Payouts (USDT)", value: "$2.8M+" },
    { label: "Success Rate", value: "99.6%" }
  ],
  aboutHighlights: [
    { title: "Our Mission", description: "Enable trusted and transparent ecosystem earning for everyone." },
    { title: "Our Vision", description: "Create a globally connected referral ecosystem." }
  ],
  features: [
    { title: "Blockchain Security", iconName: "ShieldCheck" },
    { title: "Low Operational Fees", iconName: "Coins" },
    { title: "Instant Team Insights", iconName: "Users" },
    { title: "Multi-Level Logic", iconName: "Network" },
    { title: "24/7 Support", iconName: "Headphones" },
    { title: "Transparent Tracking", iconName: "Activity" },
    { title: "Global Availability", iconName: "Globe2" },
    { title: "Regular Upgrades", iconName: "Sparkles" }
  ],
  onboardingSteps: [
    { id: "01", title: "Register", note: "Create your account with referral linkage." },
    { id: "02", title: "Make Deposit", note: "Submit USDT payment details and TXN hash." },
    { id: "03", title: "Earn & Grow", note: "Track direct and level rewards from your network." },
    { id: "04", title: "Withdraw", note: "Request secure withdrawals from your wallet dashboard." }
  ],
  whyChooseItems: [
    {
      title: "Digital Asset Infrastructure",
      description: "Built on a blockchain-first approach for transparent ecosystem growth.",
      iconName: "Layers"
    },
    {
      title: "Secure & Trusted",
      description: "Strong wallet and session controls for secure user operations.",
      iconName: "ShieldCheck"
    },
    {
      title: "High Potential Returns",
      description: "Referral earning logic designed for structured growth and retention.",
      iconName: "Coins"
    },
    {
      title: "Global Reach",
      description: "Cross-region performance for global ventures.",
      iconName: "Globe2"
    }
  ]
};
export async function getLandingContent(_req: Request, res: Response, next: NextFunction) {
  try {
    const setting = await PlatformSettingModel.findOne({ key: "landing_page_content", deletedAt: null }).lean();
    if (!setting) {
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: defaultLandingContent,
      });
    }
    
    // Merge database value with defaults so newly added keys are always present
    const merged = {
      ...defaultLandingContent,
      ...(setting.value as Record<string, any>),
    };

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: merged,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateLandingContent(req: Request, res: Response, next: NextFunction) {
  try {
    const content = req.body;
    
    // Simple validation of required top-level fields
    if (!content || typeof content !== "object") {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Invalid landing page content payload.",
      });
    }

    let setting = await PlatformSettingModel.findOne({ key: "landing_page_content", deletedAt: null });
    if (!setting) {
      setting = await PlatformSettingModel.create({
        key: "landing_page_content",
        value: content,
      });
    } else {
      setting.value = content;
      await setting.save();
    }

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Landing page content updated successfully.",
      data: setting.value,
    });
  } catch (error) {
    return next(error);
  }
}
