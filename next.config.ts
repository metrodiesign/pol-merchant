import type { NextConfig } from "next";

// dev: ตั้ง ADMIN_API_ORIGIN=http://localhost:5100 ให้ proxy /admin/* + /producer/* ไป BFF เดียวกัน
// (producer-google-sso.md §18.4 — producer endpoints อยู่ API host เดียวกับ admin) — บังคับ same-origin.
// prod: เว้นว่าง — reverse proxy เสิร์ฟ SPA + API เป็น origin เดียวกันอยู่แล้ว ไม่ต้อง rewrite.
const adminApiOrigin = process.env.ADMIN_API_ORIGIN;

// next.config.ts evaluate ครั้งเดียวตอน `next build` แล้ว freeze ผลของ rewrites() ลง
// routes-manifest.json — standalone server.js ไม่ re-read ADMIN_API_ORIGIN ตอน container start
// เลย (verified ด้วยมือ). เตือนตรงนี้ = จุดเดียวที่ทันเวลาจริง (ก่อน image ถูกสร้างค้างค่าผิดตายตัว).
if (process.env.NODE_ENV === "production" && adminApiOrigin) {
  console.warn(
    `[pol-admin] คำเตือน: ADMIN_API_ORIGIN="${adminApiOrigin}" ถูกตั้งค่าอยู่ตอน production build — ` +
      `ค่านี้จะถูกฝังใน rewrites() ตายตัวถาวรในผลลัพธ์ build นี้ (เปลี่ยนตอน container runtime ไม่มีผล). ` +
      `ใน prod ต้องเว้น ADMIN_API_ORIGIN ว่างเสมอ (reverse proxy ทำ same-origin routing แทน Next.js rewrite).`,
  );
}

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
      {
        protocol: "https",
        hostname: "api-prod-minimal-v700.pages.dev",
      },
    ],
  },
  async rewrites() {
    if (!adminApiOrigin) return [];
    return [
      { source: "/admin/:path*", destination: `${adminApiOrigin}/admin/:path*` },
      { source: "/producer/:path*", destination: `${adminApiOrigin}/producer/:path*` },
    ];
  },
};

export default nextConfig;
