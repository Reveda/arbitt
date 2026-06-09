export function PrivacyPolicyPage() {
  return (
    <section className="mx-auto max-w-4xl rounded-2xl border border-blue-400/25 bg-[#040d25]/85 p-5 text-slate-100 sm:p-6">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">
        This Privacy Policy describes how ARBITRUM collects, uses, and protects user information on the
        platform. This is a static draft page for frontend phase and will be replaced with legal-reviewed
        content before production launch.
      </p>

      <div className="mt-5 space-y-4">
        <article className="rounded-lg border border-cyan-300/20 bg-slate-900/60 p-4">
          <h2 className="text-lg font-semibold text-cyan-200">1. Information We Collect</h2>
          <p className="mt-2 text-sm text-slate-300">
            We may collect account details, wallet-related metadata, referral identifiers, and platform usage
            data to operate and secure the service.
          </p>
        </article>

        <article className="rounded-lg border border-cyan-300/20 bg-slate-900/60 p-4">
          <h2 className="text-lg font-semibold text-cyan-200">2. How We Use Data</h2>
          <p className="mt-2 text-sm text-slate-300">
            Data is used for account management, transaction workflows, support, analytics, and fraud/security
            prevention.
          </p>
        </article>

        <article className="rounded-lg border border-cyan-300/20 bg-slate-900/60 p-4">
          <h2 className="text-lg font-semibold text-cyan-200">3. Security Practices</h2>
          <p className="mt-2 text-sm text-slate-300">
            We apply industry-standard controls including encrypted transport, role-based access, and activity
            logging for critical operations.
          </p>
        </article>
      </div>
    </section>
  );
}

