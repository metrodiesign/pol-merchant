# Handoff Note: Merchant Workspace Reset

## Task Summary

Implement `merchant-workspace-reset` tasks 1–6 แบบ all-in-one
ย้าย pinned Merchant workspace จาก `pol-admin` มาเป็น standalone canonical
`pol-merchant` โดยคง target governance, CI, container และ release policy

## Current Status

Implementation complete. Local acceptance ผ่านครบ
พร้อม human review และเปิด PR เข้า `develop`

Remote GitHub Actions matrix ยังไม่รันจนกว่าจะเปิด PR

## Pinned Inputs

| Input | Value |
|---|---|
| Source repository | `https://github.com/metrodiesign/pol-admin.git` |
| Source commit | `79644df1bfa4b9ad9149fdeecedc63cbafda76d6` |
| Target repository | `https://github.com/metrodiesign/pol-merchant.git` |
| Target recovery base | `ae550fa602593b75c77cbc817cb456c86f44311c` |
| Working branch | `codex/merchant-workspace-reset` |

## Files Changed

- `apps/merchant/**` — exact tracked source Merchant application mirror
- `packages/ui/**`, `packages/shared/**` — exact local package mirrors
- `src/**`, `public/**` และ legacy root app config — removed approved lab tree
- `package.json`, `package-lock.json`, `tsconfig.base.json` — explicit Merchant-only workspace graph
- `eslint.config.mjs`, `vitest.config.ts`, `.gitignore` — workspace tooling and generated exclusions
- `.github/workflows/ci.yml` — target 3-OS policy adapted to port `3002` and root workspace commands
- `Dockerfile`, `docker-compose.yml`, `.dockerignore` — workspace build, non-root runtime and strict redirect health
- `README.md`, `docs/dev-setup.md` — install, runtime, release and rollback runbook
- `.ai/shared/PROJECT_CONTEXT.md`, `.ai/shared/ARCHITECTURE.md`, `.ai/shared/stack/nextjs.md` — canonical current state
- `.claude/specs/merchant-workspace-reset/**` — approved artifacts, task Evidence and handoff

## Important Decisions

- Root workspaces ระบุ `apps/merchant`, `packages/ui`, `packages/shared` แบบ explicit
- Application mirror ไม่มี overlay; source Admin session, API adapters and navigation remain byte-identical
- Root `/` health contract คือ exact `307 Location: /dashboard`
- `/invite`, `/pay/[token]`, `/api/health` remain absent
- Development ใช้ HTTPS `3002`; production/container ใช้ HTTP `3002`
- `ADMIN_API_ORIGIN` อยู่ app-local development environment; production ใช้ same-origin
- Source parity เป็น one-time acceptance ไม่มี permanent CI/source coupling
- Release build once, staging verify, production promote same digest, rollback previous digest

## Constraints

- ห้าม reintroduce Admin workspace หรือ root legacy application tree
- ห้ามแก้ mirrored app/package files โดยไม่มี approved follow-up spec
- ห้าม commit ignored `.env.local`, certificates หรือ generated output
- ห้าม push ตรง `main` หรือ `develop`; ใช้ PR เท่านั้น
- Target recovery ใช้ commit `ae550fa602593b75c77cbc817cb456c86f44311c`

## Tests Run

- `npm ci` -> installed 716 packages; three local workspaces resolved
- `npm run audit:production` -> Critical 0, High 0, total 0
- `npm test` -> 22 files, 240 tests passed
- `npm run lint` -> 0 errors, 8 copied-source warnings
- `npm run typecheck` -> three workspace typechecks passed
- `npm run build` -> Next.js 16.3.1, 114 route output entries
- normalized source/target route comparison -> 113/113, `missing=[]`, `extra=[]`
- exact mirror diff -> zero app/UI/shared mismatch after generated exclusions
- production HTTP and development HTTPS smoke -> port `3002`, root redirect exact
- rewrite smoke with local stub -> Admin, producer and API paths mapped correctly
- Docker build/runtime -> non-root UID 1001, port `3002`, health `healthy`
- browser `/register` -> React state interaction passed at exact widths `375/768/1440`
- browser protected `/dashboard` -> unauthenticated transition to `/login` at all three widths
- browser overflow -> false at all acceptance widths; console warnings/errors -> 0
- `.ai/bin/check-secrets.sh --all` -> exit 0
- guard test suites -> 6 suites passed
- focused/skipped test scan -> clean
- `scripts/spec-trace.sh merchant-workspace-reset` -> 110/110 EARS criteria covered

## Known Issues

- Local host uses Node `v26.0.0`; CI and Docker pin Node `22.19.0`, container build passed
- GitHub-hosted macOS/Windows/Ubuntu matrix awaits PR
- First `npm run dev` may request local CA installation; local verification used a temporary custom certificate
- `npm start` emits Next.js standalone warning but HTTP acceptance passes; deployed entrypoint uses standalone server directly
- `actionlint` is not installed locally; CI YAML passed Ruby parse and explicit contract verification
- Ignored generated `apps/merchant/next-env.d.ts` is excluded from tracked-source parity
- Temporary migration staging 1.0 GB และ local Docker test image ถูกลบหลังบันทึก Evidence; recovery ใช้ pinned Git base

## Next Recommended Agent

Human review

## Next Steps

1. Review diff, deletion scope and Evidence
2. Invoke `$ship-pr develop` when ready to commit and open PR
3. Require full GitHub Actions matrix before merge
