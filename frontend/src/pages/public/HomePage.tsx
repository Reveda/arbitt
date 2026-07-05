import * as LucideIcons from "lucide-react";
import { useGetLandingContentQuery } from "@/store/api/landingApi";
import {
  aboutHighlights as fallbackAboutHighlights,
  landingFeatures as fallbackLandingFeatures,
  landingStats as fallbackLandingStats,
  onboardingSteps as fallbackOnboardingSteps,
  whyChooseItems as fallbackWhyChooseItems,
} from "@/features/landing/data";
import { AboutSection } from "@/features/landing/components/AboutSection";
import { FeaturesSection } from "@/features/landing/components/FeaturesSection";
import { HeroSection } from "@/features/landing/components/HeroSection";
import { HowItWorksSection } from "@/features/landing/components/HowItWorksSection";
import { WhyChooseSection } from "@/features/landing/components/WhyChooseSection";
import { DashboardMarqueeSection } from "@/features/landing/components/DashboardMarqueeSection";
import { StatsSection } from "@/features/landing/components/StatsSection";
import { RevealOnScroll } from "@/components/common/RevealOnScroll";

export function HomePage() {
  const { data: landingData } = useGetLandingContentQuery();

  const resolveIcon = (name: string) => {
    const IconComponent = (LucideIcons as any)[name];
    return IconComponent || LucideIcons.HelpCircle;
  };

  const heroTitle = landingData?.data?.heroTitle;
  const heroSubtitle = landingData?.data?.heroSubtitle;

  const stats = landingData?.data?.stats || fallbackLandingStats;
  const aboutHighlights = landingData?.data?.aboutHighlights || fallbackAboutHighlights;
  
  const features = landingData?.data?.features
    ? landingData.data.features.map((f) => ({
        title: f.title,
        icon: resolveIcon(f.iconName),
      }))
    : fallbackLandingFeatures;

  const onboardingSteps = landingData?.data?.onboardingSteps || fallbackOnboardingSteps;

  const whyChooseItems = landingData?.data?.whyChooseItems
    ? landingData.data.whyChooseItems.map((w) => ({
        title: w.title,
        description: w.description,
        icon: resolveIcon(w.iconName),
      }))
    : fallbackWhyChooseItems;

  return (
    <div className="relative isolate space-y-4 text-slate-100 sm:space-y-6 md:space-y-7">
      <div className="landing-ambient pointer-events-none absolute -top-10 left-1/2 -z-10 h-[24rem] w-[92%] -translate-x-1/2 rounded-[50%] blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-full w-px -translate-x-1/2 bg-gradient-to-b from-cyan-300/15 via-cyan-300/5 to-transparent" />

      <div className="premium-stage">
        <HeroSection title={heroTitle} subtitle={heroSubtitle} />
      </div>
      <div className="premium-divider" />

      <RevealOnScroll delayMs={5}>
        <div className="premium-stage">
          <StatsSection stats={stats} />
        </div>
      </RevealOnScroll>
      <div className="premium-divider" />

      <RevealOnScroll delayMs={10}>
        <div className="premium-stage">
          <DashboardMarqueeSection />
        </div>
      </RevealOnScroll>
      <div className="premium-divider" />

      <RevealOnScroll>
        <div className="premium-stage">
          <AboutSection highlights={aboutHighlights} />
        </div>
      </RevealOnScroll>
      <div className="premium-divider" />

      <RevealOnScroll delayMs={15}>
        <div className="premium-stage">
          <FeaturesSection features={features} />
        </div>
      </RevealOnScroll>
      <div className="premium-divider" />

      <RevealOnScroll delayMs={25}>
        <div className="premium-stage">
          <HowItWorksSection steps={onboardingSteps} />
        </div>
      </RevealOnScroll>
      <div className="premium-divider" />

      <RevealOnScroll delayMs={35}>
        <div className="premium-stage">
          <WhyChooseSection items={whyChooseItems} />
        </div>
      </RevealOnScroll>
    </div>
  );
}
