"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cancelMembershipAction } from "../actions";

export function CancelMembershipButton({ until }: { until: string | null }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() => {
          if (
            !window.confirm(
              `Cancel Cubdles Plus? You'll keep it${until ? ` until ${until}` : " until the end of this period"}, and won't be charged again.`,
            )
          )
            return;
          start(async () => setMsg((await cancelMembershipAction()).message));
        }}
        className="self-start"
      >
        {pending ? "Cancelling…" : "Cancel membership"}
      </Button>
      {msg ? (
        <p role="status" className="text-sm">
          {msg}
        </p>
      ) : null}
    </div>
  );
}
