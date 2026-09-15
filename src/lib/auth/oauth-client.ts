import { codeChallengeOf, randomToken } from "@/lib/auth/pkce";
import {
  withCrossTabLock,
  type TokenPair,
  type TokenStore,
} from "@/lib/auth/token-store";

// Factory ของ OAuth authorization code + PKCE client ผ่าน OpenIddict ของ pol-core.
// ถอดออกจาก lib/api/admin/auth.ts เพื่อให้สอง client (pol-admin, pol-merchant) แชร์ตรรกะ refresh
// และ cross-tab lock ชุดเดียว แต่มี token store / PKCE storage key / refresh lock แยกกัน.
//
// authorize เป็น top-level navigation ตรงไป API origin (callback ของ Entra ลงที่ API host) —
// ส่วน /oauth/token ยิงผ่าน Next rewrite (/oauth/token -> API) เหมือน /api/* ไม่ต้องตั้ง CORS.

/** refresh ล่วงหน้าเมื่อ access token เหลืออายุน้อยกว่านี้ (กัน request ตกขอบ expires_in). */
const REFRESH_SKEW_MS = 60_000;

export interface OAuthClientConfig {
  /** OpenIddict client_id (pol-admin / pol-merchant). */
  clientId: string;
  /** origin ของ API (NEXT_PUBLIC_API_ORIGIN) — authorize เป็น top-level navigate ตรงไป host นี้. */
  apiOrigin: string;
  /** path ของ callback ฝั่ง SPA (byte-match กับที่ลงทะเบียน) เช่น /auth/callback. */
  callbackPath: string;
  /** OAuth scope ที่ขอตอน authorize. */
  scope: string;
  /** token store ที่ผูก storage key ของ client นี้. */
  tokenStore: TokenStore;
  /** sessionStorage key ของ PKCE state ระหว่าง authorize -> callback. */
  pkceStorageKey: string;
  /** ชื่อ Web Lock กัน refresh ซ้ำข้ามแท็บ. */
  refreshLockName: string;
  /** returnTo ที่อนุญาตหลัง login (clamp กัน open-redirect-ish). */
  returnToAllowlist: readonly string[];
  /** returnTo เริ่มต้นเมื่อไม่ได้ระบุหรือถูก clamp ออก. */
  defaultReturnTo: string;
  /** path ที่เด้งไปเมื่อ 401 terminal (เช่น /login). */
  loginPath: string;
}

/** payload 200 ของ POST /oauth/token (OAuth มาตรฐาน; id_token ไม่ใช้). */
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export function toTokenPair(body: TokenResponse, now: number = Date.now()): TokenPair {
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt: now + body.expires_in * 1000,
  };
}

