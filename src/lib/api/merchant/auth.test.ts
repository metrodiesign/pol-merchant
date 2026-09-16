import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  agentResultFromMe,
  beginAgentLogin,
  beginAgentRegistration,
  logoutAgent,
  merchantOAuthClient,
  merchantTokenStore,
} from "./auth";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, String(value)),
    removeItem: (key) => void map.delete(key),
    clear: () => map.clear(),
    key: () => null,
    get length() {
      return map.size;
    },
  };
}

const LIVE = {
  accessToken: "merchant-at",
  refreshToken: "merchant-rt",
  expiresAt: Date.now() + 10 * 60_000,
};
const EXPIRED = { ...LIVE, expiresAt: Date.now() - 1 };
const FRESH = {
  accessToken: "merchant-at-fresh",
  refreshToken: "merchant-rt-fresh",
  expiresAt: Date.now() + 15 * 60_000,
};
const FRESH_BODY = {
  access_token: FRESH.accessToken,
  refresh_token: FRESH.refreshToken,
  expires_in: 900,
};

let location: { href: string; origin: string };

beforeEach(() => {
  vi.stubGlobal("sessionStorage", memoryStorage());
  vi.stubGlobal("localStorage", memoryStorage());
  vi.stubGlobal("navigator", {});
  location = {
    href: "https://localhost:3002/agent?returnTo=https://evil.test",
    origin: "https://localhost:3002",
  };
  vi.stubGlobal("window", { location });
  merchantTokenStore.clearTokens();
});

afterEach(() => vi.unstubAllGlobals());

describe("agentResultFromMe", () => {
  it("200 + body -> authed พร้อม email/accountId", () => {
    expect(agentResultFromMe(200, { accountId: "a1", email: "x@y.z" })).toEqual({
      status: "authed",
      me: { accountId: "a1", email: "x@y.z" },
    });
  });

  it("200 field หาย -> authed แต่ค่าเป็น null (ไม่ throw)", () => {
    expect(agentResultFromMe(200, {})).toEqual({
      status: "authed",
      me: { accountId: null, email: null },
    });
  });

  it("401 -> anon (ตัวแทนยังไม่ login / token ตาย)", () => {
    expect(agentResultFromMe(401, null)).toEqual({ status: "anon" });
  });

  it("200 แต่ parse ไม่ได้ (body null) -> error", () => {
    expect(agentResultFromMe(200, null)).toEqual({ status: "error" });
  });

  it("5xx -> error (ไม่เด้ง login, ให้ผู้ใช้โหลดใหม่)", () => {
    expect(agentResultFromMe(500, null)).toEqual({ status: "error" });
  });
});

describe("merchantOAuthClient", () => {
  it("authorize URL ใช้ client_id=pol-merchant บน /oauth/authorize", () => {
    const url = merchantOAuthClient.buildAuthorizeUrl({
      state: "s1",
      codeChallenge: "c1",
      redirectUri: "https://localhost:3002/auth/callback",
    });
    expect(url).toContain("/oauth/authorize?");
    expect(url).toContain("client_id=pol-merchant");
  });

  it("clampReturnTo: /agent ผ่าน, ค่านอก allowlist -> default /agent", () => {
    expect(merchantOAuthClient.clampReturnTo("/agent")).toBe("/agent");
    expect(merchantOAuthClient.clampReturnTo("/")).toBe("/agent");
    expect(merchantOAuthClient.clampReturnTo("/dashboard")).toBe("/agent");
  });

  it("Login ไม่มี prompt แต่ Register ส่ง prompt=select_account", async () => {
    await beginAgentLogin();
    expect(new URL(location.href, location.origin).searchParams.has("prompt")).toBe(false);

    await beginAgentRegistration();
    const registerUrl = new URL(location.href, location.origin);
    expect(registerUrl.searchParams.getAll("prompt")).toEqual(["select_account"]);
    expect(registerUrl.searchParams.get("code_challenge_method")).toBe("S256");
  });
});

