import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../../../config/env";

let transporter: Transporter | null = null;

export function getEmailTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? 587,
      secure: env.SMTP_SECURE ?? false,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }

  return transporter;
}

export function getEmailFromAddress() {
  const fromName = env.EMAIL_FROM_NAME.trim();
  const fromAddress = env.EMAIL_FROM?.trim() ?? "";
  return fromName ? `${fromName} <${fromAddress}>` : fromAddress;
}
