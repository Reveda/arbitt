import { Mail, MessageSquareText, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { EMAIL_PATTERN } from "@/lib/validation";

type ContactFormValues = {
  fullName: string;
  email: string;
  subject: string;
  message: string;
};

export function ContactUsPage() {
  const telegramUrl = "https://t.me/your_telegram_username";
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<ContactFormValues>({
    defaultValues: {
      fullName: "",
      email: "",
      subject: "",
      message: ""
    }
  });

  const onSubmit = handleSubmit(() => {
    // API wiring will be integrated in the support sprint.
    reset();
  });

  return (
    <section className="mx-auto max-w-4xl rounded-2xl border border-blue-400/25 bg-[#040d25]/85 p-5 text-slate-100 sm:p-6">
      <h1 className="text-3xl font-bold">Contact Us</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">
        Need help with registration, payments, or dashboard access? Send your request and our team will
        respond as soon as possible.
      </p>

      <form
        className="form-motion-off mt-5 grid gap-3 rounded-xl border border-cyan-300/20 bg-slate-900/60 p-4"
        noValidate
        onSubmit={onSubmit}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            {...register("fullName", {
              required: "Full name is required.",
              minLength: { value: 2, message: "Full name must be at least 2 characters." }
            })}
            className="h-10 rounded-md border border-cyan-300/25 bg-slate-900/70 px-3 text-sm placeholder:text-slate-500"
            placeholder="Full Name"
            type="text"
          />
          <Input
            {...register("email", {
              required: "Email address is required.",
              pattern: { value: EMAIL_PATTERN, message: "Enter a valid email address." }
            })}
            className="h-10 rounded-md border border-cyan-300/25 bg-slate-900/70 px-3 text-sm placeholder:text-slate-500"
            placeholder="Email Address"
            type="email"
          />
        </div>
        {errors.fullName || errors.email ? (
          <div className="-mt-1 grid gap-1 sm:grid-cols-2">
            <span className="text-xs text-red-300">{errors.fullName?.message ?? ""}</span>
            <span className="text-xs text-red-300">{errors.email?.message ?? ""}</span>
          </div>
        ) : null}
        <Input
          {...register("subject", {
            required: "Subject is required.",
            minLength: { value: 3, message: "Subject must be at least 3 characters." }
          })}
          className="h-10 rounded-md border border-cyan-300/25 bg-slate-900/70 px-3 text-sm placeholder:text-slate-500"
          placeholder="Subject"
          type="text"
        />
        {errors.subject ? <span className="-mt-1 text-xs text-red-300">{errors.subject.message}</span> : null}
        <textarea
          {...register("message", {
            required: "Message is required.",
            minLength: { value: 10, message: "Message must be at least 10 characters." }
          })}
          className="min-h-28 rounded-md border border-cyan-300/25 bg-slate-900/70 px-3 py-2 text-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="Write your message..."
        />
        {errors.message ? <span className="-mt-1 text-xs text-red-300">{errors.message.message}</span> : null}
        <button
          className="inline-flex h-10 items-center justify-center rounded-md bg-gradient-to-r from-blue-600 to-cyan-500 px-4 text-sm font-semibold text-slate-950"
          type="submit"
        >
          Send Request
        </button>
      </form>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <article className="interactive-card rounded-lg border border-cyan-300/20 bg-slate-900/60 p-4">
          <Mail className="size-5 text-cyan-300" />
          <p className="mt-2 text-sm font-semibold">Email Support</p>
          <p className="mt-1 text-xs text-slate-400">support@arbitrum.example</p>
        </article>
        <article className="interactive-card rounded-lg border border-cyan-300/20 bg-slate-900/60 p-4">
          <Send className="size-5 text-cyan-300" />
          <p className="mt-2 text-sm font-semibold">Telegram Support</p>
          <a
            className="mt-1 inline-block text-xs text-cyan-300 underline-offset-2 transition-colors hover:text-cyan-200 hover:underline"
            href={telegramUrl}
            rel="noreferrer"
            target="_blank"
          >
            Open Telegram Chat
          </a>
        </article>
        <article className="interactive-card rounded-lg border border-cyan-300/20 bg-slate-900/60 p-4">
          <MessageSquareText className="size-5 text-cyan-300" />
          <p className="mt-2 text-sm font-semibold">Help Desk</p>
          <p className="mt-1 text-xs text-slate-400">Response window: 24-48 hours</p>
        </article>
      </div>
    </section>
  );
}
