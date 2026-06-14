import { useState, useMemo } from "react";
import { LifeBuoy, Loader2, Send, Eye, X, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminSupportTicketsQuery, useResolveSupportTicketMutation, type SupportTicket } from "@/store/api/supportApi";
import { getQueryErrorMessage } from "@/store/api/queryError";
import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const TICKETS_PAGE_SIZE = 10;

// Custom premium components
function AdminPageHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#020918] via-[#091e3a] to-[#0d5c80] p-5 text-white shadow-md">
      <div className="absolute -right-6 -top-8 size-28 rounded-full bg-white/5 blur-xl" />
      <h1 className="text-xl font-black tracking-tight">{title}</h1>
      <p className="mt-1.5 max-w-3xl text-xs font-semibold text-cyan-100/78 leading-relaxed">{description}</p>
    </div>
  );
}

function AdminCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.015)]", className)}>
      {children}
    </div>
  );
}

export function AdminSupportPage() {
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "resolved">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const { data: ticketsResponse, isLoading, refetch } = useAdminSupportTicketsQuery();
  const [resolveTicket, { isLoading: isResolving }] = useResolveSupportTicketMutation();

  const tickets = ticketsResponse?.data ?? [];

  // Filter and search
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;

      // Resolve user details
      const user = ticket.userId && typeof ticket.userId === "object" ? ticket.userId : null;
      const email = user?.email ?? "";
      const username = user?.username ?? "";

      const matchesSearch =
        searchQuery.trim() === "" ||
        ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        username.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [tickets, statusFilter, searchQuery]);

  const totalItems = filteredTickets.length;
  const totalPages = Math.ceil(totalItems / TICKETS_PAGE_SIZE) || 1;
  const activePage = Math.min(currentPage, totalPages);

  const paginatedTickets = useMemo(() => {
    return filteredTickets.slice(
      (activePage - 1) * TICKETS_PAGE_SIZE,
      activePage * TICKETS_PAGE_SIZE
    );
  }, [filteredTickets, activePage]);

  const handleResolveSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!selectedTicket) return;
    if (!replyText.trim()) {
      setErrorMsg("Reply text cannot be empty.");
      return;
    }

    try {
      await resolveTicket({ ticketId: selectedTicket._id, reply: replyText.trim() }).unwrap();
      setSuccessMsg("Support ticket resolved and answer sent.");
      setReplyText("");
      setSelectedTicket(null);
      refetch();
    } catch (caughtError) {
      setErrorMsg(getQueryErrorMessage(caughtError, "Failed to resolve support ticket.") ?? "Failed to resolve support ticket.");
    }
  };

  const getUserDetails = (ticket: SupportTicket) => {
    const user = ticket.userId && typeof ticket.userId === "object" ? ticket.userId : null;
    return {
      email: user?.email ?? "unknown@user.com",
      username: user?.username ?? "Unknown",
    };
  };

  return (
    <section className="space-y-4">
      <AdminPageHeader
        description="Handle contact requests, account issues, payment support, and ticket queues."
        title="Support Tickets"
      />

      {successMsg && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">
          {successMsg}
        </div>
      )}

      {/* Filter and Search Bar */}
      <AdminCard className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => { setStatusFilter("all"); setCurrentPage(1); }}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                statusFilter === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
              )}
            >
              All
            </button>
            <button
              onClick={() => { setStatusFilter("pending"); setCurrentPage(1); }}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                statusFilter === "pending" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
              )}
            >
              Pending
            </button>
            <button
              onClick={() => { setStatusFilter("resolved"); setCurrentPage(1); }}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                statusFilter === "resolved" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
              )}
            >
              Resolved
            </button>
          </div>

          <div className="w-full sm:max-w-xs">
            <Input
              className="h-9 rounded-xl text-xs font-bold border-slate-200 bg-slate-50 placeholder-slate-400 focus:border-cyan-300 focus:ring-0"
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search by subject, email or username..."
              value={searchQuery}
            />
          </div>
        </div>
      </AdminCard>

      {/* Ticket List Table */}
      <AdminCard>
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <div>
            <p className="text-sm font-black text-slate-950">Support Ticket Records</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Showing {filteredTickets.length} of {tickets.length} total tickets
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left">
            <thead className="bg-white text-xs text-slate-500 shadow-[0_1px_0_#e2e8f0]">
              <tr>
                <th className="px-4 py-3 font-black">User Account</th>
                <th className="px-4 py-3 font-black">Subject</th>
                <th className="px-4 py-3 font-black">Query Message</th>
                <th className="px-4 py-3 font-black">Created Date</th>
                <th className="px-4 py-3 font-black">Status</th>
                <th className="px-4 py-3 text-right font-black">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }, (_, idx) => (
                  <tr className="border-b border-slate-100 last:border-0" key={idx}>
                    {Array.from({ length: 6 }, (_, cellIdx) => (
                      <td className="px-4 py-4" key={cellIdx}>
                        <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginatedTickets.length > 0 ? (
                paginatedTickets.map((ticket) => {
                  const user = getUserDetails(ticket);
                  return (
                    <tr
                      className="border-b border-slate-100 bg-white last:border-0 hover:bg-cyan-50/20"
                      key={ticket._id}
                    >
                      <td className="px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-black text-slate-900">{user.username}</p>
                          <p className="truncate text-[10px] text-slate-400 font-bold mt-0.5">{user.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-800 truncate max-w-[200px]">
                        {ticket.subject}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-500 max-w-[320px] truncate">
                        {ticket.message}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 font-semibold">
                        {new Date(ticket.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-[10px] font-bold ring-1 capitalize",
                            ticket.status === "resolved"
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                              : "bg-amber-50 text-amber-700 ring-amber-100"
                          )}
                        >
                          {ticket.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {ticket.status === "pending" ? (
                            <Button
                              className="h-8 rounded-lg bg-cyan-600 text-white hover:bg-cyan-700 text-[11px] font-bold gap-1 px-3"
                              onClick={() => {
                                setErrorMsg("");
                                setSelectedTicket(ticket);
                              }}
                              size="sm"
                              type="button"
                            >
                              <Send className="size-3" /> Answer
                            </Button>
                          ) : (
                            <Button
                              className="h-8 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] font-bold gap-1 px-3"
                              onClick={() => {
                                setErrorMsg("");
                                setSelectedTicket(ticket);
                              }}
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              <Eye className="size-3" /> View Reply
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="py-12 text-center text-xs font-bold text-slate-400" colSpan={6}>
                    No support tickets match these criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col gap-4 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold text-slate-500">
              Showing {totalItems > 0 ? (activePage - 1) * TICKETS_PAGE_SIZE + 1 : 0} to{" "}
              {Math.min(activePage * TICKETS_PAGE_SIZE, totalItems)} of {totalItems} entries
            </p>
            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className={cn(
                      "text-xs font-bold cursor-pointer",
                      activePage === 1 && "pointer-events-none opacity-50"
                    )}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, index) => {
                  const pageNumber = index + 1;
                  return (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        onClick={() => setCurrentPage(pageNumber)}
                        isActive={activePage === pageNumber}
                        className="text-xs font-bold cursor-pointer"
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className={cn(
                      "text-xs font-bold cursor-pointer",
                      activePage === totalPages && "pointer-events-none opacity-50"
                    )}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </AdminCard>

      {/* Answer / View Dialog Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-lg bg-cyan-50 text-cyan-700">
                  <LifeBuoy className="size-4" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {selectedTicket.status === "pending" ? "Answer Support Ticket" : "Support Ticket Details"}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                    From: {getUserDetails(selectedTicket).username} ({getUserDetails(selectedTicket).email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedTicket(null);
                  setReplyText("");
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                <X className="size-4.5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Subject</p>
                <p className="text-xs font-bold text-slate-800 mt-1">{selectedTicket.subject}</p>
              </div>

              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Query Message</p>
                <div className="rounded-xl border border-slate-100 bg-slate-50/30 p-3 mt-1.5">
                  <p className="text-xs text-slate-700 leading-relaxed font-semibold break-words">
                    {selectedTicket.message}
                  </p>
                </div>
              </div>

              {selectedTicket.status === "resolved" ? (
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Staff Answer / Reply</p>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-3 mt-1.5 space-y-1">
                    <p className="text-xs text-slate-700 leading-relaxed font-semibold break-words">
                      {selectedTicket.reply}
                    </p>
                    {selectedTicket.resolvedAt && (
                      <p className="text-[9px] font-bold text-slate-400 mt-1">
                        Resolved on: {new Date(selectedTicket.resolvedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleResolveSubmit} className="space-y-4">
                  {errorMsg && (
                    <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                      {errorMsg}
                    </div>
                  )}

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold text-slate-600">Resolve Answer (Reply)</span>
                    <textarea
                      className="flex min-h-[120px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-cyan-300 focus:ring-0 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write your professional response to this ticket..."
                      required
                      value={replyText}
                    />
                  </label>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      className="h-10 rounded-xl text-xs font-bold"
                      onClick={() => {
                        setSelectedTicket(null);
                        setReplyText("");
                      }}
                      type="button"
                      variant="outline"
                    >
                      Cancel
                    </Button>
                    <Button
                      className="h-10 rounded-xl text-xs font-bold gap-2"
                      disabled={isResolving}
                      type="submit"
                    >
                      {isResolving ? (
                        <>
                          <Loader2 className="size-4 animate-spin" /> Resolving...
                        </>
                      ) : (
                        <>
                          <BadgeCheck className="size-4" /> Resolve & Close Ticket
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
