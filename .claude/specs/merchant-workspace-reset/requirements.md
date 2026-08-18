# Requirements: Merchant Workspace Reset

> Status: approved 2026-08-17, amended 2026-08-17

## Overview

รีเซ็ต repository `pol-merchant` ซึ่งยังเป็น lab ให้ใช้ Merchant workspace จาก `pol-admin`
เป็น application source เดียว โดยคงโครง `apps/merchant` พร้อม local packages ที่จำเป็น
พร้อมรักษา Git history, operating layer, CI และ deployment ownership ของ repository ปลายทาง

## Pinned Inputs

| Input | Value | Purpose |
|---|---|---|
| Source repository | `https://github.com/metrodiesign/pol-admin.git` | เจ้าของ snapshot ต้นทาง |
| Source commit | `79644df1bfa4b9ad9149fdeecedc63cbafda76d6` | baseline แบบ immutable |
| Source app | `apps/merchant` | Merchant application จำนวน 749 tracked files |
| Source package | `packages/ui` | shared presentation จำนวน 6 tracked files |
| Source package | `packages/shared` | pure shared code จำนวน 6 tracked files |
| Target repository | `https://github.com/metrodiesign/pol-merchant.git` | repository ปลายทาง |
| Target base | `ae550fa602593b75c77cbc817cb456c86f44311c` | `pol-merchant/develop` ก่อน reset |
| Working branch | `codex/merchant-workspace-reset` | branch สำหรับ spec และ implementation |

## Non-Goals

- ไม่ลบหรือแก้ `pol-admin/apps/merchant` ในงานนี้
- ไม่แก้ backend `pol-core`
- ไม่รักษา Merchant real API, session, route pruning หรือ runtime contract เดิมของ `pol-merchant`
- ไม่ย้าย commit `8191b44042261820d070c3c70b4d3e638d4b96b5` เข้าสู่ working branch
- ไม่ commit, push หรือเปิด pull request เว้นแต่ผู้ใช้สั่งภายหลัง

## REQ-1: Reproducible Repository Reset

**User Story:** As a POL developer, I want reset lab repository จาก snapshot ที่ระบุแน่นอน,
so that ผลลัพธ์ตรวจสอบย้อนกลับและทำซ้ำได้

**Acceptance Criteria (EARS):**

- 1.1 THE SYSTEM SHALL ใช้ source commit ตามตาราง Pinned Inputs เป็น application baseline เดียว (ubiquitous)
- 1.2 THE SYSTEM SHALL ใช้ target base ตามตาราง Pinned Inputs เป็นฐานของ working branch (ubiquitous)
- 1.3 THE SYSTEM SHALL รักษา Git history ของ repository `pol-merchant` (ubiquitous)
- 1.4 THE SYSTEM SHALL รักษา remote `origin` ของ repository `pol-merchant` (ubiquitous)
- 1.5 THE SYSTEM SHALL รักษา spec history เดิมใต้ `.claude/specs` (ubiquitous)
- 1.6 THE SYSTEM SHALL รักษา enforcement implementation ใต้ `.ai/bin`, `.githooks` และ `.codex` (ubiquitous)
- 1.7 WHEN reset เสร็จ THE SYSTEM SHALL บันทึก source commit และ target base ใน handoff evidence (event-driven)
- 1.8 IF source commit หรือ target base ไม่ตรง Pinned Inputs THEN THE SYSTEM SHALL หยุดก่อนเปลี่ยน application files (error handling)
- 1.9 IF target มี uncommitted change นอก active spec ก่อน reset THEN THE SYSTEM SHALL หยุดพร้อมรายชื่อไฟล์ (error handling)
- 1.10 THE SYSTEM SHALL รักษา operating layer ใต้ `.agents`, `.claude`, `.opencode` และ `.github` (ubiquitous)
- 1.11 THE SYSTEM SHALL รักษา guard, spec-trace และ repository workflow scripts ของ target repository (ubiquitous)
- 1.12 WHERE current-state documentation หรือ CI application configuration ไม่ตรง reset topology THE SYSTEM SHALL แก้เฉพาะส่วนที่จำเป็นโดยไม่ลด enforcement (state-driven)

## REQ-2: Merchant-Only Workspace Topology

