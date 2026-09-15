import { createOAuthClient } from "@/lib/auth/oauth-client";
import { createTokenStore } from "@/lib/auth/token-store";

// Agent (ตัวแทนที่อนุมัติแล้ว) auth client — OAuth authorization code + PKCE ผ่าน OpenIddict ของ pol-core
// (client_id pol-merchant, public, S256). ใช้ redirect_uri เดียวกับ admin (/auth/callback) แต่ token store /
// PKCE storage key / refresh lock แยกกัน เพื่อไม่ให้ session ของสอง client ทับกัน.
// contract: pol-core PR #268 (feature/agent-canonical-flow-gaps) — /oauth/authorize?client_id=pol-merchant,
// scope openid offline_access, session ตรวจด้วย GET /api/v1/me Bearer.

const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "";

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
  // returnTo หลัง login ของตัวแทน — assumption: ยังไม่มี dashboard ตัวแทน ใช้ "/" ไปก่อน (B7 ใน design §4.4/§7).
  returnToAllowlist: ["/"],
  defaultReturnTo: "/",
  loginPath: "/login",
});

/** OAuth client object ของ merchant — ให้ callback resolver เลือก client จาก PKCE state ค้าง. */
export const merchantOAuthClient = merchantClient;

/** เริ่ม login ตัวแทนที่อนุมัติแล้วด้วย OAuth code + PKCE (full-page navigate ไป /oauth/authorize). */
export const beginAgentLogin = merchantClient.beginLogin;

/** fetch API ด้วย Bearer ของ merchant session (401 -> refresh -> retry). */
export const merchantFetch = merchantClient.authedFetch;
