"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { CircleCheck, Clock } from "lucide-react";
import { AvatarUpload } from "@/components/shared/avatar-upload";
import { Fieldset, Field, Label, Description } from "@/components/shared/fieldset";
import { MerchantUserEditFormCard } from "@/components/user/edit-form-card";
import { Logo } from "@/components/layout/logo";
import {
  getAgentRegistration,
  resolveRegistrationUiState,
  submitNew,
  retrySubmit,
  type AgentRegistrationCase,
  type SubmitContext,
  type SubmitResult,
} from "@/lib/api/agent-registration";
import { toFormData, toRegistrationDraft } from "@/lib/agent-registration/profile";
import { beginAgentLogin } from "@/lib/api/merchant/auth";
import type { MerchantUserFormData } from "@/types/user";

// ponytail: shell-free public page — no layout.tsx in this folder, inherits only root layout (mirror /login).
// สถานะทั้งหมดมาจาก GET agent-registration ครั้งแรก (design §3). ตรรกะ decision/sequencer อยู่ใน
// lib/api/agent-registration.ts (ทดสอบ branch จริงได้); หน้านี้แค่เลือก entry point และ render.

const cardStyle = {
  boxShadow:
    "rgba(145, 158, 171, 0.2) 0px 0px 2px 0px, rgba(145, 158, 171, 0.12) 0px 12px 24px -4px",
};

const emptyForm: MerchantUserFormData = {
  firstName: "",
  lastName: "",
  personType: "Individual",
  idNumber: "",
  producerCode: "",
  licenseNumber: "",
  phoneNumber: "",
  email: "",
  acceptTerms: false,
};

const primaryButtonClass =
  "mt-8 inline-flex h-11 min-w-[160px] items-center justify-center rounded-control bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1";

function RegisterHeader() {
  return (
    <header className="flex min-h-[60px] shrink-0 items-stretch gap-3 bg-crop-blue pr-4 sm:min-h-[70px] sm:gap-4 sm:pr-6">
      <span className="flex shrink-0 items-center bg-white px-3 sm:px-5">
        <Image src="/viriyah-logo.png" alt="วิริยะประกันภัย" width={667} height={250} priority className="h-12 w-auto sm:h-16" />
      </span>
      <span className="flex items-center">
        <Image src="/fairness-tagline-white.png" alt="ความเป็นธรรม คือ พื้นฐาน" width={1147} height={176} className="h-6 w-auto sm:h-8" />
      </span>
    </header>
  );
}

function RegisterBanner() {
  return (
    <Image src="/v-central-pay-banner.jpg" alt="V Central Pay" width={1280} height={300} priority sizes="100vw" className="h-auto w-full shrink-0" />
  );
}

// branded splash — overlay ระหว่าง submit (ฟอร์มยัง mount ข้างล่าง → error transient แล้วข้อมูลไม่หาย).
function SubmitOverlay() {
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-white">
      <div className="relative inline-flex items-center justify-center" style={{ width: 120, height: 120 }}>
        <span className="relative z-[9] inline-flex" style={{ animation: "splash-logo-pulse 3s ease-in-out infinite" }}>
          <Logo size={64} idPrefix="register-loading" />
        </span>
        <span
          className="absolute"
          style={{
            width: "calc(100% - 20px)",
            height: "calc(100% - 20px)",
            border: "solid 3px color-mix(in srgb, var(--color-primary-dark) 24%, transparent)",
            animation: "splash-inner-ring 3.2s linear infinite",
          }}
        />
        <span
          className="absolute inset-0"
          style={{
            border: "solid 8px color-mix(in srgb, var(--color-primary-dark) 24%, transparent)",
            animation: "splash-outer-ring 3.2s linear infinite",
          }}
        />
      </div>
    </div>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="theme-minimals min-h-dvh bg-grey-100">
      <RegisterHeader />
      <RegisterBanner />
      {children}
    </main>
  );
}