**User Story:** As a POL developer, I want Merchant app และ local packages อยู่ใน repository แยก,
so that app build ได้โดยไม่พึ่ง source working tree

**Acceptance Criteria (EARS):**

- 2.1 THE SYSTEM SHALL มี application workspace เดียวชื่อ `@pol/merchant` ที่ `apps/merchant` (ubiquitous)
- 2.2 THE SYSTEM SHALL มี package workspace `@pol/ui` ที่ `packages/ui` (ubiquitous)
- 2.3 THE SYSTEM SHALL มี package workspace `@pol/shared` ที่ `packages/shared` (ubiquitous)
- 2.4 THE SYSTEM SHALL NOT มี workspace `@pol/admin` ใน target repository (ubiquitous)
- 2.5 THE SYSTEM SHALL ให้ root manifest ประกาศเฉพาะ workspace set ตาม REQ-2.1 ถึง REQ-2.3 (ubiquitous)
- 2.6 THE SYSTEM SHALL ให้ root commands `dev`, `dev:clean`, `build`, `start`, `test`, `lint`, `typecheck` และ `audit:production` ครอบ Merchant workspace หรือ repository policy ที่เกี่ยวข้อง (ubiquitous)
- 2.7 WHEN รัน `npm ci` ที่ repository root THE SYSTEM SHALL ติดตั้งทั้งสาม workspaces จาก root lockfile เดียว (event-driven)
- 2.8 THE SYSTEM SHALL สร้าง root lockfile ด้วย npm `11.12.1` ให้ตรงกับ merchant-only workspace graph (ubiquitous)
- 2.9 THE SYSTEM SHALL ให้ `@pol/merchant` resolve `@pol/ui` และ `@pol/shared` จาก local workspaces (ubiquitous)
- 2.10 THE SYSTEM SHALL ให้ `@pol/ui` และ `@pol/shared` ไม่มี dependency ไปยัง app workspace (ubiquitous)
- 2.11 IF workspace dependency ขาดหรือ resolve นอก repository THEN THE SYSTEM SHALL ทำให้ clean install ล้มเหลว (error handling)

## REQ-3: Exact Source Mirror

**User Story:** As a POL developer, I want target application ตรงกับ pinned Merchant workspace,
so that lab behavior ไม่ปะปนกับ implementation เดิม

**Acceptance Criteria (EARS):**

- 3.1 THE SYSTEM SHALL mirror tracked file set ใต้ source `apps/merchant` ไป target `apps/merchant` (ubiquitous)
- 3.2 THE SYSTEM SHALL mirror tracked file set ใต้ source `packages/ui` ไป target `packages/ui` (ubiquitous)
- 3.3 THE SYSTEM SHALL mirror tracked file set ใต้ source `packages/shared` ไป target `packages/shared` (ubiquitous)
- 3.4 WHILE reset acceptance กำลังดำเนินอยู่ THE SYSTEM SHALL รักษา Git blob content ของ mirrored files ให้ตรง source commit (state-driven)
- 3.5 WHEN source ไม่มี tracked file ที่ path ภายใน mirrored trees THE SYSTEM SHALL ไม่เก็บ target-only Git-tracked file ที่ path นั้น (event-driven)
- 3.6 THE SYSTEM SHALL NOT copy source `.next`, `node_modules`, `tsconfig.tsbuildinfo`, certificate หรือ untracked file (ubiquitous)
- 3.7 THE SYSTEM SHALL NOT เก็บ root application tree เดิมที่ `src` หลัง reset (ubiquitous)
- 3.8 THE SYSTEM SHALL NOT เก็บ root static tree เดิมที่ `public` หลัง reset (ubiquitous)
- 3.9 WHEN mirror เสร็จ THE SYSTEM SHALL รายงาน missing, unexpected และ changed tracked files แยกกัน (event-driven)
- 3.10 IF Git-tracked mirrored file set หรือ blob content ต่างจาก source commit ระหว่าง reset acceptance THEN THE SYSTEM SHALL ทำให้ migration verification ล้มเหลว (error handling)
- 3.11 THE SYSTEM SHALL แยก ignored target files ออกจาก mirror parity และ mirror deletion (ubiquitous)
- 3.12 THE SYSTEM SHALL จำกัด mirror deletion ไว้ที่ Git-tracked target files ภายใน mirrored trees (ubiquitous)
- 3.13 WHEN reset acceptance ผ่าน THE SYSTEM SHALL ถือ `pol-merchant` เป็น canonical repository สำหรับ Merchant app (event-driven)
- 3.14 WHERE reset acceptance ผ่านแล้ว THE SYSTEM SHALL NOT บังคับ ongoing parity หรือ synchronization กับ `pol-admin` (state-driven)

