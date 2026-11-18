import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cubdles",
    short_name: "Cubdles",
    description: "Dating for people who love closeness.",
    start_url: "/app",
    display: "standalone",
    background_color: "#FBF7F2",
    theme_color: "#FBF7F2",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
