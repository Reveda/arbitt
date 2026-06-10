import { useEffect, useMemo, useState } from "react";
import { Edit3, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminUsers } from "@/hooks/useAdminQueries";
import { cn } from "@/lib/utils";
import { AdminPageHeader, ManagementPanel } from "./admin.components";

const USERS_PAGE_LIMIT = 10;

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

function getUserName(username: string | null) {
  return username || "User";
}

function getVisiblePages(currentPage: number, totalPages: number) {
  const windowSize = 5;
  const start = Math.max(1, Math.min(currentPage - 2, totalPages - windowSize + 1));
  const length = Math.min(windowSize, totalPages);

  return Array.from({ length }, (_, index) => start + index);
}

export function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDebouncedSearch(searchValue.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timerId);
  }, [searchValue]);

  const usersQuery = useAdminUsers({
    page,
    limit: USERS_PAGE_LIMIT,
    search: debouncedSearch || undefined
  });
  const users = usersQuery.data?.data.users ?? [];
  const pagination = usersQuery.data?.data.pagination;
  const visiblePages = useMemo(() => getVisiblePages(page, pagination?.totalPages ?? 1), [page, pagination?.totalPages]);

  return (
    <section className="space-y-4">
      <AdminPageHeader
        description="Review registered users, monitor account status, and prepare role or security actions from one place."
        title="Users Management"
      />

      <ManagementPanel title="Users Management">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-500 sm:min-w-[340px]">
            <Search className="size-4" />
            <Input
              className="h-9 border-0 bg-transparent px-0 text-xs font-medium text-slate-700 shadow-none outline-none placeholder:text-slate-400 focus-visible:ring-0"
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search user by name or referral code..."
              type="search"
              value={searchValue}
            />
          </label>
        </div>

        {usersQuery.error ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
            {usersQuery.error}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-xs">
            <thead className="text-slate-500">
              <tr className="border-b border-slate-100">
                <th className="py-3 font-semibold">Name</th>
                <th className="py-3 font-semibold">Role</th>
                <th className="py-3 font-semibold">Status</th>
                <th className="py-3 font-semibold">Joined</th>
                <th className="py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {usersQuery.isLoading ? (
                Array.from({ length: 5 }, (_, index) => (
                  <tr className="border-b border-slate-100 last:border-0" key={index}>
                    <td className="py-4">
                      <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
                    </td>
                    <td className="py-4">
                      <div className="h-6 w-16 animate-pulse rounded-full bg-slate-100" />
                    </td>
                    <td className="py-4">
                      <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
                    </td>
                    <td className="py-4">
                      <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
                    </td>
                    <td className="py-4">
                      <div className="ml-auto h-4 w-14 animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : users.length ? (
                users.map((user) => (
                <tr key={user.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-4 font-semibold text-slate-800">{getUserName(user.username)}</td>
                  <td className="py-4">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 font-bold capitalize",
                        user.role === "admin" ? "bg-violet-50 text-violet-700" : "bg-cyan-50 text-cyan-700"
                      )}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td
                    className={cn(
                      "py-4 font-bold capitalize",
                      user.status === "active" && "text-emerald-600",
                      user.status === "pending" && "text-amber-600",
                      user.status === "suspended" && "text-rose-500"
                    )}
                  >
                    {user.status}
                  </td>
                  <td className="py-4 text-slate-400">{formatDate(user.createdAt)}</td>
                  <td className="py-4">
                    <div className="flex justify-end gap-3">
                      <button aria-label={`Edit ${getUserName(user.username)}`} className="text-cyan-500 transition-colors hover:text-cyan-600" type="button">
                        <Edit3 className="size-4" />
                      </button>
                      <button aria-label={`Delete ${getUserName(user.username)}`} className="text-rose-500 transition-colors hover:text-rose-600" type="button">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                ))
              ) : (
                <tr>
                  <td className="py-8 text-center text-sm font-semibold text-slate-500" colSpan={5}>
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold text-slate-500">
            Showing page {pagination?.page ?? page} of {pagination?.totalPages ?? 1}
            {typeof pagination?.total === "number" ? ` · ${pagination.total} total users` : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              className="h-9 border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-100"
              disabled={usersQuery.isLoading || !pagination?.hasPreviousPage}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              type="button"
              variant="outline"
            >
              Prev
            </Button>
            {visiblePages.map((pageNumber) => (
              <Button
                className={cn(
                  "h-9 min-w-9 px-3 text-xs",
                  pageNumber === page
                    ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 hover:from-cyan-400 hover:to-blue-400"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                )}
                disabled={usersQuery.isLoading}
                key={pageNumber}
                onClick={() => setPage(pageNumber)}
                type="button"
                variant={pageNumber === page ? "default" : "outline"}
              >
                {pageNumber}
              </Button>
            ))}
            <Button
              className="h-9 border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-100"
              disabled={usersQuery.isLoading || !pagination?.hasNextPage}
              onClick={() => setPage((current) => current + 1)}
              type="button"
              variant="outline"
            >
              Next
            </Button>
          </div>
        </div>
      </ManagementPanel>
    </section>
  );
}
