"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { confirmCheckoutAction, startCheckoutAction } from "../actions";

type RazorpayResponse = {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
};
type RazorpayInstance = {
  open: () => void;
  on: (
    event: string,
    cb: (r: { error?: { description?: string } }) => void,
  ) => void;
};
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

function loadCheckout(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

/** Opens Razorpay Checkout for one price. Access only switches on after the server verifies the payment. */
export function CheckoutButton({
  priceId,
  label,
  description,
}: {
  priceId: string;
  label: string;
  description: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<{
    tone: "ok" | "error";
    text: string;
  } | null>(null);
  const [pending, start] = useTransition();

  function buy() {
    start(async () => {
      setMessage(null);
      const r = await startCheckoutAction(priceId);
      if (!r.ok) return setMessage({ tone: "error", text: r.message });
      if (!(await loadCheckout()) || !window.Razorpay)
        return setMessage({
          tone: "error",
          text: "We couldn't load the payment window. Check your connection and try again.",
        });
      const rz = new window.Razorpay({
        key: r.keyId,
        subscription_id: r.subscriptionId,
        name: "Cubdles",
        description,
        prefill: r.email ? { email: r.email } : undefined,
        theme: { color: "#A04F37" },
        handler: (resp: RazorpayResponse) => {
          start(async () => {
            const c = await confirmCheckoutAction(resp);
            setMessage({ tone: c.ok ? "ok" : "error", text: c.message });
            if (c.ok) router.refresh();
          });
        },
        modal: {
          ondismiss: () =>
            setMessage({
              tone: "error",
              text: "Checkout closed. You haven't been charged.",
            }),
        },
      });
      rz.on("payment.failed", (e) =>
        setMessage({
          tone: "error",
          text: e.error?.description ?? "The payment didn't go through.",
        }),
      );
      rz.open();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={buy} disabled={pending}>
        {pending ? "Please wait…" : label}
      </Button>
      {message ? (
        <p
          role={message.tone === "error" ? "alert" : "status"}
          className={
            message.tone === "error" ? "text-sm text-alert" : "text-sm"
          }
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
