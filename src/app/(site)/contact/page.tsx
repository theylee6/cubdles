import type { Metadata } from "next";
import { EnvelopeIllustration } from "@/components/illustrations";
import { PageHero } from "@/components/site/page-parts";
import { Card, Container } from "@/components/ui/primitives";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the Cubdles team about safety, membership, privacy or anything else.",
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="We'd love to hear from you"
        intro="Questions, ideas or a safety concern — a real person reads every message. If you're in danger right now in India, call 112."
      />
      <Container className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <Card className="p-6 sm:p-8">
          <ContactForm />
        </Card>
        <div className="flex flex-col items-center gap-4 text-center lg:items-start lg:text-left">
          <EnvelopeIllustration className="w-40" />
          <p className="text-mocha">
            Reporting someone on Cubdles? The fastest way is the <strong className="text-cocoa">Report</strong> option on their profile or in your chat —
            it attaches the details our moderators need.
          </p>
        </div>
      </Container>
    </>
  );
}
