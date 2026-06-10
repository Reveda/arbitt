import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { APP_ROUTES } from "@/api/endpoints";
import { PasswordField } from "@/components/form/PasswordField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ToastMessage,
  type ToastMessageValue,
} from "@/components/ui/toast-message";
import { useLoginAccount } from "@/hooks/useAuthActions";
import { getDashboardRouteForUser } from "@/lib/authNavigation";
import { EMAIL_PATTERN, PASSWORD_PATTERN } from "@/lib/validation";
import { getQueryErrorMessage } from "@/store/api/queryError";

type LoginFormValues = {
  email: string;
  password: string;
};

type LoginRouteState = {
  email?: string;
  passwordReset?: boolean;
} | null;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as LoginRouteState;
  const loginMutation = useLoginAccount();
  const [toastMessage, setToastMessage] = useState<ToastMessageValue | null>(
    null,
  );
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: routeState?.email ?? "",
      password: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    loginMutation.reset();
    setToastMessage(null);

    try {
      const result = await loginMutation.mutate(values);
      if (!result.data.user.emailVerified) {
        navigate(APP_ROUTES.public.verifyEmail, {
          replace: true,
          state: {
            email: values.email,
            expiresAt: result.data.emailVerification?.expiresAt ?? null,
            testOtp: result.data.emailVerification?.testOtp ?? null,
          },
        });
        return;
      }

      navigate(getDashboardRouteForUser(result.data.user), { replace: true });
    } catch (caughtError) {
      setToastMessage({
        text:
          getQueryErrorMessage(caughtError, "Invalid email or password.") ??
          "Invalid email or password.",
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
          <CardTitle>Login</CardTitle>
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
            <div className="-mt-1 text-right">
              <Link
                className="text-sm font-medium text-primary hover:underline"
                to="/forgot-password"
              >
                Forgot password?
              </Link>
            </div>
            {loginMutation.error ? (
              <p
                className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
                role="alert"
              >
                {loginMutation.error}
              </p>
            ) : null}
            {routeState?.passwordReset ? (
              <p
                className="rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100"
                role="status"
              >
                Password reset successfully. Please login.
              </p>
            ) : null}
            <Button
              className="w-full"
              disabled={loginMutation.isLoading}
              type="submit"
            >
              {loginMutation.isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            New here?{" "}
            <Link
              className="font-medium text-primary hover:underline"
              to="/register"
            >
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </>
  );
}
