// Client ของ canonical agent-registration plane (pol-core PR #268 feature/agent-canonical-flow-gaps).
// ทุก request same-origin ผ่าน Next rewrite (/api/:path* -> API) + credentials include
// (identity มาจาก cookie pol_registration_session ที่ API set ตอน callback).
//
// กติกา ETag (design §0.1): อ่านค่า header ETag มาทั้งก้อนแล้วส่งกลับเป็น If-Match ตรง ๆ ห้ามแกะ/ประกอบเอง.
// กติกา status (design §0.2): normalize attempt.status ที่ขอบ รับได้ทั้ง PascalCase และ UPPERCASE.

const BASE = "/api/v1/agent-registration";

export type AgentRegistrationStatus = "Draft" | "Pending" | "Approved" | "Rejected";
export type AgentRegistrationNextAction = "submit" | "wait" | "login";
export type AgentAttemptStatus = "Pending" | "Approved" | "Rejected";

export interface AgentRegistrationView {
  registrationId: string;
  merchantId: string;
  status: AgentRegistrationStatus;
  currentAttemptNo: number;
  currentAttemptId: string | null;
  rejectionReason: string | null;
  version: number;
  /** contract ใหม่ §0.3 — pol-core ที่ deploy อยู่บาง build ยังไม่คืน ต้องอ่านแบบ optional */
  saleCode?: string;
  email?: string;
  phoneNumber?: string;
  profile?: Record<string, unknown>;
  hasPhoto?: boolean;
  hasKycPhoto?: boolean;
}

export interface AgentRegistrationAttemptView {
  attemptId: string;
  attemptNo: number;
  /** normalize ที่ขอบเสมอ — main ยังส่ง UPPERCASE, working tree ส่ง PascalCase (§0.2) */
  status: AgentAttemptStatus;
  submittedAt: string;
  rejectionReason: string | null;
  version: number;
  decidedAt: string | null;
  hasPhoto?: boolean;
  hasKycPhoto?: boolean;
}

export interface AgentRegistrationCase {
  registration: AgentRegistrationView;
  nextAction: AgentRegistrationNextAction;
  currentAttempt: AgentRegistrationAttemptView | null;
  /** ค่าดิบจาก header ETag — ส่งกลับเป็น If-Match ทั้งก้อน ห้ามแกะ (§0.1) */
  etag: string | null;
}

export interface AgentRegistrationDraft {
  saleCode: string;
  email: string;
  phoneNumber: string;
  profile: Record<string, unknown>;
}

/** ผล fetch ที่ caller ต้อง branch เอง — ไม่ throw บน 4xx (status 0 = network error). */
export type AgentRegistrationResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; code: string | null; title: string | null };

/** normalize attempt.status รับได้ทั้ง "Pending"/"PENDING" -> PascalCase เดียว (§0.2). */
export function normalizeAttemptStatus(raw: string): AgentAttemptStatus {
  switch (raw.toUpperCase()) {
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    default:
      return "Pending";
  }
}

function normalizeAttempt(
  attempt: (AgentRegistrationAttemptView & { status: string }) | null,
): AgentRegistrationAttemptView | null {
  if (!attempt) return null;
  return { ...attempt, status: normalizeAttemptStatus(attempt.status) };
}

/** อ่าน ProblemDetails ({code?, title?}) เพื่อประกอบ error result; network/parse fail -> code/title = null. */
async function toErrorResult<T>(res: Response): Promise<AgentRegistrationResult<T>> {
  try {
    const body = (await res.json()) as { code?: string; title?: string };
    return { ok: false, status: res.status, code: body.code ?? null, title: body.title ?? null };
  } catch {
    return { ok: false, status: res.status, code: null, title: null };
  }
}

const networkError = (): AgentRegistrationResult<never> => ({
  ok: false,
  status: 0,
  code: "network",
  title: null,
});

function parseCase(body: {
  registration: AgentRegistrationView;
  nextAction: AgentRegistrationNextAction;
  currentAttempt: (AgentRegistrationAttemptView & { status: string }) | null;
}, res: Response): AgentRegistrationCase {
  return {
    registration: body.registration,
    nextAction: body.nextAction,
    currentAttempt: normalizeAttempt(body.currentAttempt),
    etag: res.headers.get("ETag"),
  };
}