// สถานะรอการอนุมัติ (WAIT หลัง submit สำเร็จ หรือ nextAction=wait)
function WaitView() {
  return (
    <PageShell>
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-card bg-card px-6 py-12 text-center" style={cardStyle}>
          <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-warning/12">
            <Clock className="size-12 text-warning" strokeWidth={1.5} />
          </div>
          <h1 className="mt-6 text-xl font-bold text-foreground">รอการอนุมัติ</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            ระบบได้รับข้อมูลการลงทะเบียนของคุณแล้ว
            <br />
            กรุณารอการอนุมัติจากผู้ดูแลระบบ
          </p>
        </div>
      </div>
    </PageShell>
  );
}

// ตัวแทนที่อนุมัติแล้ว (nextAction=login) — เริ่ม PKCE login ด้วย client pol-merchant
function ApprovedView() {
  return (
    <PageShell>
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-card bg-card px-6 py-12 text-center" style={cardStyle}>
          <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-success/12">
            <CircleCheck className="size-12 text-success" strokeWidth={1.5} />
          </div>
          <h1 className="mt-6 text-xl font-bold text-foreground">บัญชีได้รับการอนุมัติแล้ว</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            กรุณาเข้าสู่ระบบเพื่อเริ่มใช้งาน
          </p>
          <button type="button" className={primaryButtonClass} onClick={() => void beginAgentLogin()}>
            เข้าสู่ระบบ
          </button>
        </div>
      </div>
    </PageShell>
  );
}

type View =
  | { kind: "loading" }
  | {
      kind: "form";
      prefill: MerchantUserFormData;
      etag: string | null;
      rejectionReason: string | null;
    }
  | { kind: "wait" }
  | { kind: "approved" };

