import { logout } from "@/lib/api/admin/auth";
import { logoutAgent, merchantTokenStore } from "@/lib/api/merchant/auth";

export type LogoutCurrentRealmResult = { navigated: boolean };

/** เลือก logout จาก token store ที่ถือ session อยู่; agent logout เปลี่ยน location เอง. */
export async function logoutCurrentRealm(): Promise<LogoutCurrentRealmResult> {
  if (merchantTokenStore.getTokens()) {
    await logoutAgent();
    return { navigated: true };
  }
  await logout();
  return { navigated: false };
}
