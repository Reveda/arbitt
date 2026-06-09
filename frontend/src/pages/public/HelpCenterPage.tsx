export function HelpCenterPage() {
  return (
    <section className="mx-auto max-w-4xl rounded-2xl border border-blue-400/25 bg-[#040d25]/85 p-5 text-slate-100 sm:p-6">
      <h1 className="text-3xl font-bold">Help Center</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">
        Find quick answers for account setup, payment verification, wallet operations, and referral growth.
      </p>

      <div className="mt-6 space-y-3">
        <article className="rounded-lg border border-cyan-300/20 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold text-cyan-200">How long does deposit verification take?</h2>
          <p className="mt-2 text-xs text-slate-400">
            Deposit verification depends on transaction confirmation and admin validation workflow.
          </p>
        </article>
        <article className="rounded-lg border border-cyan-300/20 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold text-cyan-200">Is withdrawal approval manual?</h2>
          <p className="mt-2 text-xs text-slate-400">
            Yes, withdrawals are reviewed according to security checks and platform policy.
          </p>
        </article>
        <article className="rounded-lg border border-cyan-300/20 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold text-cyan-200">Where can I raise account issues?</h2>
          <p className="mt-2 text-xs text-slate-400">
            Use the Contact Us form for login issues, wallet issues, or transaction-related support.
          </p>
        </article>
      </div>
    </section>
  );
}

