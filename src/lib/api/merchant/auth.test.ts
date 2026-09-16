import { describe, expect, it } from "vitest";

import { agentResultFromMe } from "./auth";

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
