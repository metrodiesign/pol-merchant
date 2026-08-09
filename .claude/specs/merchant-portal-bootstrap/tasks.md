# Implementation Tasks: Merchant Portal Bootstrap

> Status: approved 2026-08-09

> แต่ละงานต้องผ่านรายการ `Verify:` และเพิ่ม `Evidence:` ก่อนเปลี่ยนเป็น `[x]`
> ห้ามคัดลอก secret, source working tree ที่ dirty หรือ generated file เข้ามาใน target

- [x] 1. ทำ exact mirror จาก source snapshot — export tracked files จาก `pol-admin` commit
  `bb001b30b1379df2eedd4ecfcb09c9d23afe6434` ด้วย `git archive`, mirror เฉพาะ Migration
  Scope, ลบ target-only file ภายใน `src/**` และ `public/**`, และรักษา Git/operating/spec layer
  ของ target จากนั้นเก็บ sorted path/blob-hash parity evidence โดยตัด Merchant overlay และ generated
  exclusions ตาม design
  Satisfies: REQ-1.1-REQ-1.13, REQ-8.1
  Depends on: none
  Verify: canonical remote และ full commit SHA ตรง; parity รายงาน missing, unexpected และ hash
  mismatch เป็นศูนย์; source application/runtime test files อยู่ครบ; target Git remote/history และ
  operating/spec files ยังอยู่
  Evidence: Task 1 verified
    - test: `npm ci` -> ติดตั้ง 710 packages สำเร็จ, exit 0
    - test: `npm test` -> 21 test files, 234 tests passed, 0 failed
    - test: Git path/blob parity loop (`git ls-tree`, `git rev-parse`, `git hash-object`) ->
      758 paths, 0 missing, 0 unexpected, 0 hash mismatch; 21 source/target tests ตรงกัน
    - viewports: n/a — migration-only
    - deviations: none

- [x] 2. สร้าง public Merchant entry และ auth boundary — เปลี่ยน runtime metadata และ public UI เป็น
  `POL Merchant`, ให้ `/` ไป `/login`, คง `/register` contract และ `/login-error`, ลบ Admin/Merchant
  SSO action และ Admin session dependency โดยไม่สร้าง token storage, fake session หรือ authorization
  contract พร้อมคง error path ที่ผู้ใช้ลองใหม่ได้
  Satisfies: REQ-2.2, REQ-2.4, REQ-2.8, REQ-2.10, REQ-3.1-REQ-3.9,
  REQ-10.1-REQ-10.4
  Depends on: task 1
  Verify: `npm test` ผ่าน; TypeScript check ผ่าน; `/`, `/login`, `/register` และ `/login-error`
  แสดงผลตาม contract; public UI ผ่าน keyboard, focus, accessible-name และ overflow checks ที่ viewport
  `375`, `768`, `1440`; ไม่มี request `/admin/me` หรือ token ใน browser storage
  Evidence: Task 2 verified
    - test: `npx vitest run src/lib/api/merchant/user.test.ts src/lib/merchant/bootstrap-contract.test.ts`
      -> 2 test files, 9 tests passed, 0 failed
    - test: `npm test` -> 22 test files, 236 tests passed, 0 failed
    - test: `npx tsc --noEmit` -> exit 0
    - test: `npm run build` -> optimized build สำเร็จ, 114 routes generated
    - viewports: `/login`, `/register`, `/login-error` clientWidth 375 OK | 768 OK | 1440 OK;
      horizontal overflow 0; visible controls มี accessible name ครบ; focus-visible indicator ผ่าน
    - deviations: browser smoke ใช้ isolated port `5301` เพราะ source port `5200` ถูกใช้งาน;
      sandbox ไม่อนุญาตให้ Next stat `.env.local` แต่ build exit 0 และไม่ได้อ่าน secret

