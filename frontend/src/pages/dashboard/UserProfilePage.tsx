import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  BadgeCheck,
  CalendarDays,
  Copy,
  ExternalLink,
  KeyRound,
  Link as LinkIcon,
  Mail,
  Save,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wallet,
  Award
} from "lucide-react";
import { APP_ROUTES } from "@/api/endpoints";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ToastMessage, type ToastMessageValue } from "@/components/ui/toast-message";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { cn } from "@/lib/utils";
import { authService } from "@/services/auth.service";

const USER_WALLET_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

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

export function UserProfilePage() {
  const { error, isLoading, refetch, user } = useCurrentUser();
  const [copiedTarget, setCopiedTarget] = useState<"code" | "link" | null>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [currentTransactionPassword, setCurrentTransactionPassword] = useState("");
  const [transactionPassword, setTransactionPassword] = useState("");
  const [confirmTransactionPassword, setConfirmTransactionPassword] = useState("");
  const [isWalletSaving, setIsWalletSaving] = useState(false);
  const [isTransactionPasswordSaving, setIsTransactionPasswordSaving] = useState(false);
  const [message, setMessage] = useState<ToastMessageValue | null>(null);

  useEffect(() => {
    setWalletAddress(user?.walletAddress ?? "");
  }, [user?.walletAddress]);

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

  const handleWalletAddressSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextWalletAddress = walletAddress.trim();

    if (!USER_WALLET_ADDRESS_PATTERN.test(nextWalletAddress)) {
      setMessage({
        text: "Enter a valid BEP20 wallet address.",
        tone: "error"
      });
      return;
    }

    setIsWalletSaving(true);
    setMessage(null);

    try {
      await authService.updateWalletAddress({ walletAddress: nextWalletAddress });
      await refetch();
      setMessage({
        text: "Wallet address updated successfully.",
        tone: "success"
      });
    } catch (caughtError) {
      setMessage({
        text: caughtError instanceof Error ? caughtError.message : "Unable to update wallet address.",
        tone: "error"
      });
    } finally {
      setIsWalletSaving(false);
    }
  };

  const handleTransactionPasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const currentPassword = currentTransactionPassword.trim();
    const nextPassword = transactionPassword.trim();
    const confirmPassword = confirmTransactionPassword.trim();
    const hasExistingTransactionPassword = Boolean(user?.hasTransactionPassword);

    if (hasExistingTransactionPassword && !currentPassword) {
      setMessage({
        text: "Current transaction password is required.",
        tone: "error"
      });
      return;
    }

    if (nextPassword.length < 6) {
      setMessage({
        text: "Transaction password must be at least 6 characters.",
        tone: "error"
      });
      return;
    }

    if (nextPassword !== confirmPassword) {
      setMessage({
        text: "Transaction passwords do not match.",
        tone: "error"
      });
      return;
    }

    setIsTransactionPasswordSaving(true);
    setMessage(null);

    try {
      await authService.updateTransactionPassword({
        ...(hasExistingTransactionPassword ? { currentTransactionPassword: currentPassword } : {}),
        confirmTransactionPassword: confirmPassword,
        transactionPassword: nextPassword
      });
      await refetch();
      setCurrentTransactionPassword("");
      setTransactionPassword("");
      setConfirmTransactionPassword("");
      setMessage({
        text: hasExistingTransactionPassword
          ? "Transaction password changed successfully."
          : "Transaction password set successfully.",
        tone: "success"
      });
    } catch (caughtError) {
      setMessage({
        text: caughtError instanceof Error ? caughtError.message : "Unable to update transaction password.",
        tone: "error"
      });
    } finally {
      setIsTransactionPasswordSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <ToastMessage message={message} onClose={() => setMessage(null)} />

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#08152e] via-[#0d5c80] to-[#22d3ee] px-4 py-4 text-white shadow-[0_18px_50px_rgba(8,21,46,0.18)] sm:px-5">
        <div className="absolute -right-10 -top-12 size-36 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-cyan-100/82 sm:text-xs">User Panel</p>
          <h1 className="mt-1 text-[1.35rem] font-black leading-tight tracking-tight sm:text-2xl">My Profile</h1>
          <p className="mt-1 max-w-2xl text-[13px] font-semibold leading-relaxed text-cyan-50/88 sm:text-sm">
            Manage your account details and share your referral invite link.
          </p>
        </div>
      </div>

      {isLoading ? (
        <Card className="form-motion-off border-slate-200 bg-white text-slate-950 shadow-sm">
          <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_1.4fr]">
            <div className="h-52 animate-pulse rounded-3xl bg-slate-100" />
            <div className="grid gap-3">
              <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && error ? (
        <Card className="form-motion-off border-slate-200 bg-white text-slate-950 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm font-bold text-rose-600">{error}</p>
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && user ? (
        <div className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
          <Card className="form-motion-off overflow-hidden border-slate-200 bg-white text-slate-950 shadow-sm">
            <div className="relative min-h-full bg-gradient-to-br from-[#061225] via-[#0a2440] to-[#16bfd7] p-5 text-white">
              <div className="absolute -right-14 -top-14 size-44 rounded-full bg-cyan-200/20 blur-3xl" />
              <div className="absolute -bottom-16 left-4 size-40 rounded-full bg-blue-500/20 blur-3xl" />
              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <span className="grid size-16 place-items-center rounded-3xl border border-cyan-200/30 bg-white/10 text-2xl font-black shadow-[0_18px_40px_rgba(34,211,238,0.18)]">
                    {user.email.charAt(0).toUpperCase()}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/30 bg-cyan-300/12 px-3 py-1 text-xs font-bold text-cyan-100">
                    <ShieldCheck className="size-3.5" />
                    Member
                  </span>
                </div>

                <div className="mt-6">
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-100/80">Account</p>
                  <h2 className="mt-2 break-words text-2xl font-black tracking-tight">{user.username ?? "User Account"}</h2>
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
                    <p className="text-xs font-black uppercase tracking-[0.18em]">Referral Access</p>
                  </div>
                  <div className="mt-4 grid gap-3">
                    <div className="rounded-2xl border border-cyan-200/10 bg-slate-950/20 p-3">
                      <p className="text-[11px] font-semibold text-cyan-50/58">Your Referral Code</p>
                      <p className="mt-1 break-all font-mono text-sm font-black text-white">{user.referralCode ?? "Not generated"}</p>
                    </div>
                    <div className="rounded-2xl border border-cyan-200/10 bg-slate-950/20 p-3">
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-cyan-50/58">
                        <Award className="size-3.5 text-cyan-200" />
                        Rank
                      </p>
                      <p className="mt-1 break-all text-sm font-black text-cyan-50">{user.rank ?? "Unrank"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="form-motion-off border-slate-200 bg-white text-slate-950 shadow-sm">
              <CardContent className="p-5">
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
              </CardContent>
            </Card>

            <Card className="form-motion-off border-slate-200 bg-white text-slate-950 shadow-sm">
              <CardContent className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-slate-950">Wallet & Transaction Security</p>
                    <p className="mt-1 max-w-2xl text-sm font-medium text-slate-500">
                      Save your user wallet address and transaction password for secure payouts.
                    </p>
                  </div>
                  <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">
                    <ShieldCheck className="size-3.5" />
                    Protected
                  </span>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <form
                    className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
                    onSubmit={handleWalletAddressSubmit}
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 place-items-center rounded-2xl bg-cyan-50 text-cyan-700">
                        <Wallet className="size-4" />
                      </span>
                      <div>
                        <p className="text-sm font-black text-slate-950">User Wallet Address</p>
                        <p className="text-xs font-semibold text-slate-500">BEP20 compatible</p>
                      </div>
                    </div>

                    <label className="mt-4 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                      Wallet Address
                    </label>
                    <Input
                      className="mt-2 h-11 rounded-xl border-slate-200 bg-white font-mono text-sm"
                      onChange={(event) => setWalletAddress(event.target.value)}
                      placeholder="0x..."
                      value={walletAddress}
                    />

                    <Button
                      className="mt-4 w-full bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 hover:from-cyan-300 hover:to-blue-400"
                      disabled={isWalletSaving}
                      type="submit"
                    >
                      <Save className="size-4" />
                      {isWalletSaving ? "Saving..." : "Save Wallet"}
                    </Button>
                  </form>

                  <form
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                    onSubmit={handleTransactionPasswordSubmit}
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 place-items-center rounded-2xl bg-violet-50 text-violet-700">
                        <KeyRound className="size-4" />
                      </span>
                      <div>
                        <p className="text-sm font-black text-slate-950">Transaction Password</p>
                        <p className="text-xs font-semibold text-slate-500">
                          {user.hasTransactionPassword ? "Already set" : "Not set yet"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3">
                      {user.hasTransactionPassword ? (
                        <div>
                          <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                            Current Password
                          </label>
                          <Input
                            autoComplete="current-password"
                            className="mt-2 h-11 rounded-xl border-slate-200 bg-slate-50"
                            onChange={(event) => setCurrentTransactionPassword(event.target.value)}
                            type="password"
                            value={currentTransactionPassword}
                          />
                        </div>
                      ) : null}

                      <div>
                        <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                          New Transaction Password
                        </label>
                        <Input
                          autoComplete="new-password"
                          className="mt-2 h-11 rounded-xl border-slate-200 bg-slate-50"
                          onChange={(event) => setTransactionPassword(event.target.value)}
                          type="password"
                          value={transactionPassword}
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                          Confirm Transaction Password
                        </label>
                        <Input
                          autoComplete="new-password"
                          className="mt-2 h-11 rounded-xl border-slate-200 bg-slate-50"
                          onChange={(event) => setConfirmTransactionPassword(event.target.value)}
                          type="password"
                          value={confirmTransactionPassword}
                        />
                      </div>
                    </div>

                    <Button
                      className="mt-4 w-full bg-slate-950 text-white hover:bg-slate-800"
                      disabled={isTransactionPasswordSaving}
                      type="submit"
                    >
                      <KeyRound className="size-4" />
                      {isTransactionPasswordSaving
                        ? "Saving..."
                        : user.hasTransactionPassword
                          ? "Change Password"
                          : "Set Password"}
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>

            <Card className="form-motion-off border-slate-200 bg-white text-slate-950 shadow-sm">
              <CardContent className="grid gap-3 p-5 sm:grid-cols-2">
                <DetailTile label="Email" value={user.email} />
                <DetailTile label="Username" value={user.username ?? "Not set"} />
                {/* <DetailTile label="Role" value={user.role} />
                <DetailTile label="Invited By" value={user.invitedBy ?? "Root / Direct"} />
                <DetailTile label="User Wallet Address" value={user.walletAddress ?? "Not set"} />
                <DetailTile
                  label="Transaction Password"
                  value={user.hasTransactionPassword ? "Set" : "Not set"}
                />
                <DetailTile label="Created" value={formatDate(user.createdAt)} />
                <DetailTile label="Updated" value={formatDate(user.updatedAt)} /> */}
              </CardContent>
            </Card>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Access Type", value: "User Console", icon: UserRound },
                { label: "Email Status", value: user.emailVerified ? "Verified" : "Pending", icon: BadgeCheck },
                { label: "Member Since", value: formatDate(user.createdAt), icon: CalendarDays }
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <Card className="form-motion-off border-slate-200 bg-white text-slate-950 shadow-sm" key={item.label}>
                    <CardContent className="flex items-center gap-3 p-4">
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
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
