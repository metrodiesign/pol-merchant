import { afterEach, describe, expect, it, vi } from "vitest";

import { merchantUserMicrosoftLogin } from "./user";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("merchantUserMicrosoftLogin", () => {
  it("navigate ไป canonical /api/v1/auth/agents/login พร้อม returnTo default (/register, encoded)", () => {
    const location = { href: "" };
    vi.stubGlobal("window", { location });
    merchantUserMicrosoftLogin();
    expect(location.href).toBe("/api/v1/auth/agents/login?returnTo=%2Fregister");
  });

  it("encode returnTo ที่ส่งเข้ามา", () => {
    const location = { href: "" };
    vi.stubGlobal("window", { location });
    merchantUserMicrosoftLogin("/a/b");
    expect(location.href).toBe("/api/v1/auth/agents/login?returnTo=%2Fa%2Fb");
  });
});
