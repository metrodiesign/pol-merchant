"use client";

import { useEffect, useRef } from "react";

import { adminOAuthClient } from "@/lib/api/admin/auth";
import { merchantOAuthClient } from "@/lib/api/merchant/auth";
import { resolvePendingClient } from "@/lib/auth/oauth-client";

// OAuth redirect_uri (https://<spa>/auth/callback?code=..&state=..): แลก code เป็น token แล้ว full-page ไป returnTo
// (ไม่ใช้ router.replace — AuthProvider อยู่ใต้ dashboard shell ต้อง mount ใหม่หลังมี token).
// อ่าน query จาก window ใน effect แทน useSearchParams (ไม่ต้องมี Suspense boundary ตอน prerender).
// admin (pol-admin) กับ agent (pol-merchant) ใช้ redirect_uri เดียวกัน — เลือก client จาก PKCE state ที่ค้าง.
export default function AuthCallbackPage() {
  const started = useRef(false); // React StrictMode รัน effect ซ้ำ — code ใช้ซ้ำ = OpenIddict revoke ทั้ง login

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const client = resolvePendingClient([merchantOAuthClient, adminOAuthClient]);
    const completion = client
      ? client.completeLogin(window.location.search)
      : Promise.resolve({ ok: false as const, reason: "pkce_missing" });
    void completion.then((result) => {
      window.location.replace(
        result.ok ? result.returnTo : `/login-error?reason=${encodeURIComponent(result.reason)}`,
      );
    });
  }, []);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-grey-100 p-4">
      <p className="text-lg text-muted-foreground" role="status">
        กำลังเข้าสู่ระบบ...
      </p>
    </main>
  );
}
