import { ArrowRight, Crown, Medal, ShieldCheck, Sparkles, Target, Trophy, UsersRound, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useReferralNetwork } from "@/hooks/useReferralNetwork";
import { cn } from "@/lib/utils";
import { formatRankNumber, parseRankIndex, rankSteps } from "@/components/dashboard/userRank";

function formatUsdt(value: number) {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)} USDT`;
}

function getStepTone(isReached: boolean, isCurrent: boolean) {
  if (isCurrent) {
    return "border-cyan-300/60 bg-cyan-50 text-cyan-700 shadow-[0_0_18px_rgba(34,211,238,0.12)]";
  }

  if (isReached) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-500";
}

export function UserRankPage() {
  const { user, isLoading: isUserLoading, error: userError } = useCurrentUser();
  const referralNetworkQuery = useReferralNetwork();
  const referralNetwork = referralNetworkQuery.data;
  const referralSummary = referralNetwork?.summary;

  const currentRankIndex = parseRankIndex(user?.rank ?? null);
  const nextRankIndex = Math.min(Math.max(currentRankIndex + 1, 0), rankSteps.length - 1);
  const currentStep = currentRankIndex >= 0 ? rankSteps[currentRankIndex] : null;
  const nextStep = rankSteps[nextRankIndex] ?? rankSteps[rankSteps.length - 1];

  const selfBusiness = referralSummary?.selfBusinessUsdt ?? 0;
  const teamBusiness = referralSummary?.teamBusinessUsdt ?? 0;
  const directCount = referralSummary?.directCount ?? 0;
  const businessProgress = Math.min(teamBusiness / Math.max(1, nextStep.targetBusinessUsdt), 1);
  const directProgress = nextStep.directRequired > 0 ? Math.min(directCount / nextStep.directRequired, 1) : 1;
  const progress =
    currentRankIndex < 0
      ? (businessProgress + directProgress) / 2
      : currentRankIndex >= rankSteps.length - 1
        ? 1
        : businessProgress;

  const remainingBusiness = Math.max(nextStep.targetBusinessUsdt - teamBusiness, 0);
  const remainingDirects = Math.max(nextStep.directRequired - directCount, 0);
  const isTopRank = currentRankIndex >= rankSteps.length - 1;
  const progressPercent = Math.round(progress * 100);

  const metrics = [
    {
      label: "Current rank",
      value: isUserLoading ? "Loading..." : user?.rank ?? "Unranked",
      note: currentStep ? currentStep.qualification : "Start your climb",
      icon: Trophy,
      tone: "text-fuchsia-700 bg-fuchsia-50",
    },
    {
      label: "Next badge",
      value: isTopRank ? "Completed" : nextStep.label,
      note: nextStep.qualification,
      icon: Crown,
      tone: "text-cyan-700 bg-cyan-50",
    },
    {
      label: "Self business",
      value: referralNetworkQuery.isLoading ? "Loading..." : formatUsdt(selfBusiness),
      note: "Your own active plan purchases",
      icon: Wallet,
      tone: "text-blue-700 bg-blue-50",
    },
    {
      label: "Team business",
      value: referralNetworkQuery.isLoading ? "Loading..." : formatUsdt(teamBusiness),
      note: `${formatUsdt(nextStep.targetBusinessUsdt)} target`,
      icon: UsersRound,
      tone: "text-indigo-700 bg-indigo-50",
    },
  ];

  const ladder = rankSteps.map((step, index) => {
    const isReached = currentRankIndex >= index;
    const isCurrent = currentRankIndex === index;
    const fill = isReached ? 100 : isCurrent ? Math.max(10, progress * 100) : 0;

    return { ...step, isReached, isCurrent, fill };
  });

  return (
    <section className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#08152e] via-[#0d5c80] to-[#22d3ee] px-4 py-5 text-white shadow-[0_18px_50px_rgba(8,21,46,0.18)] sm:px-6 sm:py-6">
        <div className="absolute -right-10 -top-10 size-40 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-12 left-24 size-32 rounded-full bg-fuchsia-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.34em] text-cyan-100/84 sm:text-xs">User Panel</p>
            <h1 className="mt-1 text-[1.6rem] font-black leading-tight tracking-tight sm:text-[2.15rem]">Rank Journey</h1>
              <p className="mt-2 max-w-xl text-[13px] font-semibold leading-relaxed text-cyan-50/88 sm:text-sm">
              Track your next milestone, remaining target, and achievement momentum in one clean view.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[420px]">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-50/65">Current</p>
              <p className="mt-1 text-lg font-black text-white">{currentStep ? currentStep.label : (user?.rank ?? "Unranked")}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-50/65">Next</p>
              <p className="mt-1 text-lg font-black text-white">{isTopRank ? "Max rank" : nextStep.label}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-50/65">Progress</p>
              <p className="mt-1 text-lg font-black text-white">{progressPercent}%</p>
            </div>
          </div>
        </div>
      </div>

      {userError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
          {userError}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <Card className="form-motion-off border-slate-200 bg-white text-slate-950 shadow-sm" key={metric.label}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-[11px] font-bold text-slate-500">{metric.label}</p>
                  <p className="mt-1 text-lg font-black text-slate-950">{metric.value}</p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-400">{metric.note}</p>
                </div>
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-2xl", metric.tone)}>
                  <Icon className="size-4" />
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="form-motion-off border-slate-200 bg-white text-slate-950 shadow-sm">
          <CardContent className="p-5 sm:p-6 xl:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-slate-950">Rank Ladder</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Each badge is shown with its reward and completion state.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">
                <ShieldCheck className="size-3.5" />
                {isTopRank ? "Max rank reached" : `${nextStep.label} ahead`}
              </span>
            </div>

            <div className="mt-5 rounded-3xl border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-slate-50 p-4 sm:p-5 xl:p-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                    <Medal className="size-3.5 text-amber-500" />
                    Achievement flow
                  </div>
                  <p className="mt-2 text-[1.35rem] font-black leading-tight text-slate-950 sm:text-[1.5rem]">
                    {currentStep ? currentStep.label : "Unranked"}
                    <ArrowRight className="mx-2 inline size-4 text-slate-300" />
                    {isTopRank ? (currentStep?.label ?? nextStep.label) : nextStep.label}
                  </p>
                  <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-600 sm:text-[15px]">
                    Grow your team business and referrals to unlock the next badge in your path.
                  </p>
                  <div className="mt-3 inline-flex max-w-full rounded-2xl border border-cyan-100 bg-cyan-50 px-3 py-2 text-[11px] font-semibold leading-relaxed text-cyan-800">
                    Self business is shown separately. Only counted team business pushes rank progress.
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                    <span className="rounded-full bg-white px-3 py-1 text-slate-600 ring-1 ring-slate-200">
                      {progressPercent}% complete
                    </span>
                  <span className="rounded-full bg-white px-3 py-1 text-slate-600 ring-1 ring-slate-200">
                    {isTopRank ? "Top rank active" : `${formatRankNumber(remainingBusiness)} remaining`}
                  </span>
                </div>
                </div>

                <div className="min-w-[170px] rounded-2xl border border-white/80 bg-white px-4 py-3 shadow-sm xl:self-start">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Remaining</p>
                  <p className="mt-1 text-[1.75rem] font-black leading-none text-slate-950">
                    {isTopRank ? "0" : formatRankNumber(remainingBusiness)}{" "}
                    <span className="text-xs font-black text-slate-400">USDT</span>
                  </p>
                  <p className="mt-2 text-[11px] font-semibold leading-relaxed text-slate-500">
                    {isTopRank
                      ? "You have reached the top milestone."
                      : remainingDirects > 0
                        ? `${remainingDirects} direct referrals also needed for the next badge.`
                        : "Direct requirement is already covered."}
                  </p>
                </div>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-blue-500 to-cyan-400 transition-all duration-500"
                  style={{ width: `${Math.max(6, progress * 100)}%` }}
                />
              </div>

              <div className="mt-5 grid gap-3 sm:flex sm:gap-4 sm:overflow-x-auto sm:pb-2 sm:pr-1 xl:gap-5">
                {ladder.map((step) => (
                  <div
                    className={cn(
                      "min-h-[152px] w-full rounded-2xl border p-3 transition-all sm:min-h-[176px] sm:w-[210px] sm:flex-none xl:w-[220px] xl:p-4",
                      getStepTone(step.isReached, step.isCurrent)
                    )}
                    key={step.label}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em]">{step.label}</p>
                      </div>
                      <span className="rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-700">
                        {step.reward}
                      </span>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/70">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          step.isCurrent
                            ? "bg-gradient-to-r from-fuchsia-500 to-cyan-400"
                            : step.isReached
                              ? "bg-emerald-400"
                              : "bg-slate-300"
                        )}
                        style={{ width: `${step.fill}%` }}
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                      <span>{formatRankNumber(step.targetBusinessUsdt)} USDT</span>
                      <span>{step.isCurrent ? "Current" : step.isReached ? "Unlocked" : "Locked"}</span>
                    </div>
                    <p className="mt-2 text-[10px] font-medium leading-relaxed text-slate-500">{step.qualification}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:sticky xl:top-6 xl:self-start">
          <Card className="form-motion-off border-slate-200 bg-white text-slate-950 shadow-sm">
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-950">Achievement Focus</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">What to push next.</p>
                </div>
                <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  <Sparkles className="size-4" />
                </span>
              </div>

              <div className="mt-4 rounded-3xl bg-gradient-to-br from-slate-950 via-[#0b1d3a] to-[#143d64] p-4 text-white shadow-[0_18px_40px_rgba(8,21,46,0.18)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/70">Target badge</p>
                    <p className="mt-1 text-2xl font-black">{isTopRank ? currentStep?.label ?? "M5" : nextStep.label}</p>
                    <p className="mt-1 text-sm font-semibold text-cyan-50/80">
                      {isTopRank ? currentStep?.qualification : nextStep.qualification}
                    </p>
                  </div>
                  <div className="flex size-14 items-center justify-center rounded-full bg-white/10">
                    <Trophy className="size-7 text-amber-300" />
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/65">Main push</p>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-cyan-50/88">
                    Build toward the next rank by improving team business. Keep the journey simple and visible.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="form-motion-off border-slate-200 bg-white text-slate-950 shadow-sm">
            <CardContent className="p-5 sm:p-6">
              <p className="text-sm font-black text-slate-950">Quick stats</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Directs</p>
                      <p className="mt-1 text-lg font-black text-slate-950">{formatRankNumber(directCount)}</p>
                    </div>
                    <UsersRound className="size-5 text-cyan-500" />
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Self business</p>
                      <p className="mt-1 text-lg font-black text-slate-950">{formatRankNumber(selfBusiness)} USDT</p>
                    </div>
                    <Wallet className="size-5 text-blue-500" />
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Team business</p>
                      <p className="mt-1 text-lg font-black text-slate-950">{formatRankNumber(teamBusiness)} USDT</p>
                    </div>
                    <Target className="size-5 text-fuchsia-500" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