/** แนบ Authorization: Bearer ลง RequestInit (ไม่มี credentials/cookie). */
export function withBearer(opts: RequestInit, accessToken: string): RequestInit {
  const headers = new Headers(opts.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  return { ...opts, headers };
}

export interface AuthorizeParams {
  state: string;
  codeChallenge: string;
  redirectUri: string;
}

export type LoginCompletion =
  | { ok: true; returnTo: string }
  | { ok: false; reason: string };

export interface AuthedFetchOptions extends RequestInit {
  /** default true; false = ไม่เด้งไป login เมื่อเจอ 401 (ใช้โดย getMe ให้ guard เป็นคนตัดสิน). */
  redirectOnUnauthorized?: boolean;
}

/** state ที่เก็บระหว่าง authorize -> callback (sessionStorage). `client` ระบุว่าเป็นของ client ไหน. */
interface PkceState {
  verifier: string;
  state: string;
  returnTo: string;
  client?: string;
}

export interface OAuthClient {
  readonly clientId: string;
  clampReturnTo(returnTo: string): string;
  buildAuthorizeUrl(params: AuthorizeParams): string;
  beginLogin(returnTo?: string): Promise<void>;
  /**
   * ถ้ามี PKCE state ค้างของ client นี้ คืนค่า `client` ที่ประกาศไว้ใน state (fallback = clientId ของตัวเอง
   * เมื่อ state เก่าไม่มี field); ไม่มี state -> null. ให้ resolvePendingClient เลือก client จากค่านี้ (spec §4.4).
   */
  pendingClientId(): string | null;
  completeLogin(search: string): Promise<LoginCompletion>;
  refreshTokens(): Promise<TokenPair | null>;
  authedFetch(path: string, opts?: AuthedFetchOptions): Promise<Response>;
}

export function createOAuthClient(config: OAuthClientConfig): OAuthClient {
  const authorizePath = `${config.apiOrigin}/oauth/authorize`;
  const tokenPath = "/oauth/token";
  const { tokenStore } = config;

  function clampReturnTo(returnTo: string): string {
    return config.returnToAllowlist.includes(returnTo) ? returnTo : config.defaultReturnTo;
  }

  /** URL เริ่ม authorization code + PKCE. */
  function buildAuthorizeUrl({ state, codeChallenge, redirectUri }: AuthorizeParams): string {
    const query = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: config.scope,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });
    return `${authorizePath}?${query}`;
  }

  function callbackUri(): string {
    // ต้องตรงกับ redirect URI ที่ลงทะเบียนฝั่ง API แบบ byte-match (dev: https://localhost:3002/auth/callback)
    return `${window.location.origin}${config.callbackPath}`;
  }

  /** เริ่ม login: gen PKCE + state เก็บใน sessionStorage แล้ว full-page navigate ไป /oauth/authorize. */
  async function beginLogin(returnTo: string = config.defaultReturnTo): Promise<void> {
    const pkce: PkceState = {
      verifier: randomToken(),
      state: randomToken(),
      returnTo: clampReturnTo(returnTo),
      client: config.clientId,
    };
    sessionStorage.setItem(config.pkceStorageKey, JSON.stringify(pkce));
    window.location.href = buildAuthorizeUrl({
      state: pkce.state,
      codeChallenge: await codeChallengeOf(pkce.verifier),
      redirectUri: callbackUri(),
    });
  }

  function pendingClientId(): string | null {
    try {
      const raw = sessionStorage.getItem(config.pkceStorageKey);
      if (!raw) return null;
      const state = JSON.parse(raw) as PkceState;
      return state.client ?? config.clientId; // fallback สำหรับ state เก่าที่ยังไม่มี field client
    } catch {
      return null;
    }
  }

  function tokenRequest(params: Record<string, string>): Promise<Response> {
    return fetch(tokenPath, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ ...params, client_id: config.clientId }),
    });
  }

  /** อ่าน `error` จาก OAuth error body (400 {error, error_description}) หรือ http_<status>. */
  async function oauthErrorOf(res: Response): Promise<string> {
    try {
      const body = (await res.json()) as { error?: string };
      return body.error ?? `http_${res.status}`;
    } catch {
      return `http_${res.status}`;
    }
  }

  /**
   * หน้า /auth/callback: แลก code เป็น token คู่. consume PKCE state ออกจาก sessionStorage ก่อนยิง
   * (code ใช้ซ้ำ = OpenIddict revoke ทั้ง login — กัน effect รันซ้ำ/refresh หน้า).
   */
  async function completeLogin(search: string): Promise<LoginCompletion> {
    const params = new URLSearchParams(search);
    const raw = sessionStorage.getItem(config.pkceStorageKey);
    sessionStorage.removeItem(config.pkceStorageKey);
    if (!raw) return { ok: false, reason: "pkce_missing" };
    const pkce = JSON.parse(raw) as PkceState;

    const error = params.get("error");
    if (error) return { ok: false, reason: error };
    const code = params.get("code");
    if (!code || params.get("state") !== pkce.state) return { ok: false, reason: "state_mismatch" };

    try {
      const res = await tokenRequest({
        grant_type: "authorization_code",
        code,
        code_verifier: pkce.verifier,
        redirect_uri: callbackUri(),
      });
      if (res.status !== 200) return { ok: false, reason: await oauthErrorOf(res) };
      tokenStore.setTokens(toTokenPair((await res.json()) as TokenResponse));
      return { ok: true, returnTo: clampReturnTo(pkce.returnTo) };
    } catch {
      return { ok: false, reason: "network" };
    }
  }

  // refresh token หมุนทุกครั้งและใช้ซ้ำไม่ได้ (ซ้ำ = revoke ทั้ง login) จึงต้อง single-flight ในแท็บ (promise เดียว)
  // และข้ามแท็บ (Web Lock + อ่าน token สดใน lock: ถ้าแท็บอื่นหมุนไปแล้วให้ใช้คู่ใหม่แทนการยิงซ้ำ)
  let refreshInFlight: Promise<TokenPair | null> | null = null;

  /**
   * POST /oauth/token grant_type=refresh_token (dedupe ในแท็บ + lock ข้ามแท็บ). คืนคู่ใหม่ หรือ null เมื่อต่อไม่ได้:
   * 400 invalid_grant = login ตาย -> ล้าง token; network/5xx = คง token เดิม (ไม่ logout เพราะเน็ตหลุด).
   */
  function refreshTokens(): Promise<TokenPair | null> {
    refreshInFlight ??= refreshOnce().finally(() => {
      refreshInFlight = null;
    });
    return refreshInFlight;
  }

  async function refreshOnce(): Promise<TokenPair | null> {
    const before = tokenStore.getTokens();
    if (!before) return null;
    return withCrossTabLock(config.refreshLockName, async () => {
      const current = tokenStore.getTokens(); // อ่านสดหลังได้ lock — แท็บอื่นอาจหมุนไปแล้วระหว่างรอ
      if (!current) return null;
      if (current.refreshToken !== before.refreshToken) return current;
      try {
        const res = await tokenRequest({ grant_type: "refresh_token", refresh_token: current.refreshToken });
        if (res.status === 200) {
          const pair = toTokenPair((await res.json()) as TokenResponse);
          tokenStore.setTokens(pair);
          return pair;
        }
        if (res.status === 400) tokenStore.clearTokens();
        return null;
      } catch {
        return null;
      }
    });
  }

  /** access token ที่ยังใช้ได้ (refresh ล่วงหน้าเมื่อใกล้หมด) หรือ null เมื่อไม่มี login. */
  async function currentAccessToken(): Promise<string | null> {
    const pair = tokenStore.getTokens();
    if (!pair) return null;
    if (pair.expiresAt - Date.now() > REFRESH_SKEW_MS) return pair.accessToken;
    await refreshTokens();
    return tokenStore.getTokens()?.accessToken ?? null; // refresh ล้มเพราะเน็ต -> ใช้ token เดิม ให้ 401 ตัดสิน
  }

  /** fetch API ด้วย Bearer; 401 -> refresh 1 ครั้ง (single-flight) แล้ว retry; ยัง 401 -> ล้าง token (+เด้ง login). */
  async function authedFetch(path: string, opts: AuthedFetchOptions = {}): Promise<Response> {
    const { redirectOnUnauthorized = true, ...init } = opts;
    const token = await currentAccessToken();
    let res = token ? await fetch(path, withBearer(init, token)) : new Response(null, { status: 401 });
    if (res.status === 401 && token) {
      const fresh = await refreshTokens();
      if (fresh) res = await fetch(path, withBearer(init, fresh.accessToken));
    }
    if (res.status === 401) {
      tokenStore.clearTokens();
      if (redirectOnUnauthorized) window.location.href = config.loginPath; // login ตาย -> ผู้ใช้เริ่ม SSO เอง
    }
    return res;
  }

  return {
    clientId: config.clientId,
    clampReturnTo,
    buildAuthorizeUrl,
    beginLogin,
    pendingClientId,
    completeLogin,
    refreshTokens,
    authedFetch,
  };
}

/**
 * เลือก client ที่ code callback เป็นของ (spec §4.4): หา PKCE state ที่ค้าง อ่าน field `client` ในนั้น
 * แล้วคืน client ที่ `clientId` ตรงกับค่าที่ประกาศ. state ที่ประกาศ client ไม่ตรงกับ client ใดในลิสต์ ->
 * null (ปฏิเสธ ไม่เดา). ไม่มี state ค้าง -> null.
 */
export function resolvePendingClient(clients: readonly OAuthClient[]): OAuthClient | null {
  for (const client of clients) {
    const declared = client.pendingClientId();
    if (declared === null) continue;
    return clients.find((candidate) => candidate.clientId === declared) ?? null;
  }
  return null;
}
