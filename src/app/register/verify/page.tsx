"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageShell, primaryButtonClass } from "@/components/register/register-shell";
import { confirmAndSubmit, readPendingVerification, requestContactVerification, resendCooldownSeconds, submitWithRetry, writePendingVerification } from "@/lib/api/agent-registration";
import { useRegistrationCase } from "@/lib/agent-registration/use-registration-case";

export default function VerifyPage() {
  const { state, caseData } = useRegistrationCase("verify");
  const [verification, setVerification] = useState(readPendingVerification);
  const [code, setCode] = useState(""); const [error, setError] = useState<string>(); const [seconds, setSeconds] = useState(0);
  useEffect(() => { if (!verification && state.kind === "verify") void requestContactVerification().then(r => { if (r.ok) { writePendingVerification(r.value); setVerification(r.value); } else setError("ระบบยังไม่พร้อมส่ง SMS"); }); }, [state.kind, verification]);
  useEffect(() => { const timer = setInterval(() => setSeconds(verification ? resendCooldownSeconds(verification.resendAvailableAt) : 0), 1000); return () => clearInterval(timer); }, [verification]);
  useEffect(() => { if (state.kind === "ready" && caseData?.etag) void submitWithRetry(caseData.etag).then(result => { if (result.outcome.kind === "success") window.location.href = "/register/pending"; }); }, [caseData?.etag, state.kind]);
  const confirm = async () => { if (!verification) return; const result = await confirmAndSubmit(verification.verificationId, code); if (result.outcome.kind === "success") window.location.href = "/register/pending"; else if (result.outcome.kind === "field" || result.outcome.kind === "error") setError(result.outcome.message); else if (result.outcome.kind === "redirect") window.location.href = `/login-error?reason=${result.outcome.reason}`; };
  const resend = async () => { const result = await requestContactVerification(); if (result.ok) { writePendingVerification(result.value); setVerification(result.value); setError(undefined); } else setError("ยังส่งรหัสใหม่ไม่ได้ กรุณารอสักครู่"); };
  return <PageShell><div className="mx-auto max-w-md p-8"><h1 className="text-xl font-bold">ยืนยันหมายเลขโทรศัพท์</h1><p className="mt-2 text-sm text-muted-foreground">กรอกรหัส 6 หลักที่ส่งทาง SMS</p>{error && <p role="alert" className="mt-3 text-error">{error}</p>}<input className="mt-6 h-11 w-full rounded-control border px-3" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e => setCode(e.target.value)} aria-label="รหัสยืนยัน 6 หลัก" /><button className={primaryButtonClass} onClick={() => void confirm()}>ยืนยัน</button><button className="ml-3 text-sm text-primary disabled:text-muted-foreground" disabled={seconds > 0} onClick={() => void resend()}>{seconds > 0 ? `ส่งใหม่ได้ใน ${seconds} วินาที` : "ส่งรหัสใหม่"}</button><Link className="mt-6 block text-sm text-primary" href="/register">แก้ไขข้อมูล</Link></div></PageShell>;
}