- [x] 3. จำกัด protected Merchant route surface — prune route ที่ไม่อยู่ใน allowlist, ให้ blocked route
  ตอบ not-found, ลด navigation ทุก variant เหลือ dashboard, policy, order, transaction, Merchant user
  และ Merchant role, และใช้ shared server `merchant-shell-gate.tsx` เปิด protected shell เฉพาะ
  development ที่ตั้ง `MERCHANT_SHELL_PREVIEW=true`; staging/production ต้องปิดเสมอ
  Satisfies: REQ-2.5-REQ-2.7, REQ-2.11-REQ-2.13, REQ-10.5-REQ-10.6
  Depends on: task 1
  Verify: optimized build ผ่าน; route allowlist compile ครบ; blocked/source-only routes ตอบ not-found;
  preview ปิดโดย default, เปิดได้เฉพาะ development opt-in; vertical, horizontal และ mobile navigation
  ไม่มี Admin, control-plane, organization หรือ Minimals entry
  Evidence: Task 3 verified
    - test: `npx vitest run src/lib/merchant/bootstrap-contract.test.ts` -> 7 tests passed, 0 failed
    - test: `npm test` -> 22 test files, 240 tests passed, 0 failed
    - test: `npx tsc --noEmit` -> exit 0
    - test: `npm run build` -> optimized build สำเร็จ, 19 allowlisted/public routes และ not-found
    - runtime: production พร้อม `MERCHANT_SHELL_PREVIEW=true` -> protected และ blocked samples ได้
      `404`; development default -> `/dashboard` ได้ `404`; development opt-in -> protected allowlist
      samples ได้ `200` และ blocked prefixes ได้ `404`
    - viewports: vertical `1440`, horizontal `1440`, mobile `375`; horizontal overflow 0;
      navigation path ตรง allowlist, blocked path 0, accessible name ครบ และ mobile focus-visible 7/7
    - deviations: runtime smoke ใช้ isolated ports `5301`-`5303`; sandbox ไม่อนุญาตให้ Next stat
      `.env.local`; dev watcher ถึง file limit จึงใช้ `WATCHPACK_POLLING=true`; ทุก command ที่ใช้เป็น
      evidence จบตาม expected status

- [x] 4. กำหนด cross-platform runtime และ API boundary — ตั้ง package `pol-merchant`,
  `packageManager` เป็น `npm@11.12.1`, แก้เฉพาะ lockfile root identity, เพิ่ม npm scripts สำหรับ
  development `5300` และ staging/production `3000`, ใช้ Node standard library ใน
  `scripts/clean-development.mjs`, และให้ development rewrite เฉพาะ `/producer/:path*` ผ่าน
  `MERCHANT_API_ORIGIN`; deployed runtime ใช้ same-origin และไม่ bake localhost
  Satisfies: REQ-2.1, REQ-4.1-REQ-4.11, REQ-5.1-REQ-5.13, REQ-6.1-REQ-6.13
  Depends on: task 1
  Verify: `npm ci`, `npm test` และ TypeScript check ผ่าน; standard npm commands bind port ตาม profile;
  port collision จบด้วย non-zero; clean command ลบ Next.js/TypeScript cache แล้วเปิด port `5300`;
  development proxy map path ถูกต้องและ health ไม่ถูก proxy; staging/production bundle ไม่มี
  `http://localhost:5100`; environment example มีค่าปลอมเท่านั้น
  Evidence: Task 4 verified
    - test: `npm ci` -> ติดตั้ง 710 packages สำเร็จ, exit 0
    - test: `npm test` -> 23 test files, 246 tests passed, 0 failed
    - test: `npx tsc --noEmit` และ `node --check scripts/clean-development.mjs` -> exit 0
    - test: `npm run build` -> optimized build สำเร็จ; scan `.next` ไม่พบ
      `http://localhost:5100`
    - runtime: staging/production bind `0.0.0.0:3000`, `/login` ได้ `200`; process ที่สองบน
      port เดียวกันจบ non-zero ด้วย `EADDRINUSE`
    - runtime: development proxy ส่ง `/producer/register?probe=1` ไป
      `/api/v1/merchants/register?probe=1`; `/api/health` ไม่ถูก proxy
    - runtime: `npm run dev:clean` ลบ `.next` marker และ `tsconfig.tsbuildinfo` ก่อนเปิด port `5300`;
      startup จบ non-zero ด้วย `EADDRINUSE` จาก process เดิม PID `28423` ของผู้ใช้
    - config: user ยืนยันคัดลอก known-safe template จาก `/private/tmp/pol-merchant-env-example` ไป
      `.env.example`; template มีเฉพาะ `MERCHANT_API_ORIGIN=http://localhost:5100` และ
      `MERCHANT_SHELL_PREVIEW=false`
    - deviations: sandbox ปฏิเสธ stat `.env.local`/`.env.example`; local Node เป็น `v26.0.0` และ
      Node `22.19` verification อยู่ Task 5/6 CI

