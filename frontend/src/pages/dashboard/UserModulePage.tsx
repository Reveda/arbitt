import type { ComponentType } from "react";
import { Card, CardContent } from "@/components/ui/card";

type UserModulePageProps = {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

export function UserModulePage({ description, icon: Icon, title }: UserModulePageProps) {
  return (
    <section className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#08152e] via-[#0d5c80] to-[#22d3ee] px-4 py-4 text-white shadow-[0_18px_50px_rgba(8,21,46,0.18)] sm:px-5">
        <div className="absolute -right-10 -top-12 size-36 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-cyan-100/82 sm:text-xs">User Panel</p>
          <h1 className="mt-1 text-[1.35rem] font-black leading-tight tracking-tight sm:text-2xl">{title}</h1>
          <p className="mt-1 max-w-2xl text-[13px] font-semibold leading-relaxed text-cyan-50/88 sm:text-sm">{description}</p>
        </div>
      </div>

      <Card className="form-motion-off border-slate-200 bg-white text-slate-950 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-cyan-50 text-cyan-700">
            <Icon className="size-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-950">{title}</p>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              This user module is ready for backend-driven activity, filters, wallet updates, and secure account workflows.
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
