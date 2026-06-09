import { useMemo, useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  Copy,
  ExternalLink,
  Fingerprint,
  Link as LinkIcon,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound
} from "lucide-react";
import { APP_ROUTES } from "@/api/endpoints";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { cn } from "@/lib/utils";
import { AdminCard, AdminPageHeader } from "./admin.components";

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

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

export function AdminProfilePage() {
  const { error, isLoading, user } = useCurrentUser();
  const [copiedTarget, setCopiedTarget] = useState<"code" | "link" | null>(null);

  const referralLink = useMemo(() => {
    if (!user?.referralCode) {
      return "";
    }

    return `${window.location.origin}${APP_ROUTES.public.register}?ref=${encodeURIComponent(user.referralCode)}`;
  }, [user?.referralCode]);

  const copyValue = async (target: "code" | "link", value: string) => {
    if (!value) {
      return;
    }

    await navigator.clipboard.writeText(value);
    setCopiedTarget(target);
    window.setTimeout(() => setCopiedTarget(null), 1600);
  };

  return (
    <section className="space-y-4">
      <AdminPageHeader
        description="View secure admin account details and share your referral invite link."
        title="Admin Profile"
      />

      {isLoading ? (
        <AdminCard>
          <div className="grid gap-4 p-5 md:grid-cols-[1fr_1.4fr]">
            <div className="h-52 animate-pulse rounded-3xl bg-slate-100" />
            <div className="grid gap-3">
              <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
            </div>
          </div>
        </AdminCard>
      ) : null}

      {!isLoading && error ? (
        <AdminCard>
          <div className="p-5">
            <p className="text-sm font-bold text-rose-600">{error}</p>
          </div>
        </AdminCard>
      ) : null}

      {!isLoading && user ? (
        <div className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
          <AdminCard className="overflow-hidden">
            <div className="relative min-h-full bg-gradient-to-br from-[#061225] via-[#0a2440] to-[#16bfd7] p-5 text-white">
              <div className="absolute -right-14 -top-14 size-44 rounded-full bg-cyan-200/20 blur-3xl" />
              <div className="absolute -bottom-16 left-4 size-40 rounded-full bg-blue-500/20 blur-3xl" />
              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <span className="grid size-16 place-items-center rounded-3xl border border-cyan-200/30 bg-white/10 text-2xl font-black shadow-[0_18px_40px_rgba(34,211,238,0.18)]">
                    {user.email.charAt(0).toUpperCase()}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/30 bg-emerald-300/12 px-3 py-1 text-xs font-bold text-emerald-100">
                    <ShieldCheck className="size-3.5" />
                    Admin
                  </span>
                </div>

                <div className="mt-6">
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-100/80">Account</p>
                  <h2 className="mt-2 break-words text-2xl font-black tracking-tight">{user.username ?? "Admin User"}</h2>
                  <p className="mt-2 flex items-center gap-2 break-all text-sm font-semibold text-cyan-50/86">
                    <Mail className="size-4 shrink-0" />
                    {user.email}
                  </p>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-3">
                    <p className="text-[11px] font-semibold text-cyan-50/62">Status</p>
                    <p className="mt-1 text-sm font-black capitalize">{user.status}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-3">
                    <p className="text-[11px] font-semibold text-cyan-50/62">Verification</p>
                    <p className="mt-1 text-sm font-black">{user.emailVerified ? "Verified" : "Pending"}</p>
                  </div>
                </div>

                <div className="mt-6 rounded-3xl border border-white/12 bg-white/[0.08] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <div className="flex items-center gap-2 text-cyan-50">
                    <Sparkles className="size-4 text-cyan-200" />
                    <p className="text-xs font-black uppercase tracking-[0.18em]">Invite Control</p>
                  </div>
                  <div className="mt-4 grid gap-3">
                    <div className="rounded-2xl border border-cyan-200/10 bg-slate-950/20 p-3">
                      <p className="text-[11px] font-semibold text-cyan-50/58">Referral Code</p>
                      <p className="mt-1 break-all font-mono text-sm font-black text-white">{user.referralCode ?? "Not generated"}</p>
                    </div>
                    <div className="rounded-2xl border border-cyan-200/10 bg-slate-950/20 p-3">
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-cyan-50/58">
                        <Fingerprint className="size-3.5" />
                        Account ID
                      </p>
                      <p className="mt-1 break-all font-mono text-xs font-bold text-cyan-50/88">{user.id}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AdminCard>

          <div className="space-y-4">
            <AdminCard>
              <div className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-slate-950">Referral Invite</p>
                    <p className="mt-1 max-w-2xl text-sm font-medium text-slate-500">
                      Share this registration link with invited users. Their invitation code will be filled automatically on signup.
                    </p>
                  </div>
                  <span className="inline-flex w-fit items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-[11px] font-black text-cyan-700">
                    <LinkIcon className="size-3.5" />
                    Shareable
                  </span>
                </div>

                <div className="mt-5 grid gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Referral Code</p>
                        <p className="mt-2 break-all font-mono text-lg font-black text-slate-950">{user.referralCode ?? "Not generated"}</p>
                      </div>
                      <Button
                        className="bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 hover:from-cyan-300 hover:to-blue-400"
                        disabled={!user.referralCode}
                        onClick={() => copyValue("code", user.referralCode ?? "")}
                        type="button"
                      >
                        <Copy className="size-4" />
                        {copiedTarget === "code" ? "Copied" : "Copy Code"}
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Registration Link</p>
                    <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center">
                      <p className="min-w-0 flex-1 break-all rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-mono text-xs font-bold text-slate-700">
                        {referralLink || "Referral link will appear after code generation."}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          className="bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 hover:from-cyan-300 hover:to-blue-400"
                          disabled={!referralLink}
                          onClick={() => copyValue("link", referralLink)}
                          type="button"
                        >
                          <Copy className="size-4" />
                          {copiedTarget === "link" ? "Copied" : "Copy Link"}
                        </Button>
                        {referralLink ? (
                          <Button
                            asChild
                            className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                            variant="outline"
                          >
                            <a href={referralLink} rel="noreferrer" target="_blank">
                              <ExternalLink className="size-4" />
                              Open
                            </a>
                          </Button>
                        ) : (
                          <Button className="border-slate-200 bg-white text-slate-400" disabled variant="outline">
                            <ExternalLink className="size-4" />
                            Open
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </AdminCard>

            <AdminCard>
              <div className="grid gap-3 p-5 sm:grid-cols-2">
                <DetailTile label="Email" value={user.email} />
                <DetailTile label="Username" value={user.username ?? "Not set"} />
                <DetailTile label="Role" value={user.role} />
                <DetailTile label="Invited By" value={user.invitedBy ?? "Root / Direct"} />
                <DetailTile label="Created" value={formatDate(user.createdAt)} />
                <DetailTile label="Updated" value={formatDate(user.updatedAt)} />
              </div>
            </AdminCard>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Access Type", value: "Admin Console", icon: UserRound },
                { label: "Email Status", value: user.emailVerified ? "Verified" : "Pending", icon: BadgeCheck },
                { label: "Member Since", value: formatDate(user.createdAt), icon: CalendarDays }
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <AdminCard key={item.label}>
                    <div className="flex items-center gap-3 p-4">
                      <span
                        className={cn(
                          "grid size-10 shrink-0 place-items-center rounded-2xl",
                          item.label === "Access Type" ? "bg-cyan-50 text-cyan-700" : "bg-slate-100 text-slate-600"
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-slate-500">{item.label}</p>
                        <p className="truncate text-sm font-black text-slate-950">{item.value}</p>
                      </div>
                    </div>
                  </AdminCard>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
