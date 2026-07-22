import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/api/apiClient";
import { APP_ROUTES } from "@/api/endpoints";
import { PasswordField } from "@/components/form/PasswordField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CheckCircle2 } from "lucide-react";
import {
  ToastMessage,
  type ToastMessageValue,
} from "@/components/ui/toast-message";
import { useRegisterAccount } from "@/hooks/useAuthActions";
import { EMAIL_PATTERN, PASSWORD_PATTERN } from "@/lib/validation";
import { getQueryErrorMessage } from "@/store/api/queryError";

type RegisterFormValues = {
  email: string;
  password: string;
  confirmPassword: string;
  username: string;
  invitationCode: string;
};

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCodeFromUrl =
    searchParams.get("ref") ?? searchParams.get("referral") ?? "";
  const createAccountMutation = useRegisterAccount();
  const [toastMessage, setToastMessage] = useState<ToastMessageValue | null>(
    null,
  );
  const {
    register,
    handleSubmit,
    getValues,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      username: "",
      invitationCode: referralCodeFromUrl,
    },
  });

  const usernameVal = watch("username");
  const invitationCodeVal = watch("invitationCode");
  const [usernameAvailability, setUsernameAvailability] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string | null;
  }>({ checking: false, available: null, message: null });

  const [referralOwner, setReferralOwner] = useState<{
    checking: boolean;
    valid: boolean | null;
    username: string | null;
  }>({ checking: false, valid: null, username: null });

  useEffect(() => {
    if (!usernameVal || usernameVal.length < 3 || !/^[a-zA-Z0-9_]{3,24}$/.test(usernameVal)) {
      setUsernameAvailability({ checking: false, available: null, message: null });
      return;
    }

    setUsernameAvailability({ checking: true, available: null, message: null });
    const timer = setTimeout(async () => {
      try {
        const res = await apiRequest<{ available: boolean }>(`/auth/check-username?username=${encodeURIComponent(usernameVal)}`, {
          method: "GET"
        });
        if (res.success) {
          setUsernameAvailability({
            checking: false,
            available: res.data.available,
            message: res.message
          });
          if (!res.data.available) {
            setError("username", {
              type: "manual",
              message: res.message || "Username is already taken."
            });
          } else {
            clearErrors("username");
          }
        } else {
          setUsernameAvailability({ checking: false, available: null, message: null });
        }
      } catch (err) {
        setUsernameAvailability({ checking: false, available: null, message: null });
      }
    }, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [usernameVal, setError, clearErrors]);

  useEffect(() => {
    const code = invitationCodeVal?.trim() ?? "";
    if (!code || code.length < 3) {
      setReferralOwner({ checking: false, valid: null, username: null });
      return;
    }

    setReferralOwner({ checking: true, valid: null, username: null });
    const controller = new AbortController();
    let isCurrentRequest = true;

    const timer = setTimeout(async () => {
      try {
        const res = await apiRequest<{
          valid: boolean;
          referredBy: string | null;
        }>(`/auth/check-referral?referralCode=${encodeURIComponent(code)}`, {
          method: "GET",
          signal: controller.signal,
        });

        if (!isCurrentRequest || controller.signal.aborted) {
          return;
        }

        setReferralOwner({
          checking: false,
          valid: res.data.valid,
          username: res.data.referredBy,
        });
      } catch {
        if (!isCurrentRequest || controller.signal.aborted) {
          return;
        }

        setReferralOwner({ checking: false, valid: false, username: null });
      }
    }, 400);

    return () => {
      isCurrentRequest = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [invitationCodeVal]);

  const onSubmit = handleSubmit(async (values) => {
    createAccountMutation.reset();
    setToastMessage(null);

    try {
      const result = await createAccountMutation.mutate(values);
      navigate(APP_ROUTES.public.verifyEmail, {
        replace: true,
        state: {
          email: values.email,
          expiresAt: result.data.emailVerification?.expiresAt ?? null,
          testOtp: result.data.emailVerification?.testOtp ?? null,
        },
      });
    } catch (caughtError) {
      setToastMessage({
        text:
          getQueryErrorMessage(caughtError, "Registration failed.") ??
          "Registration failed.",
        tone: "error",
      });
    }
  });

  return (
    <>
      <ToastMessage
        message={toastMessage}
        onClose={() => setToastMessage(null)}
      />

      <Card className="form-motion-off mx-auto w-full max-w-xl">
        <CardHeader className="text-center">
        <CardTitle>Create Account</CardTitle>
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
              placeholder="Enter your email"
              type="email"
            />
            {errors.email ? (
              <span className="text-xs font-normal text-red-300">
                {errors.email.message}
              </span>
            ) : null}
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Password
            <PasswordField
              error={errors.password?.message}
              placeholder="Enter your password"
              registration={register("password", {
                required: "Password is required.",
                pattern: {
                  value: PASSWORD_PATTERN,
                  message:
                    "Password must be at least 8 characters with letters and numbers.",
                },
              })}
            />
            {errors.password ? (
              <span className="text-xs font-normal text-red-300">
                {errors.password.message}
              </span>
            ) : null}
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Confirm Password
            <PasswordField
              error={errors.confirmPassword?.message}
              placeholder="Confirm your password"
              registration={register("confirmPassword", {
                required: "Please confirm your password.",
                validate: (value) =>
                  value === getValues("password") || "Passwords do not match.",
              })}
            />
            {errors.confirmPassword ? (
              <span className="text-xs font-normal text-red-300">
                {errors.confirmPassword.message}
              </span>
            ) : null}
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Username
            <Input
              {...register("username", {
                required: "Username is required.",
                pattern: {
                  value: /^[a-zA-Z0-9_]{3,24}$/,
                  message:
                    "Use 3-24 characters (letters, numbers, underscore).",
                },
              })}
              className={
                errors.username
                  ? "border-red-400/70 focus-visible:ring-red-300"
                  : ""
              }
              placeholder="Enter your username"
              type="text"
            />
            {errors.username ? (
              <span className="text-xs font-normal text-red-300">
                {errors.username.message}
              </span>
            ) : null}
            {usernameAvailability.checking && (
              <span className="text-xs font-semibold text-slate-400">
                Checking availability...
              </span>
            )}
            {!usernameAvailability.checking && usernameAvailability.available === true && (
              <span className="text-xs font-bold text-emerald-400">
                ✓ Username is available!
              </span>
            )}
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Invitation Code
            <Input
              {...register("invitationCode", {
                required: "Invitation code is required.",
              })}
              className={
                errors.invitationCode
                  ? "border-red-400/70 focus-visible:ring-red-300"
                  : ""
              }
              placeholder="Enter your invitation code"
              type="text"
            />
            {referralOwner.checking ? (
              <span className="text-xs font-semibold text-slate-400">
                Checking referral code...
              </span>
            ) : referralOwner.valid && referralOwner.username ? (
              <span className="inline-flex w-fit items-center gap-1.5 rounded-md border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-300 shadow-sm shadow-emerald-950/10">
                <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-emerald-400" strokeWidth={2.5} />
                <span>
                  Referred by: <strong className="font-bold text-emerald-200">{referralOwner.username}</strong>
                </span>
              </span>
            ) : referralOwner.valid === false ? (
              <span className="text-xs font-normal text-red-300">
                Invalid referral code.
              </span>
            ) : null}
            {errors.invitationCode ? (
              <span className="text-xs font-normal text-red-300">
                {errors.invitationCode.message}
              </span>
            ) : null}
          </label>
          <p className="text-center text-[11px] text-slate-400 mt-1">
            By continuing, you agree to our{" "}
            <Link className="text-cyan-400 hover:underline font-bold" to="/terms-and-conditions" target="_blank">
              Terms & Conditions
            </Link>{" "}
            and{" "}
            <Link className="text-cyan-400 hover:underline font-bold" to="/privacy-policy" target="_blank">
              Privacy Policy
            </Link>.
          </p>
          <Button
            className="w-full"
            disabled={createAccountMutation.isLoading}
            type="submit"
          >
            {createAccountMutation.isLoading
              ? "Creating account..."
              : "Register"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            className="font-medium text-primary hover:underline"
            to="/login"
          >
            Login
          </Link>
        </p>
      </CardContent>
    </Card>
    </>
  );
}
