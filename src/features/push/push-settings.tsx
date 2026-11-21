"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  removePushSubscriptionAction,
  savePushSettingsAction,
  savePushSubscriptionAction,
} from "./actions";

type State =
  "checking" | "unsupported" | "ios-install" | "denied" | "off" | "on";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Turn push notifications on or off for this device, and choose which ones to get. */
export function PushSettings({
  publicKey,
  initial,
}: {
  publicKey: string | undefined;
  initial: { matches: boolean; messages: boolean };
}) {
  const [state, setState] = useState<State>("checking");
  const [prefs, setPrefs] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    void (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone = window.matchMedia(
        "(display-mode: standalone)",
      ).matches;
      if (
        !publicKey ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        return setState(ios && !standalone ? "ios-install" : "unsupported");
      }
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })();
  }, [publicKey]);

  function enable() {
    start(async () => {
      setMessage(null);
      const permission = await Notification.requestPermission();
      if (permission !== "granted")
        return setState(permission === "denied" ? "denied" : "off");
      const reg =
        (await navigator.serviceWorker.getRegistration()) ??
        (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey!),
      });
      const r = await savePushSubscriptionAction(
        sub.toJSON(),
        navigator.userAgent,
      );
      if (!r.ok) {
        await sub.unsubscribe();
        return setMessage(r.message ?? "That didn't work.");
      }
      setState("on");
    });
  }

  function disable() {
    start(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await removePushSubscriptionAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    });
  }

  function toggle(key: "matches" | "messages", value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    start(async () => {
      const r = await savePushSettingsAction(next.matches, next.messages);
      if (!r.ok) setMessage("We couldn't save that. Please try again.");
    });
  }

  return (
    <div className="flex flex-col gap-3 text-sm">
      {state === "checking" ? (
        <p className="text-mocha">Checking this device…</p>
      ) : null}
      {state === "unsupported" ? (
        <p className="text-mocha">
          This browser doesn&rsquo;t support notifications.
        </p>
      ) : null}
      {state === "ios-install" ? (
        <p className="text-mocha">
          On iPhone and iPad, add Cubdles to your Home Screen first: tap{" "}
          <strong>Share</strong>, then <strong>Add to Home Screen</strong>, then
          open Cubdles from there and come back here.
        </p>
      ) : null}
      {state === "denied" ? (
        <p className="text-mocha">
          Notifications are blocked for Cubdles in your browser settings. Allow
          them there, then reload this page.
        </p>
      ) : null}
      {state === "off" ? (
        <>
          <p className="text-mocha">
            Get a notification on this device when you match or get a message.
          </p>
          <Button onClick={enable} disabled={pending} className="self-start">
            {pending ? "Turning on…" : "Turn on notifications"}
          </Button>
        </>
      ) : null}
      {state === "on" ? (
        <>
          <p>Notifications are on for this device.</p>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={prefs.matches}
              onChange={(e) => toggle("matches", e.target.checked)}
              className="accent-[var(--color-clay)]"
            />{" "}
            New matches
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={prefs.messages}
              onChange={(e) => toggle("messages", e.target.checked)}
              className="accent-[var(--color-clay)]"
            />{" "}
            New messages
            <span className="text-mocha">(never shows what was said)</span>
          </label>
          <Button
            variant="secondary"
            size="sm"
            onClick={disable}
            disabled={pending}
            className="self-start"
          >
            Turn off on this device
          </Button>
        </>
      ) : null}
      {message ? (
        <p role="alert" className="text-alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
