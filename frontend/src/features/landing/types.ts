import type { LucideIcon } from "lucide-react";

export type LandingStat = {
  label: string;
  value: string;
};

export type AboutHighlight = {
  description: string;
  title: string;
};

export type FeatureItem = {
  icon: LucideIcon;
  title: string;
};

export type StepItem = {
  id: string;
  note: string;
  title: string;
};

export type WhyChooseItem = {
  description: string;
  icon: LucideIcon;
  title: string;
};