## REQ-4: Source Runtime and Route Contract

**User Story:** As a POL developer, I want standalone repository รัน behavior เดียวกับ source Merchant app,
so that แยก repository โดยไม่สร้าง product variant ใหม่

**Acceptance Criteria (EARS):**

- 4.1 WHEN รัน development command THE SYSTEM SHALL เปิด Merchant app ด้วย HTTPS ที่ port `3002` (event-driven)
- 4.2 WHEN รัน production start command THE SYSTEM SHALL เปิด Merchant app ด้วย HTTP ที่ port `3002` (event-driven)
- 4.3 WHEN ผู้ใช้เรียก `/` THE SYSTEM SHALL redirect ไป `/dashboard` (event-driven)
- 4.4 WHILE reset acceptance กำลังดำเนินอยู่ THE SYSTEM SHALL expose user-facing route set เดียวกับ source Merchant app (state-driven)
- 4.5 THE SYSTEM SHALL expose public route `/register` (ubiquitous)
- 4.6 THE SYSTEM SHALL ใช้ source Admin session, `AdminMe`, `getMe` และ auth guard สำหรับ cloned protected routes (ubiquitous)
- 4.7 THE SYSTEM SHALL ใช้ source Admin API adapters สำหรับ cloned Admin operations (ubiquitous)
- 4.8 THE SYSTEM SHALL ใช้ source navigation configuration (ubiquitous)
- 4.9 WHEN `ADMIN_API_ORIGIN` มีค่าใน development THE SYSTEM SHALL rewrite `/admin/*` ไป backend origin (event-driven)
- 4.10 WHEN `ADMIN_API_ORIGIN` มีค่าใน development THE SYSTEM SHALL rewrite `/producer/*` ไป backend origin (event-driven)
- 4.11 WHEN `ADMIN_API_ORIGIN` มีค่าใน development THE SYSTEM SHALL rewrite `/api/*` ไป backend origin (event-driven)
- 4.12 IF `ADMIN_API_ORIGIN` ไม่มีค่า THEN THE SYSTEM SHALL ไม่สร้าง development rewrite (error handling)
- 4.13 IF route ไม่มีใน source Merchant app THEN THE SYSTEM SHALL ตอบ not-found ใน target app (error handling)
- 4.14 THE SYSTEM SHALL NOT expose target-only route `/invite` (ubiquitous)
- 4.15 THE SYSTEM SHALL NOT expose target-only route `/pay/[token]` (ubiquitous)
- 4.16 THE SYSTEM SHALL NOT expose target-only route `/api/health` (ubiquitous)

## REQ-5: Lab Reset and Data Safety

**User Story:** As a repository owner, I want ทิ้ง Merchant-specific lab implementation โดยไม่แตะ secret,
so that reset ทำลายเฉพาะ code ที่อนุมัติ

**Acceptance Criteria (EARS):**

