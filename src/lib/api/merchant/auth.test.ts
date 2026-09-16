import { describe, expect, it } from "vitest";

import { agentResultFromMe, merchantOAuthClient } from "./auth";

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

// ปุ่ม Login และ Register บนหน้า /login ยิงสายเดียวกัน (beginAgentLogin -> /oauth/authorize) แล้วให้ pol-core
// แยกปลายทาง: approved -> code -> /agent, ยังไม่ approved -> registration session -> /register.
// สองข้อนี้คือ observable ที่ทำให้บั๊กหาย: (1) client_id ต้องเป็น pol-merchant เพื่อให้ pol-core route ถูก,
// (2) returnTo clamp เป็น /agent เพื่อให้บัญชี approved landing /agent ไม่ใช่ / (ที่เด้งเข้า dashboard -> /login).
describe("merchantOAuthClient (สายที่ปุ่ม Login/Register ใช้ร่วม)", () => {
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
});
