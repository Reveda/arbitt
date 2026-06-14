import { useState, type FormEvent } from "react";
import { Headphones, Loader2, Send, Clock, BadgeCheck, CheckCircle2, MessageSquare, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserSupportTicketsQuery, useCreateSupportTicketMutation } from "@/store/api/supportApi";
import { getQueryErrorMessage } from "@/store/api/queryError";
import { cn } from "@/lib/utils";

export function SupportPage() {
  const [subject, setSubject] = useState("");
  const [messageText, setMessageText] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const { data: ticketsResponse, isLoading: isLoadingTickets } = useUserSupportTicketsQuery();
  const [createTicket, { isLoading: isCreating }] = useCreateSupportTicketMutation();

  const tickets = ticketsResponse?.data ?? [];

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    if (!subject.trim() || !messageText.trim()) {
      setErrorMsg("Subject and message are required.");
      return;
    }

    try {
      await createTicket({ subject: subject.trim(), message: messageText.trim() }).unwrap();
      setSuccessMsg("Support ticket raised successfully. Our team will review it shortly.");
      setSubject("");
      setMessageText("");
    } catch (caughtError) {
      setErrorMsg(getQueryErrorMessage(caughtError, "Failed to create support ticket.") ?? "Failed to create support ticket.");
    }
  };

  return (
    <section className="space-y-6">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#08152e] via-[#0d5c80] to-[#22d3ee] px-4 py-6 text-white shadow-[0_18px_50px_rgba(8,21,46,0.18)] sm:px-5">
        <div className="absolute -right-10 -top-12 size-36 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-cyan-100/82 sm:text-xs">User Panel</p>
          <h1 className="mt-1 text-[1.35rem] font-black leading-tight tracking-tight sm:text-2xl">Support Helpdesk</h1>
          <p className="mt-1 max-w-2xl text-[13px] font-semibold leading-relaxed text-cyan-50/88 sm:text-sm">
            Need assistance? Raise account, payment, or platform support requests.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Create Ticket Form */}
        <Card className="border-slate-200 bg-white text-slate-950 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-cyan-50 text-cyan-700">
                <Headphones className="size-4" />
              </span>
              <div>
                <CardTitle className="text-base font-black text-slate-900">New Support Ticket</CardTitle>
                <CardDescription className="text-xs font-semibold text-slate-500">
                  Submit your request and our support desk will assist you.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {/* Professional Disclaimer */}
            <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3.5 flex items-start gap-3">
              <Clock className="size-5 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-xs text-blue-950 font-semibold leading-relaxed">
                <span className="font-bold">Estimated Turnaround Time:</span> Support tickets are processed and resolved by our helpdesk team within <strong className="font-extrabold underline decoration-wavy decoration-blue-400">24 to 48 hours</strong>.
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {successMsg && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  {successMsg}
                </div>
              )}
              {errorMsg && (
                <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-xs font-bold text-rose-700 flex items-center gap-2">
                  <AlertCircle className="size-4 text-rose-600" />
                  {errorMsg}
                </div>
              )}

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Subject</span>
                <Input
                  className="rounded-xl border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:border-cyan-300 focus:ring-0"
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Deposit issue, Password reset"
                  required
                  type="text"
                  value={subject}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Detailed Message</span>
                <textarea
                  className="flex min-h-[140px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-cyan-300 focus:ring-0 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Explain your query in detail, providing any transaction IDs if applicable..."
                  required
                  value={messageText}
                />
              </label>

              <Button
                className="w-full h-11 rounded-xl text-xs font-bold gap-2 mt-2"
                disabled={isCreating}
                type="submit"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Raising Ticket...
                  </>
                ) : (
                  <>
                    <Send className="size-4" /> Submit Request
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Support Ticket History */}
        <Card className="border-slate-200 bg-white text-slate-950 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-5">
            <CardTitle className="text-base font-black text-slate-900">Ticket History</CardTitle>
            <CardDescription className="text-xs font-semibold text-slate-500">
              Track and monitor the status of your queries.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 max-h-[500px] overflow-y-auto space-y-4">
            {isLoadingTickets ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="size-8 animate-spin text-cyan-600" />
                <p className="text-xs font-bold">Loading support tickets...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-slate-400 text-center gap-3">
                <MessageSquare className="size-10 text-slate-300" />
                <div>
                  <p className="text-sm font-bold text-slate-700">No Support Tickets Raised</p>
                  <p className="text-xs font-semibold text-slate-500 mt-1 max-w-[280px] mx-auto">
                    If you have any questions or platform issues, submit a new request using the form.
                  </p>
                </div>
              </div>
            ) : (
              tickets.map((ticket) => (
                <div
                  key={ticket._id}
                  className="rounded-xl border border-slate-100 bg-slate-50/30 p-4 space-y-3 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:border-slate-200 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-slate-800 truncate">{ticket.subject}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold ring-1",
                        ticket.status === "resolved"
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                          : "bg-amber-50 text-amber-700 ring-amber-100"
                      )}
                    >
                      {ticket.status === "resolved" ? "Resolved" : "Pending"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed font-semibold break-words">{ticket.message}</p>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                    <Clock className="size-3" />
                    <span>{new Date(ticket.createdAt).toLocaleString()}</span>
                  </div>

                  {ticket.reply && (
                    <div className="rounded-xl border border-emerald-100/50 bg-emerald-50/30 p-3 mt-2 space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700">
                        <BadgeCheck className="size-3.5 text-emerald-600" />
                        <span>Staff Reply</span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-semibold break-words">{ticket.reply}</p>
                      {ticket.resolvedAt && (
                        <p className="text-[9px] font-bold text-slate-400">
                          Resolved at: {new Date(ticket.resolvedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
