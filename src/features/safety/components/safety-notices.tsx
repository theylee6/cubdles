import Link from "next/link";
import { publicEnv } from "@/lib/env";
import { FRAUD_BAN_ADVICE, FTC_ROMANCE_SCAMS_URL, warningText } from "../copy";
import type { SafetyNotice } from "../data";
import { DismissNotice } from "./dismiss-notice";

const when = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

/** Notices from the safety team: fraud-ban notifications (15 U.S.C. 45g) and warnings. */
export function SafetyNotices({
  notices,
  timeZone,
}: {
  notices: SafetyNotice[];
  timeZone: string;
}) {
  if (!notices.length) return null;
  const support = publicEnv.NEXT_PUBLIC_SUPPORT_EMAIL;
  return (
    <div className="mb-6 flex flex-col gap-3">
      {notices.map((n) =>
        n.kind === "fraud_ban" ? (
          <section
            key={n.id}
            role="alert"
            aria-labelledby={`notice-${n.id}`}
            className="rounded-[var(--radius-card)] bg-blush-soft px-5 py-4 text-sm ring-1 ring-blush"
          >
            <h2
              id={`notice-${n.id}`}
              className="font-display text-lg text-cocoa"
            >
              Important: someone you talked to was removed for fraud
            </h2>
            <p className="mt-2">
              We&rsquo;ve banned <strong>{n.subject_name ?? "a member"}</strong>{" "}
              from Cubdles.
              {n.last_contact_at
                ? ` Your last message with them was on ${when(n.last_contact_at, timeZone)}.`
                : ""}{" "}
              {FRAUD_BAN_ADVICE.identity}
            </p>
            <p className="mt-2 font-medium">{FRAUD_BAN_ADVICE.money}</p>
            <p className="mt-2">{FRAUD_BAN_ADVICE.help}</p>
            <p className="mt-2">
              Learn how to spot romance scams:{" "}
              <a
                href={FTC_ROMANCE_SCAMS_URL}
                className="underline underline-offset-4"
              >
                US Federal Trade Commission guide
              </a>{" "}
              ·{" "}
              <Link href="/safety" className="underline underline-offset-4">
                Cubdles safety centre
              </Link>
              . Questions? Contact our team
              {support ? (
                <>
                  {" "}
                  at{" "}
                  <a
                    href={`mailto:${support}`}
                    className="underline underline-offset-4"
                  >
                    {support}
                  </a>
                </>
              ) : (
                <>
                  {" "}
                  via the{" "}
                  <Link
                    href="/contact"
                    className="underline underline-offset-4"
                  >
                    contact page
                  </Link>
                </>
              )}
              .
            </p>
            <DismissNotice id={n.id} label="I understand" />
          </section>
        ) : (
          <section
            key={n.id}
            role="status"
            aria-labelledby={`notice-${n.id}`}
            className="rounded-[var(--radius-card)] bg-linen px-5 py-4 text-sm ring-1 ring-oat"
          >
            <h2
              id={`notice-${n.id}`}
              className="font-display text-lg text-cocoa"
            >
              A note from our safety team
            </h2>
            <p className="mt-2">
              {warningText(n.reason)}{" "}
              <Link href="/guidelines" className="underline underline-offset-4">
                Community guidelines
              </Link>
            </p>
            <DismissNotice id={n.id} label="Got it" />
          </section>
        ),
      )}
    </div>
  );
}
