import Link from "next/link";
import { Suspense } from "react";
import { Wordmark } from "@/components/brand";
import { AdminNav, AdminNavView } from "@/features/admin/components/admin-nav";

export const metadata = {
  title: { default: "Admin", template: "%s · Cubdles admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-oat bg-cream">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-4 px-4 py-3">
          <Link
            href="/admin"
            className="flex items-center gap-2"
            aria-label="Cubdles admin home"
          >
            <Wordmark />
            <span className="rounded-full bg-cocoa px-2 py-0.5 text-xs font-medium text-cream">
              Admin
            </span>
          </Link>
          <Suspense fallback={<AdminNavView pathname="" />}>
            <AdminNav />
          </Suspense>
          <Link
            href="/app/discover"
            className="ml-auto text-sm text-mocha underline underline-offset-4"
          >
            Back to the app
          </Link>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-5xl px-4 py-8">
        {children}
      </main>
    </div>
  );
}
