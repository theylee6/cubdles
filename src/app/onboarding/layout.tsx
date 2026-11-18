import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { Container } from "@/components/ui/primitives";

export const metadata = { title: "Set up your profile", robots: { index: false } };

export default function OnboardingLayout({ children }: LayoutProps<"/onboarding">) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-oat/60">
        <Container className="flex h-16 max-w-2xl items-center justify-between">
          <Wordmark />
          <Link href="/app" className="text-sm text-mocha hover:text-cocoa">
            Save &amp; finish later
          </Link>
        </Container>
      </header>
      <main id="main">
        <Container className="max-w-2xl py-10">{children}</Container>
      </main>
    </div>
  );
}
