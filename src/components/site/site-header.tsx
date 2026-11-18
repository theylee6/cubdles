"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/safety", label: "Safety" },
  { href: "/pricing", label: "Membership" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  const pathname = usePathname();
  // The menu belongs to the page it was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;

  return (
    <header className="sticky top-0 z-40 border-b border-oat/60 bg-cream/85 backdrop-blur-md">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:rounded-full focus:bg-cocoa focus:px-4 focus:py-2 focus:text-cream">
        Skip to content
      </a>
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="Cubdles home" className="rounded-lg">
          <Wordmark />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className={cn(
                "rounded-full px-4 py-2 text-[15px] text-mocha transition-colors hover:bg-linen hover:text-cocoa",
                pathname === item.href && "text-cocoa",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link href="/login" className={buttonClasses("ghost", "sm")}>
            Log in
          </Link>
          <Link href="/join" className={buttonClasses("primary", "sm")}>
            Join Cubdles
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-full text-cocoa hover:bg-linen md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpenOn(open ? null : pathname)}
        >
          {open ? <X className="size-5" strokeWidth={1.5} /> : <Menu className="size-5" strokeWidth={1.5} />}
        </button>
      </div>

      <div id="mobile-nav" hidden={!open} className="border-t border-oat/60 bg-cream md:hidden">
        <nav aria-label="Main mobile" className="flex flex-col gap-1 px-5 py-4">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-2xl px-4 py-3 text-lg text-cocoa hover:bg-linen">
              {item.label}
            </Link>
          ))}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Link href="/login" className={buttonClasses("secondary", "md")}>
              Log in
            </Link>
            <Link href="/join" className={buttonClasses("primary", "md")}>
              Join
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
