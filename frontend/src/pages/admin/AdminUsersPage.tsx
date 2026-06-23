import { useEffect, useMemo, useState } from "react";
import { Edit3, Search, Trash2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminUsers } from "@/hooks/useAdminQueries";
import { adminService } from "@/services/admin.service";
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
    year: "numeric",
    timeZone: "UTC"
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
  const [limit, setLimit] = useState(USERS_PAGE_LIMIT);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Edit User State
  const [selectedEditUser, setSelectedEditUser] = useState<any>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editError, setEditError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Delete User State
  const [selectedDeleteUser, setSelectedDeleteUser] = useState<any>(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Status Alerts
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDebouncedSearch(searchValue.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timerId);
  }, [searchValue]);

  const usersQuery = useAdminUsers({
    page,
    limit,
    search: debouncedSearch || undefined
  });
  const users = usersQuery.data?.data.users ?? [];
  const pagination = usersQuery.data?.data.pagination;
  const visiblePages = useMemo(() => getVisiblePages(page, pagination?.totalPages ?? 1), [page, pagination?.totalPages]);

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEditError("");
    setIsSaving(true);

    try {
      await adminService.editUser(selectedEditUser.id, {
        username: editUsername.trim() || undefined,
        role: editRole,
        status: editStatus
      });
      setSuccessMessage("User updated successfully.");
      setSelectedEditUser(null);
      usersQuery.refetch();
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err: any) {
      setEditError(err instanceof Error ? err.message : "Failed to update user.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSubmit = async () => {
    setDeleteError("");
    setIsDeleting(true);

    try {
      await adminService.deleteUser(selectedDeleteUser.id);
      setSuccessMessage("User deleted successfully.");
      setSelectedDeleteUser(null);
      usersQuery.refetch();
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err: any) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete user.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="space-y-4">
      <AdminPageHeader
        description="Review registered users, monitor account status, and prepare role or security actions from one place."
        title="Users Management"
      />

      {successMessage && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">
          {successMessage}
        </div>
      )}

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
                  <tr key={user.id} className="border-b border-slate-100 last:border-0 hover:bg-cyan-50/20">
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
                        <button
                          aria-label={`Edit ${getUserName(user.username)}`}
                          className="text-cyan-500 transition-colors hover:text-cyan-600"
                          onClick={() => {
                            setEditUsername(user.username || "");
                            setEditRole(user.role);
                            setEditStatus(user.status);
                            setEditError("");
                            setSelectedEditUser(user);
                          }}
                          type="button"
                        >
                          <Edit3 className="size-4" />
                        </button>
                        <button
                          aria-label={`Delete ${getUserName(user.username)}`}
                          className="text-rose-500 transition-colors hover:text-rose-600"
                          onClick={() => {
                            setDeleteError("");
                            setSelectedDeleteUser(user);
                          }}
                          type="button"
                        >
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
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mr-2">
              <span>Show rows:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 outline-none transition-colors focus:border-cyan-300"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
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

      {/* Edit User Modal */}
      {selectedEditUser && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4 bg-slate-50/50">
              <h3 className="text-sm font-black text-slate-900">Edit User Details</h3>
              <button
                onClick={() => setSelectedEditUser(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                <X className="size-4.5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              {editError && (
                <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                  {editError}
                </div>
              )}

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Username</span>
                <Input
                  className="h-10 rounded-xl text-xs font-semibold border-slate-200"
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                  value={editUsername}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Role</span>
                <select
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 shadow-sm outline-none transition-colors focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
                  onChange={(e) => setEditRole(e.target.value)}
                  value={editRole}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Status</span>
                <select
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 shadow-sm outline-none transition-colors focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
                  onChange={(e) => setEditStatus(e.target.value)}
                  value={editStatus}
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                </select>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  className="h-10 rounded-xl text-xs font-bold"
                  onClick={() => setSelectedEditUser(null)}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  className="h-10 rounded-xl text-xs font-bold gap-2 bg-cyan-600 text-white hover:bg-cyan-700"
                  disabled={isSaving}
                  type="submit"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {selectedDeleteUser && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4 bg-slate-50/50">
              <h3 className="text-sm font-black text-slate-900">Delete User</h3>
              <button
                onClick={() => setSelectedDeleteUser(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                <X className="size-4.5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {deleteError && (
                <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                  {deleteError}
                </div>
              )}

              <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                Are you sure you want to delete user <span className="font-bold text-slate-800">{getUserName(selectedDeleteUser.username)}</span>?
                <br />
                This action will perform a **soft delete** and revoke all active login sessions for this user immediately.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  className="h-10 rounded-xl text-xs font-bold"
                  onClick={() => setSelectedDeleteUser(null)}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  className="h-10 rounded-xl text-xs font-bold gap-2 bg-rose-600 text-white hover:bg-rose-700"
                  disabled={isDeleting}
                  onClick={handleDeleteSubmit}
                  type="button"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
