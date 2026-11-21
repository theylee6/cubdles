import type { Metadata } from "next";
import { Container } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "You're offline",
  robots: { index: false },
};

export default function OfflinePage() {
  return (
    <Container className="max-w-lg py-20 text-center">
      <h1 className="text-3xl">You&rsquo;re offline</h1>
      <p className="mt-3 text-mocha">
        Cubdles needs a connection. Check your Wi-Fi or mobile data, then try
        again.
      </p>
    </Container>
  );
}
