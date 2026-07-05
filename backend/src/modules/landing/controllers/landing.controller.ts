import type { Request, Response, NextFunction } from "express";
import { HTTP_STATUS } from "../../../constants/http";
import { PlatformSettingModel } from "../../admin/models/platform-setting.model";

export const defaultLandingContent = {
  heroTitle: "Ecosystem Earning Made Simple & Transparent",
  heroSubtitle: "Join a transparent and secure earning ecosystem built on Arbitrum blockchain infrastructure. Build, secure and automate digital asset solutions at scale. Monitor teams, monitor wallet flows and scale your earnings with confidence.",
  copyrightText: "© 2026 Arbitrum. All rights reserved.",
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
