import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.SITE_URL ?? "https://life-tools.jp";

  return {
    rules: [
      {
        userAgent: "*", // すべてのクローラー対象
        allow: "/",     // サイト全体をクロール可能に
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
