export type RankStep = {
  label: string;
  name: string;
  qualification: string;
  reward: string;
  targetBusinessUsdt: number;
  directRequired: number;
  requiredQualifiedLegs: number;
  requiredSubtreeRank: number;
};

export const rankSteps: RankStep[] = [
  {
    label: "M1",
    name: "Starter",
    qualification: "10 active direct + 50000 team business",
    reward: "50 daily",
    targetBusinessUsdt: 50000,
    directRequired: 10,
    requiredQualifiedLegs: 0,
    requiredSubtreeRank: 0,
  },
  {
    label: "M2",
    name: "Associate",
    qualification: "2 M1 legs + 50% single-leg cap",
    reward: "150 daily",
    targetBusinessUsdt: 150000,
    directRequired: 0,
    requiredQualifiedLegs: 2,
    requiredSubtreeRank: 1,
  },
  {
    label: "M3",
    name: "Builder",
    qualification: "2 M2 legs + 50% single-leg cap",
    reward: "500 daily",
    targetBusinessUsdt: 500000,
    directRequired: 0,
    requiredQualifiedLegs: 2,
    requiredSubtreeRank: 2,
  },
  {
    label: "M4",
    name: "Leader",
    qualification: "2 M3 legs + 50% single-leg cap",
    reward: "1500 daily",
    targetBusinessUsdt: 2000000,
    directRequired: 0,
    requiredQualifiedLegs: 2,
    requiredSubtreeRank: 3,
  },
  {
    label: "M5",
    name: "Elite",
    qualification: "2 M4 legs + 50% single-leg cap",
    reward: "10000 daily",
    targetBusinessUsdt: 5000000,
    directRequired: 0,
    requiredQualifiedLegs: 2,
    requiredSubtreeRank: 4,
  },
];

export function formatRankNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export function parseRankIndex(rank: string | null) {
  if (!rank?.startsWith("M")) {
    return -1;
  }

  const parsed = Number.parseInt(rank.slice(1), 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return -1;
  }

  return Math.min(parsed - 1, rankSteps.length - 1);
}
