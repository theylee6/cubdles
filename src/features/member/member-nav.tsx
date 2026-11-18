"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, MessageCircleHeart, Sparkles, UserRound } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/app/discover", label: "Discover", icon: Sparkles },
  { href: "/app/likes", label: "Likes", icon: Heart },
  { href: "/app/matches", label: "Matches", icon: MessageCircleHeart },
  { href: "/app/me", label: "Me", icon: UserRound },
] as const;

/** Reads the current URL (needs a Suspense boundary on dynamic routes). */
export function MemberNav() {
  return <MemberNavView pathname={usePathname()} />;
}

/** Bottom tab bar on mobile, left rail on desktop. Pure view: pass "" for no active tab. */
export function MemberNavView({ pathname }: { pathname: string }) {
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col gap-8 border-r border-oat/70 bg-cream px-5 py-6 md:flex">
        <Link href="/app/discover" aria-label="Cubdles home" className="w-fit rounded-lg px-2">
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[15px] text-mocha hover:bg-linen hover:text-cocoa",
                active(href) && "bg-linen font-medium text-cocoa",
              )}
            >
              <Icon className={cn("size-5", active(href) && "text-clay")} strokeWidth={1.6} aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-oat/70 bg-cream/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={active(href) ? "page" : undefined}
            className={cn("flex flex-col items-center gap-1 py-2.5 text-xs text-mocha", active(href) && "text-clay")}
          >
            <Icon className="size-6" strokeWidth={1.6} aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
