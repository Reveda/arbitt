import { env } from "../../../config/env";
import { logger } from "../../../config/logger";
import { addEmailJob } from "../queues/email.queue";
import type { EmailDeliveryResult, EmailMessage, SendOtpEmailInput } from "../types/email.types";
import { getEmailFromAddress, getEmailTransporter } from "./email.transport";

const PURPOSE_COPY = {
  "email-verification": {
    subject: "Verify your Arbitrum email address",
    heading: "Verify your email address",
    description:
      "Use this code to confirm your email and continue with your Arbitrum account setup.",
  },
  "password-reset": {
    subject: "Reset your Arbitrum password",
    heading: "Reset your password",
    description: "Use this code to complete your password reset request.",
  },
  "wallet-address-change": {
    subject: "Confirm your Arbitrum wallet address change",
    heading: "Confirm your wallet address change",
    description: "Use this code to verify the new wallet address you submitted.",
  },
} as const;

class EmailService {
  async sendOtpEmail(input: SendOtpEmailInput): Promise<EmailDeliveryResult> {
    if (!env.EMAIL_ENABLED) {
      logger.info(
        {
          purpose: input.purpose,
          to: input.to,
          contextLabel: input.contextLabel ?? null,
        },
        "Email service disabled; OTP skipped",
      );

      return { sent: false, queued: false, skipped: true };
    }

    const template = PURPOSE_COPY[input.purpose];
    const message = this.buildOtpMessage({
      to: input.to,
      subject: template.subject,
      heading: template.heading,
      description: template.description,
      otp: input.otp,
      expiresInMinutes: input.expiresInMinutes,
      contextLabel: input.contextLabel,
    });

    if (env.EMAIL_QUEUE_ENABLED && env.REDIS_ENABLED) {
      const queued = await addEmailJob(message);
      if (queued) {
        return { sent: true, queued: true };
      }

      logger.warn(
        { to: input.to, purpose: input.purpose },
        "Email queue unavailable; falling back to direct send",
      );
    }

    await this.sendDirect(message);
    return { sent: true, queued: false };
  }

  private async sendDirect(message: EmailMessage) {
    await getEmailTransporter().sendMail({
      from: getEmailFromAddress(),
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    logger.info(
      { to: message.to, subject: message.subject, contextLabel: message.contextLabel ?? null },
      "Email sent directly",
    );
  }

  private buildOtpMessage(input: {
    to: string;
    subject: string;
    heading: string;
    description: string;
    otp: string;
    expiresInMinutes: number;
    contextLabel?: string;
  }): EmailMessage {
    const text = [
      input.heading,
      "",
      input.description,
      "",
      `OTP: ${input.otp}`,
      `Expires in: ${input.expiresInMinutes} minutes`,
      input.contextLabel ? `Context: ${input.contextLabel}` : null,
      "",
      "If you did not request this, you can ignore this email.",
    ]
      .filter(Boolean)
      .join("\n");

    const html = this.buildOtpHtml({
      heading: input.heading,
      description: input.description,
      otp: input.otp,
      expiresInMinutes: input.expiresInMinutes,
      contextLabel: input.contextLabel,
    });

    return {
      to: input.to,
      subject: input.subject,
      text,
      html,
      contextLabel: input.contextLabel,
    };
  }

  private buildOtpHtml(input: {
    heading: string;
    description: string;
    otp: string;
    expiresInMinutes: number;
    contextLabel?: string;
  }) {
    const safeContext = input.contextLabel
      ? `<p style="margin:16px 0 0;color:#64748b;font-size:13px;">Context: ${input.contextLabel}</p>`
      : "";

    return `
      <div style="margin:0;padding:32px;background:#f5f7fb;font-family:Arial,sans-serif;color:#0f172a;">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;">
          <div style="padding:24px 28px;background:linear-gradient(135deg,#0f172a 0%,#1d4ed8 55%,#22d3ee 100%);color:#ffffff;">
            <div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;opacity:0.8;">Arbitrum Security</div>
            <h1 style="margin:10px 0 0;font-size:26px;line-height:1.2;">${input.heading}</h1>
          </div>
          <div style="padding:28px;">
            <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.7;">${input.description}</p>
            <div style="margin:0 auto 20px;max-width:240px;border-radius:18px;border:1px solid #bae6fd;background:linear-gradient(180deg,#ecfeff 0%,#dbeafe 100%);padding:18px 20px;text-align:center;">
              <div style="font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#0f766e;">One-time code</div>
              <div style="margin-top:8px;font-size:40px;font-weight:800;letter-spacing:6px;color:#0f172a;">${input.otp}</div>
            </div>
            <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:16px;">
              <div style="flex:1;min-width:180px;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;padding:14px 16px;">
                <div style="font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#64748b;">Expires In</div>
                <div style="margin-top:6px;font-size:16px;font-weight:700;color:#0f172a;">${input.expiresInMinutes} minutes</div>
              </div>
              <div style="flex:1;min-width:180px;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;padding:14px 16px;">
                <div style="font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#64748b;">Security Note</div>
                <div style="margin-top:6px;font-size:16px;font-weight:700;color:#0f172a;">Do not share this code</div>
              </div>
            </div>
            ${safeContext}
          </div>
        </div>
      </div>
    `;
  }
}

export const emailService = new EmailService();
