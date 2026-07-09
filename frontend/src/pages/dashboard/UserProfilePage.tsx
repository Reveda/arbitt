import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Copy,
  ExternalLink,
  KeyRound,
  Link as LinkIcon,
  Mail,
  Save,
  ShieldCheck,
  Sparkles,
  X,
  Wallet
} from "lucide-react";
import { APP_ROUTES } from "@/api/endpoints";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ToastMessage, type ToastMessageValue } from "@/components/ui/toast-message";
import { useCurrentUser } from "@/hooks/useCurrentUser";
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

export function UserProfilePage() {
  const { error, isLoading, refetch, user } = useCurrentUser();
  const [copiedTarget, setCopiedTarget] = useState<"code" | "link" | null>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [currentTransactionPassword, setCurrentTransactionPassword] = useState("");
  const [transactionPassword, setTransactionPassword] = useState("");
  const [confirmTransactionPassword, setConfirmTransactionPassword] = useState("");
  const [walletDialogStep, setWalletDialogStep] = useState<"edit" | "verify">("edit");
  const [isWalletOtpRequesting, setIsWalletOtpRequesting] = useState(false);
  const [walletOtp, setWalletOtp] = useState("");
  const [walletOtpTargetAddress, setWalletOtpTargetAddress] = useState("");
  const [isWalletOtpDialogOpen, setIsWalletOtpDialogOpen] = useState(false);
  const [isWalletOtpVerifying, setIsWalletOtpVerifying] = useState(false);
  const [isTransactionPasswordSaving, setIsTransactionPasswordSaving] = useState(false);
  const [isTransactionPasswordDialogOpen, setIsTransactionPasswordDialogOpen] = useState(false);
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

  const openWalletOtpDialog = () => {
    setWalletAddress(user?.walletAddress ?? "");
    setWalletOtpTargetAddress("");
    setWalletOtp("");
    setWalletDialogStep("edit");
    setIsWalletOtpDialogOpen(true);
  };

  const closeWalletOtpDialog = () => {
    if (isWalletOtpRequesting || isWalletOtpVerifying) {
      return;
    }

    setIsWalletOtpDialogOpen(false);
    setWalletOtp("");
    setWalletOtpTargetAddress("");
    setWalletDialogStep("edit");
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

    if (walletDialogStep === "edit") {
      setIsWalletOtpRequesting(true);
      setMessage(null);

      try {
        const response = await authService.requestWalletAddressChangeOtp({
          walletAddress: nextWalletAddress,
        });
        setWalletOtpTargetAddress(nextWalletAddress);
        setWalletDialogStep("verify");
        setMessage({
          text: response.data.testMode && response.data.testOtp
            ? `OTP ready for testing: ${response.data.testOtp}`
            : "We sent an OTP to your email to confirm the new wallet address.",
          tone: "success"
        });
      } catch (caughtError) {
        setMessage({
          text: caughtError instanceof Error ? caughtError.message : "Unable to start wallet verification.",
          tone: "error"
        });
      } finally {
        setIsWalletOtpRequesting(false);
      }
    }
  };

  const handleWalletOtpSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const otp = walletOtp.trim();
    const targetWallet = walletOtpTargetAddress.trim();

    if (!targetWallet) {
      setMessage({
        text: "Wallet address is missing. Please request OTP again.",
        tone: "error"
      });
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setMessage({
        text: "Enter the 6-digit OTP sent to your email.",
        tone: "error"
      });
      return;
    }

    setIsWalletOtpVerifying(true);
    setMessage(null);

    try {
      await authService.verifyWalletAddressChangeOtp({
        otp,
        walletAddress: targetWallet,
      });
      await refetch();
      setWalletAddress(targetWallet);
      setWalletDialogStep("edit");
      closeWalletOtpDialog();
      setMessage({
        text: "Wallet address updated successfully.",
        tone: "success"
      });
    } catch (caughtError) {
      setMessage({
        text: caughtError instanceof Error ? caughtError.message : "Unable to verify wallet address.",
        tone: "error"
      });
    } finally {
      setIsWalletOtpVerifying(false);
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

  const openTransactionPasswordDialog = () => {
    setCurrentTransactionPassword("");
    setTransactionPassword("");
    setConfirmTransactionPassword("");
    setIsTransactionPasswordDialogOpen(true);
  };

  const closeTransactionPasswordDialog = () => {
    if (isTransactionPasswordSaving) {
      return;
    }

    setIsTransactionPasswordDialogOpen(false);
    setCurrentTransactionPassword("");
    setTransactionPassword("");
    setConfirmTransactionPassword("");
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
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Card className="form-motion-off overflow-hidden border-slate-200 bg-white text-slate-950 shadow-sm">
            <div className="relative h-full min-h-[540px] bg-gradient-to-br from-[#061225] via-[#0a2440] to-[#16bfd7] p-5 text-white">
              <div className="absolute -right-14 -top-14 size-44 rounded-full bg-cyan-200/20 blur-3xl" />
              <div className="absolute -bottom-20 left-6 size-44 rounded-full bg-blue-500/18 blur-3xl" />
              <div className="relative flex h-full flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className="grid size-16 shrink-0 place-items-center rounded-3xl border border-cyan-200/30 bg-white/10 text-2xl font-black shadow-[0_18px_40px_rgba(34,211,238,0.18)]">
                      {user.email.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.32em] text-cyan-100/70">Account</p>
                      <h2 className="mt-1 break-words text-2xl font-black tracking-tight">{user.username ?? "User Account"}</h2>
                      <p className="mt-1 flex items-center gap-2 break-all text-sm font-semibold text-cyan-50/86">
                        <Mail className="size-4 shrink-0" />
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/30 bg-cyan-300/12 px-3 py-1 text-xs font-bold text-cyan-100">
                    <ShieldCheck className="size-3.5" />
                    {user.emailVerified ? "Verified" : "Pending"}
                  </span>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                    <p className="text-[11px] font-semibold text-cyan-50/62">Status</p>
                    <p className="mt-1 text-sm font-black capitalize">{user.status}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                    <p className="text-[11px] font-semibold text-cyan-50/62">Rank</p>
                    <p className="mt-1 text-sm font-black">{user.rank ?? "Unranked"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                    <p className="text-[11px] font-semibold text-cyan-50/62">Member Since</p>
                    <p className="mt-1 text-sm font-black">{formatDate(user.createdAt)}</p>
                  </div>
                </div>

                <div className="mt-6 rounded-3xl border border-white/12 bg-white/[0.08] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-cyan-50">
                      <Sparkles className="size-4 text-cyan-200" />
                      <p className="text-xs font-black uppercase tracking-[0.18em]">Referral Access</p>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">
                      <LinkIcon className="size-3.5" />
                      Shareable
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <div className="rounded-2xl border border-cyan-200/10 bg-slate-950/20 p-3">
                      <p className="text-[11px] font-semibold text-cyan-50/58">Referral Code</p>
                      <p className="mt-1 break-all font-mono text-sm font-black text-white">
                        {user.referralCode ?? "Not generated"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-cyan-200/10 bg-slate-950/20 p-3">
                      <p className="text-[11px] font-semibold text-cyan-50/58">Current Rank</p>
                      <p className="mt-1 break-all text-sm font-black text-cyan-50">{user.rank ?? "Unranked"}</p>
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
                      Share this registration link with invited users. Their invitation code is auto-filled on signup.
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
                        <p className="mt-2 break-all font-mono text-lg font-black text-slate-950">
                          {user.referralCode ?? "Not generated"}
                        </p>
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
                      Save your wallet and protect payouts with a transaction password.
                    </p>
                  </div>
                  <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">
                    <ShieldCheck className="size-3.5" />
                    Protected
                  </span>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.95fr]">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 place-items-center rounded-2xl bg-cyan-50 text-cyan-700">
                        <Wallet className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-950">Wallet Address</p>
                        <p className="text-xs font-semibold text-slate-500">Protected with email OTP</p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-3 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Current Wallet</p>
                      <p className="mt-2 break-all font-mono text-sm font-black text-slate-950">
                        {user.walletAddress ?? "Not set"}
                      </p>
                    </div>

                    <Button
                      className="mt-4 w-full bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 hover:from-cyan-300 hover:to-blue-400"
                      onClick={openWalletOtpDialog}
                      type="button"
                    >
                      <Save className="size-4" />
                      Change Wallet
                    </Button>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 place-items-center rounded-2xl bg-violet-50 text-violet-700">
                        <KeyRound className="size-4" />
                      </span>
                      <div>
                        <p className="text-sm font-black text-slate-950">Transaction Password</p>
                        <p className="text-xs font-semibold text-slate-500">
                          {user.hasTransactionPassword ? "Set" : "Not set yet"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Status</p>
                      <p className="mt-2 text-sm font-black text-slate-950">
                        {user.hasTransactionPassword ? "Password is active" : "Password not configured"}
                      </p>
                      <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                        {user.hasTransactionPassword
                          ? "Change it from the secure dialog anytime."
                          : "Set one before making payouts and withdrawals."}
                      </p>
                    </div>

                    <Button
                      className="mt-4 w-full bg-slate-950 text-white hover:bg-slate-800"
                      onClick={openTransactionPasswordDialog}
                      type="button"
                    >
                      <KeyRound className="size-4" />
                      {user.hasTransactionPassword ? "Change Password" : "Set Password"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      ) : null}

      {isWalletOtpDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_30px_80px_rgba(2,8,23,0.32)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Secure Update</p>
                <h3 className="mt-1 text-xl font-black text-slate-950">
                  {walletDialogStep === "edit" ? "Change Wallet Address" : "Verify Wallet Change"}
                </h3>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {walletDialogStep === "edit"
                    ? "Enter the new wallet address and save to receive a verification OTP."
                    : "Enter the OTP sent to your email to confirm the new wallet address."}
                </p>
              </div>
              <button
                className="grid size-10 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950"
                onClick={closeWalletOtpDialog}
                type="button"
              >
                <X className="size-5" />
              </button>
            </div>

            {walletDialogStep === "edit" ? (
              <form className="mt-5 grid gap-3" onSubmit={handleWalletAddressSubmit}>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    New Wallet Address
                  </label>
                  <Input
                    className="mt-2 h-11 rounded-xl border-slate-200 bg-slate-50 font-mono text-sm"
                    onChange={(event) => setWalletAddress(event.target.value)}
                    placeholder="0x..."
                    value={walletAddress}
                  />
                </div>

                <div className="mt-2 flex gap-3">
                  <Button
                    className="flex-1 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                    disabled={isWalletOtpRequesting}
                    onClick={closeWalletOtpDialog}
                    type="button"
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-slate-950 text-white hover:bg-slate-800"
                    disabled={isWalletOtpRequesting}
                    type="submit"
                  >
                    <Save className="size-4" />
                    {isWalletOtpRequesting ? "Sending OTP..." : "Save"}
                  </Button>
                </div>
              </form>
            ) : (
              <>
                <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-cyan-700">New Wallet</p>
                  <p className="mt-1 break-all font-mono text-sm font-black text-slate-950">{walletOtpTargetAddress}</p>
                </div>

                <form className="mt-5 grid gap-3" onSubmit={handleWalletOtpSubmit}>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">OTP</label>
                    <Input
                      autoComplete="one-time-code"
                      className="mt-2 h-11 rounded-xl border-slate-200 bg-slate-50 tracking-[0.35em] text-center font-black"
                      inputMode="numeric"
                      maxLength={6}
                      onChange={(event) => setWalletOtp(event.target.value.replace(/\D/g, ""))}
                      placeholder="Enter OTP"
                      value={walletOtp}
                    />
                  </div>

                  <div className="mt-2 flex gap-3">
                    <Button
                      className="flex-1 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                      disabled={isWalletOtpVerifying}
                      onClick={closeWalletOtpDialog}
                      type="button"
                      variant="outline"
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 bg-slate-950 text-white hover:bg-slate-800"
                      disabled={isWalletOtpVerifying}
                      type="submit"
                    >
                      <Save className="size-4" />
                      {isWalletOtpVerifying ? "Verifying..." : "Confirm Wallet"}
                    </Button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      ) : null}

      {isTransactionPasswordDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_30px_80px_rgba(2,8,23,0.32)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Secure Update</p>
                <h3 className="mt-1 text-xl font-black text-slate-950">
                  {user?.hasTransactionPassword ? "Change Transaction Password" : "Set Transaction Password"}
                </h3>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Use a strong password you can remember. It will be used for payout confirmations.
                </p>
              </div>
              <button
                className="grid size-10 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950"
                onClick={closeTransactionPasswordDialog}
                type="button"
              >
                <X className="size-5" />
              </button>
            </div>

            <form className="mt-5 grid gap-3" onSubmit={handleTransactionPasswordSubmit}>
              {user?.hasTransactionPassword ? (
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
                  New Password
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
                  Confirm Password
                </label>
                <Input
                  autoComplete="new-password"
                  className="mt-2 h-11 rounded-xl border-slate-200 bg-slate-50"
                  onChange={(event) => setConfirmTransactionPassword(event.target.value)}
                  type="password"
                  value={confirmTransactionPassword}
                />
              </div>

              <div className="mt-2 flex gap-3">
                <Button
                  className="flex-1 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                  disabled={isTransactionPasswordSaving}
                  onClick={closeTransactionPasswordDialog}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-slate-950 text-white hover:bg-slate-800"
                  disabled={isTransactionPasswordSaving}
                  type="submit"
                >
                  <KeyRound className="size-4" />
                  {isTransactionPasswordSaving ? "Saving..." : user?.hasTransactionPassword ? "Change Password" : "Set Password"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
