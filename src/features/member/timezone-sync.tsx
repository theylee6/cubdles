"use client";

import { useEffect } from "react";
import { syncTimezoneAction } from "@/features/onboarding/location-actions";

/** Keeps the member's time zone current (daily likes and picks reset at local midnight). Once per browser session. */
export function TimezoneSync() {
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!tz || sessionStorage.getItem("cubdles:tz") === tz) return;
      sessionStorage.setItem("cubdles:tz", tz);
      void syncTimezoneAction(tz);
    } catch {
      // Storage or Intl unavailable — nothing to do; the server keeps the last known zone.
    }
  }, []);
  return null;
}
