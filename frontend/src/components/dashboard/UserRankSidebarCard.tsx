import { useMemo } from "react";
import { ShieldCheck, Sparkles, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useUserDashboard } from "@/hooks/useUserDashboard";
import { cn } from "@/lib/utils";
import { formatRankNumber, parseRankIndex, rankSteps } from "@/components/dashboard/userRank";

type UserRankSidebarCardProps = {
  currentRank: string | null;
  collapsed?: boolean;
};

export function UserRankSidebarCard({ collapsed = false, currentRank }: UserRankSidebarCardProps) {
  const dashboardQuery = useUserDashboard();
  const dashboard = dashboardQuery.data;

  const currentRankIndex = useMemo(() => parseRankIndex(currentRank), [currentRank]);
  const nextRankIndex = Math.min(Math.max(currentRankIndex + 1, 0), rankSteps.length - 1);
  const currentStep = currentRankIndex >= 0 ? rankSteps[currentRankIndex] : null;
  const nextStep = rankSteps[nextRankIndex] ?? rankSteps[0];

  const teamBusiness = dashboard?.totalTeamBusinessUsdt ?? 0;
  const directCount = dashboard?.referrals.directCount ?? 0;

  const businessProgress = Math.min(teamBusiness / Math.max(1, nextStep.targetBusinessUsdt), 1);
  const directProgress =
    nextStep.directRequired > 0 ? Math.min(directCount / nextStep.directRequired, 1) : 1;
  const progress =
    currentRankIndex < 0
      ? (businessProgress + directProgress) / 2
      : currentRankIndex >= rankSteps.length - 1
        ? 1
        : businessProgress;

  const milestoneProgress = rankSteps.map((step, index) => ({
    ...step,
    isReached: currentRankIndex >= index,
    isCurrent: currentRankIndex === index,
  }));

  return (
    <Card className={cn("form-motion-off border-cyan-300/15 bg-[#061225] text-white shadow-[0_20px_50px_rgba(2,8,23,0.26)]", collapsed && "lg:hidden")}>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-100/70">Rank Track</p>
            <p className="mt-1 text-sm font-black text-white">Achievement path</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">
            <Trophy className="size-3.5" />
            {currentRank ?? "Unranked"}
          </span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <div className="flex items-center justify-between gap-3 text-[11px] font-semibold text-cyan-50/70">
            <span>Next target</span>
            <span>{nextStep.label}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-white">{nextStep.name}</p>
              <p className="mt-0.5 text-xs text-cyan-100/70">{nextStep.qualification}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200">
              <ShieldCheck className="size-3.5" />
              Live
            </span>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-fuchsia-400 via-blue-400 to-cyan-300 transition-all duration-500"
              style={{ width: `${Math.max(6, progress * 100)}%` }}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-semibold text-cyan-50/80">
            <div className="rounded-xl bg-white/[0.05] p-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-cyan-100/50">Team business</p>
              <p className="mt-1 font-black text-white">{formatRankNumber(teamBusiness)} USDT</p>
            </div>
            <div className="rounded-xl bg-white/[0.05] p-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-cyan-100/50">Directs</p>
              <p className="mt-1 font-black text-white">{formatRankNumber(directCount)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {milestoneProgress.map((step) => (
            <div
              className={cn(
                "rounded-xl border p-2 text-center transition-all",
                step.isCurrent
                  ? "border-cyan-300/40 bg-cyan-300/15 shadow-[0_0_18px_rgba(34,211,238,0.18)]"
                  : step.isReached
                    ? "border-emerald-300/30 bg-emerald-300/10"
                    : "border-white/10 bg-white/[0.04]"
              )}
              key={step.label}
            >
              <p className={cn("text-[10px] font-black uppercase tracking-[0.18em]", step.isReached ? "text-white" : "text-cyan-100/50")}>
                {step.label}
              </p>
              <div className="mt-1 flex justify-center">
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full text-[10px] font-black",
                    step.isCurrent
                      ? "bg-gradient-to-br from-fuchsia-400 to-cyan-300 text-slate-950"
                      : step.isReached
                        ? "bg-emerald-300/20 text-emerald-200"
                        : "bg-white/5 text-cyan-100/50"
                  )}
                >
                  {step.label}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/70">Next milestone</p>
              <p className="mt-1 text-xs font-semibold text-cyan-50/72">
                Keep growing your team to unlock the next badge.
              </p>
            </div>
            <Sparkles className="size-4 text-cyan-200" />
          </div>
          {currentStep ? (
            <p className="mt-3 text-[11px] font-medium text-cyan-50/68">
              Current rank: <span className="font-black text-white">{currentStep.label}</span>
            </p>
          ) : null}
          <p className="mt-1 text-[11px] font-medium text-cyan-50/68">
            Next rank needs {nextStep.directRequired > 0 ? `${nextStep.directRequired} active directs and ` : ""}
            {formatRankNumber(nextStep.targetBusinessUsdt)} USDT team business.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
