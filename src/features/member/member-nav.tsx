"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Heart, MessageCircleHeart, Sparkles, UserRound } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { unreadCountAction } from "@/features/messaging/actions";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/app/discover", label: "Discover", icon: Sparkles },
  { href: "/app/likes", label: "Likes", icon: Heart },
  { href: "/app/matches", label: "Matches", icon: MessageCircleHeart },
  { href: "/app/me", label: "Me", icon: UserRound },
] as const;

/** Keeps the unread badge current: on navigation, when the tab comes back, and when a message arrives. */
function useUnreadCount(initial: number, pathname: string) {
  const [count, setCount] = useState(initial);

  useEffect(() => {
    let alive = true;
    void unreadCountAction().then((n) => alive && setCount(n));
    return () => {
      alive = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(
        () => void unreadCountAction().then((n) => !cancelled && setCount(n)),
        500,
      );
    };
    const channel = supabase.channel("nav-unread");
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session)
        await supabase.realtime.setAuth(data.session.access_token);
      channel
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          refresh,
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "match_reads" },
          refresh,
        )
        .subscribe();
    })();
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, []);

  return count;
}

/** Reads the current URL (needs a Suspense boundary on dynamic routes). */
export function MemberNav({ initialUnread = 0 }: { initialUnread?: number }) {
  const pathname = usePathname();
  const unread = useUnreadCount(initialUnread, pathname);
  return <MemberNavView pathname={pathname} unread={unread} />;
}

function Badge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="grid min-w-5 place-items-center rounded-full bg-clay px-1.5 text-[11px] font-semibold leading-5 text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}

/** Bottom tab bar on mobile, left rail on desktop. Pure view: pass "" for no active tab. */
export function MemberNavView({
  pathname,
  unread = 0,
}: {
  pathname: string;
  unread?: number;
}) {
  const active = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const badgeFor = (href: string) => (href === "/app/matches" ? unread : 0);
  const srLabel = (label: string, href: string) =>
    badgeFor(href)
      ? `${label}, ${badgeFor(href)} unread conversation${badgeFor(href) === 1 ? "" : "s"}`
      : undefined;

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col gap-8 border-r border-oat/70 bg-cream px-5 py-6 md:flex">
        <Link
          href="/app/discover"
          aria-label="Cubdles home"
          className="w-fit rounded-lg px-2"
        >
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
              aria-label={srLabel(label, href)}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[15px] text-mocha hover:bg-linen hover:text-cocoa",
                active(href) && "bg-linen font-medium text-cocoa",
              )}
            >
              <Icon
                className={cn("size-5", active(href) && "text-clay")}
                strokeWidth={1.6}
                aria-hidden
              />
              <span className="flex-1">{label}</span>
              <Badge count={badgeFor(href)} />
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
            aria-label={srLabel(label, href)}
            className={cn(
              "relative flex flex-col items-center gap-1 py-2.5 text-xs text-mocha",
              active(href) && "text-clay",
            )}
          >
            <Icon className="size-6" strokeWidth={1.6} aria-hidden />
            {label}
            {badgeFor(href) ? (
              <span className="absolute top-1.5 left-[calc(50%+6px)]">
                <Badge count={badgeFor(href)} />
              </span>
            ) : null}
          </Link>
        ))}
      </nav>
    </>
  );
}
