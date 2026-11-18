import type { ReactNode } from "react";

/** Title row for member pages. */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl">{title}</h1>
        {subtitle ? <p className="text-mocha">{subtitle}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading">
      <div className="h-9 w-48 animate-pulse rounded-xl bg-linen" />
      <div className="aspect-[4/5] w-full max-w-md animate-pulse rounded-[var(--radius-sheet)] bg-linen" />
    </div>
  );
}