/** GET /api/v1/agent-registration — 404 -> { ok:true, value:null } (ยังไม่มี case = ฟอร์มเปล่า). */
export async function getAgentRegistration(): Promise<
  AgentRegistrationResult<AgentRegistrationCase | null>
> {
  let res: Response;
  try {
    res = await fetch(BASE, { credentials: "include", cache: "no-store" });
  } catch {
    return networkError();
  }
  if (res.status === 404) return { ok: true, value: null };
  if (res.status === 200) return { ok: true, value: parseCase(await res.json(), res) };
  return toErrorResult(res);
}

/** PUT draft — etag=null ในการบันทึกครั้งแรก (ไม่ส่ง If-Match). */
export async function saveAgentRegistrationDraft(
  draft: AgentRegistrationDraft,
  etag: string | null,
): Promise<AgentRegistrationResult<AgentRegistrationCase>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (etag !== null) headers["If-Match"] = etag;
  let res: Response;
  try {
    res = await fetch(BASE, {
      method: "PUT",
      credentials: "include",
      headers,
      body: JSON.stringify(draft),
    });
  } catch {
    return networkError();
  }
  if (res.status === 200) return { ok: true, value: parseCase(await res.json(), res) };
  return toErrorResult(res);
}

/**
 * PUT /photos multipart — photo บังคับ, kycPhoto เมื่อมี. ห้าม set Content-Type เอง (ให้ browser ใส่ boundary).
 * contract ล่าสุด: photos ดัน version และคืน ETag ใหม่เสมอ (§หมายเหตุ orchestrator).
 */
export async function uploadAgentRegistrationPhotos(
  photo: File,
  kycPhoto: File | null,
): Promise<AgentRegistrationResult<{ etag: string | null }>> {
  const fd = new FormData();
  fd.append("photo", photo);
  if (kycPhoto) fd.append("kycPhoto", kycPhoto);
  let res: Response;
  try {
    res = await fetch(`${BASE}/photos`, { method: "PUT", credentials: "include", body: fd });
  } catch {
    return networkError();
  }
  if (res.status === 200) return { ok: true, value: { etag: res.headers.get("ETag") } };
  return toErrorResult(res);
}

/** POST /submissions — If-Match + Idempotency-Key บังคับทั้งคู่, body {}. */
export async function submitAgentRegistration(
  etag: string,
  idempotencyKey: string,
): Promise<
  AgentRegistrationResult<{
    registration: AgentRegistrationView;
    attempt: AgentRegistrationAttemptView;
    replayed: boolean;
    etag: string | null;
  }>
> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/submissions`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "If-Match": etag,
        "Idempotency-Key": idempotencyKey,
      },
      body: "{}",
    });
  } catch {
    return networkError();
  }
  if (res.status === 201) {
    const body = (await res.json()) as {
      registration: AgentRegistrationView;
      attempt: AgentRegistrationAttemptView & { status: string };
      replayed: boolean;
    };
    return {
      ok: true,
      value: {
        registration: body.registration,
        attempt: { ...body.attempt, status: normalizeAttemptStatus(body.attempt.status) },
        replayed: body.replayed,
        etag: res.headers.get("ETag"),
      },
    };
  }
  return toErrorResult(res);
}

// --- pure decision (design §3, §5.4) — แยกจาก component เพื่อทดสอบ branch จริงได้ ---

export type RegistrationUiState =
  | { kind: "form" } // 404 ฟอร์มเปล่า
  | { kind: "form-prefill"; rejected: boolean } // nextAction submit
  | { kind: "wait" } // nextAction wait หรือหลัง 201
  | { kind: "approved" } // nextAction login
  | { kind: "expired" }; // 401

/** map GET case -> UI state (§3). null = 404. unknown nextAction -> wait (default arm ของ pol-core). */
export function resolveRegistrationUiState(
  caseData: AgentRegistrationCase | null,
): RegistrationUiState {
  if (!caseData) return { kind: "form" };
  switch (caseData.nextAction) {
    case "submit":
      return { kind: "form-prefill", rejected: caseData.registration.rejectionReason !== null };
    case "login":
      return { kind: "approved" };
    case "wait":
    default:
      return { kind: "wait" };
  }
}

export type RegisterField = "photo" | "producerCode" | "form";

/** action ที่ได้จากการ classify error ของ PUT/POST (§5.4). retry-* = sequencer จัดการ IO ต่อ. */
export type SubmitErrorAction =
  | { kind: "field"; field: RegisterField; message: string }
  | { kind: "redirect"; reason: string }
  | { kind: "reload" } // refetch GET แล้ว render ตาม nextAction
  | { kind: "retry-refetch" } // 409 state_conflict — refetch etag แล้วลองซ้ำ 1 ครั้ง
  | { kind: "retry-newkey" } // 409 idempotency_conflict — key ใหม่แล้วลองซ้ำ 1 ครั้ง
  | { kind: "error"; message: string };

const GENERIC_ERROR = "เกิดข้อผิดพลาด กรุณาลองใหม่";

/** ตารางตัดสินใจ §5.4 — pure, ครอบทุกแถวรวม 409 ที่ code เป็น null. */
export function classifySubmitError(
  status: number,
  code: string | null,
  title: string | null,
): SubmitErrorAction {
  if (status === 401) return { kind: "redirect", reason: "registration-session-expired" };
  if (status === 413)
    return { kind: "field", field: "photo", message: "ไฟล์รูปมีขนาดใหญ่เกิน 2 MB" };
  if (status === 400) {
    if (code === "photo_required")
      return { kind: "field", field: "photo", message: "กรุณาแนบรูปถ่ายตัวแทน" };
    if (code === "validation_failed")
      return { kind: "field", field: "form", message: title ?? "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบ" };
    // invalid_etag / invalid_idempotency_key = bug ฝั่ง client — ไม่ retry อัตโนมัติ
    return { kind: "error", message: GENERIC_ERROR };
  }
  if (status === 409) {
    switch (code) {
      case "state_conflict":
        return { kind: "retry-refetch" };
      case "registration_pending":
        return { kind: "reload" };
      case "account_already_approved":
        return { kind: "redirect", reason: "account-already-approved" };
      case "registration_sale_invalid":
        return { kind: "field", field: "producerCode", message: "ไม่พบรหัสตัวแทนนี้ในระบบ" };
      case "registration_merchant_mismatch":
        return { kind: "redirect", reason: "registration-merchant-mismatch" };
      case "idempotency_conflict":
        return { kind: "retry-newkey" };
      default: // 409 ที่ code เป็น null = fallback ของ pol-core เวอร์ชันก่อนแก้ (§0.4)
        return { kind: "reload" };
    }
  }
  return { kind: "error", message: GENERIC_ERROR }; // 5xx และอื่น ๆ
}

// --- submit sequencer (design §5.2, §5.3) ---

export interface SubmitContext {
  /** ETag ที่ใช้ยิง POST — network retry ยิงเฉพาะ POST ด้วยค่านี้ + key เดิม (§5.3). */
  etag: string;
  idempotencyKey: string;
}

export type SubmitOutcome =
  | { kind: "success" } // 201 -> WAIT
  | { kind: "reload" } // refetch GET แล้ว render ตาม nextAction
  | { kind: "field"; field: RegisterField; message: string }
  | { kind: "redirect"; reason: string }
  | { kind: "retryable" } // network error ตอน POST -> แสดงปุ่มลองใหม่ (retrySubmit)
  | { kind: "error"; message: string };

export interface SubmitResult {
  outcome: SubmitOutcome;
  /** มีค่าเมื่อ POST ถูกยิงแล้ว (สำเร็จหรือ network fail) — ให้ retrySubmit ใช้ต่อ. */
  ctx?: SubmitContext;
}

function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

function actionToOutcome(action: Exclude<SubmitErrorAction, { kind: "retry-refetch" } | { kind: "retry-newkey" }>): SubmitOutcome {
  return action;
}

interface SequenceOnceResult {
  ok: boolean;
  action?: SubmitErrorAction;
  ctx?: SubmitContext;
  outcome?: SubmitOutcome;
}

async function runSequenceOnce(
  draft: AgentRegistrationDraft,
  photo: File,
  kycPhoto: File | null,
  etag: string | null,
  key: string,
): Promise<SequenceOnceResult> {
  const drafted = await saveAgentRegistrationDraft(draft, etag);
  if (!drafted.ok) return { ok: false, action: classifySubmitError(drafted.status, drafted.code, drafted.title) };

  const photos = await uploadAgentRegistrationPhotos(photo, kycPhoto);
  if (!photos.ok) return { ok: false, action: classifySubmitError(photos.status, photos.code, photos.title) };
  const postEtag = photos.value.etag;
  if (postEtag === null) return { ok: false, action: { kind: "error", message: GENERIC_ERROR } };

  const submitted = await submitAgentRegistration(postEtag, key);
  const ctx: SubmitContext = { etag: postEtag, idempotencyKey: key };
  if (submitted.ok) return { ok: true, outcome: { kind: "success" }, ctx };
  // network error ตอน POST -> retryable (ยิงซ้ำเฉพาะ POST ด้วย etag+key เดิม, §5.3)
  if (submitted.status === 0) return { ok: false, outcome: { kind: "retryable" }, ctx };
  return { ok: false, action: classifySubmitError(submitted.status, submitted.code, submitted.title), ctx };
}

/**
 * ลำดับ PUT draft -> PUT photos -> POST submissions (§5.2) พร้อม retry-once ของ
 * state_conflict (refetch etag) และ idempotency_conflict (key ใหม่). key ใหม่ 1 ครั้งต่อ intent.
 */
export async function submitNew(params: {
  draft: AgentRegistrationDraft;
  photo: File;
  kycPhoto: File | null;
  etag: string | null;
}): Promise<SubmitResult> {
  let etag = params.etag;
  let key = newIdempotencyKey();
  let refetched = false;
  let rekeyed = false;

  // อย่างมาก 3 รอบ (initial + refetch + rekey) — retry แต่ละชนิดครั้งเดียว
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const result = await runSequenceOnce(params.draft, params.photo, params.kycPhoto, etag, key);
    if (result.ok) return { outcome: result.outcome!, ctx: result.ctx };
    if (result.outcome) return { outcome: result.outcome, ctx: result.ctx }; // retryable

    const action = result.action!;
    if (action.kind === "retry-refetch" && !refetched) {
      refetched = true;
      const fresh = await getAgentRegistration();
      if (!fresh.ok) {
        if (fresh.status === 401) return { outcome: { kind: "redirect", reason: "registration-session-expired" } };
        return { outcome: { kind: "reload" } };
      }
      if (!fresh.value) return { outcome: { kind: "reload" } };
      etag = fresh.value.etag;
      continue;
    }
    if (action.kind === "retry-newkey" && !rekeyed) {
      rekeyed = true;
      key = newIdempotencyKey();
      continue;
    }
    if (action.kind === "retry-refetch" || action.kind === "retry-newkey") {
      return { outcome: { kind: "reload" } }; // retry หมดโควตา -> reload
    }
    return { outcome: actionToOutcome(action) };
  }
  return { outcome: { kind: "reload" } };
}

/**
 * network retry ของ §5.3 — ยิงเฉพาะ POST ด้วย If-Match เดิมและ key เดิม (ห้ามย้อนไป PUT ใหม่:
 * ถ้า POST รอบแรกถึง server แล้ว case จะ Pending, PUT จะได้ 409 ทันที). replay -> 201 = สำเร็จ.
 */
export async function retrySubmit(ctx: SubmitContext): Promise<SubmitResult> {
  const submitted = await submitAgentRegistration(ctx.etag, ctx.idempotencyKey);
  if (submitted.ok) return { outcome: { kind: "success" }, ctx };
  if (submitted.status === 0) return { outcome: { kind: "retryable" }, ctx };
  const action = classifySubmitError(submitted.status, submitted.code, submitted.title);
  if (action.kind === "retry-refetch" || action.kind === "retry-newkey") return { outcome: { kind: "reload" }, ctx };
  return { outcome: actionToOutcome(action), ctx };
}
