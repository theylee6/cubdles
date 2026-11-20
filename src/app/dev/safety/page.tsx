import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PhotoQueue } from "@/features/admin/components/photo-queue";
import { ResolveForm } from "@/features/admin/components/resolve-form";
import { ReportButton } from "@/features/safety/components/report-dialog";
import { SafetyNotices } from "@/features/safety/components/safety-notices";

/** DEVELOPMENT ONLY: safety and moderation components with sample data. 404 in production. */
export default function DevSafetyPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Suspense fallback={null}>
      <Preview />
    </Suspense>
  );
}

async function Preview() {
  await connection();
  const now = new Date().toISOString();
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-8">
      <section>
        <h2 className="mb-3 text-xl">Safety notices</h2>
        <SafetyNotices
          timeZone="Asia/Kolkata"
          notices={[
            {
              id: "00000000-0000-0000-0000-000000000101",
              kind: "fraud_ban",
              subject_name: "Sample S",
              last_contact_at: now,
              reason: "scam",
              created_at: now,
            },
            {
              id: "00000000-0000-0000-0000-000000000102",
              kind: "warning",
              subject_name: null,
              last_contact_at: null,
              reason: "harassment",
              created_at: now,
            },
          ]}
        />
      </section>
      <section>
        <h2 className="mb-3 text-xl">Report button</h2>
        <ReportButton
          reportedId="00000000-0000-0000-0000-000000000001"
          name="Sample A"
        />
      </section>
      <section>
        <h2 className="mb-3 text-xl">Photo queue</h2>
        <PhotoQueue
          photos={[
            {
              id: "00000000-0000-0000-0000-000000000201",
              profileId: "p",
              name: "Sample A",
              profileStatus: "active",
              uploadedAt: now,
              url: null,
            },
            {
              id: "00000000-0000-0000-0000-000000000202",
              profileId: "q",
              name: "Sample B",
              profileStatus: "onboarding",
              uploadedAt: now,
              url: null,
            },
          ]}
        />
      </section>
      <section>
        <h2 className="mb-3 text-xl">Resolve a report</h2>
        <ResolveForm
          reportId="00000000-0000-0000-0000-000000000301"
          suggestFraud
        />
      </section>
    </main>
  );
}
