import { getMe } from "@/lib/api/admin/auth";
import { getAgentSession } from "@/lib/api/merchant/auth";
import type { AdminMe, AuthBootstrapResult } from "@/types/auth";

/** แปลง agent session ให้ใช้ shell เดียวกันโดยไม่ให้สิทธิ์ admin ข้าม realm. */
export function agentToAdminMe(me: { accountId: string | null; displayName: string | null; email: string | null }): AdminMe {
  return {
    adminId: me.accountId ?? "agent",
    displayName: me.displayName,
    email: me.email,
    hasPlatformAccess: false,
    permissions: [],
    realm: "agent",
  };
}

/** admin มี precedence; เมื่อ admin anonymous จึง bootstrap agent token store ที่แยกกัน. */
export async function bootstrapAuth(): Promise<AuthBootstrapResult> {
  const admin = await getMe();
  if (admin.status !== "anon") return admin;
  const agent = await getAgentSession();
  if (agent.status === "authed") return { status: "authed", me: agentToAdminMe(agent.me) };
  if (agent.status === "error") return { status: "error", me: null };
  return admin;
}
