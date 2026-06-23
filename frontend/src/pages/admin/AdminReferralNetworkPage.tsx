import { useEffect, useState } from "react";
import { BadgeCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminReferrals } from "@/hooks/useAdminQueries";
import { cn } from "@/lib/utils";
import type { AdminReferralNode } from "@/services/admin.service";
import { AdminCard, AdminPageHeader } from "./admin.components";

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

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

function getUserName(node: AdminReferralNode) {
  return node.user?.username ?? "Unknown user";
}

function getStatusTone(status?: string) {
  if (status === "active") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (status === "pending") {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }

  if (status === "suspended") {
    return "bg-rose-50 text-rose-700 ring-rose-100";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function ReferralNodeRow({
  index,
  node,
  onOpenDirects
}: {
  index: number;
  node: AdminReferralNode;
  onOpenDirects: (node: AdminReferralNode) => void;
}) {
  const openNode = () => {
    if (node.user) {
      onOpenDirects(node);
    }
  };

  return (
    <tr
      className="group cursor-pointer border-b border-slate-100 bg-white transition-colors last:border-0 hover:bg-cyan-50/40 focus-within:bg-cyan-50/40"
      onClick={openNode}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openNode();
        }
      }}
      tabIndex={node.user ? 0 : -1}
    >
      <td className="w-10 px-3 py-3 text-xs font-black text-slate-400">{index}</td>
      <td className="px-3 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cyan-50 text-sm font-black uppercase text-cyan-700 ring-1 ring-cyan-100">
            {getUserName(node).charAt(0)}
          </span>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-sm font-black text-slate-950">{getUserName(node)}</p>
              {node.user?.emailVerified ? <BadgeCheck className="size-3.5 shrink-0 text-emerald-500" /> : null}
            </div>
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        {node.parent ? (
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-800">{node.parent.username ?? "Unknown sponsor"}</p>
          </div>
        ) : (
          <span className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700 ring-1 ring-violet-100">
            Root
          </span>
        )}
      </td>
      <td className="px-3 py-3">
        <span className="inline-flex rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700 ring-1 ring-cyan-100">
          {node.user?.rank ?? "Unranked"}
        </span>
      </td>
      {/* <td className="px-3 py-3">
        <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-100">
          L{node.level}
        </span>
      </td> */}
      <td className="px-3 py-3">
        <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-black capitalize ring-1", getStatusTone(node.user?.status))}>
          {node.user?.status ?? "unknown"}
        </span>
      </td>
      <td className="px-3 py-3 text-sm font-black text-slate-800">{formatNumber(node.directCount)}</td>
      <td className="px-3 py-3 text-sm font-black text-slate-800">{formatNumber(node.teamBusinessUsdt)} USDT</td>
      <td className="px-3 py-3 text-xs font-semibold text-slate-500">
        {formatDate(node.user?.joinedAt ?? node.createdAt)}
      </td>
    </tr>
  );
}

