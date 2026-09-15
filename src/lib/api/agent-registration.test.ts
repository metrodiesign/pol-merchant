import { afterEach, describe, expect, it, vi } from "vitest";

import {
  classifySubmitError,
  getAgentRegistration,
  normalizeAttemptStatus,
  resolveRegistrationUiState,
  retrySubmit,
  saveAgentRegistrationDraft,
  submitAgentRegistration,
  submitNew,
  uploadAgentRegistrationPhotos,
  type AgentRegistrationCase,
  type AgentRegistrationDraft,
  type AgentRegistrationView,
} from "./agent-registration";

type Handler = (url: string, init: RequestInit) => Response;

function stubFetch(routes: Record<string, Handler>) {
  const mock = vi.fn(async (url: string, init: RequestInit = {}) => {
    const key = `${init.method ?? "GET"} ${url}`;
    const handler = routes[key];
    if (!handler) throw new Error(`no stub for ${key}`);
    return handler(url, init);
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

const withEtag = (body: unknown, etag: string, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ETag: etag } });

const problem = (status: number, code: string | null, title: string | null = null) =>
  new Response(JSON.stringify({ code, title }), { status });

const draft: AgentRegistrationDraft = {
  saleCode: "DEMO-SALE-1",
  email: "s@example.com",
  phoneNumber: "0812345678",
  profile: { schemaVersion: 1, firstName: "a", lastName: "b" },
};

const photo = new File(["x"], "photo.jpg", { type: "image/jpeg" });

const registration: AgentRegistrationView = {
  registrationId: "r1",
  merchantId: "m1",
  status: "Draft",
  currentAttemptNo: 0,
  currentAttemptId: null,
  rejectionReason: null,
  version: 1,
};

afterEach(() => vi.unstubAllGlobals());

describe("normalizeAttemptStatus", () => {
  it("รับได้ทั้ง PascalCase และ UPPERCASE -> PascalCase เดียว", () => {
    expect(normalizeAttemptStatus("Pending")).toBe("Pending");
    expect(normalizeAttemptStatus("PENDING")).toBe("Pending");
    expect(normalizeAttemptStatus("APPROVED")).toBe("Approved");
    expect(normalizeAttemptStatus("Rejected")).toBe("Rejected");
  });
});

describe("getAgentRegistration", () => {
  it("404 -> { ok:true, value:null } (ฟอร์มเปล่า ไม่ใช่ error)", async () => {
    stubFetch({ "GET /api/v1/agent-registration": () => new Response(null, { status: 404 }) });
    await expect(getAgentRegistration()).resolves.toEqual({ ok: true, value: null });
  });

  it("200 -> อ่าน ETag ทั้งก้อน + normalize attempt.status + no-store/credentials", async () => {
    const mock = stubFetch({
      "GET /api/v1/agent-registration": () =>
        withEtag(
          {
            registration,
            nextAction: "submit",
            currentAttempt: { attemptId: "a1", attemptNo: 1, status: "PENDING", submittedAt: "t", rejectionReason: null, version: 1, decidedAt: null },
          },
          '"v3"',
        ),
    });
    const res = await getAgentRegistration();
    expect(res.ok).toBe(true);
    if (!res.ok || !res.value) throw new Error("expected case");
    expect(res.value.etag).toBe('"v3"');
    expect(res.value.currentAttempt?.status).toBe("Pending");
    const init = mock.mock.calls[0]![1] as RequestInit;
    expect(init.cache).toBe("no-store");
    expect(init.credentials).toBe("include");
  });

  it("401 -> { ok:false, status:401 }", async () => {
    stubFetch({ "GET /api/v1/agent-registration": () => new Response(null, { status: 401 }) });
    const res = await getAgentRegistration();
    expect(res).toMatchObject({ ok: false, status: 401 });
  });
});

describe("saveAgentRegistrationDraft — If-Match", () => {
  it("ไม่ส่ง If-Match เมื่อ etag === null (บันทึกครั้งแรก)", async () => {
    const mock = stubFetch({
      "PUT /api/v1/agent-registration": () => withEtag({ registration, nextAction: "submit", currentAttempt: null }, '"v1"'),
    });
    await saveAgentRegistrationDraft(draft, null);
    const init = mock.mock.calls[0]![1] as RequestInit;
    expect(new Headers(init.headers).has("If-Match")).toBe(false);
  });

  it("ส่ง If-Match = etag ที่ถืออยู่แบบ byte ต่อ byte", async () => {
    const mock = stubFetch({
      "PUT /api/v1/agent-registration": () => withEtag({ registration, nextAction: "submit", currentAttempt: null }, '"v2"'),
    });
    await saveAgentRegistrationDraft(draft, '"v1"');
    const init = mock.mock.calls[0]![1] as RequestInit;
    expect(new Headers(init.headers).get("If-Match")).toBe('"v1"');
  });
});

describe("uploadAgentRegistrationPhotos", () => {
  it("multipart มี photo เสมอ, kycPhoto เฉพาะเมื่อส่ง, ไม่ตั้ง Content-Type เอง", async () => {
    const mock = stubFetch({
      "PUT /api/v1/agent-registration/photos": () => withEtag({}, '"v2"'),
    });
    await uploadAgentRegistrationPhotos(photo, null);
    const init = mock.mock.calls[0]![1] as RequestInit;
    const fd = init.body as FormData;
    expect(fd.get("photo")).toBeInstanceOf(File);
    expect(fd.has("kycPhoto")).toBe(false);
    expect(new Headers(init.headers).has("Content-Type")).toBe(false);

    const kyc = new File(["y"], "kyc.jpg", { type: "image/jpeg" });
    await uploadAgentRegistrationPhotos(photo, kyc);
    const init2 = mock.mock.calls[1]![1] as RequestInit;
    expect((init2.body as FormData).get("kycPhoto")).toBeInstanceOf(File);
  });

  it("คืน etag จาก header", async () => {
    stubFetch({ "PUT /api/v1/agent-registration/photos": () => withEtag({}, '"v9"') });
    await expect(uploadAgentRegistrationPhotos(photo, null)).resolves.toEqual({ ok: true, value: { etag: '"v9"' } });
  });
});

describe("submitAgentRegistration", () => {
  it("ส่งทั้ง If-Match และ Idempotency-Key เสมอ", async () => {
    const mock = stubFetch({
      "POST /api/v1/agent-registration/submissions": () =>
        withEtag(
          { registration, attempt: { attemptId: "a1", attemptNo: 1, status: "PENDING", submittedAt: "t", rejectionReason: null, version: 1, decidedAt: null }, replayed: false },
          '"v3"',
          201,
        ),
    });
    await submitAgentRegistration('"v2"', "key-1");
    const init = mock.mock.calls[0]![1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get("If-Match")).toBe('"v2"');
    expect(headers.get("Idempotency-Key")).toBe("key-1");
    expect(init.body).toBe("{}");
  });

  it("201 -> normalize attempt.status", async () => {
    stubFetch({
      "POST /api/v1/agent-registration/submissions": () =>
        withEtag(
          { registration, attempt: { attemptId: "a1", attemptNo: 1, status: "PENDING", submittedAt: "t", rejectionReason: null, version: 1, decidedAt: null }, replayed: false },
          '"v3"',
          201,
        ),
    });
    const res = await submitAgentRegistration('"v2"', "key-1");
    if (!res.ok) throw new Error("expected ok");
    expect(res.value.attempt.status).toBe("Pending");
  });
});

describe("classifySubmitError — ตาราง §5.4 ทุกแถว", () => {
  it.each([
    [401, null, { kind: "redirect", reason: "registration-session-expired" }],
    [413, null, { kind: "field", field: "photo" }],
    [400, "photo_required", { kind: "field", field: "photo" }],
    [400, "validation_failed", { kind: "field", field: "form" }],
    [400, "invalid_etag", { kind: "error" }],
    [400, "invalid_idempotency_key", { kind: "error" }],
    [409, "state_conflict", { kind: "retry-refetch" }],
    [409, "registration_pending", { kind: "reload" }],
    [409, "account_already_approved", { kind: "redirect", reason: "account-already-approved" }],
    [409, "registration_sale_invalid", { kind: "field", field: "producerCode" }],
    [409, "registration_merchant_mismatch", { kind: "redirect", reason: "registration-merchant-mismatch" }],
    [409, "idempotency_conflict", { kind: "retry-newkey" }],
    [409, null, { kind: "reload" }],
    [500, null, { kind: "error" }],
  ] as const)("status %s code %s", (status, code, expected) => {
    expect(classifySubmitError(status, code, null)).toMatchObject(expected);
  });

  it("validation_failed ใช้ title เป็นข้อความเมื่อมี", () => {
    expect(classifySubmitError(400, "validation_failed", "idNumber ไม่ถูกต้อง")).toMatchObject({
      kind: "field",
      field: "form",
      message: "idNumber ไม่ถูกต้อง",
    });
  });
});

describe("resolveRegistrationUiState — 5 เคสจาก GET", () => {
  const caseOf = (nextAction: string, rejectionReason: string | null = null): AgentRegistrationCase => ({
    registration: { ...registration, rejectionReason },
    nextAction: nextAction as AgentRegistrationCase["nextAction"],
    currentAttempt: null,
    etag: '"v1"',
  });

  it("404 (null) -> form", () => expect(resolveRegistrationUiState(null)).toEqual({ kind: "form" }));
  it("submit ไม่มี rejection -> form-prefill rejected:false", () =>
    expect(resolveRegistrationUiState(caseOf("submit"))).toEqual({ kind: "form-prefill", rejected: false }));
  it("submit + rejectionReason -> form-prefill rejected:true", () =>
    expect(resolveRegistrationUiState(caseOf("submit", "รูปไม่ชัด"))).toEqual({ kind: "form-prefill", rejected: true }));
  it("wait -> wait", () => expect(resolveRegistrationUiState(caseOf("wait"))).toEqual({ kind: "wait" }));
  it("login -> approved", () => expect(resolveRegistrationUiState(caseOf("login"))).toEqual({ kind: "approved" }));
  it("nextAction ไม่รู้จัก -> wait (default arm)", () =>
    expect(resolveRegistrationUiState(caseOf("weird"))).toEqual({ kind: "wait" }));
});

describe("submitNew — ลำดับและ Idempotency-Key", () => {
  function happyRoutes() {
    return {
      "PUT /api/v1/agent-registration": () => withEtag({ registration, nextAction: "submit", currentAttempt: null }, '"v1"'),
      "PUT /api/v1/agent-registration/photos": () => withEtag({}, '"v2"'),
      "POST /api/v1/agent-registration/submissions": () =>
        withEtag({ registration, attempt: { attemptId: "a1", attemptNo: 1, status: "Pending", submittedAt: "t", rejectionReason: null, version: 1, decidedAt: null }, replayed: false }, '"v3"', 201),
    };
  }

  it("ลำดับ PUT draft -> PUT photos -> POST และ If-Match ของ POST = ETag จาก photos", async () => {
    const mock = stubFetch(happyRoutes());
    const res = await submitNew({ draft, photo, kycPhoto: null, etag: null });
    expect(res.outcome).toEqual({ kind: "success" });
    const paths = mock.mock.calls.map(([url, init]) => `${(init as RequestInit).method ?? "GET"} ${url}`);
    expect(paths).toEqual([
      "PUT /api/v1/agent-registration",
      "PUT /api/v1/agent-registration/photos",
      "POST /api/v1/agent-registration/submissions",
    ]);
    const postInit = mock.mock.calls[2]![1] as RequestInit;
    expect(new Headers(postInit.headers).get("If-Match")).toBe('"v2"'); // จาก photos ไม่ใช่ draft v1
  });

  it("retrySubmit ใช้ Idempotency-Key เดิม; submitNew ใหม่ได้ key ใหม่ (§5.3)", async () => {
    const mock = stubFetch(happyRoutes());
    const first = await submitNew({ draft, photo, kycPhoto: null, etag: null });
    const firstKey = new Headers((mock.mock.calls[2]![1] as RequestInit).headers).get("Idempotency-Key");
    expect(first.ctx?.idempotencyKey).toBe(firstKey);

    await retrySubmit(first.ctx!);
    const retryKey = new Headers((mock.mock.calls[3]![1] as RequestInit).headers).get("Idempotency-Key");
    expect(retryKey).toBe(firstKey); // retry = key เดิม

    await submitNew({ draft, photo, kycPhoto: null, etag: null });
    const secondKey = new Headers((mock.mock.calls[6]![1] as RequestInit).headers).get("Idempotency-Key");
    expect(secondKey).not.toBe(firstKey); // intent ใหม่ = key ใหม่
  });

  it("state_conflict -> refetch GET เอา etag ใหม่ แล้วลองลำดับซ้ำ 1 ครั้ง (สำเร็จ)", async () => {
    let postCount = 0;
    const mock = stubFetch({
      "GET /api/v1/agent-registration": () => withEtag({ registration, nextAction: "submit", currentAttempt: null }, '"v5"'),
      "PUT /api/v1/agent-registration": () => withEtag({ registration, nextAction: "submit", currentAttempt: null }, '"v1"'),
      "PUT /api/v1/agent-registration/photos": () => withEtag({}, '"v2"'),
      "POST /api/v1/agent-registration/submissions": () => {
        postCount += 1;
        if (postCount === 1) return problem(409, "state_conflict");
        return withEtag({ registration, attempt: { attemptId: "a1", attemptNo: 1, status: "Pending", submittedAt: "t", rejectionReason: null, version: 1, decidedAt: null }, replayed: false }, '"v6"', 201);
      },
    });
    const res = await submitNew({ draft, photo, kycPhoto: null, etag: '"v1"' });
    expect(res.outcome).toEqual({ kind: "success" });
    expect(mock.mock.calls.some(([url, init]) => url === "/api/v1/agent-registration" && (init as RequestInit).method === undefined)).toBe(true); // refetch GET เกิดขึ้น
  });

  it("idempotency_conflict -> key ใหม่แล้วลองซ้ำ 1 ครั้ง", async () => {
    let postCount = 0;
    const keys: (string | null)[] = [];
    stubFetch({
      "PUT /api/v1/agent-registration": () => withEtag({ registration, nextAction: "submit", currentAttempt: null }, '"v1"'),
      "PUT /api/v1/agent-registration/photos": () => withEtag({}, '"v2"'),
      "POST /api/v1/agent-registration/submissions": (_url, init) => {
        keys.push(new Headers(init.headers).get("Idempotency-Key"));
        postCount += 1;
        if (postCount === 1) return problem(409, "idempotency_conflict");
        return withEtag({ registration, attempt: { attemptId: "a1", attemptNo: 1, status: "Pending", submittedAt: "t", rejectionReason: null, version: 1, decidedAt: null }, replayed: false }, '"v6"', 201);
      },
    });
    const res = await submitNew({ draft, photo, kycPhoto: null, etag: null });
    expect(res.outcome).toEqual({ kind: "success" });
    expect(keys).toHaveLength(2);
    expect(keys[0]).not.toBe(keys[1]); // key ใหม่ในรอบสอง
  });

  it("network error ตอน POST -> retryable + ctx (ยิงซ้ำเฉพาะ POST)", async () => {
    stubFetch({
      "PUT /api/v1/agent-registration": () => withEtag({ registration, nextAction: "submit", currentAttempt: null }, '"v1"'),
      "PUT /api/v1/agent-registration/photos": () => withEtag({}, '"v2"'),
      "POST /api/v1/agent-registration/submissions": () => {
        throw new TypeError("offline");
      },
    });
    const res = await submitNew({ draft, photo, kycPhoto: null, etag: null });
    expect(res.outcome).toEqual({ kind: "retryable" });
    expect(res.ctx).toEqual({ etag: '"v2"', idempotencyKey: expect.any(String) });
  });

  it("validation_failed ที่ PUT draft -> field form (ไม่ยิง photos/POST ต่อ)", async () => {
    const mock = stubFetch({
      "PUT /api/v1/agent-registration": () => problem(400, "validation_failed", "idNumber ผิด"),
    });
    const res = await submitNew({ draft, photo, kycPhoto: null, etag: null });
    expect(res.outcome).toMatchObject({ kind: "field", field: "form", message: "idNumber ผิด" });
    expect(mock.mock.calls).toHaveLength(1); // หยุดที่ PUT draft
  });
});

describe("retrySubmit — POST only", () => {
  it("ยิงเฉพาะ POST /submissions ด้วย etag+key เดิม", async () => {
    const mock = stubFetch({
      "POST /api/v1/agent-registration/submissions": () =>
        withEtag({ registration, attempt: { attemptId: "a1", attemptNo: 1, status: "Pending", submittedAt: "t", rejectionReason: null, version: 1, decidedAt: null }, replayed: true }, '"v6"', 201),
    });
    const res = await retrySubmit({ etag: '"v2"', idempotencyKey: "key-1" });
    expect(res.outcome).toEqual({ kind: "success" });
    expect(mock.mock.calls).toHaveLength(1);
    const init = mock.mock.calls[0]![1] as RequestInit;
    expect(new Headers(init.headers).get("If-Match")).toBe('"v2"');
    expect(new Headers(init.headers).get("Idempotency-Key")).toBe("key-1");
  });
});
