import type { Metadata } from "next";
import Link from "next/link";
import { BusinessDetails } from "@/components/site/business-details";
import {
  LegalDraftNotice,
  PageHero,
  Prose,
} from "@/components/site/page-parts";
import { Container } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Refunds and cancellation",
  description:
    "How cancelling Cubdles Plus works and when you can get a refund.",
};

export default function RefundsPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Refunds and cancellation"
        intro="Cubdles is free to use. Cubdles Plus is an optional membership — here's how cancelling and refunds work."
      />
      <Container className="flex flex-col gap-8">
        <LegalDraftNotice />
        <Prose>
          <h2>1. What you pay for</h2>
          <p>
            Cubdles Plus is a digital membership billed every month or every 6
            months, in the currency shown at checkout. The price, billing period
            and renewal date are shown before you pay. Nothing physical is
            shipped; Plus features are available on your account as soon as
            payment is confirmed.
          </p>

          <h2>2. Cancelling</h2>
          <p>
            You can cancel any time from <strong>Settings → Membership</strong>.
            Cancelling stops the next renewal. You keep Plus until the end of
            the period you&rsquo;ve already paid for, and you won&rsquo;t be
            charged again. Deleting your account also cancels your membership.
          </p>

          <h2>3. Refunds</h2>
          <p>
            Because you keep Plus until the end of the paid period, we
            don&rsquo;t give refunds for the current period or for unused time,
            except:
          </p>
          <ul>
            <li>
              if you were charged in error (for example, a duplicate charge, or
              a renewal after you had cancelled);
            </li>
            <li>
              if Plus didn&rsquo;t work for you because of a fault on our side
              that we couldn&rsquo;t fix;
            </li>
            <li>
              if we close your account without you breaking our{" "}
              <Link href="/terms">terms</Link> — we refund the unused part of
              your period;
            </li>
            <li>where the law where you live gives you a right to a refund.</li>
          </ul>
          <p>
            If we remove your account for breaking our{" "}
            <Link href="/terms">terms</Link> or{" "}
            <Link href="/guidelines">community guidelines</Link>, unused time
            isn&rsquo;t refunded unless the law requires it.
          </p>

          <h2>4. EU and UK members</h2>
          <p>
            If you live in the European Union or the United Kingdom, you have a
            legal right to withdraw from a new membership within 14 days of
            buying it. If you start using Plus straight away, you agree that the
            service begins immediately, and if you withdraw within the 14 days
            we refund the price minus the part for the days you&rsquo;ve already
            had.
          </p>

          <h2>5. How to ask for a refund</h2>
          <p>
            Write to us through the <Link href="/contact">contact page</Link>{" "}
            with the email on your account and the date of the charge. We reply
            within 5 working days. Approved refunds go back to the original
            payment method, usually within 5–7 working days (your bank may take
            longer).
          </p>

          <h2>6. Payment processing</h2>
          <p>
            Payments are processed securely by Razorpay. We never see or store
            your full card details.
          </p>
        </Prose>
        <BusinessDetails />
      </Container>
    </>
  );
}
