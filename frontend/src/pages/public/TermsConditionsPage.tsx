import { useGetLandingContentQuery } from "@/store/api/landingApi";

export function TermsConditionsPage() {
  const { data: remoteData, isLoading } = useGetLandingContentQuery();
  const termsConditions = remoteData?.data?.termsConditions;

  return (
    <section className="mx-auto max-w-4xl rounded-2xl border border-blue-400/25 bg-[#040d25]/85 p-5 text-slate-100 sm:p-6">
      <h1 className="text-3xl font-bold">Terms & Conditions</h1>
      {isLoading ? (
        <div className="mt-8 flex h-32 items-center justify-center">
          <div className="size-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
        </div>
      ) : (
        <div className="whitespace-pre-line mt-6 text-sm leading-relaxed text-slate-300">
          {termsConditions || "Terms & Conditions details are currently unavailable. Please check back later."}
        </div>
      )}
    </section>
  );
}