- 5.1 THE SYSTEM SHALL NOT นำ Merchant real API implementation เดิมเข้าสู่ new application tree (ubiquitous)
- 5.2 THE SYSTEM SHALL NOT นำ Merchant session gate เดิมเข้าสู่ new application tree (ubiquitous)
- 5.3 THE SYSTEM SHALL NOT นำ Merchant route-pruning implementation เดิมเข้าสู่ new application tree (ubiquitous)
- 5.4 THE SYSTEM SHALL NOT ให้ migration tooling inspect หรือ emit ค่าจาก `.env`, `.env.local` หรือ credential file (ubiquitous)
- 5.5 THE SYSTEM SHALL NOT copy secret หรือ credential จาก source repository (ubiquitous)
- 5.6 THE SYSTEM SHALL รักษา ignored target secret files โดยไม่ commit (ubiquitous)
- 5.7 THE SYSTEM SHALL copy source `.env.example` ซึ่งมีเฉพาะค่าตัวอย่าง (ubiquitous)
- 5.8 THE SYSTEM SHALL ให้ `.gitignore` ครอบ `.env`, `.env.*`, certificates, `.next`, `node_modules` และ `tsconfig.tsbuildinfo` (ubiquitous)
- 5.9 WHEN reset เสร็จ THE SYSTEM SHALL ผ่าน full-tree secret scan (event-driven)
- 5.10 IF migration พบ symlink หรือ reparse point ภายใน authorized source หรือ target copy/delete paths THEN THE SYSTEM SHALL หยุดพร้อม path ก่อนเปลี่ยนไฟล์ (error handling)
- 5.11 WHERE Merchant runtime ต้องใช้ environment configuration THE SYSTEM SHALL โหลด app-local `apps/merchant/.env.local` ได้โดยไฟล์ยัง ignored และ uncommitted (state-driven)
- 5.12 THE SYSTEM SHALL สร้าง migration input ด้วย `git archive` จาก pinned source commit (ubiquitous)
- 5.13 WHEN migration พร้อมเริ่มเปลี่ยนไฟล์ THE SYSTEM SHALL แสดง dry-run inventory ของ create, update และ delete paths พร้อมจำนวนก่อน write หรือ delete (event-driven)
- 5.14 THE SYSTEM SHALL จำกัด write และ delete targets ไว้ใน approved path allowlist (ubiquitous)
- 5.15 WHERE generated cleanup จำเป็น THE SYSTEM SHALL ลบเฉพาะ path ที่ระบุชัดหลัง validation, reconcile `node_modules` ด้วย `npm ci` และไม่แตะ secret files (state-driven)
- 5.16 IF resolved path อยู่นอก approved allowlist หรือเป็น symlink หรือ reparse point THEN THE SYSTEM SHALL หยุดก่อน write หรือ delete (error handling)
- 5.17 IF reset ต้อง rollback หรือ recover THEN THE SYSTEM SHALL ใช้ target base ตาม Pinned Inputs เป็น recovery reference (error handling)

## REQ-6: Verification and Continuous Integration

**User Story:** As a POL maintainer, I want automated evidence ว่า reset repository ใช้งานได้,
so that source parity และ standalone operation ถูกพิสูจน์ก่อน review

**Acceptance Criteria (EARS):**

- 6.1 WHEN clean install เสร็จ THE SYSTEM SHALL ผ่าน custom production dependency audit ตาม target repository policy (event-driven)
- 6.2 WHEN root test command รัน THE SYSTEM SHALL execute tests ของ `@pol/merchant` และ `@pol/shared` (event-driven)
- 6.3 WHEN root lint command รัน THE SYSTEM SHALL ตรวจทั้งสาม workspaces (event-driven)
- 6.4 WHEN root typecheck command รัน THE SYSTEM SHALL ตรวจทั้งสาม workspaces (event-driven)
- 6.5 WHEN root build command รัน THE SYSTEM SHALL สร้าง Merchant standalone output ใต้ `apps/merchant/.next` (event-driven)
- 6.6 WHEN source และ target application builds เสร็จระหว่าง reset acceptance THE SYSTEM SHALL เปรียบเทียบ normalized route manifests แบบ one-time (event-driven)
- 6.7 THE SYSTEM SHALL NOT มี committed test ที่ใช้ `.only` หรือ `.skip` (ubiquitous)
- 6.8 THE SYSTEM SHALL รักษา CI guard, secret scan และ spec-trace checks ของ target repository (ubiquitous)
- 6.9 THE SYSTEM SHALL ปรับ CI application checks ให้ใช้ merchant-only workspace commands โดยรักษา target CI operating policy (ubiquitous)
- 6.10 IF lint, typecheck, test, build, audit, route verification หรือ secret scan ล้มเหลว THEN THE SYSTEM SHALL block completion (error handling)
- 6.11 THE SYSTEM SHALL รักษา root `audit:production` script และ custom audit policy ของ target repository (ubiquitous)
- 6.12 THE SYSTEM SHALL รักษา CI application matrix บน macOS, Windows และ Ubuntu (ubiquitous)
- 6.13 THE SYSTEM SHALL pin CI และ container build runtime ที่ Node.js `22.19.0` (ubiquitous)
- 6.14 THE SYSTEM SHALL pin package manager ที่ npm `11.12.1` (ubiquitous)
- 6.15 WHEN normalize route manifest THE SYSTEM SHALL เลือกเฉพาะ keys ที่ลงท้าย `/page`, map `/page` เป็น `/`, ตัด suffix `/page`, ตัด routes ที่ขึ้นต้น `/_` และคืนค่า sorted unique routes (event-driven)
- 6.16 WHEN route manifests ต่างกัน THE SYSTEM SHALL บันทึก missing และ extra routes แยกกันใน Evidence (event-driven)
- 6.17 WHERE reset acceptance ผ่านแล้ว THE SYSTEM SHALL NOT ให้ ongoing target CI checkout หรือ synchronize `pol-admin` เพื่อพิสูจน์ source parity (state-driven)

