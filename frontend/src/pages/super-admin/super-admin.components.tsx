import type { ComponentType, ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function SuperAdminCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <Card className={cn("form-motion-off border-slate-200 bg-white text-slate-950 shadow-sm", className)}>
      {children}
    </Card>
  );
}

export function SuperAdminPageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#061225] via-[#0b5f7d] to-[#22d3ee] px-4 py-4 text-white shadow-[0_18px_50px_rgba(8,21,46,0.18)] sm:px-5">
      <div className="absolute -right-10 -top-12 size-36 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-16 left-8 size-32 rounded-full bg-cyan-200/15 blur-2xl" />
      <div className="relative">
        <p className="text-[10px] font-black uppercase tracking-[0.32em] text-cyan-100/82 sm:text-xs">
          Super Admin Panel
        </p>
        <h1 className="mt-1 text-[1.35rem] font-black leading-tight tracking-tight sm:text-2xl">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-3xl text-[13px] font-semibold leading-relaxed text-cyan-50/88 sm:text-sm">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function SuperAdminMetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <SuperAdminCard className="rounded-2xl">
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-xs font-bold text-slate-500">{label}</p>
          <p className="mt-1 text-lg font-black tracking-tight text-slate-950">{value}</p>
        </div>
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", tone)}>
          <Icon className="size-4" />
        </span>
      </CardContent>
    </SuperAdminCard>
  );
}
