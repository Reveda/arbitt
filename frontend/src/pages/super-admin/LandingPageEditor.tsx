import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "react-hot-toast";
import { Save, RefreshCw } from "lucide-react";
import {
  useGetLandingContentQuery,
  useUpdateLandingContentMutation,
  type LandingPageContent,
} from "@/store/api/landingApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SuperAdminCard, SuperAdminPageHeader } from "./super-admin.components";

export function LandingPageEditor() {
  const { data: remoteData, isLoading, refetch } = useGetLandingContentQuery();
  const [updateContent, { isLoading: isSaving }] = useUpdateLandingContentMutation();

  const { register, control, handleSubmit, reset } = useForm<LandingPageContent>({
    defaultValues: {
      heroTitle: "",
      heroSubtitle: "",
      copyrightText: "",
      stats: [],
      aboutHighlights: [],
      features: [],
      onboardingSteps: [],
      whyChooseItems: [],
    },
  });

  const { fields: statFields } = useFieldArray({ control, name: "stats" });
  const { fields: highlightFields } = useFieldArray({ control, name: "aboutHighlights" });
  const { fields: featureFields } = useFieldArray({ control, name: "features" });
  const { fields: stepFields } = useFieldArray({ control, name: "onboardingSteps" });
  const { fields: whyChooseFields } = useFieldArray({ control, name: "whyChooseItems" });

  useEffect(() => {
    if (remoteData?.data) {
      reset(remoteData.data);
    }
  }, [remoteData, reset]);

  const onSubmit = async (values: LandingPageContent) => {
    try {
      await updateContent(values).unwrap();
      toast.success("Landing page content updated successfully.");
      refetch();
    } catch (error) {
      toast.error("Failed to update landing page content.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
      </div>
    );
  }

  // Common styling classes for inputs in the light themed super admin console
  const inputStyles = "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-500";

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <SuperAdminPageHeader
          description="Edit text content, metrics/numbers, features, steps, and copyright info displayed on the public landing page."
          title="Landing Page Editor"
        />
        <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-2 text-slate-800 border-slate-300 hover:bg-slate-100">
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-12">
        {/* Hero & General Settings */}
        <SuperAdminCard className="p-6">
          <h2 className="text-lg font-black text-slate-900 mb-4 border-b pb-2">Hero & Footer Content</h2>
          <div className="grid gap-4">
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Hero Title
              <Input
                {...register("heroTitle", { required: "Hero title is required" })}
                placeholder="Enter hero title"
                className={inputStyles}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Hero Subtitle
              <Textarea
                {...register("heroSubtitle", { required: "Hero subtitle is required" })}
                placeholder="Enter hero subtitle"
                rows={3}
                className={inputStyles}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Footer Copyright Text
              <Input
                {...register("copyrightText", { required: "Copyright text is required" })}
                placeholder="Enter footer copyright text"
                className={inputStyles}
              />
            </label>
          </div>
        </SuperAdminCard>

        {/* Statistics Section */}
        <SuperAdminCard className="p-6">
          <h2 className="text-lg font-black text-slate-900 mb-4 border-b pb-2">Key Metrics (Scroll Counters)</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statFields.map((field, idx) => (
              <div key={field.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <p className="text-xs font-bold text-slate-400">Metric #{idx + 1}</p>
                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                  Label
                  <Input {...register(`stats.${idx}.label` as const)} placeholder="Label" className={inputStyles} size={1} />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                  Value (e.g. 25K+, 99.6%)
                  <Input {...register(`stats.${idx}.value` as const)} placeholder="Value" className={inputStyles} size={1} />
                </label>
              </div>
            ))}
          </div>
        </SuperAdminCard>

        {/* Mission & Vision Section */}
        <SuperAdminCard className="p-6">
          <h2 className="text-lg font-black text-slate-900 mb-4 border-b pb-2">Mission & Vision Highlights</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {highlightFields.map((field, idx) => (
              <div key={field.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <p className="text-xs font-bold text-slate-400">Highlight #{idx + 1}</p>
                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                  Title
                  <Input {...register(`aboutHighlights.${idx}.title` as const)} placeholder="Title" className={inputStyles} />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                  Description
                  <Textarea {...register(`aboutHighlights.${idx}.description` as const)} placeholder="Description" rows={2} className={inputStyles} />
                </label>
              </div>
            ))}
          </div>
        </SuperAdminCard>

        {/* Features list */}
        <SuperAdminCard className="p-6">
          <h2 className="text-lg font-black text-slate-900 mb-4 border-b pb-2">Platform Features (Lucide Icons)</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featureFields.map((field, idx) => (
              <div key={field.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <p className="text-xs font-bold text-slate-400">Feature #{idx + 1}</p>
                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                  Title
                  <Input {...register(`features.${idx}.title` as const)} placeholder="Feature Title" className={inputStyles} />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                  Icon Name (Lucide)
                  <Input {...register(`features.${idx}.iconName` as const)} placeholder="e.g. ShieldCheck" className={inputStyles} />
                </label>
              </div>
            ))}
          </div>
        </SuperAdminCard>

        {/* Why Choose Us */}
        <SuperAdminCard className="p-6">
          <h2 className="text-lg font-black text-slate-900 mb-4 border-b pb-2">Why Choose Us Items</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {whyChooseFields.map((field, idx) => (
              <div key={field.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <p className="text-xs font-bold text-slate-400">Item #{idx + 1}</p>
                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                  Title
                  <Input {...register(`whyChooseItems.${idx}.title` as const)} placeholder="Title" className={inputStyles} />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                  Description
                  <Textarea {...register(`whyChooseItems.${idx}.description` as const)} placeholder="Description" rows={2} className={inputStyles} />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                  Icon Name
                  <Input {...register(`whyChooseItems.${idx}.iconName` as const)} placeholder="e.g. ShieldCheck" className={inputStyles} />
                </label>
              </div>
            ))}
          </div>
        </SuperAdminCard>

        {/* How It Works Steps */}
        <SuperAdminCard className="p-6">
          <h2 className="text-lg font-black text-slate-900 mb-4 border-b pb-2">How It Works Steps</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stepFields.map((field, idx) => (
              <div key={field.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <p className="text-xs font-bold text-slate-400">Step #{field.id}</p>
                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                  Step Number
                  <Input {...register(`onboardingSteps.${idx}.id` as const)} placeholder="e.g. 01" className={inputStyles} />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                  Step Title
                  <Input {...register(`onboardingSteps.${idx}.title` as const)} placeholder="Step Title" className={inputStyles} />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                  Step Instruction
                  <Textarea {...register(`onboardingSteps.${idx}.note` as const)} placeholder="Step instructions" rows={2} className={inputStyles} />
                </label>
              </div>
            ))}
          </div>
        </SuperAdminCard>

        {/* Fixed Save Bar */}
        <div className="sticky bottom-4 z-40 flex items-center justify-end rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
          <Button type="submit" disabled={isSaving} className="gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:opacity-90">
            <Save className="size-4" />
            {isSaving ? "Saving..." : "Save All Changes"}
          </Button>
        </div>
      </form>
    </section>
  );
}
