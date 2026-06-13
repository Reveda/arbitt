export function TermsConditionsPage() {
  return (
    <section className="mx-auto max-w-4xl rounded-2xl border border-blue-400/25 bg-[#040d25]/85 p-5 text-slate-100 sm:p-6">
      <h1 className="text-3xl font-bold">Terms & Conditions</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">
        These Terms & Conditions govern the use of ARBITRUM services. This is a static placeholder for the
        current frontend phase and will be replaced with final legal text before go-live.
      </p>

      <div className="mt-5 space-y-4">
        <article className="rounded-lg border border-cyan-300/20 bg-slate-900/60 p-4">
          <h2 className="text-lg font-semibold text-cyan-200">1. Account Use</h2>
          <p className="mt-2 text-sm text-slate-300">
            Users are responsible for providing accurate information, maintaining account security, and complying
            with platform policies.
          </p>
        </article>

        <article className="rounded-lg border border-cyan-300/20 bg-slate-900/60 p-4">
          <h2 className="text-lg font-semibold text-cyan-200">2. Payments & Transactions</h2>
          <p className="mt-2 text-sm text-slate-300">
            Deposit and withdrawal operations are subject to verification procedures, system policies, and
            applicable limits.
          </p>
        </article>

        <article className="rounded-lg border border-cyan-300/20 bg-slate-900/60 p-4">
          <h2 className="text-lg font-semibold text-cyan-200">3. Platform Rights</h2>
          <p className="mt-2 text-sm text-slate-300">
            ARBITRUM may update features, policies, and operating rules to improve security, compliance, and
            service quality.
          </p>
        </article>
      </div>
    </section>
  );
}
