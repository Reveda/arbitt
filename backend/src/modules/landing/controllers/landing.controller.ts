import type { Request, Response, NextFunction } from "express";
import { HTTP_STATUS } from "../../../constants/http";
import { PlatformSettingModel } from "../../admin/models/platform-setting.model";
import { ContactMessageModel } from "../models/contact-message.model";

export const defaultLandingContent = {
  heroTitle: "Ecosystem Earning Made Simple & Transparent",
  heroSubtitle:
    "Join a transparent and secure earning ecosystem built on Arbitrum blockchain infrastructure. Build, secure and automate digital asset solutions at scale. Monitor teams, monitor wallet flows and scale your earnings with confidence.",
  copyrightText: "© 2026 Arbitrum. All rights reserved.",
  privacyPolicy: `This Privacy Policy explains how our Platform collects, uses, and protects your personal and financial information when you use our digital asset services.

1. Wallet & Transaction Information
We collect your public wallet address and submitted transaction hashes to verify deposits and process withdrawals. We do not collect, access, or store private keys or recovery seed phrases.

2. Team & Referral Information
To calculate referral rewards and bonuses, our Platform records the sponsor linked to your account and the users you refer.

3. Account & Verification Records
We collect only the account and verification information reasonably necessary to provide our services, protect accounts, meet legal obligations, and respond to support requests.

4. Security & Data Protection
We maintain appropriate technical and organizational safeguards designed to protect personal information against unauthorized access, alteration, disclosure, or loss. Access to protected information is limited to authorized personnel who need it to operate and secure the Platform.

5. Information Use & Support
Your information is used to provide account services, process deposits and withdrawals, calculate eligible rewards, maintain platform security, and respond to support requests. We do not disclose private account information except when required to provide the service, comply with law, or protect users and the Platform.`,
  termsConditions:
    "These Terms & Conditions govern the use of our services.\n\n1. Account Eligibility & Security\nUsers are responsible for maintaining the confidentiality of their login credentials. Any unauthorized access attempts or suspicious session behavior will result in automatic session termination to protect user assets.\n\n2. Deposits & Plan Activation\nAll plan activations require USDT deposits sent over the Arbitrum network. You must provide a valid transaction hash matching the transfer. Submitting false, duplicate, or incorrect transaction hashes constitutes a violation of these terms and may lead to temporary or permanent account suspension.\n\n3. Referral Logic & Earnings\nMulti-level team rewards, weekly ROI payouts, and salary royalty club eligibility are calculated automatically based on team volumes and active plans. The platform reserves the right to correct calculations errors and adjust account records accordingly.\n\n4. Withdrawal Processing\nWhen you request a withdrawal, the funds are temporarily locked in your wallet balance to prevent duplicate transfers. Withdrawals are processed safely following administrator verification. The processing times may vary based on blockchain network congestion.\n\n5. Fair Use & Policy Violations\nAttempting to manipulate the referral system, exploit system glitches, or register duplicate accounts to artificially gain bonuses is strictly prohibited and will result in permanent account termination and forfeiture of remaining balances.",
  stats: [
    { label: "Total Users", value: "25K+" },
    { label: "Total Deposits (USDT)", value: "$4.2M+" },
    { label: "Total Payouts (USDT)", value: "$2.8M+" },
    { label: "Success Rate", value: "99.6%" },
  ],
  aboutHighlights: [
    {
      title: "Our Mission",
      description: "Enable trusted and transparent ecosystem earning for everyone.",
    },
    { title: "Our Vision", description: "Create a globally connected referral ecosystem." },
  ],
  features: [
    { title: "Blockchain Security", iconName: "ShieldCheck" },
    { title: "Low Operational Fees", iconName: "Coins" },
    { title: "Instant Team Insights", iconName: "Users" },
    { title: "Multi-Level Logic", iconName: "Network" },
    { title: "24/7 Support", iconName: "Headphones" },
    { title: "Transparent Tracking", iconName: "Activity" },
    { title: "Global Availability", iconName: "Globe2" },
    { title: "Regular Upgrades", iconName: "Sparkles" },
  ],
  onboardingSteps: [
    { id: "01", title: "Register", note: "Create your account with referral linkage." },
    { id: "02", title: "Make Deposit", note: "Submit USDT payment details and TXN hash." },
    { id: "03", title: "Earn & Grow", note: "Track direct and level rewards from your network." },
    { id: "04", title: "Withdraw", note: "Request secure withdrawals from your wallet dashboard." },
  ],
  whyChooseItems: [
    {
      title: "Digital Asset Infrastructure",
      description: "Built on a blockchain-first approach for transparent ecosystem growth.",
      iconName: "Layers",
    },
    {
      title: "Secure & Trusted",
      description: "Strong wallet and session controls for secure user operations.",
      iconName: "ShieldCheck",
    },
    {
      title: "High Potential Returns",
      description: "Referral earning logic designed for structured growth and retention.",
      iconName: "Coins",
    },
    {
      title: "Global Reach",
      description: "Cross-region performance for global ventures.",
      iconName: "Globe2",
    },
  ],
};

function sanitizePublicPrivacyPolicy(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return defaultLandingContent.privacyPolicy;
  }

  return value
    .replace(/Arbitrum-based USDT referral network/gi, "digital asset referral network")
    .replace(/Arbitrum network/gi, "supported network")
    .replace(/\bArbitrum\b/gi, "our Platform")
    .replace(
      /3\. Account & Verification Records[\s\S]*?(?=\n\n4\. Security & Data Protection)/i,
      "3. Account & Verification Records\nWe collect only the account and verification information reasonably necessary to provide our services, protect accounts, meet legal obligations, and respond to support requests.",
    )
    .replace(/\badministrators?\b/gi, "authorized platform personnel");
}

export async function getLandingContent(_req: Request, res: Response, next: NextFunction) {
  try {
    const setting = await PlatformSettingModel.findOne({
      key: "landing_page_content",
      deletedAt: null,
    }).lean();
    if (!setting) {
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: defaultLandingContent,
      });
    }

    // Merge database value with defaults so newly added keys are always present
    const merged = {
      ...defaultLandingContent,
      ...(setting.value as Record<string, unknown>),
    };
    merged.privacyPolicy = sanitizePublicPrivacyPolicy(merged.privacyPolicy);

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

    let setting = await PlatformSettingModel.findOne({
      key: "landing_page_content",
      deletedAt: null,
    });
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

export async function submitContactMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const { fullName, email, subject, message } = req.body;

    if (!fullName?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "All fields (fullName, email, subject, message) are required.",
      });
    }

    const inquiry = await ContactMessageModel.create({
      fullName: fullName.trim(),
      email: email.trim(),
      subject: subject.trim(),
      message: message.trim(),
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Your support request has been submitted successfully.",
      data: inquiry,
    });
  } catch (error) {
    return next(error);
  }
}
