import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { navConfig } from "@/components/layout/nav-config";
import { isMerchantShellPreviewEnabled } from "@/lib/merchant/shell-preview";

function readSource(file: string): string {
  return readFileSync(join(process.cwd(), file), "utf8");
}

describe("Merchant public entry contract", () => {
  it("redirect root ไป /login และประกาศ POL Merchant metadata", () => {
    expect(readSource("src/app/page.tsx")).toContain('redirect("/login")');

    const layout = readSource("src/app/layout.tsx");
    expect(layout).toContain('default: "POL Merchant"');
    expect(layout).toContain('lang="th"');
  });

  it("แสดง Merchant-only login และ registration link โดยไม่มี SSO action", () => {
    const login = readSource("src/components/auth/login-view.tsx");
    expect(login).toContain("POL Merchant");
    expect(login).toContain("สำหรับตัวแทน/นายหน้า");
    expect(login).toContain('href="/register"');
    expect(login).not.toMatch(/admin\/auth|merchantUserLogin|microsoftLogin|Google|Microsoft/);
  });

  it("public auth surface ไม่อ้าง Admin session หรือ browser token storage", () => {
    const publicAuth = [
      "src/components/auth/login-view.tsx",
      "src/app/register/page.tsx",
      "src/app/login-error/page.tsx",
      "src/lib/api/merchant/user.ts",
    ]
      .map(readSource)
      .join("\n");

    expect(publicAuth).not.toMatch(/\/admin\/me|localStorage|sessionStorage|POL Admin|pol-admin/);
  });
});

describe("Merchant protected shell contract", () => {
  it("เปิด preview เฉพาะ development ที่ opt-in ด้วยค่าตรงตัว", () => {
    expect(
      isMerchantShellPreviewEnabled({
        NODE_ENV: "development",
        MERCHANT_SHELL_PREVIEW: "true",
      }),
    ).toBe(true);

    for (const environment of [
      { NODE_ENV: "development" },
      { NODE_ENV: "development", MERCHANT_SHELL_PREVIEW: "TRUE" },
      { NODE_ENV: "test", MERCHANT_SHELL_PREVIEW: "true" },
      { NODE_ENV: "staging", MERCHANT_SHELL_PREVIEW: "true" },
      { NODE_ENV: "production", MERCHANT_SHELL_PREVIEW: "true" },
    ]) {
      expect(isMerchantShellPreviewEnabled(environment)).toBe(false);
    }
  });

  it("ให้ protected layouts ทั้งหมดผ่าน server gate เดียว", () => {
    const layouts = [
      "dashboard",
      "policy",
      "checkout",
      "order",
      "transaction",
      "merchant",
    ];

    for (const route of layouts) {
      const layout = readSource(`src/app/${route}/layout.tsx`);
      expect(layout).toContain("MerchantShellGate");
      expect(layout).not.toContain("MinimalsLayout");
    }

    const gate = readSource("src/components/layout/merchant-shell-gate.tsx");
    expect(gate).toContain("notFound()");
    expect(gate).not.toMatch(/NEXT_PUBLIC|AuthProvider|AuthGuard|admin\/me/);
  });

  it("prune blocked route trees และ Admin auth components", () => {
    for (const path of [
      "src/app/admin",
      "src/app/control",
      "src/app/organization",
      "src/app/minimals",
      "src/app/error",
      "src/app/maintenance",
      "src/app/logout",
      "src/components/auth/auth-provider.tsx",
      "src/components/auth/auth-guard.tsx",
    ]) {
      expect(existsSync(join(process.cwd(), path)), path).toBe(false);
    }

    expect(existsSync(join(process.cwd(), "src/app/error.tsx"))).toBe(true);
  });

  it("จำกัด navigation ทุก variant ไว้เฉพาะ Merchant allowlist", () => {
    const paths = navConfig.flatMap((group) =>
      group.items.map((item) => item.path),
    );

    expect(paths).toEqual([
      "/dashboard",
      "/policy/list",
      "/order/list",
      "/transaction/list",
      "/merchant/user/list",
      "/merchant/role/list",
    ]);

    const minimalsConfig = readSource(
      "src/components/layout/minimals-nav-config.ts",
    );
    expect(minimalsConfig).toContain("navConfig as minimalsNavConfig");
    expect(JSON.stringify(navConfig)).not.toMatch(
      /\/admin|\/control|\/organization|\/minimals|POL Admin/,
    );
  });
});
