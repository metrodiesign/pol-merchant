import { describe, expect, it } from "vitest";

import { getLoginErrorContent } from "./login-error";

describe("getLoginErrorContent", () => {
  it("อธิบาย workforce denial และ identity conflict ด้วยข้อความที่ตรงเหตุผล", () => {
    expect(getLoginErrorContent("workforce-access-denied").message).toContain("ไม่ผ่านนโยบายพนักงาน");
    expect(getLoginErrorContent("identity-conflict").message).toContain("identity binding");
    expect(getLoginErrorContent("workforce-email-unavailable").message).toContain("ไม่มีอีเมล");
  });

  it("map policy code ของ employee stack เป็นข้อความเฉพาะ ไม่ตก default", () => {
    for (const reason of ["workforce-not-eligible", "issuer-mismatch", "tenant-mismatch", "account-suspended"]) {
      expect(getLoginErrorContent(reason).message).not.toBe(getLoginErrorContent("unknown-x").message);
    }
  });

  it("ใช้ข้อความ provider-neutral สำหรับ legacy reasons", () => {
    for (const reason of ["not-provisioned", "missing-subject", "email-unverified", "missing-identity"]) {
      expect(getLoginErrorContent(reason).message).not.toMatch(/Google|Microsoft/);
    }
  });

  it("ครบ 13 reason canonical ของสาย agent ทุกตัวมีข้อความเฉพาะ ไม่ตก default", () => {
    const canonical = [
      "provider-not-allowed",
      "tenant-mismatch",
      "issuer-mismatch",
      "audience-mismatch",
      "signature-invalid",
      "lifetime-invalid",
      "state-invalid",
      "nonce-invalid",
      "registration-identity-not-agent",
      "account-already-approved",
      "access-denied",
      "auth-failed",
      "agent-account-suspended",
    ];
    expect(canonical).toHaveLength(13);
    const fallback = getLoginErrorContent("unknown-x").message;
    for (const reason of canonical) {
      expect(getLoginErrorContent(reason).message).not.toBe(fallback);
    }
  });

  it("FE-minted reason ของ /register มีข้อความเฉพาะ", () => {
    const fallback = getLoginErrorContent("unknown-x").message;
    for (const reason of ["registration-session-expired", "registration-merchant-mismatch"]) {
      expect(getLoginErrorContent(reason).message).not.toBe(fallback);
    }
  });

  it("prototype key (__proto__/toString/constructor) คืน default string ไม่ใช่ object", () => {
    for (const reason of ["__proto__", "toString", "constructor", "hasOwnProperty"]) {
      expect(getLoginErrorContent(reason).message).toBe("เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่");
    }
  });

  it("คืน default สำหรับ reason ที่ไม่รู้จัก และคง pending state", () => {
    expect(getLoginErrorContent("unknown").message).toBe("เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่");
    expect(getLoginErrorContent("awaiting-approval")).toMatchObject({
      title: "รอการอนุมัติ",
      isPending: true,
    });
  });
});
