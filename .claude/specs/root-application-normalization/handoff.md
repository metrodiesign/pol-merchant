# Handoff: Root Application Normalization

## Task Summary

Spec `root-application-normalization` Tasks 1-4: คืน application จาก workspace extraction
กลับเป็น root single Next.js app, รักษา route/auth/API behavior และ sync current docs ทั้งหมด.

## Current Status

Done. Requirements, design, tasks, implementation, tests, runtime/browser acceptance และ review ครบ.

## Files Changed

- `src/`, `public/` — source/assets ล่าสุดอยู่ root; Merchant directory namespace ถูกยุบ
- `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`, `vitest.config.ts` —
  single-app toolchain ไม่มี workspaces
- `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `.github/workflows/ci.yml` — root runtime/CI
- `README.md`, `docs/`, `.ai/shared/`, agent/automation guides — current root architecture
- `scripts/production-audit-policy.json` — policy ย้ายจาก top-level `configs/`
- `.claude/specs/root-application-normalization/` — approved spec, Evidence, handoff

## Important Decisions

- Screenshot ของผู้ใช้เป็น authority: root `src/{app,components,hooks,lib,types}` และ `public`.
- Shared package code inline เข้า app-local modules; reuse `src/lib/utils.ts` แทน utility สำเนา.
- Domain names `Merchant*` และ backend `/producer/*` คงเดิม; directory/import namespace ไม่คง.
- Legacy Merchant URLs ใช้ permanent 308 redirects พร้อม query preservation.
- Historical specs/retrospectives ไม่ rewrite; current guides แยก historical boundary ชัด.

## Constraints

- ห้ามสร้าง `apps/`, `packages/`, `configs/`, `tsconfig.base.json` หรือ `src/**/merchant` กลับ.
- ห้ามเปลี่ยน Admin/auth/API contracts โดยไม่มี spec ใหม่.
- ห้าม commit, push หรือเปิด PR จน user ขอ explicit.
- Git index มี staged deletions จาก migration ก่อนงานนี้; งานนี้จงใจไม่เปลี่ยน staging state.

## Tests Run

- `npm run audit:production` -> critical=0, high=0, total=0
- `npm test` -> 22 files, 240 passed
- `npm run lint` -> 0 errors, 8 warnings
- `npm run typecheck` -> passed
- `npm run build` -> passed, 114 static pages
- `.claude/hooks/tests/*.test.sh` -> 270 passed
- `scripts/spec-trace.sh root-application-normalization` -> 33/33 covered
- browser/HTTP/manifest/structure/link/secret/focused-test probes -> passed

## Known Issues

- Local machine ใช้ Node v26.0.0 จึงมี EBADENGINE warning; CI/Docker pin Node 22.19.0.
- ESLint มี 8 warnings เดิมจาก relative `window.location` assignments; ไม่มี error.
- Local BFF ไม่ได้รันระหว่าง browser probe; server log มี expected `ECONNREFUSED`, browser console สะอาด.
- Working tree ใช้ user-owned staged deletion state เดิม; ต้อง review/stage effective root tree ก่อน commit ในงานถัดไป.

## Next Recommended Agent

Human review.

## Next Steps

1. ตรวจ `git status` และ stage effective root tree อย่างตั้งใจก่อน commit เมื่อพร้อม.
2. รัน CI บน PR เข้า `develop`; ไม่ push ตรง protected branch.
