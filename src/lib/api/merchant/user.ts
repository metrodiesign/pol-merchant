// Agent registration entry — full-page navigate เริ่ม OIDC challenge สายผู้สมัครใหม่.
// contract: pol-core PR #268 — GET /api/v1/auth/agents/login?returnTo=/register เด้งไป Entra แล้วกลับมาที่
// API callback ซึ่ง set cookie pol_registration_session + 302 /register (หรือ /login-error เมื่อ policy ไม่ผ่าน).
// เป็น top-level navigation ตรงไป API origin (redirect_uri ของ OIDC ต้องตรง host จริง — เหตุผลเดียวกับ admin/auth.ts).
const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "";
const AGENT_LOGIN_PATH = `${API_ORIGIN}/api/v1/auth/agents/login`;

// ผู้สมัครใหม่/Pending/Rejected -> API set registration cookie แล้ว 302 กลับ returnTo (/register).
const AGENT_DEFAULT_RETURN_TO = "/register";

/** เริ่ม flow ลงทะเบียนตัวแทน (OIDC challenge) ด้วย full-page navigate. */
export function merchantUserMicrosoftLogin(returnTo: string = AGENT_DEFAULT_RETURN_TO): void {
  window.location.href = `${AGENT_LOGIN_PATH}?returnTo=${encodeURIComponent(returnTo)}`;
}
