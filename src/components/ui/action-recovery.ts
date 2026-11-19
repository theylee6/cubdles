"use client";

export const STALE_PAGE_MESSAGE =
  "Cubdles was just updated. Please refresh this page and try again.";
export const OFFLINE_MESSAGE =
  "We couldn't reach Cubdles. Check your connection and try again.";

/** Next.js control-flow signals (redirect, notFound…) must keep propagating. */
function isFrameworkSignal(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_");
}

export function recoveryMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  return /server action/i.test(text) &&
    /not found|was not found|failed to find/i.test(text)
    ? STALE_PAGE_MESSAGE
    : OFFLINE_MESSAGE;
}

/**
 * Wraps a server action so that a page left open across a deploy (whose action no longer exists on the
 * server), or a dropped connection, shows a message in the form instead of the full-page error screen.
 */
export function withRecovery<S extends object>(
  action: (prev: S, formData: FormData) => Promise<S>,
) {
  return async (prev: S, formData: FormData): Promise<S> => {
    try {
      return await action(prev, formData);
    } catch (error) {
      if (isFrameworkSignal(error)) throw error;
      console.error("Form action failed", error);
      return {
        ...prev,
        ok: false,
        errors: undefined,
        message: recoveryMessage(error),
      } as S;
    }
  };
}
