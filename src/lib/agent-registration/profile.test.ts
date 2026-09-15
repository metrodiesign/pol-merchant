import { describe, it, expect } from "vitest";

import { PROFILE_SCHEMA_VERSION, toFormData, toRegistrationDraft } from "./profile";
import type { AgentRegistrationView } from "@/lib/api/agent-registration";
import type { MerchantUserFormData } from "@/types/user";

const form: MerchantUserFormData = {
  firstName: "สมชาย",
  lastName: "ใจดี",
  personType: "Individual",
  idNumber: "1234567890121",
  producerCode: "DEMO-SALE-1",
  licenseNumber: "1234567890",
  phoneNumber: "0812345678",
  email: "s@example.com",
  acceptTerms: true,
};

describe("toRegistrationDraft", () => {
  it("map ฟอร์ม -> wire: saleCode/email/phoneNumber ที่ top-level, ส่วนอื่นเข้า profile", () => {
    const draft = toRegistrationDraft(form, "2026-09-15T00:00:00.000Z");
    expect(draft.saleCode).toBe("DEMO-SALE-1");
    expect(draft.email).toBe("s@example.com");
    expect(draft.phoneNumber).toBe("0812345678");
    expect(draft.profile).toMatchObject({
      schemaVersion: PROFILE_SCHEMA_VERSION,
      firstName: "สมชาย",
      lastName: "ใจดี",
      personType: "Individual",
      idNumber: "1234567890121",
      licenseNumber: "1234567890",
      acceptedTermsAt: "2026-09-15T00:00:00.000Z",
    });
  });

  it("schemaVersion ติดไปเป็น 1 เสมอ", () => {
    expect(toRegistrationDraft(form, "t").profile.schemaVersion).toBe(1);
  });

  it("licenseNumber ว่าง/เว้นวรรค -> null ใน profile", () => {
    expect(toRegistrationDraft({ ...form, licenseNumber: "  " }, "t").profile.licenseNumber).toBeNull();
  });

  it("โยน RangeError เมื่อ profile JSON เกิน 32768 ตัวอักษร", () => {
    const huge = { ...form, firstName: "x".repeat(33000) };
    expect(() => toRegistrationDraft(huge, "t")).toThrow(RangeError);
  });

  it("ไม่โยนเมื่อ profile JSON ยาวพอดีใต้เพดาน", () => {
    const nearLimit = { ...form, firstName: "x".repeat(30000) };
    expect(() => toRegistrationDraft(nearLimit, "t")).not.toThrow();
  });
});

describe("toFormData", () => {
  const baseReg: AgentRegistrationView = {
    registrationId: "r1",
    merchantId: "m1",
    status: "Draft",
    currentAttemptNo: 0,
    currentAttemptId: null,
    rejectionReason: null,
    version: 1,
    saleCode: "DEMO-SALE-1",
    email: "s@example.com",
    phoneNumber: "0812345678",
    profile: {
      firstName: "สมชาย",
      lastName: "ใจดี",
      personType: "Juristic",
      idNumber: "1234567890121",
      licenseNumber: "LIC-1",
      acceptedTermsAt: "2026-09-15T00:00:00.000Z",
    },
  };

  it("prefill ครบจาก registration + profile", () => {
    expect(toFormData(baseReg)).toEqual({
      firstName: "สมชาย",
      lastName: "ใจดี",
      personType: "Juristic",
      idNumber: "1234567890121",
      producerCode: "DEMO-SALE-1",
      licenseNumber: "LIC-1",
      phoneNumber: "0812345678",
      email: "s@example.com",
      acceptTerms: true,
    });
  });

  it("ทนกับ response ที่ยังไม่มี field ใหม่ (§0.3) -> ฟอร์มเปล่า ไม่โยน", () => {
    const bare: AgentRegistrationView = {
      registrationId: "r1",
      merchantId: "m1",
      status: "Draft",
      currentAttemptNo: 0,
      currentAttemptId: null,
      rejectionReason: null,
      version: 1,
    };
    expect(toFormData(bare)).toEqual({
      firstName: "",
      lastName: "",
      personType: "Individual",
      idNumber: "",
      producerCode: "",
      licenseNumber: "",
      phoneNumber: "",
      email: "",
      acceptTerms: false,
    });
  });

  it("personType ที่ไม่ใช่ Juristic -> Individual (default)", () => {
    expect(toFormData({ ...baseReg, profile: { personType: "weird" } }).personType).toBe("Individual");
  });
});
