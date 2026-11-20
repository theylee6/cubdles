import Link from "next/link";
import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/features/member/page-header";
import { getQueueCounts } from "@/features/admin/data";
import { requireModerator } from "@/lib/auth/staff";

export const metadata = { title: "Overview" };

export default function AdminHome() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  await requireModerator("/admin");
  const c = await getQueueCounts();
  const tiles = [
    {
      href: "/admin/reports",
      label: "Urgent reports",
      value: c.urgentReports,
      note: "Under-18 and offline safety. Review first.",
      alert: c.urgentReports > 0,
    },
    {
      href: "/admin/reports",
      label: "Open reports",
      value: c.openReports,
      note: "Waiting for a decision",
    },
    {
      href: "/admin/photos",
      label: "Photos to review",
      value: c.pendingPhotos,
      note: "People can't appear in Discover until a photo is approved",
    },
  ];
  return (
    <>
      <PageHeader
        title="Moderation"
        subtitle="Everything you do here is recorded in the audit log."
      />
      <ul className="grid gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <li key={t.label}>
            <Link
              href={t.href}
              className={`flex h-full flex-col gap-1 rounded-[var(--radius-card)] p-5 ring-1 hover:bg-linen ${t.alert ? "bg-blush-soft ring-blush" : "bg-cream ring-oat"}`}
            >
              <span className="text-sm text-mocha">{t.label}</span>
              <span className="font-display text-4xl">{t.value}</span>
              <span className="text-sm text-mocha">{t.note}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
