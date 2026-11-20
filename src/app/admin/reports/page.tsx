import Link from "next/link";
import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/features/member/page-header";
import { listReports } from "@/features/admin/data";
import { reasonLabel } from "@/features/safety/copy";
import { requireModerator } from "@/lib/auth/staff";
import { cn } from "@/lib/utils";

export const metadata = { title: "Reports" };

const TABS = [
  { status: "open", label: "Open" },
  { status: "actioned", label: "Actioned" },
  { status: "dismissed", label: "Dismissed" },
] as const;
type Status = (typeof TABS)[number]["status"];

const fmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

export default function AdminReports({
  searchParams,
}: PageProps<"/admin/reports">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Reports searchParams={searchParams} />
    </Suspense>
  );
}

async function Reports({
  searchParams,
}: {
  searchParams: PageProps<"/admin/reports">["searchParams"];
}) {
  await requireModerator("/admin/reports");
  const raw = (await searchParams).status;
  const status: Status = TABS.some((t) => t.status === raw)
    ? (raw as Status)
    : "open";
  const rows = await listReports(status);

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Urgent first, then oldest first. Times are UTC."
      />
      <nav aria-label="Report status" className="mb-4 flex gap-1">
        {TABS.map((t) => (
          <Link
            key={t.status}
            href={
              t.status === "open"
                ? "/admin/reports"
                : `/admin/reports?status=${t.status}`
            }
            aria-current={status === t.status ? "page" : undefined}
            className={cn(
              "rounded-full px-4 py-2 text-sm text-mocha ring-1 ring-oat hover:bg-linen",
              status === t.status && "bg-linen font-medium text-cocoa",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <p className="rounded-[var(--radius-card)] bg-linen px-5 py-10 text-center text-mocha ring-1 ring-oat">
          Nothing here.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.report_id}>
              <Link
                href={`/admin/reports/${r.report_id}`}
                className={cn(
                  "flex flex-col gap-1 rounded-[var(--radius-card)] p-4 ring-1 hover:bg-linen sm:flex-row sm:items-center sm:justify-between",
                  r.priority === "urgent" && r.status === "open"
                    ? "bg-blush-soft ring-blush"
                    : "bg-cream ring-oat",
                )}
              >
                <span className="min-w-0">
                  <span className="block font-medium">
                    {r.priority === "urgent" ? "URGENT · " : ""}
                    {reasonLabel(r.reason)}
                  </span>
                  <span className="block truncate text-sm text-mocha">
                    {r.reported_name ?? "(deleted account)"} (
                    {r.reported_status ?? "gone"}) · reported by{" "}
                    {r.reporter_name ?? "(deleted account)"}
                    {r.reports_against > 1
                      ? ` · ${r.reports_against} reports in total`
                      : ""}
                  </span>
                  {r.details ? (
                    <span className="block truncate text-sm">
                      “{r.details}”
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-xs text-mocha">
                  {fmt.format(new Date(r.created_at))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
