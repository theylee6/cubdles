import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";

const PUBLIC_PATHS = ["", "/how-it-works", "/about", "/pricing", "/safety", "/faq", "/contact", "/guidelines", "/terms", "/privacy", "/join", "/login"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  return PUBLIC_PATHS.map((path) => ({
    url: `${base}${path}`,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.6,
  }));
}
