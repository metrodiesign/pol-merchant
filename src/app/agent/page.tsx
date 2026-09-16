"use client";

// ponytail: placeholder landing จนกว่าจะมี dashboard ตัวแทนจริง (B7 ใน design §4.4/§7).
// returnTo ของ merchant OAuth client ชี้มาที่นี่ — ตรวจ session ด้วย merchant token (pol_merchant_tokens)
// ไม่ผ่าน admin AuthProvider/AuthGuard (ซึ่งอ่าน pol_tokens) เพื่อไม่ให้ตัวแทน approved เด้งกลับ /login.

import React, { useEffect, useState } from "react";

import {
  getAgentSession,
  logoutAgent,
  type AgentSessionResult,
} from "@/lib/api/merchant/auth";

export default function AgentLandingPage(): React.JSX.Element {
  const [result, setResult] = useState<AgentSessionResult | { status: "loading" }>({
    status: "loading",
  });
  const [logoutPending, setLogoutPending] = useState(false);
  const [logoutError, setLogoutError] = useState(false);

  useEffect(() => {
    let active = true;
    getAgentSession().then((r) => {
      if (!active) return;
      if (r.status === "anon") {
        window.location.href = "/login";
        return;
      }
      setResult(r);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleLogout = async () => {
    setLogoutPending(true);
    setLogoutError(false);
    try {
      await logoutAgent();
    } catch {
      setLogoutError(true);
      setLogoutPending(false);
    }
  };

  const message =
    result.status === "loading"
      ? "กำลังตรวจสอบสถานะ..."
      : result.status === "error"
        ? "ระบบขัดข้องชั่วคราว กรุณาโหลดหน้าใหม่"
        : result.status === "authed"
          ? `เข้าสู่ระบบสำเร็จ${result.me.email ? ` (${result.me.email})` : ""}`
          : "กำลังพาไปหน้าเข้าสู่ระบบ...";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-2 bg-grey-100 p-4">
      {result.status === "authed" && (
        <h1 className="text-2xl font-semibold">บัญชีตัวแทน</h1>
      )}
      <p className="text-lg text-muted-foreground" role="status">
        {message}
      </p>
      {result.status === "authed" && (
        <>
          {logoutError && (
            <p className="text-sm text-error" role="alert">
              ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง
            </p>
          )}
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={logoutPending}
            aria-busy={logoutPending}
            className="mt-4 inline-flex h-11 min-w-[160px] items-center justify-center rounded-control bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {logoutPending
              ? "กำลังออกจากระบบ..."
              : logoutError
                ? "ลองออกจากระบบอีกครั้ง"
                : "ออกจากระบบ"}
          </button>
        </>
      )}
    </main>
  );
}