- [x] 5. ทำ Ubuntu/container deployment contract — เพิ่ม public `/api/health` body ตายตัว, ใช้
  Node `22.19`/npm `11.12.1` แบบ standalone multi-stage image, รัน non-root ที่
  `0.0.0.0:3000`, probe loopback, และตั้ง Docker Compose service `pol-merchant` เป็น
  `3000:3000`; รองรับ immutable image digest promotion หลัง staging พร้อม previous-digest rollback
  Satisfies: REQ-2.3, REQ-7.1-REQ-7.14
  Depends on: task 4
  Verify: Ubuntu 24.04 npm staging/production smoke ผ่านที่ `3000`; image build/run และ healthcheck ผ่าน;
  inspect ยืนยัน non-root, exposed/bound port, `NODE_ENV=production`, loopback probe และไม่มี credential;
  staging กับ production plan อ้าง image digest เดียวกัน
  Evidence: Task 5 verified
    - test: targeted health/runtime contracts -> 9 tests passed; `npm test` -> 24 test files,
      249 tests passed, 0 failed
    - test: `npx tsc --noEmit`, `npm run lint`, `npm run build` และ `docker compose config` -> exit 0;
      optimized build มี `/api/health`
    - npm runtime: `start:staging` และ `start:production` bind `0.0.0.0:3000`; endpoint ตอบ
      HTTP `200`, `application/json`, body `{"status":"ok"}`
    - image: `pol-merchant:codex-task5` ID
      `sha256:c2a1238370f9ca1a95d5286cb8ca7c77b4305459f8cffee92a144b7f97ebf884`, Linux arm64;
      user build นอก sandbox หลัง BuildKit activity path ถูก policy บล็อก
    - container: Node `v22.19.0`, npm `11.12.1`, UID `1001(nextjs)`, `NODE_ENV=production`,
      bind host/container `3000:3000`, health state `healthy`, loopback probe ตรง contract
    - compose: service `pol-merchant`; `POL_MERCHANT_IMAGE` รับ immutable
      `repository@sha256:<digest>` และ staging/production ใช้ reference เดียวโดยไม่ rebuild
    - deviations: Ubuntu 24.04 native npm execution รวมใน required CI matrix ของ Task 6;
      local runtime evidence ครอบคลุม macOS npm และ Linux container

- [x] 6. บังคับ dependency และ cross-platform CI gates — ใช้ source lock เป็น baselineโดยยอมให้ต่างเฉพาะ
  root identity กับ security remediation ที่บันทึกไว้, ยืนยันไม่มี floating production version,
  ตรวจ license/maintenance, บล็อก Critical และ High ที่มี fix, รายงาน High ที่ไม่มี fixพร้อม owner/review date,
  และขยาย CI เป็น macOS/Windows development smoke
  ที่ `5300` กับ Ubuntu 24.04 quality/build/staging/production smoke ที่ `3000` โดยรักษา guard,
  secret-scan และ spec-trace jobs เดิม
  Satisfies: REQ-8.2-REQ-8.8, REQ-9.1-REQ-9.6, REQ-9.10-REQ-9.12,
  REQ-9.17-REQ-9.19
  Depends on: tasks 2-5
  Verify: dependency graph diff มีเฉพาะข้อยกเว้นที่อนุมัติ; license tableครบ; policy-aware production
  audit บล็อก Critical/fixable High และรายงาน no-fix High; `npm test`, lint, TypeScript check, build, secret scan และ
  `.only`/`.skip` scan ผ่าน; CI matrix และ existing guard jobs ผ่าน
  Evidence: Task 6 verified
    - dependency: normalized lock comparison -> source 796 entries, target 800 entries, เพิ่ม 4,
      เปลี่ยน 64, ลบ 0; ต่างเฉพาะ documented security remediation
    - audit: `npm run audit:production` -> Critical 0, High 0, total 0; policy testsครอบ Critical,
      fixable High, tracked/untracked/expired no-fix High
    - test: `npm test` -> 25 test files, 255 tests passed, 0 failed
    - quality: `npx tsc --noEmit` และ `npm run build` -> exit 0; Next.js `16.3.0` build 22 routes;
      `npm run lint` -> 0 errors, 4 existing/new-rule warnings
    - security: `.ai/bin/check-secrets.sh --all` และ focused/skipped-test scan -> exit 0
    - guards: `.claude/hooks/tests/*.test.sh` -> suitesผ่าน 7/116/19/80/27/11, 0 failed;
      `scripts/spec-trace.sh merchant-portal-bootstrap` -> 119 criteria covered
    - CI: YAML parse และ runtime-contract testผ่าน; matrixประกาศ `macos-latest`, `windows-latest`,
      `ubuntu-24.04` พร้อม Node/npm pin, required ports และรักษา guard/secret/spec-trace job
    - deviations: remote GitHub Actions matrixยังไม่รันจนกว่าจะเปิด PR; local macOS npm,
      Linux container และ static CI contractเป็น implementation evidenceรอบนี้

