import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createOAuthClient, resolvePendingClient } from "./oauth-client";
import { createTokenStore } from "./token-store";

/** storage จำลอง (vitest env = node). */
function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
    clear: () => map.clear(),
    key: () => null,
    get length() {
      return map.size;
    },
  };
}

const TOKEN_BODY = { access_token: "at", refresh_token: "rt", expires_in: 900 };

function makeClient(id: string, tokenKey: string, pkceKey: string, lock: string) {
  const store = createTokenStore(tokenKey);
  const client = createOAuthClient({
    clientId: id,
    apiOrigin: "https://api.test",
    callbackPath: "/auth/callback",
    scope: "openid offline_access",
    tokenStore: store,
    pkceStorageKey: pkceKey,
    refreshLockName: lock,
    returnToAllowlist: ["/"],
    defaultReturnTo: "/",
    loginPath: "/login",
  });
  return { client, store };
}

let admin: ReturnType<typeof makeClient>;
let merchant: ReturnType<typeof makeClient>;

beforeEach(() => {
  vi.stubGlobal("sessionStorage", memoryStorage());
  vi.stubGlobal("localStorage", memoryStorage());
  vi.stubGlobal("navigator", {});
  vi.stubGlobal("window", { location: { href: "", origin: "https://localhost:3002" } });
  admin = makeClient("pol-admin", "pol_tokens", "pol_pkce", "pol_refresh");
  merchant = makeClient("pol-merchant", "pol_merchant_tokens", "pol_merchant_pkce", "pol_merchant_refresh");
});
afterEach(() => vi.unstubAllGlobals());

describe("two clients — storage key isolation (AC2)", () => {
  it("เขียน token ของ client หนึ่งไม่ทับอีก client (key ต่างกัน)", async () => {
    // จำลอง completeLogin ของ merchant: seed pkce ของ merchant แล้วแลก token
    sessionStorage.setItem("pol_merchant_pkce", JSON.stringify({ verifier: "v", state: "s", returnTo: "/", client: "pol-merchant" }));
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(TOKEN_BODY), { status: 200 })));
    await merchant.client.completeLogin("?code=c&state=s");

    expect(merchant.store.getTokens()?.accessToken).toBe("at");
    expect(admin.store.getTokens()).toBeNull(); // admin store ไม่ถูกแตะ
    // แยกจริงในระดับ localStorage key
    expect(localStorage.getItem("pol_merchant_tokens")).not.toBeNull();
    expect(localStorage.getItem("pol_tokens")).toBeNull();
  });

  it("mutation-check: ถ้าใช้ key เดียวกันจะทับกัน (พิสูจน์ว่า key คือสิ่งที่แยก)", async () => {
    const shared = createTokenStore("pol_tokens");
    shared.setTokens({ accessToken: "x", refreshToken: "y", expiresAt: Date.now() + 1000 });
    const another = createTokenStore("pol_tokens");
    expect(another.getTokens()?.accessToken).toBe("x"); // key เดียวกัน -> เห็นค่าเดียวกัน
  });

  it("beginLogin เก็บ PKCE state ที่ key ของตัวเองเท่านั้น", async () => {
    await merchant.client.beginLogin("/");
    expect(sessionStorage.getItem("pol_merchant_pkce")).not.toBeNull();
    expect(sessionStorage.getItem("pol_pkce")).toBeNull();
  });
});

describe("resolvePendingClient — callback เลือก client ถูกตัวจาก state (AC2)", () => {
  it("เลือก merchant เมื่อมี PKCE state ของ merchant ค้าง", async () => {
    await merchant.client.beginLogin("/");
    expect(resolvePendingClient([merchant.client, admin.client])?.clientId).toBe("pol-merchant");
  });

  it("เลือก admin เมื่อมี PKCE state ของ admin ค้าง", async () => {
    await admin.client.beginLogin("/");
    expect(resolvePendingClient([merchant.client, admin.client])?.clientId).toBe("pol-admin");
  });

  it("คืน null เมื่อไม่มี login ค้าง", () => {
    expect(resolvePendingClient([merchant.client, admin.client])).toBeNull();
  });

  it("เลือกตาม field client ใน state (spec §4.4) ไม่ใช่แค่ key presence", () => {
    // state อยู่ใน key ของ merchant แต่ประกาศ client = pol-admin -> ต้องเลือก admin ตาม field
    sessionStorage.setItem("pol_merchant_pkce", JSON.stringify({ verifier: "v", state: "s", returnTo: "/", client: "pol-admin" }));
    expect(resolvePendingClient([merchant.client, admin.client])?.clientId).toBe("pol-admin");
  });

  it("ปฏิเสธ (null) เมื่อ client ใน state ไม่ตรงกับ client ใดในลิสต์", () => {
    sessionStorage.setItem("pol_merchant_pkce", JSON.stringify({ verifier: "v", state: "s", returnTo: "/", client: "evil-client" }));
    expect(resolvePendingClient([merchant.client, admin.client])).toBeNull();
  });

  it("fallback เป็น clientId ของตัวเองเมื่อ state เก่าไม่มี field client", () => {
    sessionStorage.setItem("pol_pkce", JSON.stringify({ verifier: "v", state: "s", returnTo: "/" }));
    expect(resolvePendingClient([merchant.client, admin.client])?.clientId).toBe("pol-admin");
  });
});
