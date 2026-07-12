import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpLeft,
  UserCheck,
  UsersRound,
  Wallet,
  LineChart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useReferralNetwork } from "@/hooks/useReferralNetwork";
import { cn } from "@/lib/utils";
import type { ReferralMember } from "@/services/referral.service";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function getDisplayName(member: ReferralMember) {
  return member.username ?? "Member";
}

function getStatusTone(status: string) {
  if (status === "active") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "pending") {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-slate-100 text-slate-600";
}

function TeamMemberRow({
  isSelected = false,
  member,
  onSelect
}: {
  isSelected?: boolean;
  member: ReferralMember;
  onSelect: (member: ReferralMember) => void;
}) {
  const openMember = () => onSelect(member);

  return (
    <tr
      className={cn(
        "group cursor-pointer border-b border-slate-100 bg-white transition-colors last:border-0 hover:bg-cyan-50/40 focus:bg-cyan-50/40",
        isSelected
          ? "bg-cyan-50/70"
          : member.directCount > 0
            ? "bg-blue-100/60 hover:bg-blue-200/40"
            : ""
      )}
      onClick={openMember}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openMember();
        }
      }}
      tabIndex={0}
    >
      <td className="px-3 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cyan-50 text-sm font-black uppercase text-cyan-700 ring-1 ring-cyan-100">
            {getDisplayName(member).charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-950">{getDisplayName(member)}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        <span className="inline-flex rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700 ring-1 ring-cyan-100">
          {member.rank ?? "Unranked"}
        </span>
      </td>
      {/* <td className="px-3 py-3">
        <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-100">
          L{member.relativeLevel}
        </span>
      </td> */}
      <td className="px-3 py-3">
        <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-black capitalize", getStatusTone(member.status))}>
          {member.status}
        </span>
      </td>
      <td className="px-3 py-3 text-sm font-black text-slate-800">{formatNumber(member.directCount)}</td>
      <td className="px-3 py-3 text-sm font-black text-slate-800">{formatNumber(member.teamBusinessUsdt)} USDT</td>
      <td className="px-3 py-3 text-sm font-black text-slate-800">{formatNumber(member.selfBusinessUsdt)} USDT</td>
      <td className="px-3 py-3 text-xs font-semibold text-slate-500">{formatDate(member.joinedAt)}</td>
    </tr>
  );
}

