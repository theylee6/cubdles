"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/photos", label: "Photos" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/verifications", label: "Verifications" },
];

export function AdminNav() {
  const pathname = usePathname();
  return <AdminNavView pathname={pathname} />;
}

export function AdminNavView({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Admin" className="flex flex-wrap gap-1">
      {LINKS.map((l) => {
        const active =
          l.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full px-4 py-2 text-sm text-mocha hover:bg-linen",
              active && "bg-linen font-medium text-cocoa",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
