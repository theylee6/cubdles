import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Container } from "@/components/ui/primitives";
import { UnsubscribeButton } from "./unsubscribe-button";

export const metadata: Metadata = {
  title: "Email preferences",
  robots: { index: false },
};

export default function UnsubscribePage({
  searchParams,
}: PageProps<"/unsubscribe">) {
  return (
    <Container className="max-w-lg py-16">
      <Suspense fallback={null}>
        <Body searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function Body({
  searchParams,
}: {
  searchParams: PageProps<"/unsubscribe">["searchParams"];
}) {
  const p = await searchParams;
  const one = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v) ?? "";
  const u = one(p.u);
  const k = one(p.k);
  const t = one(p.t);
  const topic = k === "matches" ? "match" : k === "messages" ? "message" : null;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl">Email preferences</h1>
      {topic && u && t ? (
        <>
          <p className="text-mocha">
            Stop getting {topic} emails from Cubdles? Safety notices will still
            reach you.
          </p>
          <UnsubscribeButton
            query={new URLSearchParams({ u, k, t }).toString()}
            label={`Turn off ${topic} emails`}
          />
        </>
      ) : (
        <p className="text-mocha">
          This link isn&rsquo;t complete. You can change which emails you get in{" "}
          <Link
            href="/app/settings"
            className="text-clay underline underline-offset-4"
          >
            Settings
          </Link>
          .
        </p>
      )}
    </div>
  );
}
