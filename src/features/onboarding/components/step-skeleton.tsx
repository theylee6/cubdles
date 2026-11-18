export function StepSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading">
      <div className="h-1.5 animate-pulse rounded-full bg-oat/70" />
      <div className="h-10 w-2/3 animate-pulse rounded-xl bg-linen" />
      <div className="h-64 animate-pulse rounded-[var(--radius-card)] bg-linen" />
    </div>
  );
}
