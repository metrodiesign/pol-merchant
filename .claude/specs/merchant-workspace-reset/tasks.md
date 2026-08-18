# Implementation Tasks: Merchant Workspace Reset

> Status: approved 2026-08-17

> แต่ละ task เป็น cohesive, independently verifiable slice ทำทั้ง task ในรอบเดียว
> ผู้ implement แตก micro-steps ใน internal plan เอง ห้าม mark done โดยไม่มี Evidence จากผลรันจริง

## Implementation checklist

- [x] 1. Controlled exact mirror และ standalone workspace — validate pinned inputs และ mutation safety, แสดง dry-run inventory, copy สาม source trees, ลบ approved lab tree แล้วสร้าง Merchant-only root manifest/lock จน `npm ci` และ path/blob parity ผ่าน
  Satisfies: REQ-1.1-REQ-1.6, REQ-1.8-REQ-1.11, REQ-2, REQ-3.1-REQ-3.12, REQ-5.
  Depends on: none.
  Verify: source counts `749/6/6`, categorized inventory, zero mirror mismatch, explicit workspace query และ `npm ci` ผ่านโดยไม่แตะ ignored secrets
  Evidence:
    - test: `npm ci` -> installed 716 packages, workspace install completed
    - test: `npm query .workspace` -> only `@pol/merchant`, `@pol/shared`, `@pol/ui`
    - test: `diff -qr -x node_modules -x .next -x tsconfig.tsbuildinfo -x certificates -- /tmp/pol-merchant-reset.gllzlE/payload/apps/merchant apps/merchant` -> exit 0
    - test: same `diff` command for `packages/ui` and `packages/shared` -> exit 0 for both
    - test: `npm test` -> 22 files passed, 240 tests passed
    - test: `npm run typecheck` -> 3 workspace typechecks passed
    - viewports: n/a — repository/workspace migration
    - deviations: dry-run create/update/delete = `762/5/634`; ignored secrets unread; local Node `v26.0.0` emitted expected engine warning, CI/container pin remains Task 3/4

- [x] 2. Source runtime และ one-time route acceptance — build pinned source reference กับ target, compare normalized route manifests แล้ว smoke HTTPS/HTTP `3002`, root redirect, registration, copied auth/API/navigation และ target-only not-found behavior
  Satisfies: REQ-3.13-REQ-3.14, REQ-4, REQ-6.5-REQ-6.7, REQ-6.15-REQ-6.17.
  Depends on: 1.
  Verify: `npm run build`, `npm start`, HTTPS development smoke และ route report แสดง source/target counts พร้อม `missing=[]`, `extra=[]`
  Evidence:
    - test: pinned source `npm run build:merchant` และ target `npm run build` -> ผ่านทั้งคู่, Next.js `16.3.1`, route output 114 entries
    - test: normalized route comparator -> source `113`, target `113`, `missing=[]`, `extra=[]`; required routes present และ forbidden routes absent
    - test: production HTTP `3002` -> `/` = `307 Location: /dashboard`, `/register` = `200`, `/invite`, `/pay/example`, `/api/health` = `404`
    - test: development HTTPS `3002` ด้วย temporary self-signed certificate -> `/` = `307 Location: /dashboard`, `/register` = `200`; เมื่อไม่มี `ADMIN_API_ORIGIN`, `/api/spec-rewrite-probe` = `404`
    - test: local HTTP stub + `ADMIN_API_ORIGIN` -> `/admin/*`, `/producer/*`, `/api/*` map ตรง `/api/v1/admins/*`, `/api/v1/merchants/*`, `/api/*`
    - test: Task 1 exact mirror parity `changed=0` ครอบ source Admin session/API/navigation implementation
    - viewports: n/a — HTTP/runtime acceptance; browser acceptance อยู่ Task 6
    - deviations: `npm run dev` ครั้งแรกต้องขอสิทธิ์ติดตั้ง local CA; verification ใช้ Next.js native custom certificate flags โดยไม่เปลี่ยน source runtime code

- [x] 3. Target CI และ quality gates — preserve guard/spec/secret floor กับ custom audit policy, adapt workspace commands และ macOS/Windows/Ubuntu smokes โดย pin Node.js/npm และไม่มี ongoing source checkout
  Satisfies: REQ-1.6, REQ-1.10-REQ-1.12, REQ-2.6, REQ-6.1-REQ-6.14, REQ-6.17.
  Depends on: 1, 2.
  Verify: audit, test, lint, typecheck, build, focused-test scan และ CI workflow structure ผ่านด้วย target-only commands
  Evidence:
    - test: `npm run audit:production` -> `critical=0`, `high=0`, `total=0`
    - test: `npm test` -> 22 files passed, 240 tests passed
    - test: `npm run lint` -> 0 errors, 8 copied-source warnings; `npm run typecheck` -> 3 workspace typechecks passed
    - test: `npm run build` -> Next.js `16.3.1`, 114 route entries generated
    - test: focused/skipped test scan -> no committed `.only` หรือ `.skip`
    - test: CI YAML parse + 13-field contract verifier -> `missing=[]`; stale `pol-admin`, old ports, health route และ old start profiles absent
    - viewports: n/a — CI/static and command gates
    - deviations: `actionlint` ไม่มีใน local environment; ใช้ Ruby YAML parser และ explicit workflow contract verifier แทน, GitHub-hosted 3-OS execution รอ PR CI

