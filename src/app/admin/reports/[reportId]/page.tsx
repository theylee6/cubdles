import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { PageSkeleton } from "@/features/member/page-header";
import { ResolveForm } from "@/features/admin/components/resolve-form";
import { getReportDetail } from "@/features/admin/data";
import { reasonLabel, type ReportReason } from "@/features/safety/copy";
import { requireModerator } from "@/lib/auth/staff";
import { cn } from "@/lib/utils";

export const metadata = { title: "Report" };

const fmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

export default function AdminReport({
  params,
}: PageProps<"/admin/reports/[reportId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Report params={params} />
    </Suspense>
  );
}

async function Report({
  params,
}: {
  params: PageProps<"/admin/reports/[reportId]">["params"];
}) {
  const { reportId } = await params;
  if (!z.uuid().safeParse(reportId).success) notFound();
  await requireModerator(`/admin/reports/${reportId}`);
  const d = await getReportDetail(reportId);
  if (!d) notFound();
  const { report: r, reported, reporter } = d;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/reports"
          className="text-sm text-mocha underline underline-offset-4"
        >
          ← All reports
        </Link>
        <h1 className="mt-2 text-3xl">
          {r.priority === "urgent" ? "URGENT · " : ""}
          {reasonLabel(r.reason as ReportReason)}
        </h1>
        <p className="text-mocha">
          Reported {fmt.format(new Date(r.created_at))} UTC · status{" "}
          <strong>{r.status}</strong>
          {r.action ? ` (${r.action})` : ""}
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[var(--radius-card)] bg-cream p-5 ring-1 ring-oat">
          <h2 className="text-lg">Reported member</h2>
          {reported ? (
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-mocha">Name</dt>
              <dd>{reported.name ?? "(none)"}</dd>
              <dt className="text-mocha">Status</dt>
              <dd>
                {reported.status}
                {reported.status_reason ? ` (${reported.status_reason})` : ""}
              </dd>
              <dt className="text-mocha">Joined</dt>
              <dd>{fmt.format(new Date(reported.joined_at))}</dd>
              <dt className="text-mocha">Country</dt>
              <dd>{reported.country_code ?? "unknown"}</dd>
              <dt className="text-mocha">Other reports</dt>
              <dd>
                {d.history.length
                  ? d.history
                      .map(
                        (h) =>
                          `${reasonLabel(h.reason as ReportReason)} (${h.status})`,
                      )
                      .join(", ")
                  : "none"}
              </dd>
            </dl>
          ) : (
            <p className="mt-2 text-sm text-mocha">Account deleted.</p>
          )}
        </div>
        <div className="rounded-[var(--radius-card)] bg-cream p-5 ring-1 ring-oat">
          <h2 className="text-lg">Report</h2>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-mocha">From</dt>
            <dd>{reporter?.name ?? "(deleted account)"}</dd>
            <dt className="text-mocha">Details</dt>
            <dd className="whitespace-pre-wrap">
              {r.details ?? "(none given)"}
            </dd>
            {r.resolution ? (
              <>
                <dt className="text-mocha">Resolution</dt>
                <dd className="whitespace-pre-wrap">{r.resolution}</dd>
              </>
            ) : null}
          </dl>
        </div>
      </section>

      {d.photos.length ? (
        <section>
          <h2 className="mb-3 text-lg">Their photos</h2>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {d.photos.map((p) => (
              <li
                key={p.id}
                className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-linen"
              >
                {d.photoUrls[p.path] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={d.photoUrls[p.path]}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : null}
                <span className="absolute bottom-1 left-1 rounded-full bg-cream/90 px-2 text-[11px]">
                  {p.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="mb-1 text-lg">Conversation between them</h2>
        <p className="mb-3 text-sm text-mocha">
          Last 100 messages. Opening this report was recorded in the audit log.
        </p>
        {d.messages.length ? (
          <ol className="flex max-h-[28rem] flex-col gap-1.5 overflow-y-auto rounded-[var(--radius-card)] bg-cream p-4 ring-1 ring-oat">
            {d.messages.map((m) => {
              const byReported = m.sender_id === r.reported_id;
              return (
                <li
                  key={m.id}
                  className={cn(
                    "flex flex-col",
                    byReported ? "items-start" : "items-end",
                  )}
                >
                  <span
                    className={cn(
                      "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm",
                      byReported ? "bg-linen ring-1 ring-oat" : "bg-sage-soft",
                      m.id === r.message_id && "ring-2 ring-alert",
                    )}
                  >
                    {m.body}
                  </span>
                  <span className="px-1 text-[11px] text-mocha">
                    {byReported
                      ? (reported?.name ?? "Reported")
                      : (reporter?.name ?? "Reporter")}{" "}
                    · {fmt.format(new Date(m.created_at))}
                    {m.id === r.message_id ? " · reported message" : ""}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-sm text-mocha">
            They haven&rsquo;t exchanged messages.
          </p>
        )}
      </section>

      <section className="rounded-[var(--radius-card)] bg-cream p-5 ring-1 ring-oat">
        {r.status === "open" ? (
          <ResolveForm
            reportId={r.id}
            suggestFraud={r.reason === "scam" || r.reason === "fake_profile"}
          />
        ) : (
          <p className="text-sm">
            Resolved
            {r.reviewed_at
              ? ` on ${fmt.format(new Date(r.reviewed_at))} UTC`
              : ""}{" "}
            with action <strong>{r.action}</strong>.
          </p>
        )}
      </section>
    </div>
  );
}
