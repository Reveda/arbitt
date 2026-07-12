import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { APP_ROUTES } from "@/api/endpoints";
import { PasswordField } from "@/components/form/PasswordField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useForgotPasswordRequest, useResetPassword } from "@/hooks/useAuthActions";
import { EMAIL_PATTERN, PASSWORD_PATTERN } from "@/lib/validation";

type ForgotPasswordFormValues = {
  email: string;
};

type ResetPasswordFormValues = {
  email: string;
  otp: string;
  password: string;
  confirmPassword: string;
};

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const forgotPasswordMutation = useForgotPasswordRequest();
  const resetPasswordMutation = useResetPassword();
  const [resetEmail, setResetEmail] = useState("");

  const {
    register: registerForgotPassword,
    handleSubmit: handleForgotPasswordSubmit,
    formState: { errors: forgotPasswordErrors }
  } = useForm<ForgotPasswordFormValues>({
    defaultValues: { email: "" }
  });

  const {
    register: registerResetPassword,
    handleSubmit: handleResetPasswordSubmit,
    getValues,
    setValue,
    formState: { errors: resetPasswordErrors }
  } = useForm<ResetPasswordFormValues>({
    defaultValues: {
      email: "",
      otp: "",
      password: "",
      confirmPassword: ""
    }
  });

  const onForgotPasswordSubmit = handleForgotPasswordSubmit(async (values) => {
    try {
      await forgotPasswordMutation.mutate(values);
      setResetEmail(values.email);
      setValue("email", values.email);
      resetPasswordMutation.reset();
    } catch {
      // Error state is handled by the shared API mutation hook.
    }
  });

  const onResetPasswordSubmit = handleResetPasswordSubmit(async (values) => {
    try {
      await resetPasswordMutation.mutate(values);
      navigate(APP_ROUTES.public.login, {
        replace: true,
        state: {
          email: values.email,
          passwordReset: true
        }
      });
    } catch {
      // Error state is handled by the shared API mutation hook.
    }
  });

  const resetPasswordSucceeded = Boolean(resetPasswordMutation.data?.data.reset);

  return (
    <Card className="form-motion-off mx-auto w-full max-w-xl">
      <CardHeader>
        <CardTitle>Forgot Password</CardTitle>
        <CardDescription>Enter your email to receive a password reset OTP.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" noValidate onSubmit={onForgotPasswordSubmit}>
          <label className="grid gap-2 text-sm font-medium">
            Email
            <Input
              {...registerForgotPassword("email", {
                required: "Email is required.",
                pattern: { value: EMAIL_PATTERN, message: "Enter a valid email address." }
              })}
              className={forgotPasswordErrors.email ? "border-red-400/70 focus-visible:ring-red-300" : ""}
              placeholder="you@example.com"
              type="email"
            />
            {forgotPasswordErrors.email ? (
              <span className="text-xs font-normal text-red-300">{forgotPasswordErrors.email.message}</span>
            ) : null}
          </label>
          {forgotPasswordMutation.error ? (
            <p className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200" role="alert">
              {forgotPasswordMutation.error}
            </p>
          ) : null}
          {!resetEmail ? (
            <Button className="w-full" disabled={forgotPasswordMutation.isLoading} type="submit">
              {forgotPasswordMutation.isLoading ? "Sending OTP..." : "Send OTP"}
            </Button>
          ) : null}
        </form>

        {resetEmail ? (
          <form className="mt-5 grid gap-4 border-t border-white/10 pt-5" noValidate onSubmit={onResetPasswordSubmit}>
            <input type="hidden" {...registerResetPassword("email")} />
            <label className="grid gap-2 text-sm font-medium">
              OTP
              <Input
                {...registerResetPassword("otp", {
                  required: "OTP is required.",
                  pattern: { value: /^\d{6}$/, message: "Enter the 6-digit OTP." }
                })}
                className={resetPasswordErrors.otp ? "border-red-400/70 focus-visible:ring-red-300" : ""}
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                type="text"
              />
              {resetPasswordErrors.otp ? (
                <span className="text-xs font-normal text-red-300">{resetPasswordErrors.otp.message}</span>
              ) : null}
            </label>
            <label className="grid gap-2 text-sm font-medium">
              New Password
              <PasswordField
                error={resetPasswordErrors.password?.message}
                placeholder="Enter your new password"
                registration={registerResetPassword("password", {
                  required: "Password is required.",
                  pattern: {
                    value: PASSWORD_PATTERN,
                    message: "Password must be at least 8 characters with letters and numbers."
                  }
                })}
              />
              {resetPasswordErrors.password ? (
                <span className="text-xs font-normal text-red-300">{resetPasswordErrors.password.message}</span>
              ) : null}
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Confirm Password
              <PasswordField
                error={resetPasswordErrors.confirmPassword?.message}
                placeholder="Confirm your new password"
                registration={registerResetPassword("confirmPassword", {
                  required: "Please confirm your password.",
                  validate: (value) => value === getValues("password") || "Passwords do not match."
                })}
              />
              {resetPasswordErrors.confirmPassword ? (
                <span className="text-xs font-normal text-red-300">{resetPasswordErrors.confirmPassword.message}</span>
              ) : null}
            </label>
            {resetPasswordMutation.error ? (
              <p className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200" role="alert">
                {resetPasswordMutation.error}
              </p>
            ) : null}
            {resetPasswordSucceeded ? (
              <p className="rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100" role="status">
                Password reset successfully.
              </p>
            ) : null}
            <Button className="w-full" disabled={resetPasswordMutation.isLoading || resetPasswordSucceeded} type="submit">
              {resetPasswordMutation.isLoading ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
        ) : null}

        <p className="mt-4 text-sm text-muted-foreground">
          Back to{" "}
          <Link className="font-medium text-primary hover:underline" to="/login">
            Login
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
