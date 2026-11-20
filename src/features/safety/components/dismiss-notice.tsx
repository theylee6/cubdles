"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { dismissNoticeAction } from "../actions";

export function DismissNotice({ id, label }: { id: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="mt-3">
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() => start(() => dismissNoticeAction(id))}
      >
        {label}
      </Button>
    </div>
  );
}
