import type { MerchantUserFormData, PersonType } from "@/types/user";
import type {
  AgentRegistrationDraft,
  AgentRegistrationView,
} from "@/lib/api/agent-registration";

export const PROFILE_SCHEMA_VERSION = 1;
/** เพดานความยาว profile JSON ฝั่ง pol-core (ValidateDraft) — เกินแล้วโยนก่อนยิง. */
const MAX_PROFILE_JSON = 32768;

/**
 * map ฟอร์ม -> wire draft. โยน RangeError เมื่อ profile JSON เกิน 32768 ตัวอักษร (เพดาน pol-core).
 * acceptedTermsAt เป็น timestamp (ไม่ใช่ boolean) — ค่า false ไม่มีทางถูกส่ง timestamp จึงเป็นหลักฐานจริง.
 */
export function toRegistrationDraft(
  form: MerchantUserFormData,
  acceptedTermsAt: string,
): AgentRegistrationDraft {
  const profile: Record<string, unknown> = {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    firstName: form.firstName,
    lastName: form.lastName,
    personType: form.personType,
    idNumber: form.idNumber,
    licenseNumber: form.licenseNumber.trim() ? form.licenseNumber : null,
    acceptedTermsAt,
  };
  if (JSON.stringify(profile).length > MAX_PROFILE_JSON) {
    throw new RangeError(`profile JSON exceeds ${MAX_PROFILE_JSON} characters`);
  }
  return {
    saleCode: form.producerCode,
    email: form.email,
    phoneNumber: form.phoneNumber,
    profile,
  };
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * wire -> ฟอร์ม สำหรับ prefill. ทนกับ response ที่ยังไม่มี field ใหม่ (§0.3): ไม่มี profile -> ฟอร์มเปล่า
 * (ไม่โยน). field ที่ขาดหรือผิดชนิดกลายเป็นค่าว่าง เพื่อให้หน้าใช้งานได้ทั้งก่อนและหลัง pol-core deploy.
 */
export function toFormData(registration: AgentRegistrationView): MerchantUserFormData {
  const profile = (registration.profile ?? {}) as Record<string, unknown>;
  const personType: PersonType = profile.personType === "Juristic" ? "Juristic" : "Individual";
  return {
    firstName: asString(profile.firstName),
    lastName: asString(profile.lastName),
    personType,
    idNumber: asString(profile.idNumber),
    producerCode: asString(registration.saleCode),
    licenseNumber: asString(profile.licenseNumber),
    phoneNumber: asString(registration.phoneNumber),
    email: asString(registration.email),
    acceptTerms: Boolean(profile.acceptedTermsAt),
  };
}
