# Implementation Tasks: Merchant Source Normalization

> Status: approved 2026-08-17 (quick, no gates)

สอง task แบบ coupled รันต่อเนื่องใน session เดียวตาม `$spec-quick`

## Implementation Checklist

- [x] 1. Normalize source modules and routes — ย้าย user/role modules, ปรับ imports/internal URLs, เพิ่ม `308` redirects และซ่อม path-sensitive tests
  Satisfies: REQ-1, REQ-2, REQ-3, REQ-4.2-REQ-4.3.
  Depends on: none.
  Verify: structural scans, unit tests, typecheck และ production route manifest/runtime smoke.
  Evidence:
    - test: `find apps/merchant/src -type d -name merchant -print` -> no output
    - test: `npm run test --workspace=@pol/merchant` -> 20 files passed, 209 tests passed
    - test: `npm run typecheck --workspace=@pol/merchant` -> exit 0
    - test: `npm run build --workspace=@pol/merchant` -> Next.js build passed, 114 static pages generated
    - routes: manifest -> new 8, legacy 0, Admin 8; redirect manifest -> two rules with statusCode 308
    - runtime: legacy user and role probes -> 308 with exact destination suffix and preserved query
    - viewports: n/a — browser acceptance belongs to Task 2
    - deviations: removed ignored `.next` cache after first typecheck exposed stale generated route validators; rebuild recreated it

- [x] 2. Align canonical context and complete acceptance — อัปเดต current-state docs แล้วรัน audit, full quality gates, runtime/browser verification และ handoff
  Satisfies: REQ-4.1, REQ-4.4-REQ-4.5.
  Depends on: 1.
  Verify: spec trace, audit, test, lint, typecheck, build, HTTP redirects และ exact viewport browser checks.
  Evidence:
    - docs: `README.md`, `.ai/shared/PROJECT_CONTEXT.md`, `.ai/shared/ARCHITECTURE.md` และ `.ai/shared/stack/nextjs.md` ระบุ normalization เป็น current state และคง reset เป็น historical evidence
    - audit: `npm run audit:production` -> critical 0, high 0, total 0
    - test: `npm test` -> 22 files passed, 240 tests passed รวมทุก workspace
    - lint: `npm run lint` -> 0 errors, 8 pre-existing warnings
    - typecheck: `npm run typecheck` -> exit 0 ทุก workspace
    - build: `npm run build` -> Next.js 16.3.1 production build passed, 114 static pages generated
    - security: `.ai/bin/check-secrets.sh --all` -> exit 0
    - trace: `scripts/spec-trace.sh merchant-src-normalization` -> 23/23 criteria covered and EARS lint passed
    - historical trace: `scripts/spec-trace.sh merchant-workspace-reset` -> 110/110 criteria covered and EARS lint passed without editing historical spec
    - routes: final manifest -> new 8, legacy 0, Admin 8; redirect manifest -> two exact 308 rules
    - runtime: legacy user and role URLs -> 308 with preserved query strings and exact new destinations
    - browser: `/register`, `/user/list` and `/role/list` verified at exact `clientWidth` 375/768/1440; no horizontal overflow; protected routes reached `/login`; registration interaction stayed checked
    - browser console: 0 error/warn entries
    - review: `code-reviewer` pass -> no actionable findings
    - deviations: none

## Suggested Execution

รัน tasks 1-2 แบบ all-in-one เพราะแชร์ routes, imports, build artifact และ acceptance state
