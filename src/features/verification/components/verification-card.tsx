"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { BadgeCheck, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prepareImageForUpload } from "@/features/photos/client-resize";
import { startVerificationAction, submitSelfieAction } from "../actions";
import { poseText } from "../copy";
import type { VerificationState } from "../data";

/** Get a "Verified" badge: copy a pose in a selfie; our team compares it with your photos. */
export function VerificationCard({ state }: { state: VerificationState }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function begin() {
    start(async () => {
      const r = await startVerificationAction();
      if (!r.ok) return setError(r.message);
      setError(null);
      router.refresh();
    });
  }

  function upload(file: File | undefined, requestId: string) {
    if (!file) return;
    start(async () => {
      try {
        const blob = await prepareImageForUpload(file);
        const fd = new FormData();
        fd.set("requestId", requestId);
        fd.set(
          "selfie",
          new File([blob], "selfie.jpg", { type: blob.type || "image/jpeg" }),
        );
        const r = await submitSelfieAction(fd);
        if (!r.ok) return setError(r.message);
        setError(null);
        router.refresh();
      } catch {
        setError("We couldn't read that photo. Please try another.");
      }
    });
  }

  return (
    <section
      aria-labelledby="verify-title"
      className="rounded-[var(--radius-card)] bg-cream p-5 ring-1 ring-oat"
    >
      <h2 id="verify-title" className="flex items-center gap-2 text-lg">
        <BadgeCheck className="size-5 text-sage" aria-hidden /> Photo
        verification
      </h2>
      {state.state === "verified" ? (
        <p className="mt-2 text-sm text-mocha">
          You&rsquo;re verified. People see a badge on your profile.
        </p>
      ) : state.state === "pending" ? (
        <p className="mt-2 text-sm text-mocha">
          Thanks! Our team is checking your selfie, usually within a day.
        </p>
      ) : state.state === "awaiting_photo" ? (
        <div className="mt-2 flex flex-col gap-3 text-sm">
          <p>
            Take a selfie doing this pose:{" "}
            <strong>{poseText(state.pose).label}</strong>.{" "}
            {poseText(state.pose).how} Make sure your face is clear and well
            lit.
          </p>
          <input
            ref={input}
            type="file"
            accept="image/*"
            capture="user"
            className="sr-only"
            id="selfie"
            onChange={(e) => upload(e.target.files?.[0], state.requestId)}
          />
          <Button
            onClick={() => input.current?.click()}
            disabled={pending}
            className="self-start"
          >
            <Camera className="size-4" aria-hidden />{" "}
            {pending ? "Uploading…" : "Take selfie"}
          </Button>
          <p className="text-xs text-mocha">
            Only our safety team sees this selfie. We delete it as soon as
            we&rsquo;ve checked it.
          </p>
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-3 text-sm">
          <p className="text-mocha">
            Show people you&rsquo;re really you. You&rsquo;ll copy a pose in a
            quick selfie and our team compares it with your photos.
          </p>
          {state.lastRejection ? (
            <p className="rounded-2xl bg-linen px-3 py-2">
              Last time it didn&rsquo;t go through: {state.lastRejection}
            </p>
          ) : null}
          <Button onClick={begin} disabled={pending} className="self-start">
            {pending ? "Starting…" : "Get verified"}
          </Button>
        </div>
      )}
      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-2xl bg-blush-soft px-3 py-2 text-sm ring-1 ring-blush"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}
