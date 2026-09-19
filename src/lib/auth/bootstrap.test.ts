import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/api/admin/auth", () => ({ getMe: vi.fn() }));
vi.mock("@/lib/api/merchant/auth", () => ({ getAgentSession: vi.fn() }));
import { getMe } from "@/lib/api/admin/auth";
import { getAgentSession } from "@/lib/api/merchant/auth";
import { bootstrapAuth } from "./bootstrap";

describe("bootstrapAuth dual realm", () => {
  it("keeps authed admin without probing agent", async () => { vi.mocked(getMe).mockResolvedValue({ status: "authed", me: { adminId: "a", displayName: null, email: null, hasPlatformAccess: true, permissions: [], realm: "admin" } }); await expect(bootstrapAuth()).resolves.toMatchObject({ status: "authed", me: { realm: "admin" } }); expect(getAgentSession).not.toHaveBeenCalled(); });
  it("maps authed agent into the AuthGuard authed state", async () => { vi.mocked(getMe).mockResolvedValue({ status: "anon", me: null }); vi.mocked(getAgentSession).mockResolvedValue({ status: "authed", me: { accountId: "agent", displayName: "Agent", email: "a@test" } }); await expect(bootstrapAuth()).resolves.toEqual({ status: "authed", me: { adminId: "agent", displayName: "Agent", email: "a@test", hasPlatformAccess: false, permissions: [], realm: "agent" } }); });
  it("returns anon when both realms are anonymous", async () => { vi.mocked(getMe).mockResolvedValue({ status: "anon", me: null }); vi.mocked(getAgentSession).mockResolvedValue({ status: "anon" }); await expect(bootstrapAuth()).resolves.toEqual({ status: "anon", me: null }); });
});
