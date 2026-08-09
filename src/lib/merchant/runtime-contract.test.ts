import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import nextConfig from "../../../next.config";

function readSource(file: string): string {
  return readFileSync(join(process.cwd(), file), "utf8");
}

async function rewrites() {
  if (typeof nextConfig.rewrites !== "function") {
    throw new Error("nextConfig.rewrites must be a function");
  }
  return nextConfig.rewrites();
}

afterEach(() => vi.unstubAllEnvs());

describe("Merchant runtime profiles", () => {
  it("กำหนด package identity, npm baseline และ port commands ตายตัว", () => {
    const manifest = JSON.parse(readSource("package.json"));

    expect(manifest.name).toBe("pol-merchant");
    expect(manifest.packageManager).toBe("npm@11.12.1");
    expect(manifest.scripts).toMatchObject({
      dev: "next dev -p 5300",
      "dev:clean": "node scripts/clean-development.mjs",
      start: "npm run start:production",
      "start:staging": "next start -p 3000 -H 0.0.0.0",
      "start:production": "next start -p 3000 -H 0.0.0.0",
    });
  });

  it("เปลี่ยน lockfile เฉพาะ root identity เป็น pol-merchant", () => {
    const lock = JSON.parse(readSource("package-lock.json"));
    expect(lock.name).toBe("pol-merchant");
    expect(lock.packages[""].name).toBe("pol-merchant");
  });

  it("ใช้ Node standard library ล้าง cache โดยไม่มี POSIX command", () => {
    const cleanup = readSource("scripts/clean-development.mjs");
    expect(cleanup).toMatch(/node:fs/);
    expect(cleanup).toMatch(/rmSync/);
    expect(cleanup).toMatch(/\.next/);
    expect(cleanup).toMatch(/tsconfig\.tsbuildinfo/);
    expect(cleanup).toMatch(/"dev", "-p", "5300"/);
    expect(cleanup).not.toMatch(/rm -rf|shell:\s*true|rimraf/);
  });
});

describe("Merchant API rewrite", () => {
  it("ใช้ local default และ proxy เฉพาะ producer ใน development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("MERCHANT_API_ORIGIN", "");

    expect(await rewrites()).toEqual([
      {
        source: "/producer/:path*",
        destination:
          "http://localhost:5100/api/v1/merchants/:path*",
      },
    ]);
  });

  it("ใช้ MERCHANT_API_ORIGIN เมื่อ development กำหนดค่า", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("MERCHANT_API_ORIGIN", "http://127.0.0.1:5199");

    expect(await rewrites()).toEqual([
      {
        source: "/producer/:path*",
        destination: "http://127.0.0.1:5199/api/v1/merchants/:path*",
      },
    ]);
  });

  it("ไม่สร้าง external rewrite ใน deployed runtime", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MERCHANT_API_ORIGIN", "http://localhost:5100");

    expect(await rewrites()).toEqual([]);
  });
});

describe("Merchant container profile", () => {
  it("ใช้ pinned toolchain, standalone output, non-root port และ loopback health", () => {
    const dockerfile = readSource("Dockerfile");

    expect(dockerfile).toContain("FROM node:22.19.0-alpine3.22 AS base");
    expect(dockerfile).toContain("npm install -g npm@11.12.1");
    expect(dockerfile).toContain("/app/.next/standalone");
    expect(dockerfile).toContain("ENV NODE_ENV=production");
    expect(dockerfile).toContain("ENV PORT=3000");
    expect(dockerfile).toContain("ENV HOSTNAME=0.0.0.0");
    expect(dockerfile).toMatch(/USER nextjs/);
    expect(dockerfile).toMatch(/EXPOSE 3000/);
    expect(dockerfile).toContain(
      "http://127.0.0.1:3000/api/health",
    );
  });

  it("กำหนด Compose service, image override และ port mapping ตายตัว", () => {
    const compose = readSource("docker-compose.yml");

    expect(compose).toMatch(/^\s{2}pol-merchant:/m);
    expect(compose).toContain(
      "image: ${POL_MERCHANT_IMAGE:-pol-merchant:local}",
    );
    expect(compose).toContain('- "3000:3000"');
    expect(compose).toContain("NODE_ENV: production");
    expect(compose).not.toMatch(/env_file|credential|password|token/i);
  });
});

describe("Merchant CI profile", () => {
  it("รักษา guard floor และรัน cross-platform runtime matrix", () => {
    const workflow = readSource(".github/workflows/ci.yml");

    expect(workflow).toContain("name: guards + spec-trace");
    expect(workflow).toContain("Guard regression tests");
    expect(workflow).toContain("Secret scan");
    expect(workflow).toContain("Spec trace (REQ coverage)");
    expect(workflow).toContain(
      "os: [macos-latest, windows-latest, ubuntu-24.04]",
    );
    expect(workflow).toContain("node-version: '22.19.0'");
    expect(workflow).toContain("npm install --global npm@11.12.1");
    expect(workflow).toContain("npm run audit:production");
    expect(workflow).toContain("npm run dev:clean");
    expect(workflow).toContain("smoke_profile start:staging");
    expect(workflow).toContain("smoke_profile start:production");
  });
});
