# e2e canonical agent-registration flow — run 2026-09-15

รันโดย agent (Claude) ขับ browser ผ่าน chrome-devtools MCP; Microsoft login ทำโดย user (interactive)

## Snapshot ที่ใช้ตรวจ

| Component | Detail |
|---|---|
| pol-core API | PID 84354 @ `pol-core/src/Api`, branch `feature/agent-canonical-flow-gaps` HEAD `b00a472b`, bin build ใหม่กว่า HEAD (rebuild หลัง checkout), listen `https://localhost:5001` |
| pol-merchant | PID 86680 @ `pol-merchant` branch `develop` HEAD `872e795`, listen `https://localhost:3002` |
| pol-admin (reviewer UI) | PID 56904 @ `pol-admin`, listen `:3001` |
| test data | merchant `demo` (merchantId `e1000000-0000-4000-8000-000000000001`), saleCode `10100` (prefill จาก identity) |
| test photo | 1x1 PNG 71B |
| registrationId | `01a0a473-de16-7026-9c08-62ced72d3877` |
| attemptId (#1) | `01a0a524-357f-71f0-914d-197dbba231de` |

## ผลรายขั้น

### ขั้น 1 — login Microsoft (agent CIAM) -> /register
PASS. คลิก "ลงทะเบียนด้วย Microsoft" -> 302 Entra CIAM tenant `viriyahexternal` (`1aee3cad...`) client `fb0e40a7...` -> user login -> callback set cookie `pol_registration_session` -> เด้ง `/register`

### ขั้น 2 — GET /api/v1/agent-registration
PASS. `GET` -> **200** ETag `"v6"`; status `Draft`, version 6, nextAction `submit`, saleCode `10100`, hasPhoto true, hasKycPhoto false. (มี Draft ค้างจาก partial run ก่อนหน้า — จึง 200 ไม่ใช่ 404)

### ขั้น 3 — PUT /api/v1/agent-registration (draft)
PASS. req If-Match `"v6"`, body `{saleCode, email, phoneNumber, profile{schemaVersion:1, firstName, lastName, personType:Individual, idNumber, licenseNumber:null, acceptedTermsAt}}` -> **200** ETag `"v7"`, version 7, nextAction submit. `Access-Control-Expose-Headers: ETag,Location` ครบ

### ขั้น 4 — PUT /api/v1/agent-registration/photos
PASS. multipart `photo` (image/png) -> **200** ETag `"v8"`, version 8. ยืนยัน photos ดัน version + คืน ETag ใหม่ตาม contract

### ขั้น 5 — POST /api/v1/agent-registration/submissions
PASS. req If-Match `"v8"` + Idempotency-Key `f84e73bf-6d99-4df4-b9a0-5df476da0756`, body `{}` -> **201** ETag `"v9"`, Location `/api/v1/agent-registration/history/01a0a524-357f-71f0-914d-197dbba231de`; registration.status `Pending`, currentAttemptNo 1, attempt.status `Pending`, replayed false

### ขั้น 6 — reviewer approve
PASS (มี workaround). endpoint จริง: `POST /api/v1/agent-registrations/{registrationId}/attempts/{attemptId}/approve` (กลุ่ม `/agent-registrations` plural, `.RequireAuthorization("admin")`, perm `MerchantUserApprove`, If-Match + Idempotency บังคับ). auth = Bearer token ของ pol-admin (workforce Microsoft, tenant `05ab044e`) เก็บใน localStorage `pol_tokens` (ไม่มี CSRF). รันผ่าน evaluate_script บน pol-admin :3001 (token ไม่ออกจาก browser)

- req: If-Match `"v9"` + Idempotency-Key + body `{contactEvidenceReference:"e2e-2026-09-15"}` -> **200** ETag `"v10"`, registration.status **Approved**, attempt.status Approved, decidedAt `2026-09-15T13:01:08Z`, replayed false

**FINDING (pol-core ต้องแก้) — reviewer GET ไม่คืน ETag:** `GetReviewerCase` (`GET /api/v1/agent-registrations/{id}`) `Results.Ok(ToView(...))` ไม่เรียก `VersionEtags.Set` -> response **ไม่มี header ETag** (verify: `g.headers.get("ETag")===null` ขณะ same-origin proxy). แต่ `Approve`/`Reject` บังคับ `VersionEtags.Require` (If-Match). ผล: reviewer client ไม่มีทางได้ ETag ตาม contract; ครั้งแรกส่ง If-Match null -> **400 `invalid_etag`**. workaround: ประกอบ `"v"+body.version` เอง (ขัดกติกา §0.1 ห้ามประกอบ ETag). แก้: เพิ่ม `VersionEtags.Set(http, registration.Version)` ใน `GetReviewerCase` (และ `ListReviewerAttempts`/`ListReviewerCases` ตามที่ client ต้องใช้) ที่ `src/Api/Api/Accounts/AgentRegistrationEndpoints.cs`

หลัง approve — applicant GET (reload หน้า register) -> **200** ETag `"v10"`, status `Approved`, nextAction **`login`**, currentAttempt.status Approved decidedAt ตรงกับขั้น 6. UI แสดง "บัญชีได้รับการอนุมัติแล้ว" + ปุ่ม "เข้าสู่ระบบ" ถูกต้อง

### ขั้น 7 — re-login (agent) หลัง approve -> token ผ่าน client pol-merchant
PARTIAL. OAuth token flow ผ่านครบ; UI landing มี bug

- คลิก "เข้าสู่ระบบ" -> `/oauth/authorize?client_id=pol-merchant` PKCE (SSO silent ไม่ถาม Microsoft ซ้ำ) -> `/auth/callback?code=...&state=...&iss=https://localhost:5001` -> แลก `POST /oauth/token` สำเร็จ: `pol_merchant_tokens {accessToken, refreshToken, expiresAt}` ถูกเก็บใน localStorage
- ยืนยัน token ใช้ได้จริง: `GET /api/v1/me` + `Authorization: Bearer <accessToken>` -> **200**, email `metrodiesign@gmail.com` (agent authenticate ผ่าน client pol-merchant สำเร็จ)
- **FINDING (pol-merchant) — landing bounce:** redirect chain `/auth/callback -> /dashboard (200) -> /login (200)`; ตัวแทน approved ที่ login แล้วถูกเด้งกลับ `/login` แทนหน้าใช้งาน. ตรงกับ known bug ใน memory: route guard อ่าน token store ของ admin (`pol_tokens`) ไม่ใช่ `pol_merchant_tokens` -> guard เห็นเป็น unauthenticated. token ระดับ API ใช้ได้ (me 200) แต่ SPA guard ไม่รับ. แก้ฝั่ง pol-merchant (guard/route protection ให้ตรวจ `pol_merchant_tokens`)

## สรุป

| ขั้น | ผล |
|---|---|
| 1 login Microsoft (agent CIAM) -> /register | PASS |
| 2 GET agent-registration | PASS (200, ETag v6) |
| 3 PUT draft | PASS (200, v6->v7, If-Match) |
| 4 PUT photos | PASS (200, v7->v8) |
| 5 POST submissions | PASS (201, Pending, If-Match+Idempotency) |
| 6 reviewer approve | PASS with workaround (200, Approved) + FINDING reviewer GET ไม่คืน ETag (pol-core) |
| 7 re-login -> token | PARTIAL: token+me 200 ผ่าน; landing เด้ง /login (pol-merchant guard bug) |

### Re-verify finding #1 (หลัง pol-core fix + restart API)
CLOSED. API restart เป็น PID 53702 HEAD `b1ea2ed7` "fix(registration): return the case ETag from the reviewer read"
- `GET /api/v1/agent-registrations/{id}` (workforce Bearer) -> **200 ETag `"v10"`** (ก่อน fix = null). fix ทำงาน
- approve ด้วย If-Match `"v10"` (จาก reviewer GET ตรง ๆ ไม่ประกอบเอง) -> **409 `decision_already_recorded`** = If-Match parse ผ่าน (ไม่ใช่ 400 `invalid_etag` แล้ว), 409 ถูกต้องเพราะ registration นี้ Approved ไปแล้ว. reviewer flow ใช้ ETag ตาม contract ได้ครบ
- หมายเหตุ: API restart ล้าง token/refresh (ทั้ง workforce Bearer และ agent registration session) ต้อง re-login; green approve 200 สด ๆ ต้องมี Pending attempt ใหม่ (agent login + submit รอบใหม่) — ไม่จำเป็นเพราะ fix พิสูจน์แล้ว

### Fix finding #2 (pol-merchant guard bounce) — CLOSED
branch `fix/agent-landing-after-login`. root cause: agent login (client pol-merchant) redirect ไป `returnTo="/"` -> `/` redirect ไป `/dashboard` (admin shell) -> `AuthGuard`/`AuthProvider` ใช้ admin `getMe()` อ่าน `pol_tokens` -> agent ไม่มี admin token -> anon -> เด้ง /login

fix (smallest correct — ไม่แตะ AuthProvider/AuthGuard):
- route ใหม่ `src/app/agent/page.tsx` — merchant-authed landing ตรวจ session ด้วย `getAgentSession()` (merchant token `pol_merchant_tokens` + merchantFetch `/api/v1/me`), anon -> /login, authed -> แสดง email. mark `// ponytail: placeholder จนกว่าจะมี agent dashboard (B7)`
- `src/lib/api/merchant/auth.ts` — `returnToAllowlist`/`defaultReturnTo` -> `/agent`; เพิ่ม `agentResultFromMe` (pure) + `getAgentSession`
- test `src/lib/api/merchant/auth.test.ts` 5 เคส (200/200-missing/401/parse-fail/5xx) PASS; typecheck + lint clean

verify (browser, agent re-login SSO silent): callback -> **`/agent`** (ไม่ใช่ /login แล้ว), หน้าแสดง "บัญชีตัวแทน" + "เข้าสู่ระบบสำเร็จ (metrodiesign@gmail.com)", GET /api/v1/me -> **200**

### Fresh green approve (200) — BLOCKED
registration `01a0a473` (account metrodiesign@gmail.com) status Approved แล้ว -> สร้าง Pending attempt ใหม่ไม่ได้ (submit ซ้ำ = 409 account_already_approved). ต้องใช้ agent Microsoft account อื่น หรือ reset case ใน DB local ก่อน. #1 closure ยืนหลักฐาน 409 `decision_already_recorded` (If-Match parse ผ่าน) เพียงพอแล้ว

### Fresh full e2e — ALL GREEN (หลัง pol-core reset DB + fix #1 + fix #2)
รันสดครบ 7 ขั้น ไม่มี workaround/409. registration ใหม่ `01a0a549-9f87-7376-bed6-4e95bc44b503` attempt `01a0a549-9fe2-70ca-9fbf-08c192611651`

| ขั้น | req -> resp |
|---|---|
| 1 agent login (SSO silent) | -> cookie `pol_registration_session` -> /register |
| 2 GET agent-registration | **404** (fresh หลัง reset) -> ฟอร์มเปล่า |
| 3 PUT draft (ครั้งแรก ไม่มี If-Match) | -> **200** ETag `"v2"` |
| 4 PUT photos | -> **200** |
| 5 POST submissions | If-Match `"v2"` + Idempotency -> **201** Pending ETag `"v3"` |
| 6 reviewer GET + approve | GET -> 200 **ETag `"v3"` (จาก reviewer read, fix b1ea2ed7)**; approve If-Match `"v3"` ตรง ๆ -> **200 Approved** ETag `"v4"` decidedAt set, replayed false (ไม่ใช่ 409/invalid_etag) |
| 7 agent re-login | -> landing **`/agent`** (fix #2), "เข้าสู่ระบบสำเร็จ (metrodiesign@gmail.com)", GET /me **200** |

สรุป: ทั้ง 7 ขั้น GREEN, finding #1 + #2 ปิดครบด้วยหลักฐานรันจริง

### สิ่งที่ต้องแก้
1. pol-core: `GetReviewerCase` (+ list endpoints) ต้อง `VersionEtags.Set` เพื่อ reviewer ได้ ETag สำหรับ If-Match ของ approve/reject; มิฉะนั้น approve ครั้งแรก = 400 `invalid_etag`
2. pol-merchant: route guard หลัง login ตัวแทน ให้ตรวจ `pol_merchant_tokens` (ไม่ใช่ admin `pol_tokens`) ไม่งั้นตัวแทน approved เด้งกลับ /login
3. reviewer flow ไม่มี UI ใน pol-admin (ทำ approve ผ่าน API ตรง) — ถ้าต้องการให้ human review ต้องเพิ่มหน้า review agent-registration

## PR / CI
- pol-merchant PR #14: MERGED เข้า develop, CI เขียว (guards+spec-trace, Admin app+packages), PR base guard SKIPPED
- pol-core PR #268: OPEN, CI เขียวครบ (guards, dotnet build+test, docker, integration live SQL), รอ user merge
