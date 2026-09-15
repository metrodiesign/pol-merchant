import { createOAuthClient, toTokenPair, withBearer, type AuthedFetchOptions } from "@/lib/auth/oauth-client";
import { defaultTokenStore } from "@/lib/auth/token-store";
import type { AdminMe, AuthBootstrapResult, AuthStatus } from "@/types/auth";

// Employee auth client — OAuth authorization code + PKCE ผ่าน OpenIddict ของ pol-core (client_id pol-admin).
// SPA ถือ access token (15 นาที) + refresh token (หมุนทุกครั้ง) ใน localStorage (แชร์ทุกแท็บ, refresh ภายใต้ Web Lock); ไม่มี cookie/CSRF.
// contract: pol-core PR #261 (feature/employee-jwt-auth) — /oauth/authorize, /oauth/token, /api/v1/auth/logout, /api/v1/me*
//
// ตรรกะ OAuth/PKCE/refresh ถอดไปอยู่ที่ lib/auth/oauth-client.ts (แชร์กับ merchant client);
// ไฟล์นี้เป็น instantiation ของ pol-admin + ส่วนที่เฉพาะ admin (getMe/AdminMe).

const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "";

const adminClient = createOAuthClient({
  clientId: "pol-admin",
  apiOrigin: API_ORIGIN,
  callbackPath: "/auth/callback",
  scope: "openid offline_access",
  tokenStore: defaultTokenStore,
  pkceStorageKey: "pol_pkce",
  refreshLockName: "pol_refresh",
  // returnTo หลัง login สำเร็จ — clamp ฝั่ง FE กัน open-redirect-ish path ที่ไม่ใช่ landing ของแอป.
  returnToAllowlist: ["/", "/minimals", "/dashboard"],
  defaultReturnTo: "/dashboard",
  loginPath: "/login",
});

/** OAuth client object ของ admin — ให้ callback resolver เลือก client จาก PKCE state ค้าง. */
export const adminOAuthClient = adminClient;

// re-export ตรรกะที่ใช้ร่วม/pure helper — พฤติกรรมภายนอกคงเดิมทุกฟังก์ชัน
export { toTokenPair, withBearer };
export type { TokenResponse, AuthorizeParams } from "@/lib/auth/oauth-client";
export type AdminFetchOptions = AuthedFetchOptions;

export const clampReturnTo = adminClient.clampReturnTo;
export const buildAuthorizeUrl = adminClient.buildAuthorizeUrl;
export const beginLogin = adminClient.beginLogin;
export const completeLogin = adminClient.completeLogin;
export const refreshTokens = adminClient.refreshTokens;

/** fetch API ด้วย Bearer; 401 -> refresh 1 ครั้ง (single-flight) แล้ว retry; ยัง 401 -> ล้าง token (+เด้ง /login). */
export function adminFetch(path: string, opts: AdminFetchOptions = {}): Promise<Response> {
  return adminClient.authedFetch(path, opts);
}

/** payload GET /api/v1/me (เฉพาะ field ที่ใช้). */
interface MeResponse {
  accountId: string;
  displayName: string | null;
  email: string | null;
}

/** payload GET /api/v1/me/access (เฉพาะ field ที่ใช้). */
interface AccessResponse {
  hasPlatformAccess: boolean;
  permissions: string[];
}

/** ประกอบ AdminMe จาก /me + /me/access (permissions ใช้ vocabulary Iam Keys เดียวกับ stack เก่า). */
export function toAdminMe(me: MeResponse, access: AccessResponse): AdminMe {
  return {
    adminId: me.accountId,
    displayName: me.displayName,
    email: me.email ?? null,
    hasPlatformAccess: access.hasPlatformAccess,
    permissions: access.permissions,
  };
}

/** GET /api/v1/me + /api/v1/me/access — ไม่มี token = anon ทันที; แยก auth failure ออกจาก bootstrap/system failure. */
export async function getMe(): Promise<AuthBootstrapResult> {
  if (!defaultTokenStore.getTokens()) return { status: "anon", me: null };
  try {
    const [meRes, accessRes] = await Promise.all([
      adminFetch("/api/v1/me", { redirectOnUnauthorized: false }),
      adminFetch("/api/v1/me/access", { redirectOnUnauthorized: false }),
    ]);
    const status = meRes.status === 200 ? accessRes.status : meRes.status;
    if (status === 401) return { status: "anon", me: null };
    if (status === 403) return { status: "forbidden", me: null };
    if (status !== 200) return { status: "error", me: null };
    const [me, access] = (await Promise.all([meRes.json(), accessRes.json()])) as [MeResponse, AccessResponse];
    return { status: "authed", me: toAdminMe(me, access) };
  } catch {
    return { status: "error", me: null };
  }
}

export function shouldRedirectToLogin(status: AuthStatus): boolean {
  return status === "anon";
}

/** authenticated session ที่ไม่มี effective permission ต้องแสดง Inline 403 โดยไม่ mount protected child. */
export function shouldShowForbidden(status: AuthStatus, me: AdminMe | null): boolean {
  return status === "forbidden" || (status === "authed" && me !== null && me.permissions.length === 0);
}

/** 204 = logout สำเร็จ (revoke ทั้ง access/refresh), 401 = token ตายอยู่แล้ว (terminal logged-out). */
export function isLogoutSuccessStatus(status: number): boolean {
  return status === 204 || status === 401;
}

/** ออกจากระบบ POST /api/v1/auth/logout พร้อม Bearer แล้วล้าง token ฝั่ง SPA; ไม่มี token = logged-out อยู่แล้ว. */
export async function logout(): Promise<Response> {
  const pair = defaultTokenStore.getTokens();
  if (!pair) return new Response(null, { status: 401 });
  const response = await fetch("/api/v1/auth/logout", withBearer({ method: "POST" }, pair.accessToken));
  if (!isLogoutSuccessStatus(response.status)) throw new Error("admin-logout-failed");
  defaultTokenStore.clearTokens();
  return response;
}
