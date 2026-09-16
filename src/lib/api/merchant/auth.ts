import { createOAuthClient, withBearer } from "@/lib/auth/oauth-client";
import { createTokenStore } from "@/lib/auth/token-store";

// Agent (ตัวแทนที่อนุมัติแล้ว) auth client — OAuth authorization code + PKCE ผ่าน OpenIddict ของ pol-core
// (client_id pol-merchant, public, S256). ใช้ redirect_uri เดียวกับ admin (/auth/callback) แต่ token store /
// PKCE storage key / refresh lock แยกกัน เพื่อไม่ให้ session ของสอง client ทับกัน.
// contract: pol-core PR #268 (feature/agent-canonical-flow-gaps) — /oauth/authorize?client_id=pol-merchant,
// scope openid offline_access, session ตรวจด้วย GET /api/v1/me Bearer.

const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "";
const AGENT_END_SESSION_URL = `${API_ORIGIN}/api/v1/auth/agents/logout`;

/** token store ของ merchant (key แยกจาก admin pol_tokens). */
export const merchantTokenStore = createTokenStore("pol_merchant_tokens");

const merchantClient = createOAuthClient({
  clientId: "pol-merchant",
  apiOrigin: API_ORIGIN,
  callbackPath: "/auth/callback",
  scope: "openid offline_access",
  tokenStore: merchantTokenStore,
  pkceStorageKey: "pol_merchant_pkce",
  refreshLockName: "pol_merchant_refresh",
  // returnTo หลัง login ของตัวแทน -> /agent (landing ที่ตรวจ session ด้วย merchant token).
  // ห้ามใช้ "/" เพราะ "/" redirect ไป /dashboard (admin shell, guard อ่าน pol_tokens) -> ตัวแทนเด้ง /login.
  returnToAllowlist: ["/agent"],
  defaultReturnTo: "/agent",
  loginPath: "/login",
});

/** OAuth client object ของ merchant — ให้ callback resolver เลือก client จาก PKCE state ค้าง. */
export const merchantOAuthClient = merchantClient;

/** เริ่ม login ตัวแทนที่อนุมัติแล้วด้วย OAuth code + PKCE (full-page navigate ไป /oauth/authorize). */
export const beginAgentLogin = merchantClient.beginLogin;

/** เริ่มสมัครตัวแทนด้วย OAuth/PKCE เดิม แต่ให้ CIAM แสดง account chooser ทุกครั้ง. */
export function beginAgentRegistration(): Promise<void> {
  return merchantClient.beginLogin("/agent", { prompt: "select_account" });
}

/**
 * revoke platform session ก่อนล้าง merchant state แล้วไป Agent CIAM end-session endpoint.
 * 401 ต้อง refresh แล้ว retry; transient failure ต้องคง state ไว้ให้ผู้ใช้ retry.
 */
export async function logoutAgent(): Promise<void> {
  const pair = merchantTokenStore.getTokens();
  if (pair) {
    let response = await fetch(
      "/api/v1/auth/logout",
      withBearer({ method: "POST" }, pair.accessToken),
    );
    if (response.status === 401) {
      const fresh = await merchantClient.refreshTokens();
      if (fresh) {
        response = await fetch(
          "/api/v1/auth/logout",
          withBearer({ method: "POST" }, fresh.accessToken),
        );
      } else if (merchantTokenStore.getTokens()) {
        throw new Error("merchant-logout-failed");
      }
    }
    if (response.status !== 204 && merchantTokenStore.getTokens()) {
      throw new Error("merchant-logout-failed");
    }
  }

  merchantTokenStore.clearTokens();
  sessionStorage.removeItem("pol_merchant_pkce");
  window.location.href = AGENT_END_SESSION_URL;
}

/** fetch API ด้วย Bearer ของ merchant session (401 -> refresh -> retry). */
export const merchantFetch = merchantClient.authedFetch;

/** payload GET /api/v1/me (เฉพาะ field ที่ใช้ใน landing ตัวแทน). */
export interface AgentMe {
  accountId: string | null;
  email: string | null;
}

export type AgentSessionResult =
  | { status: "authed"; me: AgentMe }
  | { status: "anon" }
  | { status: "error" };

/** map ผล GET /api/v1/me -> สถานะ session ตัวแทน (pure, ทดสอบ branch ได้ตรง). */
export function agentResultFromMe(
  httpStatus: number,
  body: { accountId?: string | null; email?: string | null } | null,
): AgentSessionResult {
  if (httpStatus === 401) return { status: "anon" };
  if (httpStatus !== 200 || body === null) return { status: "error" };
  return { status: "authed", me: { accountId: body.accountId ?? null, email: body.email ?? null } };
}

/** ตรวจ session ตัวแทนด้วย merchant token: ไม่มี token = anon ทันที; ไม่เด้ง 401 เอง ให้ landing ตัดสิน. */
export async function getAgentSession(): Promise<AgentSessionResult> {
  if (!merchantTokenStore.getTokens()) return { status: "anon" };
  try {
    const res = await merchantFetch("/api/v1/me", { redirectOnUnauthorized: false });
    const body = res.status === 200 ? ((await res.json()) as AgentMe) : null;
    return agentResultFromMe(res.status, body);
  } catch {
    return { status: "error" };
  }
}