## REQ-7: Deployment Compatibility

**User Story:** As a POL operator, I want deployment files รัน copied Merchant workspace,
so that repository แยกยังสร้างและตรวจ runtime artifact ได้

**Acceptance Criteria (EARS):**

- 7.1 WHEN build container image THE SYSTEM SHALL build `@pol/merchant` พร้อม local workspace packages (event-driven)
- 7.2 THE SYSTEM SHALL ให้ container runner ใช้ non-root user (ubiquitous)
- 7.3 THE SYSTEM SHALL ให้ container runtime listen ที่ port `3002` (ubiquitous)
- 7.4 WHEN container start สำเร็จ THE SYSTEM SHALL ให้ request `/` ได้ response redirect ตาม REQ-4.3 (event-driven)
- 7.5 WHEN container healthcheck เรียก `/` THE SYSTEM SHALL ยอมรับเฉพาะ HTTP `307` พร้อม `Location: /dashboard` (event-driven)
- 7.6 WHEN promote release ไป production THE SYSTEM SHALL ใช้ artifact digest เดียวกับ staging (event-driven)
- 7.7 IF staging verification ไม่ผ่าน THEN THE SYSTEM SHALL block production promotion (error handling)
- 7.8 THE SYSTEM SHALL มี rollback plan ที่อ้าง artifact digest ก่อนหน้า (ubiquitous)

## REQ-8: Documentation and Canonical Context

**User Story:** As a POL developer, I want เอกสารตรงกับ reset topology และ runtime,
so that ไม่มีคำสั่งหรือ architecture claim จาก lab implementation เดิม

**Acceptance Criteria (EARS):**

- 8.1 THE SYSTEM SHALL อัปเดต `README.md` ให้ระบุ merchant-only workspace topology (ubiquitous)
- 8.2 THE SYSTEM SHALL อัปเดต `docs/dev-setup.md` ให้ใช้ root workspace commands (ubiquitous)
- 8.3 THE SYSTEM SHALL อัปเดต `.ai/shared/PROJECT_CONTEXT.md` ให้ประกาศ reset app เป็น current state (ubiquitous)
- 8.4 THE SYSTEM SHALL อัปเดต `.ai/shared/ARCHITECTURE.md` ให้ตรงกับ target filesystem (ubiquitous)
- 8.5 THE SYSTEM SHALL อัปเดต `.ai/shared/stack/nextjs.md` ให้ตรงกับ source versions และ runtime contract (ubiquitous)
- 8.6 THE SYSTEM SHALL ระบุ new spec เป็น current source of truth สำหรับ reset (ubiquitous)
- 8.7 THE SYSTEM SHALL รักษา spec เดิมเป็น historical record (ubiquitous)
- 8.8 THE SYSTEM SHALL NOT อ้าง Merchant real API integration เป็น current implementation หลัง reset (ubiquitous)
- 8.9 THE SYSTEM SHALL NOT อ้าง development port `5300` เป็น current runtime หลัง reset (ubiquitous)
- 8.10 THE SYSTEM SHALL NOT อ้าง staging หรือ production port `3000` เป็น current runtime หลัง reset (ubiquitous)
- 8.11 WHEN documented install command รันบน clean checkout THE SYSTEM SHALL ติดตั้ง workspace graph สำเร็จ (event-driven)
- 8.12 WHEN documented verification commands รันบน clean checkout THE SYSTEM SHALL ผ่าน checks ที่เอกสารระบุ (event-driven)
- 8.13 WHEN documented run command รันหลัง install THE SYSTEM SHALL serve app ที่ port ตาม environment ที่ระบุ (event-driven)
- 8.14 THE SYSTEM SHALL ระบุ app-local environment path `apps/merchant/.env.local` และขั้นตอน manual copy จาก `.env.example` (ubiquitous)
- 8.15 THE SYSTEM SHALL ระบุ source parity เป็น one-time reset acceptance และไม่มี ongoing source synchronization (ubiquitous)