export default function RegisterPage() {
  const [view, setView] = useState<View>({ kind: "loading" });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();
  const [retryCtx, setRetryCtx] = useState<SubmitContext>();

  const applyCase = useCallback((caseData: AgentRegistrationCase | null) => {
    const ui = resolveRegistrationUiState(caseData);
    switch (ui.kind) {
      case "form":
        setView({ kind: "form", prefill: emptyForm, etag: null, rejectionReason: null });
        break;
      case "form-prefill":
        setView({
          kind: "form",
          prefill: caseData ? toFormData(caseData.registration) : emptyForm,
          etag: caseData?.etag ?? null,
          rejectionReason: caseData?.registration.rejectionReason ?? null,
        });
        break;
      case "wait":
        setView({ kind: "wait" });
        break;
      case "approved":
        setView({ kind: "approved" });
        break;
    }
  }, []);

  const load = useCallback(async () => {
    const result = await getAgentRegistration();
    if (!result.ok) {
      if (result.status === 401) {
        window.location.href = "/login-error?reason=registration-session-expired";
        return;
      }
      setSubmitError("โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่");
      setView({ kind: "form", prefill: emptyForm, etag: null, rejectionReason: null });
      return;
    }
    applyCase(result.value);
  }, [applyCase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time GET สถานะ case ตอน mount (design §3), ไม่ใช่ subscription
    void load();
  }, [load]);

  const handleOutcome = useCallback(
    async (result: SubmitResult) => {
      const { outcome, ctx } = result;
      switch (outcome.kind) {
        case "success":
          setRetryCtx(undefined);
          setView({ kind: "wait" });
          setSubmitting(false);
          return;
        case "reload":
          setRetryCtx(undefined);
          await load();
          setSubmitting(false);
          return;
        case "field":
          if (outcome.field === "photo") setPhotoError(outcome.message);
          else setSubmitError(outcome.message);
          setSubmitting(false);
          return;
        case "redirect":
          window.location.href = `/login-error?reason=${encodeURIComponent(outcome.reason)}`;
          return;
        case "retryable":
          setRetryCtx(ctx);
          setSubmitError("เชื่อมต่อไม่สำเร็จระหว่างส่งข้อมูล กรุณากดลองใหม่");
          setSubmitting(false);
          return;
        case "error":
          setSubmitError(outcome.message);
          setSubmitting(false);
          return;
      }
    },
    [load],
  );

  const handleSave = useCallback(
    async (data: MerchantUserFormData) => {
      if (view.kind !== "form") return;
      // card validate photo แล้วก่อน onSave (validateRegisterForm) — guard นี้กัน type null และเป็น safety net
      if (!photo) {
        setPhotoError("กรุณาแนบรูปถ่ายตัวแทน");
        return;
      }
      setSubmitError(undefined);
      setRetryCtx(undefined);
      setSubmitting(true);
      let draft;
      try {
        draft = toRegistrationDraft(data, new Date().toISOString());
      } catch {
        setSubmitError("ข้อมูลโปรไฟล์ยาวเกินกำหนด กรุณาตรวจสอบ");
        setSubmitting(false);
        return;
      }
      const result = await submitNew({ draft, photo, kycPhoto: null, etag: view.etag });
      await handleOutcome(result);
    },
    [view, photo, handleOutcome],
  );

  const handleRetry = useCallback(async () => {
    if (!retryCtx) return;
    setSubmitError(undefined);
    setSubmitting(true);
    const result = await retrySubmit(retryCtx);
    await handleOutcome(result);
  }, [retryCtx, handleOutcome]);

  if (view.kind === "loading") {
    return <SubmitOverlay />;
  }
  if (view.kind === "wait") return <WaitView />;
  if (view.kind === "approved") return <ApprovedView />;

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="mb-6 text-xl font-bold text-foreground">การลงทะเบียนตัวแทน</h1>

        {view.rejectionReason && (
          <div className="mb-6 rounded-control border border-warning/24 bg-warning/8 px-4 py-3 text-sm text-warning-foreground">
            คำขอก่อนหน้าถูกปฏิเสธ: {view.rejectionReason} กรุณาแก้ไขข้อมูลแล้วส่งใหม่อีกครั้ง
          </div>
        )}

        {submitError && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-control border border-error/24 bg-error/8 px-4 py-3 text-sm text-error">
            <span>{submitError}</span>
            {retryCtx && (
              <button
                type="button"
                onClick={() => void handleRetry()}
                className="inline-flex h-8 items-center justify-center rounded-control bg-primary px-3 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                ลองใหม่
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 mmd:grid-cols-12">
          <div className="mmd:col-span-4">
            <div className="rounded-card bg-card px-6 pb-10 pt-20" style={cardStyle}>
              <AvatarUpload
                size={144}
                error={Boolean(photoError)}
                onFileSelect={(file) => {
                  setPhoto(file);
                  setPhotoError(undefined);
                }}
              />
              {photoError && <p className="mt-3 text-center text-xs text-error">{photoError}</p>}

              <Fieldset aria-label="รูปถ่ายตัวแทน" className="mt-10">
                <Field className="flex-row items-start justify-between gap-4">
                  <div>
                    <Label className="text-sm font-semibold">
                      รูปถ่ายตัวแทน + บัตรประชาชน <span className="text-error">*</span>
                    </Label>
                    <Description>แนบรูปถ่ายตัวแทนพร้อมกับบัตรประชาชนผ่านปุ่มอัปโหลดด้านบน</Description>
                  </div>
                </Field>
              </Fieldset>
            </div>
          </div>

          <div className="mmd:col-span-8">
            <MerchantUserEditFormCard
              key={view.etag ?? "new"}
              initialData={view.prefill}
              submitLabel={view.rejectionReason ? "ส่งใหม่อีกครั้ง" : "ลงทะเบียน"}
              showAcceptTerms
              brandAccent
              photo={{ value: photo, onError: setPhotoError }}
              onSave={handleSave}
            />
          </div>
        </div>
      </div>
      {submitting && <SubmitOverlay />}
    </PageShell>
  );
}