- [x] 7. ปิด documentation และ acceptance evidence — ปรับ `README.md`, `docs/dev-setup.md`,
  `.ai/shared/PROJECT_CONTEXT.md`, `.ai/shared/ARCHITECTURE.md` และ `.ai/shared/stack/nextjs.md`
  ให้ตรง Merchant, environment matrix, native commands, staging-before-production และ rollback;
  เก็บ final port/platform/browser/parity evidence และรัน traceability gate โดยไม่แก้ spec history อื่น
  Satisfies: REQ-2.9-REQ-2.10, REQ-9.7-REQ-9.16, REQ-10.1-REQ-10.6
  Depends on: tasks 2-6
  Verify: documentation ไม่มี runtime-visible Admin identity หรือ command เก่า; smoke evidence ครบ
  development/staging/production และ macOS/Windows/Ubuntu 24.04; public/preview UI ผ่าน responsive และ
  accessibility checks ทุก viewport/navigation variant; final parity และ
  `scripts/spec-trace.sh merchant-portal-bootstrap` ผ่าน
  Evidence: Task 7 verified
    - docs: `README.md`, `docs/dev-setup.md`, `.ai/shared/PROJECT_CONTEXT.md`,
      `.ai/shared/ARCHITECTURE.md` และ `.ai/shared/stack/nextjs.md` อธิบาย Merchant audience,
      environment/OS matrix, native commands, staging-before-production, immutable digest promotion
      และ previous-digest rollback; stale Admin/Node 20/npm 10/port 5200 scan -> 0 matches
    - runtime: development command กำหนด port `5300`; local smoke ยืนยัน clean/start path และจบ
      `EADDRINUSE` เพราะ process PID `28423` ของผู้ใช้ครอง port; staging/production bind
      `0.0.0.0:3000` และ `/api/health` ตอบ `{"status":"ok"}`; macOS npm และ Linux container ผ่าน
    - public UI: optimized runtime ที่ port `3000`; `/` -> `/login`, public pages render,
      protected/blocked samples -> `404`; widths `375`, `768`, `1440` ไม่มี application overflow,
      controls มี accessible name, focus indicator แสดง และ browser console 0 error/warning
    - preview UI: development opt-in บน isolated port `5301`; vertical/horizontal/mobile navigation
      แสดงเฉพาะ allowlist, blocked entry 0, drawer interaction/focus ผ่านทุก variant; widths
      `375`, `768`, `1440` ไม่มี application overflow
    - fix: browser acceptance พบ chart กว้าง `600px` ดัน mobile root; เพิ่ม native
      `overflow-x-auto` ที่ `StackedBarChart` wrapper ทำให้ scroll จำกัดอยู่ใน widget
    - parity: source `src/**` ต่าง 152 paths (added 6, modified 20, deleted 126) และจัดประเภทเป็น
      Merchant/route/security/REQ-10 overlay ครบ, unclassified 0; `public/**` ต่าง 0;
      copied root scope และ target operating layer มี unclassified difference 0
    - final gate: `npm run audit:production`, `npm test`, `npm run lint`, `npx tsc --noEmit`,
      `npm run build`, secret scan, focused/skipped scan, guard suites และ spec trace -> exit 0;
      25 test files/255 tests, lint 0 errors/4 warnings, build 22 routes, audit Critical 0/High 0
    - deviations: preview browser ใช้ port `5301` เพราะ port `5300` เป็น process ของผู้ใช้และไม่ได้หยุด;
      Windows/Ubuntu native evidence จะมาจาก required GitHub Actions matrix เมื่อเปิด PR;
      local evidence รอบนี้ครอบคลุม macOS npm, Linux container และ static CI runtime contract

## Execution

แนะนำ implement แบบ all-in-one หลังอนุมัติ เพราะ tasks ใช้ application tree, package/runtime config,
CI และ final parity ชุดเดียวกัน เรียงตาม dependency ข้างต้นและหยุดทันทีเมื่อ gate ใดล้มเหลว
