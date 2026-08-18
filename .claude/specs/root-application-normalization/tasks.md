# Implementation Tasks: Root Application Normalization

> Status: approved 2026-08-17 (quick, no gates)

สี่ task แบบ coupled รัน all-in-one เพราะใช้ source tree และ build artifact ชุดเดียวกัน

## Implementation Checklist

- [x] 1. Consolidate application source and local packages at repository root
  Satisfies: REQ-1.1, REQ-1.2, REQ-1.4, REQ-1.5, REQ-2.1, REQ-2.2, REQ-2.3, REQ-2.4, REQ-2.5, REQ-2.6, REQ-3.1, REQ-3.2, REQ-3.3, REQ-3.4, REQ-3.5.
  Verify: root file inventory, forbidden workspace/import scans, focused tests, and source route scan.
  Evidence:
  - structure: root `src/{app,components,hooks,lib,types}` + `public`; `apps`, `packages`,
    `configs`, `tsconfig.base.json`, และ directory `src/**/merchant` ไม่พบ
  - imports: `@pol/ui`, `@pol/shared`, `apps/merchant`, `packages/ui`, `packages/shared` = 0
  - test: `npm test` -> 22 files, 240 passed, 0 failed
  - deviations: audit policy ย้ายจาก root `configs/` ไป `scripts/` เพื่อให้ top-level ตรงรูป

- [x] 2. Restore single-app root toolchain and runtime
  Satisfies: REQ-1.3, REQ-4.1, REQ-4.2, REQ-4.3, REQ-4.4, REQ-4.5, REQ-4.6.
  Depends on: 1.
  Verify: clean dependency install, root commands, standalone build, manifest, and Docker config inspection.
  Evidence:
  - install: clean `npm ci` -> 713 packages; generated lock has 0 workspace entries
  - gates: `npm run audit:production` -> critical=0, high=0, total=0;
    `npm run lint` -> 0 errors, 8 warnings; `npm run typecheck` -> passed
  - build: `npm run build` -> Next.js 16.3.1 compiled, 114 static pages generated
  - container: `docker compose config --quiet` -> passed; Dockerfile copies root standalone output
  - deviations: local runtime Node v26.0.0 emitted EBADENGINE warning; project/CI/Docker remain pinned
    to Node 22.19.0 and npm 11.12.1

- [x] 3. Synchronize all current documentation and guides
  Satisfies: REQ-5.1, REQ-5.2, REQ-5.3, REQ-5.4, REQ-5.5.
  Depends on: 1, 2.
  Verify: current-doc inventory, stale-reference scan, historical file-scope check, and local-link validation.
  Evidence:
  - docs: root README, `docs/`, `.ai/shared`, agent adapters, hook/automation guides และ
    long-form workflow guide อัปเดตเป็น root single app
  - links: Node local-link validator -> 97 current Markdown files, 0 broken links
  - scans: stale workspace/current claims = 0 นอกข้อความห้ามสร้าง workspace กลับ; Markdown emoji = 0
  - history: completed specs/retrospectives ไม่แก้ body; `docs/sdd-optimization-plan.md` เพิ่ม archived marker
  - deviations: none

- [x] 4. Complete structural, runtime, browser, and quality acceptance
  Satisfies: REQ-6.1, REQ-6.2, REQ-6.3, REQ-6.4, REQ-6.5, REQ-6.6.
  Depends on: 1, 2, 3.
  Verify: full gates, route/redirect assertions, HTTP probes, exact viewport browser checks, review, Evidence, and handoff.
  Evidence:
  - manifest: canonical Merchant routes 8/8, legacy route pages 0/8, Admin user/role routes 8/8;
    redirect manifest มี 2 rules ที่ statusCode 308
  - HTTP: `/` -> 307 `/dashboard`; `/register` -> 200; legacy user/role URLs -> 308 พร้อม query
  - browser: production `/register` และ `/user/list` protected transition -> `/login` ผ่านที่ exact
    clientWidth 375/768/1440; overflow=false; console error/warning=0
  - quality: audit 0 production findings; 240 tests; lint 0 errors/8 warnings; typecheck/build passed;
    guard tests 270 passed; effective-tree secret scan passed; focused/skipped tests = 0
  - trace: ทุก requirements-based spec ผ่าน; `root-application-normalization` 33/33 criteria
  - review: code-reviewer -> no findings; effective-tree `git diff --check` passed
  - publication: ไม่มี commit, push หรือ PR
  - deviations: local BFF ไม่ได้รัน จึงมี expected server-side proxy `ECONNREFUSED` ระหว่าง
    protected-route probe; browser transition และ console acceptance ผ่าน

## Execution

รัน Task 1-4 ใน session เดียว แล้ว mark checkbox พร้อม Evidence จากผลที่รันจริง
