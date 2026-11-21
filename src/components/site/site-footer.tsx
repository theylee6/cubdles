import Link from "next/link";
import { Wordmark } from "@/components/brand";

const GROUPS = [
  {
    title: "Cubdles",
    links: [
      { href: "/how-it-works", label: "How it works" },
      { href: "/pricing", label: "Membership" },
      { href: "/about", label: "About us" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Safety",
    links: [
      { href: "/safety", label: "Safety centre" },
      { href: "/guidelines", label: "Community guidelines" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
      { href: "/refunds", label: "Refunds & cancellation" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-oat/70 bg-linen/60">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="flex flex-col gap-3">
          <Wordmark />
          <p className="max-w-xs text-sm leading-relaxed text-mocha">
            Cubdles (said &ldquo;cuddles&rdquo;) is dating for people who love closeness. For adults 18 and over.
          </p>
          <p className="text-xs text-mocha">
            City data &copy; <a href="https://www.geonames.org/" className="underline underline-offset-2">GeoNames</a>, CC BY 4.0.
          </p>
        </div>
        {GROUPS.map((group) => (
          <nav key={group.title} aria-label={group.title} className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-cocoa">{group.title}</p>
            {group.links.map((link) => (
              <Link key={link.href} href={link.href} className="w-fit text-sm text-mocha hover:text-clay">
                {link.label}
              </Link>
            ))}
          </nav>
        ))}
      </div>
    </footer>
  );
}