export function TeamPage() {
  const networkQuery = useReferralNetwork();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const network = networkQuery.data;
  const directMembers = network?.directMembers ?? [];
  const allTreeMembers = network?.teamMembers ?? [];

  const memberByUserId = useMemo(() => {
    const map = new Map<string, ReferralMember>();

    for (const member of allTreeMembers) {
      map.set(member.userId, member);
    }

    for (const member of directMembers) {
      map.set(member.userId, member);
    }

    return map;
  }, [allTreeMembers, directMembers]);

  const childrenByParentId = useMemo(() => {
    const map = new Map<string, ReferralMember[]>();

    for (const member of allTreeMembers) {
      if (!member.parentUserId) {
        continue;
      }

      const children = map.get(member.parentUserId) ?? [];
      children.push(member);
      map.set(member.parentUserId, children);
    }

    return map;
  }, [allTreeMembers]);

  const selectedMember = selectedMemberId ? memberByUserId.get(selectedMemberId) ?? null : null;
  const selectedChildren = selectedMemberId ? childrenByParentId.get(selectedMemberId) ?? [] : [];
  const visibleTeamMembers = selectedMember ? selectedChildren : directMembers;
  const isTeamListLoading = networkQuery.isLoading;
  const visibleFirstMemberRow = selectedMember
    ? selectedChildren.length > 0 ? 1 : 0
    : directMembers.length > 0 ? 1 : 0;
  const visibleLastMemberRow = visibleTeamMembers.length;
  const visibleTotalMembers = visibleTeamMembers.length;

  useEffect(() => {
    if (selectedMemberId && !memberByUserId.has(selectedMemberId)) {
      setSelectedMemberId(null);
    }
  }, [memberByUserId, selectedMemberId]);

  const stats = [
    {
      label: "Direct Referrals",
      value: networkQuery.isLoading ? "Loading..." : formatNumber(network?.summary.directCount ?? 0),
      icon: UserCheck,
      tone: "bg-cyan-50 text-cyan-700"
    },
    {
      label: "Total Team",
      value: networkQuery.isLoading ? "Loading..." : formatNumber(network?.summary.totalTeamMembers ?? 0),
      icon: UsersRound,
      tone: "bg-blue-50 text-blue-700"
    },
    {
      label: "Self Business",
      value: networkQuery.isLoading ? "Loading..." : `${formatNumber(network?.summary.selfBusinessUsdt ?? 0)} USDT`,
      icon: Wallet,
      tone: "bg-emerald-50 text-emerald-700"
    },
    {
      label: "Total Team Business",
      value: networkQuery.isLoading ? "Loading..." : `${formatNumber(network?.summary.teamBusinessUsdt ?? 0)} USDT`,
      icon: LineChart,
      tone: "bg-indigo-50 text-indigo-700"
    }
  ];
  const returnToPreviousList = () => {
    if (selectedMember?.parentUserId && memberByUserId.has(selectedMember.parentUserId)) {
      setSelectedMemberId(selectedMember.parentUserId);
      return;
    }

    setSelectedMemberId(null);
  };

  return (
    <section className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#08152e] via-[#0d5c80] to-[#22d3ee] px-4 py-4 text-white shadow-[0_18px_50px_rgba(8,21,46,0.18)] sm:px-5">
        <div className="absolute -right-10 -top-12 size-36 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-cyan-100/82 sm:text-xs">User Panel</p>
          <h1 className="mt-1 text-[1.35rem] font-black leading-tight tracking-tight sm:text-2xl">My Team</h1>
          <p className="mt-1 max-w-2xl text-[13px] font-semibold leading-relaxed text-cyan-50/88 sm:text-sm">
            Tap any member to see who joined through them.
          </p>
        </div>
      </div>

      {networkQuery.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
          {networkQuery.error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <Card className="form-motion-off border-slate-200 bg-white text-slate-950 shadow-sm" key={stat.label}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 sm:text-xs">{stat.label}</p>
                  <p className="mt-1 text-base font-black text-slate-950 sm:text-lg">{stat.value}</p>
                </div>
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-2xl", stat.tone)}>
                  <Icon className="size-4" />
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="form-motion-off border-slate-200 bg-white text-slate-950 shadow-sm">
        <CardContent className="p-4">
          {selectedMember ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-cyan-50 text-base font-black uppercase text-cyan-700 ring-1 ring-cyan-100">
                  {getDisplayName(selectedMember).charAt(0)}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-black text-slate-950">{getDisplayName(selectedMember)}</p>
                    {/* <span className="hidden rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-black text-blue-700 ring-1 ring-blue-100 sm:inline-flex">
                      L{selectedMember.relativeLevel}
                    </span> */}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <span className="inline-flex rounded-full bg-cyan-50 px-3 py-1 text-[11px] font-black text-cyan-700">
                  {formatNumber(visibleTotalMembers)} members
                </span>
                <Button
                  className="hidden h-9 shrink-0 rounded-full border-slate-200 bg-white px-3.5 text-slate-700 shadow-sm transition-colors hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-800 sm:inline-flex"
                  onClick={returnToPreviousList}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <ArrowUpLeft className="size-4" />
                  <span className="hidden sm:inline">
                    {selectedMember?.parentUserId && memberByUserId.has(selectedMember.parentUserId)
                      ? "Up one level"
                      : "Direct list"}
                  </span>
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm font-black text-slate-950">Direct Members</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Showing {formatNumber(visibleFirstMemberRow)}-{formatNumber(visibleLastMemberRow)} of{" "}
                {formatNumber(visibleTotalMembers)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {isTeamListLoading ? (
        <Card className="form-motion-off border-slate-200 bg-white text-slate-950 shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] table-fixed text-left">
                <tbody>
                  {Array.from({ length: 5 }, (_, rowIndex) => (
                    <tr className="border-b border-slate-100 last:border-0" key={rowIndex}>
                      {Array.from({ length: 7 }, (_, cellIndex) => (
                        <td className="px-3 py-4" key={cellIndex}>
                          <div className="h-4 w-full max-w-24 animate-pulse rounded bg-slate-100" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : visibleTeamMembers.length ? (
        <Card className="form-motion-off border-slate-200 bg-white text-slate-950 shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] table-fixed text-left">
                <thead className="bg-white text-xs text-slate-500 shadow-[0_1px_0_#e2e8f0]">
                  <tr>
                    <th className="w-[28%] px-3 py-3 font-black">User</th>
                    {/* <th className="w-16 px-3 py-3 font-black">Level</th> */}
                    <th className="w-20 px-3 py-3 font-black">Rank</th>
                    <th className="w-20 px-3 py-3 font-black">Status</th>
                    <th className="w-20 px-3 py-3 font-black">Directs</th>
                    <th className="w-28 px-3 py-3 font-black">Team Business</th>
                    <th className="w-28 px-3 py-3 font-black">Self Business</th>
                    <th className="w-24 px-3 py-3 font-black">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTeamMembers.map((member) => (
                    <TeamMemberRow
                      isSelected={selectedMemberId === member.userId}
                      key={member.id}
                      member={member}
                      onSelect={(selected) => setSelectedMemberId(selected.userId)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="form-motion-off border-slate-200 bg-white text-slate-950 shadow-sm">
          <CardContent className="p-8 text-center">
            <p className="text-sm font-black text-slate-700">
              {selectedMember
                ? `No members joined through ${getDisplayName(selectedMember)} yet`
                : "No team members found"}
            </p>
            {!selectedMember ? (
              <p className="mt-1 text-xs font-semibold text-slate-400">
                Your referral team will appear here after users join.
              </p>
            ) : null}
          </CardContent>
        </Card>
      )}

      <Card className="form-motion-off border-slate-200 bg-white text-slate-950 shadow-sm">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-xs font-semibold text-slate-500">
            {selectedMember
              ? `${getDisplayName(selectedMember)} direct join list`
              : directMembers.length ? "Direct list is ready" : "No direct members yet"}
          </p>
          <span className="rounded-full bg-cyan-50 px-3 py-1 text-[11px] font-black text-cyan-700">
            {formatNumber(visibleTotalMembers)} members
          </span>
        </CardContent>
      </Card>
    </section>
  );
}
