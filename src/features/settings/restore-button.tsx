"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { restoreAccount } from "./actions";

export function RestoreButton() {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await restoreAccount(); // redirects on success
            setMessage(r.message ?? null);
          })
        }
      >
        {pending ? "Restoring…" : "Changed your mind? Restore my account"}
      </Button>
      {message ? <p role="alert" className="text-sm text-alert">{message}</p> : null}
    </div>
  );
}