## Edge Cases & Open Questions

| Status | Case | Decision |
|---|---|---|
| Decided | `@pol/merchant` พึ่ง private local packages | คง layout `apps/merchant` และ copy `packages/ui`, `packages/shared` |
| Decided | Source root manifest มี Admin workspace | ใช้เป็น baseline แล้วสร้าง merchant-only root command interface |
| Decided | Source lockfile รวม Admin workspace | Regenerate lock ด้วย npm `11.12.1` ให้ตรง target graph |
| Decided | Target มี real API commit บน local branch อื่น | Base reset จาก `develop`; ไม่ลบ branch หรือ commit เดิม |
| Decided | Target operating layer มี historical specs | รักษาไว้; update เฉพาะ canonical current-state docs และ active spec |
| Decided | Source app ไม่มี `/api/health` | ไม่เพิ่ม route; container smoke ใช้ root redirect |
| Decided | Source/target มี generated files | เปรียบเทียบเฉพาะ Git-tracked source trees; generated files ไม่เป็น migration input |
| Decided | Target อาจมี ignored secret files | ไม่อ่าน ไม่ copy ไม่ลบ ไม่ commit |
| Decided | Source cleanup ใน `pol-admin` | แยกเป็น feature และ pull request ภายหลัง |

### Analysis Log

Full audit. ก่อน amendment ไฟล์ `requirements.md` ยัง untracked, repository HEAD คือ
`ae550fa602593b75c77cbc817cb456c86f44311c` และ pre-amendment SHA-256 คือ
`f0353c64856b0a6e1915c5cf4e5eeaacf702343ec3cbd9d853fd945454f39b00`

| ID | Category | REQ | Decision | Reason |
|---|---|---|---|---|
| A1 | Logical inconsistency | REQ-3, REQ-5 | จำกัด exact mirror และ mirror deletion ที่ Git-tracked files; ignored files อยู่นอก parity | ทำให้ source parity อยู่ร่วมกับการรักษา ignored secrets ได้ |
| A2 | Conflicting constraints | REQ-5 | ห้าม migration tooling inspect/emit secrets; อนุญาต Next.js runtime โหลด app-local environment | แยก migration safety จาก runtime behavior |
| A3 | Unstated assumption | REQ-3, REQ-8 | source parity เป็น one-time reset acceptance; หลังผ่านให้ `pol-merchant` เป็น canonical | ป้องกัน repository ใหม่ผูกกับ source ตลอดไป |
| A4 | Gap | REQ-4, REQ-6 | build pinned source และ target locally, compare normalized route manifests, เก็บ Evidence; ไม่ทำ permanent CI checkout | ให้ route parity ตรวจซ้ำได้โดยไม่สร้าง ongoing coupling |
| A5 | Gap / Conflicting constraints | REQ-2, REQ-6 | รักษา custom production audit และ 3-OS CI matrix; pin Node.js `22.19.0` และ npm `11.12.1`; ปรับ paths/ports | คง target repository policy พร้อมรองรับ workspace ใหม่ |
| A6 | Gap | REQ-1, REQ-6 | รักษา full operating layer และแก้เฉพาะ current-state docs/CI config โดยไม่ลด guards | reset application แต่ไม่ทิ้ง governance ของ target |
| A7 | Gap | REQ-5 | ใช้ pinned `git archive`, approved allowlist, dry-run inventory, no-link traversal และ target-base recovery | จำกัด destructive scope และทำให้ recover ได้ |
| A8 | Gap / Conflicting constraints | REQ-4, REQ-7 | ใช้ `/` เป็น Docker healthcheck; รับเฉพาะ `307` พร้อม `Location: /dashboard`; ไม่เพิ่ม `/api/health` | ตรวจ runtime ด้วย contract ที่ source มีอยู่แล้ว |
