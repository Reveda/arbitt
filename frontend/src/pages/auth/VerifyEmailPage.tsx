import { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  useEmailVerificationRequest,
  useVerifyEmail,
} from "@/hooks/useAuthActions";
import { getDashboardRouteForUser } from "@/lib/authNavigation";
import { EMAIL_PATTERN } from "@/lib/validation";

type VerifyEmailFormValues = {
  email: string;
  otp: string;
};

type VerifyEmailRouteState = {
  email?: string;
  expiresAt?: string | null;
  from?: string;
  testOtp?: string | null;
} | null;

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const routeState = location.state as VerifyEmailRouteState;
  const initialEmail = searchParams.get("email") ?? routeState?.email ?? "";
  const verifyEmailMutation = useVerifyEmail();
  const resendOtpMutation = useEmailVerificationRequest();
  const [testOtp, setTestOtp] = useState(routeState?.testOtp ?? null);

  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors },
  } = useForm<VerifyEmailFormValues>({
    defaultValues: {
      email: initialEmail,
      otp: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const result = await verifyEmailMutation.mutate(values);
      navigate(getDashboardRouteForUser(result.data.user), { replace: true });
    } catch {
      // Error state is handled by the shared API mutation hook.
    }
  });

  const handleResendOtp = async () => {
    const email = getValues("email").trim();

    if (!EMAIL_PATTERN.test(email)) {
      setError("email", {
        message: "Enter a valid email address.",
        type: "manual",
      });
      return;
    }

    try {
      const result = await resendOtpMutation.mutate({ email });
      setTestOtp(result.data.testOtp ?? null);
    } catch {
      // Error state is handled by the shared API mutation hook.
    }
  };

  return (
    <Card className="form-motion-off mx-auto w-full max-w-xl">
      <CardHeader>
        <CardTitle>Verify Email</CardTitle>
        <CardDescription>
          Enter the 6-digit OTP sent for your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" noValidate onSubmit={onSubmit}>
          <label className="grid gap-2 text-sm font-medium">
            Email
            <Input
              {...register("email", {
                required: "Email is required.",
                pattern: {
                  value: EMAIL_PATTERN,
                  message: "Enter a valid email address.",
                },
              })}
              className={
                errors.email
                  ? "border-red-400/70 focus-visible:ring-red-300"
                  : ""
              }
              placeholder="you@example.com"
              type="email"
            />
            {errors.email ? (
              <span className="text-xs font-normal text-red-300">
                {errors.email.message}
              </span>
            ) : null}
          </label>
          <label className="grid gap-2 text-sm font-medium">
            OTP
            <Input
              {...register("otp", {
                required: "OTP is required.",
                pattern: {
                  value: /^\d{6}$/,
                  message: "Enter the 6-digit OTP.",
                },
              })}
              className={
                errors.otp ? "border-red-400/70 focus-visible:ring-red-300" : ""
              }
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              type="text"
            />
            {errors.otp ? (
              <span className="text-xs font-normal text-red-300">
                {errors.otp.message}
              </span>
            ) : null}
          </label>
          {testOtp ? (
            <p
              className="rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-100"
              role="status"
            >
              OTP: <span className="font-black tracking-wider">{testOtp}</span>{" "}
              (test mode)
            </p>
          ) : null}
          {verifyEmailMutation.error ? (
            <p
              className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
              role="alert"
            >
              {verifyEmailMutation.error}
            </p>
          ) : null}
          {resendOtpMutation.error ? (
            <p
              className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
              role="alert"
            >
              {resendOtpMutation.error}
            </p>
          ) : null}
          <Button
            className="w-full"
            disabled={verifyEmailMutation.isLoading}
            type="submit"
          >
            {verifyEmailMutation.isLoading ? "Verifying..." : "Verify Email"}
          </Button>
          <Button
            className="w-full"
            disabled={resendOtpMutation.isLoading}
            onClick={handleResendOtp}
            type="button"
            variant="secondary"
          >
            {resendOtpMutation.isLoading ? "Sending OTP..." : "Resend OTP"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-muted-foreground">
          Back to{" "}
          <Link
            className="font-medium text-primary hover:underline"
            to="/login"
          >
            Login
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
