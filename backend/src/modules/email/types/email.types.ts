export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
  contextLabel?: string;
};

export type EmailDeliveryResult = {
  sent: boolean;
  queued: boolean;
  skipped?: boolean;
};

export type OtpEmailPurpose = "email-verification" | "password-reset" | "wallet-address-change";

export type SendOtpEmailInput = {
  to: string;
  otp: string;
  purpose: OtpEmailPurpose;
  expiresInMinutes: number;
  contextLabel?: string;
};
