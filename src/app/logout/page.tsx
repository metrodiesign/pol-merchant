"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { logoutCurrentRealm } from "@/lib/auth/logout";

// sign-out: เรียก BFF logout แล้วเด้งกลับ /login เมื่อได้ 204 หรือ terminal logged-out state (401/403).
export default function LogoutPage() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const attemptLogout = useCallback(async () => {
    setFailed(false);
    try {
      const result = await logoutCurrentRealm();
      if (!result.navigated) router.replace("/login");
    } catch {
      setFailed(true);
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    void logoutCurrentRealm()
      .then((result) => {
        if (!cancelled && !result.navigated) router.replace("/login");
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (failed) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-grey-100 p-4">
        <p className="text-base text-error" role="alert">
          ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง
        </p>
        <button
          type="button"
          onClick={() => void attemptLogout()}
          className="rounded-lg bg-primary px-4 py-2 text-base font-semibold text-white"
        >
          ลองอีกครั้ง
        </button>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-grey-100 p-4">
      <p className="text-base text-muted-foreground" role="status">
        กำลังออกจากระบบ...
      </p>
    </main>
  );
}