describe("logoutAgent", () => {
  it("204: POST พร้อม merchant Bearer ก่อนล้าง merchant state และไป fixed end-session", async () => {
    merchantTokenStore.setTokens(LIVE);
    sessionStorage.setItem("pol_merchant_pkce", "merchant-pkce");
    localStorage.setItem("pol_tokens", "admin-token");
    sessionStorage.setItem("pol_pkce", "admin-pkce");
    const fetchMock = vi.fn(async (_path: string, _init: RequestInit) =>
      new Response(null, { status: 204 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await logoutAgent();

    expect(fetchMock).toHaveBeenCalledOnce();
    const [path, init] = fetchMock.mock.calls[0]!;
    expect(path).toBe("/api/v1/auth/logout");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer merchant-at");
    expect(merchantTokenStore.getTokens()).toBeNull();
    expect(sessionStorage.getItem("pol_merchant_pkce")).toBeNull();
    expect(localStorage.getItem("pol_tokens")).toBe("admin-token");
    expect(sessionStorage.getItem("pol_pkce")).toBe("admin-pkce");
    expect(location.href).toBe("/api/v1/auth/agents/logout");
  });

  it("401: refresh แล้ว retry ด้วย Bearer ใหม่; 204 จึงล้างและไป end-session", async () => {
    merchantTokenStore.setTokens(EXPIRED);
    sessionStorage.setItem("pol_merchant_pkce", "merchant-pkce");
    const fetchMock = vi.fn(async (path: string, init: RequestInit) => {
      if (path === "/oauth/token") {
        return new Response(JSON.stringify(FRESH_BODY), { status: 200 });
      }
      const bearer = new Headers(init.headers).get("Authorization");
      return new Response(null, { status: bearer === "Bearer merchant-at" ? 401 : 204 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await logoutAgent();

    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual([
      "/api/v1/auth/logout",
      "/oauth/token",
      "/api/v1/auth/logout",
    ]);
    expect(new Headers(fetchMock.mock.calls[2]![1].headers).get("Authorization")).toBe(
      "Bearer merchant-at-fresh",
    );
    expect(merchantTokenStore.getTokens()).toBeNull();
    expect(sessionStorage.getItem("pol_merchant_pkce")).toBeNull();
    expect(location.href).toBe("/api/v1/auth/agents/logout");
  });

  it.each([
    ["network", () => Promise.reject(new TypeError("refresh offline"))],
    ["5xx", () => Promise.resolve(new Response(null, { status: 503 }))],
  ])("401 + refresh %s: throw และคง pair, PKCE, URL", async (_case, refreshResult) => {
    merchantTokenStore.setTokens(LIVE);
    sessionStorage.setItem("pol_merchant_pkce", "merchant-pkce");
    const before = location.href;
    const fetchMock = vi.fn(async (path: string) => {
      if (path === "/oauth/token") return refreshResult();
      return new Response(null, { status: 401 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(logoutAgent()).rejects.toThrow("merchant-logout-failed");

    expect(merchantTokenStore.getTokens()).toEqual(LIVE);
    expect(sessionStorage.getItem("pol_merchant_pkce")).toBe("merchant-pkce");
    expect(location.href).toBe(before);
  });

  it("401 + refresh invalid_grant: authorization ตาย จึงล้าง PKCE และไป end-session", async () => {
    merchantTokenStore.setTokens(LIVE);
    sessionStorage.setItem("pol_merchant_pkce", "merchant-pkce");
    const fetchMock = vi.fn(async (path: string) =>
      path === "/oauth/token"
        ? new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 })
        : new Response(null, { status: 401 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await logoutAgent();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(merchantTokenStore.getTokens()).toBeNull();
    expect(sessionStorage.getItem("pol_merchant_pkce")).toBeNull();
    expect(location.href).toBe("/api/v1/auth/agents/logout");
  });

  it("401 + refresh HTTP 503 invalid_grant: throw และคง pair, PKCE, URL", async () => {
    merchantTokenStore.setTokens(LIVE);
    sessionStorage.setItem("pol_merchant_pkce", "merchant-pkce");
    const before = location.href;
    const fetchMock = vi.fn(async (path: string) =>
      path === "/oauth/token"
        ? new Response(JSON.stringify({ error: "invalid_grant" }), { status: 503 })
        : new Response(null, { status: 401 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(logoutAgent()).rejects.toThrow("merchant-logout-failed");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(merchantTokenStore.getTokens()).toEqual(LIVE);
    expect(sessionStorage.getItem("pol_merchant_pkce")).toBe("merchant-pkce");
    expect(location.href).toBe(before);
  });

  it.each([
    ["invalid_request", JSON.stringify({ error: "invalid_request" })],
    ["body อ่านไม่ได้", "not-json"],
  ])("401 + refresh HTTP 400 %s: throw และคง pair, PKCE, URL", async (_case, body) => {
    merchantTokenStore.setTokens(LIVE);
    sessionStorage.setItem("pol_merchant_pkce", "merchant-pkce");
    const before = location.href;
    const fetchMock = vi.fn(async (path: string) =>
      path === "/oauth/token"
        ? new Response(body, { status: 400 })
        : new Response(null, { status: 401 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(logoutAgent()).rejects.toThrow("merchant-logout-failed");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(merchantTokenStore.getTokens()).toEqual(LIVE);
    expect(sessionStorage.getItem("pol_merchant_pkce")).toBe("merchant-pkce");
    expect(location.href).toBe(before);
  });

  it.each([
    ["non-204", () => Promise.resolve(new Response(null, { status: 500 }))],
    ["network", () => Promise.reject(new TypeError("retry offline"))],
  ])("401 + refresh สำเร็จ + retry %s: คง fresh pair, PKCE, URL", async (_case, retryResult) => {
    merchantTokenStore.setTokens(LIVE);
    sessionStorage.setItem("pol_merchant_pkce", "merchant-pkce");
    const before = location.href;
    let logoutCalls = 0;
    const fetchMock = vi.fn(async (path: string) => {
      if (path === "/oauth/token") {
        return new Response(JSON.stringify(FRESH_BODY), { status: 200 });
      }
      logoutCalls += 1;
      return logoutCalls === 1 ? new Response(null, { status: 401 }) : retryResult();
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(logoutAgent()).rejects.toThrow();

    expect(merchantTokenStore.getTokens()).toMatchObject({
      accessToken: FRESH.accessToken,
      refreshToken: FRESH.refreshToken,
    });
    expect(sessionStorage.getItem("pol_merchant_pkce")).toBe("merchant-pkce");
    expect(location.href).toBe(before);
  });

  it("ไม่มี merchant token: ไม่ยิง request, คง admin token และไป end-session", async () => {
    sessionStorage.setItem("pol_merchant_pkce", "merchant-pkce");
    localStorage.setItem("pol_tokens", "admin-token");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await logoutAgent();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("pol_merchant_pkce")).toBeNull();
    expect(localStorage.getItem("pol_tokens")).toBe("admin-token");
    expect(location.href).toBe("/api/v1/auth/agents/logout");
  });

  it("mutation-check 500: throw, คง merchant state และไม่ navigate", async () => {
    merchantTokenStore.setTokens(LIVE);
    sessionStorage.setItem("pol_merchant_pkce", "merchant-pkce");
    const before = location.href;
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 500 })));

    await expect(logoutAgent()).rejects.toThrow("merchant-logout-failed");

    expect(merchantTokenStore.getTokens()).toEqual(LIVE);
    expect(sessionStorage.getItem("pol_merchant_pkce")).toBe("merchant-pkce");
    expect(location.href).toBe(before);
  });

  it("mutation-check network error: throw, คง merchant state และไม่ navigate", async () => {
    merchantTokenStore.setTokens(LIVE);
    sessionStorage.setItem("pol_merchant_pkce", "merchant-pkce");
    const before = location.href;
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("network down");
    }));

    await expect(logoutAgent()).rejects.toThrow("network down");

    expect(merchantTokenStore.getTokens()).toEqual(LIVE);
    expect(sessionStorage.getItem("pol_merchant_pkce")).toBe("merchant-pkce");
    expect(location.href).toBe(before);
  });
});
