// src/app/sitemap.ts
import type { MetadataRoute } from "next";

const BASE = process.env.SITE_URL ?? "https://life-tools.jp";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // 1) 固定ページ
  const staticPaths: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now },
    { url: `${BASE}/tools`, lastModified: now },
    { url: `${BASE}/articles`, lastModified: now },
  ];

  // 2) ツール（移行済み3本＋将来追加分）
  const toolSlugs = [
    "cashflow-planner",
    "moji-counter",
    "qr-generator",
    // ここに追加していく: "xxxx",
  ];
  const toolPaths: MetadataRoute.Sitemap = toolSlugs.map((slug) => ({
    url: `${BASE}/tools/${slug}`,
    lastModified: now,
  }));

  // 3) 記事（microCMS 連携は後で。まずは空配列）
  const articlePaths: MetadataRoute.Sitemap = [];

  return [...staticPaths, ...toolPaths, ...articlePaths];
}
