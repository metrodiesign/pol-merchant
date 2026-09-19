"use client";

import { useState } from "react";
import { CircleCheck } from "lucide-react";
import { AvatarUpload } from "@/components/shared/avatar-upload";
import { MerchantUserEditFormCard } from "@/components/user/edit-form-card";
import { PageShell, SubmitOverlay, cardStyle, primaryButtonClass } from "@/components/register/register-shell";
import { startRegistration, writePendingVerification } from "@/lib/api/agent-registration";
import { toFormData, toRegistrationDraft } from "@/lib/agent-registration/profile";
import { useRegistrationCase } from "@/lib/agent-registration/use-registration-case";
import { beginAgentLogin } from "@/lib/api/merchant/auth";
import type { MerchantUserFormData } from "@/types/user";

const emptyForm: MerchantUserFormData = { firstName: "", lastName: "", personType: "Individual", idNumber: "", producerCode: "", licenseNumber: "", phoneNumber: "", email: "", acceptTerms: false };
export default function RegisterPage() {
  const { state, caseData } = useRegistrationCase("form");
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const form = caseData ? toFormData(caseData.registration) : emptyForm;
  if (state.kind === "approved") return <PageShell><div className="p-12 text-center"><CircleCheck className="mx-auto size-12 text-success" /><h1 className="mt-4 text-xl font-bold">บัญชีได้รับการอนุมัติแล้ว</h1><button className={primaryButtonClass} onClick={() => void beginAgentLogin()}>เข้าสู่ระบบ</button></div></PageShell>;
  const save = async (data: MerchantUserFormData) => { if (!photo) { setError("กรุณาแนบรูปถ่ายตัวแทน"); return; } setSubmitting(true); try { const result = await startRegistration({ draft: toRegistrationDraft(data, new Date().toISOString()), photo, kycPhoto: null, etag: caseData?.etag ?? null }); if (result.outcome.kind === "verify" && result.verification) { writePendingVerification(result.verification); window.location.href = "/register/verify"; return; } else if (result.outcome.kind === "success") window.location.href = "/register/pending"; else if (result.outcome.kind === "field" || result.outcome.kind === "error") setError(result.outcome.message); else if (result.outcome.kind === "redirect") window.location.href = `/login-error?reason=${encodeURIComponent(result.outcome.reason)}`; } catch { setError("เกิดข้อผิดพลาด กรุณาลองใหม่"); } finally { setSubmitting(false); } };
  return <PageShell><div className="mx-auto max-w-5xl px-4 py-10"><h1 className="mb-6 text-xl font-bold">การลงทะเบียนตัวแทน</h1>{error && <p role="alert" className="mb-4 text-error">{error}</p>}<div className="grid grid-cols-1 gap-6 mmd:grid-cols-12"><div className="mmd:col-span-4"><div className="rounded-card bg-card p-6" style={cardStyle}><AvatarUpload size={144} onFileSelect={setPhoto} /></div></div><div className="mmd:col-span-8"><MerchantUserEditFormCard key={caseData?.etag ?? "new"} initialData={form} submitLabel="ลงทะเบียน" showAcceptTerms brandAccent photo={{ value: photo, onError: setError }} onSave={save} /></div></div></div>{submitting && <SubmitOverlay />}</PageShell>;
}
