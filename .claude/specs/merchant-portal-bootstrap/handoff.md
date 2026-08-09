# Handoff Note: Merchant Portal Bootstrap

## Task Summary

Implement spec `merchant-portal-bootstrap` แบบ all-in-one. Tasks 1-7 เสร็จและมี Evidence ครบ.

## Current Status

Implementation complete. Local gates ผ่าน; พร้อม review และเปิด PR เข้า `develop`.

## Files Changed

- `src/**`, `public/**` — source snapshot และ Merchant identity/route/auth overlays
- `src/components/charts/stacked-bar-chart.tsx` — จำกัด chart overflow ไว้ใน widget บน mobile
- `package.json`, `package-lock.json`, `next.config.ts`, `vitest.config.ts` — runtime, dependency และ test contract
- `scripts/clean-development.mjs` — cross-platform clean/start ด้วย Node standard library
- `scripts/check-production-audit.mjs`, `configs/production-audit-policy.json` — production audit policy
- `Dockerfile`, `docker-compose.yml` — Node 22.19/npm 11.12.1, non-root, port `3000`, healthcheck
- `.github/workflows/ci.yml` — macOS/Windows/Ubuntu 24.04 compatibility matrix
- `README.md`, `docs/dev-setup.md`, `docs/dependency-audit.md` — setup, deploy, rollback และ security
- `.ai/shared/PROJECT_CONTEXT.md`, `.ai/shared/ARCHITECTURE.md`, `.ai/shared/stack/nextjs.md` — Merchant operating context
- `AGENTS.md` — Next.js 16-generated version guidance; operating rulesเดิมไม่เปลี่ยน
- `.claude/specs/merchant-portal-bootstrap/**` — approved requirements/design/tasks และ evidence

## Important Decisions

- Protected shell เปิดเฉพาะ development opt-in; staging/production ตอบ not-found จนมี session contract
- Navigation ทุก variant ใช้ allowlist เดียว
- Development proxy มี rule เดียว; deployed runtime ใช้ same-origin
- Source lock เป็น baseline; เปลี่ยนได้เฉพาะ documented security remediation
- Staging และ production promote image digest เดียว; rollback ด้วย previous digest

## Verification

- `npm run audit:production` -> Critical 0, High 0, total 0
- `npm test` -> 25 test files, 255 tests passed
- `npm run lint` -> 0 errors, 4 warnings
- `npx tsc --noEmit` -> exit 0
- `npm run build` -> Next.js 16.3.0, 22 routes
- secret scan, focused/skipped scan, guard suites, runtime contracts และ spec trace -> exit 0
- public UI widths `375`, `768`, `1440`; overflow/accessibility/focus checksผ่าน
- preview vertical/horizontal/mobile; allowlist, drawer, focus และ overflow checksผ่าน
- final parity -> `src/**` unclassified 0, `public/**` differences 0, root unclassified 0

## Known Deviations

- Port `5300` ยังถูก process PID `28423` ของผู้ใช้ครอง; local development smoke จึงยืนยัน clean/start
  path และ expected `EADDRINUSE`, ส่วน browser preview ใช้ isolated port `5301`
- Remote macOS/Windows/Ubuntu GitHub Actions matrixยังไม่รันจนกว่าจะเปิด PR
- Local Node คือ `v26.0.0`; Node `22.19.0` ผ่าน Linux container และถูก pin ใน CI
- Sandbox ปฏิเสธ stat `.env.local`/`.env.example`; user คัดลอก known-safe `.env.example` แล้ว
- Next.js พิมพ์ `.env.local` `EPERM` แต่ build/runtime จบด้วย exit status ที่คาด

## Next Steps

1. Review diff และ evidence
2. ใช้ `$ship-pr develop` เพื่อ commit บน feature branch และเปิด PR
3. รอ required CI matrix ผ่านก่อน merge