export function AdminReferralNetworkPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [focusStack, setFocusStack] = useState<AdminReferralNode[]>([]);
  const focusedNode = focusStack[focusStack.length - 1] ?? null;
  const focusedParentUserId = focusedNode?.user?.id;
  const referralsQuery = useAdminReferrals({
    page,
    limit: pageSize,
    parentUserId: focusedParentUserId,
    rootOnly: !focusedParentUserId
  });
  const network = referralsQuery.data?.data;
  const nodes = network?.nodes ?? [];
  const pagination = network?.pagination ?? {
    hasNextPage: false,
    hasPreviousPage: false,
    limit: pageSize,
    page,
    total: 0,
    totalPages: 1
  };
  const firstRow = pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const lastRow = Math.min(pagination.page * pagination.limit, pagination.total);
  const loadingRows = Math.min(pageSize, DEFAULT_PAGE_SIZE);
  const paginationButtonClass =
    "h-9 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-cyan-50 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-100";

  useEffect(() => {
    setPage(1);
  }, [focusedParentUserId, pageSize]);

  useEffect(() => {
    if (network?.pagination && page > network.pagination.totalPages) {
      setPage(network.pagination.totalPages);
    }
  }, [network?.pagination, page]);

  const openDirects = (node: AdminReferralNode) => {
    if (!node.user) {
      return;
    }

    setFocusStack((currentStack) => {
      const existingIndex = currentStack.findIndex((item) => item.user?.id === node.user?.id);

      if (existingIndex >= 0) {
        return currentStack.slice(0, existingIndex + 1);
      }

      return [...currentStack, node];
    });
    setPage(1);
  };

  const returnToPreviousList = () => {
    setFocusStack((currentStack) => currentStack.slice(0, -1));
    setPage(1);
  };

  return (
    <section className="space-y-4">
      <AdminPageHeader
        description="Open a member to view only the users who joined through that member."
        title="Referral Network"
      />

      {referralsQuery.error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
          {referralsQuery.error}
        </div>
      ) : null}

      <AdminCard>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-950">
              {focusedNode ? getUserName(focusedNode) : "Root Members"}
            </p>
            {focusedNode ? (
              <p className="mt-1 truncate text-xs font-semibold text-slate-500">Direct join list</p>
            ) : (
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Showing top-level members only
              </p>
            )}
          </div>
          {focusedNode ? (
            <Button
              className="h-10 rounded-xl border-slate-200 text-slate-700"
              onClick={returnToPreviousList}
              type="button"
              variant="outline"
            >
              <ChevronLeft className="size-4" />
              Back
            </Button>
          ) : null}
        </div>
      </AdminCard>

      <AdminCard className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div>
            <p className="text-sm font-black text-slate-950">
              {focusedNode ? "Direct Joined Members" : "Root Member List"}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Showing {formatNumber(firstRow)}-{formatNumber(lastRow)} of {formatNumber(pagination.total)}
            </p>
          </div>
          <span className="rounded-full bg-cyan-50 px-3 py-1 text-[11px] font-black text-cyan-700">
            Page {pagination.page} / {pagination.totalPages}
          </span>
        </div>

        <div className="max-h-[590px] overflow-auto">
          <table className="w-full min-w-[860px] table-fixed text-left">
            <thead className="sticky top-0 z-10 bg-white text-xs text-slate-500 shadow-[0_1px_0_#e2e8f0]">
              <tr>
                <th className="w-10 px-3 py-3 font-black">#</th>
                <th className="w-[20%] px-3 py-3 font-black">User</th>
                <th className="w-[18%] px-3 py-3 font-black">Sponsor</th>
                <th className="w-20 px-3 py-3 font-black">Rank</th>
                {/* <th className="w-16 px-3 py-3 font-black">Level</th> */}
                <th className="w-24 px-3 py-3 font-black">Status</th>
                <th className="w-20 px-3 py-3 font-black">Directs</th>
                <th className="w-32 px-3 py-3 font-black">Team Business</th>
                <th className="w-28 px-3 py-3 font-black">Joined</th>
              </tr>
            </thead>
            <tbody>
              {referralsQuery.isLoading ? (
                Array.from({ length: loadingRows }, (_, rowIndex) => (
                  <tr className="border-b border-slate-100 last:border-0" key={rowIndex}>
                    {Array.from({ length: 8 }, (_, cellIndex) => (
                      <td className="px-3 py-4" key={cellIndex}>
                        <div className="h-4 w-full max-w-24 animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : nodes.length ? (
                nodes.map((node, index) => (
                  <ReferralNodeRow
                    index={(pagination.page - 1) * pagination.limit + index + 1}
                    key={node.id}
                    node={node}
                    onOpenDirects={openDirects}
                  />
                ))
              ) : (
                <tr>
                  <td className="py-12 text-center text-sm font-semibold text-slate-500" colSpan={8}>
                    {focusedNode
                      ? `No direct members found under ${getUserName(focusedNode)}.`
                      : "No root members found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4">
          <p className="text-xs font-semibold text-slate-500">
            {pagination.total
              ? `Showing ${formatNumber(firstRow)}-${formatNumber(lastRow)} of ${formatNumber(pagination.total)}`
              : "No members in this list"}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mr-2">
              <span>Show rows:</span>
              <select
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 outline-none transition-colors focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
                onChange={(event) => setPageSize(Number(event.target.value))}
                value={pageSize}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <Button
              className={paginationButtonClass}
              disabled={!pagination.hasPreviousPage || referralsQuery.isLoading}
              onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
              type="button"
              variant="outline"
            >
              <ChevronLeft className="size-4" />
              Prev
            </Button>
            <Button
              className={paginationButtonClass}
              disabled={!pagination.hasNextPage || referralsQuery.isLoading}
              onClick={() => setPage((currentPage) => currentPage + 1)}
              type="button"
              variant="outline"
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </AdminCard>
    </section>
  );
}
