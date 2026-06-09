import type { ComponentType } from "react";
import { AdminCard, AdminPageHeader } from "./admin.components";

type AdminModulePageProps = {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

export function AdminModulePage({ description, icon: Icon, title }: AdminModulePageProps) {
  return (
    <section className="space-y-4">
      <AdminPageHeader description={description} title={title} />
      <AdminCard>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-cyan-50 text-cyan-700">
            <Icon className="size-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-950">{title}</p>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              This module shell is ready for backend-driven data, filters, approval workflows, and RBAC permissions.
            </p>
          </div>
        </div>
      </AdminCard>
    </section>
  );
}
