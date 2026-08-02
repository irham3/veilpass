import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VeilPass",
    short_name: "VeilPass",
    description: "Private wallet eligibility login for Stellar dApps.",
    start_url: "/",
    display: "standalone",
    background_color: "#0B0F0E",
    theme_color: "#0B0F0E",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
