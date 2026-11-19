import { describe, expect, it, vi } from "vitest";
import {
  OFFLINE_MESSAGE,
  STALE_PAGE_MESSAGE,
  withRecovery,
} from "@/components/ui/action-recovery";

describe("withRecovery", () => {
  const fd = new FormData();
  vi.spyOn(console, "error").mockImplementation(() => {});

  it("passes results through", async () => {
    const run = withRecovery<{ ok?: boolean }>(async () => ({ ok: true }));
    expect(await run({}, fd)).toEqual({ ok: true });
  });
  it("turns a missing action after a deploy into a refresh message", async () => {
    const run = withRecovery<{ message?: string }>(async () => {
      throw new Error('Server Action "abc" was not found on the server.');
    });
    expect((await run({}, fd)).message).toBe(STALE_PAGE_MESSAGE);
  });
  it("turns network failures into a connection message", async () => {
    const run = withRecovery<{ message?: string }>(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect((await run({}, fd)).message).toBe(OFFLINE_MESSAGE);
  });
  it("lets redirects through", async () => {
    const redirect = Object.assign(new Error("NEXT_REDIRECT"), {
      digest: "NEXT_REDIRECT;replace;/app;307;",
    });
    const run = withRecovery<{ ok?: boolean }>(async () => {
      throw redirect;
    });
    await expect(run({}, fd)).rejects.toBe(redirect);
  });
});