- [x] 4. Workspace-aware container และ release contract — adapt Docker/Compose ให้ build local packages, run non-root ที่ `3002`, healthcheck exact `307 /dashboard` และคง digest promotion/rollback contract
  Satisfies: REQ-6.13-REQ-6.14, REQ-7.
  Depends on: 1, 2.
  Verify: image build, runtime user/port inspection, repeated root health probe และ staging/production digest configuration ผ่าน
  Evidence:
    - test: `docker build --tag pol-merchant:spec-reset .` -> exit 0, image `sha256:38c341e12300...`
    - test: image inspection -> user `nextjs`, exposed `3002/tcp`, command `node apps/merchant/server.js`, strict redirect healthcheck present
    - test: running container -> UID `1001`, host/container port `3002`, Docker health `healthy`
    - test: repeated root probe 3 ครั้ง -> ทุกครั้ง `307 Location: /dashboard`
    - test: `docker compose config --format json` -> port/env `3002`; immutable digest substitution exact และ rollback contract present
    - viewports: n/a — container/runtime contract
    - deviations: test container ถูก stop/remove หลัง verify; local test image ใช้ซ้ำใน Task 6 แล้วลบหลัง acceptance

- [x] 5. Canonical operating documentation — update runbook และ shared project context ให้ตรง workspace, source versions, app-local environment, port `3002`, one-time parity และ release procedure โดยรักษา historical specs
  Satisfies: REQ-1.12, REQ-3.13-REQ-3.14, REQ-5.11, REQ-7.6-REQ-7.8, REQ-8.
  Depends on: 1, 2, 3, 4.
  Verify: stale-current-state scan เป็นศูนย์ และ documented install, verification, development กับ production commands ตรงผล runtime จริง
  Evidence:
    - test: five-file documentation contract verifier -> `stale_hits=[]`, `missing_contracts=[]`, `emoji_files=[]`
    - test: `git diff --check` -> exit 0; README local links -> 4 links, `missing=[]`
    - test: documented `npm ci`, audit, test, lint, typecheck และ build commands ผ่านใน Task 1/3
    - test: documented HTTPS development, HTTP production และ Docker `3002` smokes ผ่านใน Task 2/4
    - test: current docs ระบุ source SHA, target recovery base, app-local env, canonical target, one-time parity, same-digest promotion และ rollback
    - viewports: n/a — operating documentation
    - deviations: historical specs ไม่ถูกแก้; current docs ระบุชัดว่าเป็น audit record ไม่ใช่ current-state contract

- [x] 6. Integrated acceptance และ handoff — run full repository, browser, route, container, secret และ trace gates แล้วบันทึก source SHA, target base, parity results, commands, deviations และ recovery reference
  Satisfies: REQ-1.7, REQ-3.9-REQ-3.14, REQ-4.1-REQ-4.16, REQ-5.9, REQ-6.10, REQ-7.4-REQ-7.8, REQ-8.11-REQ-8.15.
  Depends on: 1, 2, 3, 4, 5.
  Verify: `scripts/spec-trace.sh merchant-workspace-reset`, full quality gate, full-tree secret scan, browser viewports `375/768/1440` และ container health evidence ผ่านทั้งหมด
  Evidence:
    - test: final audit/test/lint/typecheck/build -> audit `0/0/0`, 22 files and 240 tests passed, lint 0 errors, three typechecks passed, build 114 route entries
    - test: final mirror parity -> zero mismatch for Merchant/UI/shared after ignored generated exclusions; route parity -> source/target `113/113`, `missing=[]`, `extra=[]`
    - test: full-tree secret scan, six guard suites, focused/skipped scan และ spec trace -> ผ่าน; trace coverage `110/110`
    - test: Docker image/runtime -> non-root UID `1001`, port `3002`, health `healthy`, repeated exact `307 Location: /dashboard`
    - browser: `/register` hydrated interaction passed; `/dashboard` unauthenticated transition reached `/login`; horizontal overflow false and console warnings/errors 0
    - viewports: exact `document.documentElement.clientWidth` = `375`, `768`, `1440` สำหรับ registration และ auth surfaces
    - handoff: `.claude/specs/merchant-workspace-reset/handoff.md` records pinned SHAs, files, commands, deviations and recovery base
    - deviations: local Node `v26.0.0`; remote 3-OS CI pending PR; first dev run may request CA; `actionlint` unavailable locally; ignored generated `next-env.d.ts` excluded from tracked parity

## Suggested execution batches

Feature นี้ coupled ผ่าน root manifest, lockfile, runtime, CI และ docs ใช้ session เดียวตามลำดับ
task 1 ถึง 6 ไม่มี `Batch:` tag เพราะแต่ละ task ใหญ่และมี dependency จริง

คำสั่งแนะนำหลัง tasks approval:

```sh
scripts/pane-loop.sh merchant-workspace-reset all-in-one
```
