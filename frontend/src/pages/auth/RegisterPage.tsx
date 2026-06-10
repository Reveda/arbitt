import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { APP_ROUTES } from "@/api/endpoints";
import { PasswordField } from "@/components/form/PasswordField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRegisterAccount } from "@/hooks/useAuthActions";
import { EMAIL_PATTERN, PASSWORD_PATTERN } from "@/lib/validation";

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
  const {
    register,
    handleSubmit,
    getValues,
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

  const onSubmit = handleSubmit(async (values) => {
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
    } catch {
      // Error state is handled by the shared API mutation hook.
    }
  });

  return (
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
            Re-enter Password
            <PasswordField
              error={errors.confirmPassword?.message}
              placeholder="Re-enter your password"
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
            {referralCodeFromUrl ? (
              <span className="text-xs font-normal text-cyan-200">
                Referral code applied from your invite link.
              </span>
            ) : null}
            {errors.invitationCode ? (
              <span className="text-xs font-normal text-red-300">
                {errors.invitationCode.message}
              </span>
            ) : null}
          </label>
          {createAccountMutation.error ? (
            <p
              className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
              role="alert"
            >
              {createAccountMutation.error}
            </p>
          ) : null}
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
  );
}
