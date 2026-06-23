import { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://zipline.mv";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow:     "/",
        disallow:  [
          "/admin/",
          "/agents/",
          "/affiliate/",
          "/auth/",
          "/api/",
          "/book/confirmation",
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
