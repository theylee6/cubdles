import type { Metadata } from "next";
import Link from "next/link";
import { LegalDraftNotice, PageHero, Prose } from "@/components/site/page-parts";
import { Container } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Terms and conditions",
  description: "The terms for using Cubdles.",
};

export default function TermsPage() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Terms and conditions" intro="The agreement between you and Cubdles, in plain language." />
      <Container className="flex flex-col gap-8">
        <LegalDraftNotice />
        <Prose>
          <h2>1. Who can use Cubdles</h2>
          <p>You must be at least 18 years old and legally able to enter this agreement. You may have only one account. You may not use Cubdles if we have previously removed you.</p>

          <h2>2. Your account</h2>
          <p>Keep your login details safe and tell us if you think someone else has accessed your account. You&rsquo;re responsible for what happens on your account.</p>

          <h2>3. Your content</h2>
          <p>You own the photos and words you post. You give Cubdles a licence to host, display and process them to run the service — for example, showing your profile to other members and reviewing photos for safety. This licence ends when you delete the content or your account, apart from copies we must keep by law or for safety records.</p>

          <h2>4. Behaviour</h2>
          <p>You agree to follow our <Link href="/guidelines">community guidelines</Link>. We may remove content or suspend or close accounts that break them. You can appeal these decisions.</p>

          <h2>5. Paid membership</h2>
          <p>Paid features are optional. Prices, billing period and renewal terms are shown before you pay. Memberships renew automatically until cancelled; you can cancel any time and keep your features until the end of the period you&rsquo;ve paid for. Refunds follow our refund policy and applicable law.</p>

          <h2>6. Safety</h2>
          <p>We review reports and take safety seriously, but we don&rsquo;t run criminal background checks, and we can&rsquo;t guarantee the behaviour of other members. Please follow the advice in our <Link href="/safety">Safety centre</Link>.</p>

          <h2>7. Ending the agreement</h2>
          <p>You can delete your account at any time from Settings. We may end or suspend your access if you break these terms, with notice where appropriate.</p>

          <h2>8. Complaints and grievances</h2>
          <p>Contact us through our <Link href="/contact">contact page</Link>. A Grievance Officer&rsquo;s name and contact details will be published here before launch.</p>

          <h2>9. Changes</h2>
          <p>If we change these terms in a meaningful way, we&rsquo;ll tell you in the app before the change takes effect.</p>
        </Prose>
      </Container>
    </>
  );
}
