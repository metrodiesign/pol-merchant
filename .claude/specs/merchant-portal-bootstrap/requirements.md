# Requirements: Merchant Portal Bootstrap

> Status: approved 2026-08-09, amended 2026-08-09

## Overview

เปลี่ยน repository `pol-merchant` จากฐาน POL Admin เดิมให้เป็น bootstrap ของ POL Merchant
สำหรับ merchant/producer ภายนอก โดยใช้ application/runtime จาก `pol-admin` แบบตรวจสอบย้อนกลับได้
และกำหนดการรัน development, staging, production ตามข้อจำกัดของแต่ละระบบปฏิบัติการ

งานนี้แก้ product direction ที่ยังเป็น Admin ใน
[`PROJECT_CONTEXT.md`](../../../.ai/shared/PROJECT_CONTEXT.md) แต่ไม่สร้าง backend หรือ merchant-session
contract ใหม่เอง

## Domain Terminology

| คำ | ความหมายใน spec นี้ |
|---|---|
| Merchant | ชื่อ product และ repository สำหรับ portal ภายนอก |
| ตัวแทน/นายหน้า | บทบาทผู้ใช้ภาษาไทยของ Merchant ซึ่งสอดคล้องกับ producer ในระบบเดิม |
| Producer compatibility path | prefix `/producer/*` ที่คงไว้เพื่อเชื่อม backend Merchant API |

## Route Allowlist

| กลุ่ม | Route | พฤติกรรม |
|---|---|---|
| Public UI | `/`, `/login`, `/register`, `/login-error` | เปิดได้โดยไม่ต้องมี Merchant session โดย `/` นำทางไป `/login` |
| Protected Merchant shell | `/dashboard`, `/policy/*`, `/checkout/*`, `/order/*`, `/transaction/*`, `/merchant/user/*`, `/merchant/role/*` | compile และ configure ไว้ แต่ staging/production ยังเปิดไม่ได้จนกว่า Merchant session contract พร้อม; development เปิด preview แบบ opt-in ได้ |
| Health | `/api/health` | public endpoint สำหรับ healthcheck เท่านั้น |
| Internal blocked | `/admin/*`, `/control/*`, `/organization/*`, `/minimals/*` | ตอบ not-found ทุก environment |
| Source UI อื่น | route จาก source ที่ไม่อยู่ใน allowlist | ตอบ not-found ใน staging และ production |

## Migration Scope

| กลุ่ม | ขอบเขต |
|---|---|
| คัดลอกจาก source | `src/**`, `public/**`, `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`, `components.json`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`, `Dockerfile`, `.dockerignore` |
| รักษาจาก target แล้วปรับเท่าที่จำเป็น | Git history/remote, operating layer, specs, hooks, CI, `docker-compose.yml`, `.gitignore`, `README.md` |
| Merchant overlay | `/api/health`, Merchant identity, Route Allowlist, port/scripts, API proxy, deployment config และ documentation |
| ไม่คัดลอก | `.env*`, credential, `node_modules`, `.next`, `.playwright-mcp`, `.DS_Store`, `next-env.d.ts`, `tsconfig.tsbuildinfo`, source specs, source retrospectives |
| Source snapshot | remote `https://github.com/metrodiesign/pol-admin.git`, local path `/Users/king_developer/Desktop/Project/pol-admin`, commit `bb001b30b1379df2eedd4ecfcb09c9d23afe6434` |

## Non-Goals

- ไม่สร้างหรือแก้ backend API
- ไม่ invent merchant session endpoint หรือ authorization contract ที่ source ยังไม่มี
- ไม่ redesign business flow ของ policy, order, transaction หรือ registration ที่คัดลอกมา
- ไม่ deploy staging หรือ production จริงในงานนี้
- ไม่ deploy หรือแก้ external reverse proxy จริงในงานนี้
- ไม่คัดลอก dirty working tree, Admin specs หรือ retrospective จาก `pol-admin`

## REQ-1: Reproducible Source Migration

**User Story:** As a POL developer, I want Merchant bootstrap อ้าง source snapshot ที่แน่นอน,
so that ผลการคัดลอกทำซ้ำและตรวจสอบได้

**Acceptance Criteria (EARS):**

- 1.1  THE SYSTEM SHALL ใช้ application/runtime จาก remote `https://github.com/metrodiesign/pol-admin.git` ที่ commit `bb001b30b1379df2eedd4ecfcb09c9d23afe6434` เป็น baseline เดียว (ubiquitous)
- 1.2  THE SYSTEM SHALL นำเข้าเฉพาะไฟล์ที่ Git track อยู่ใน source snapshot (ubiquitous)
- 1.3  THE SYSTEM SHALL รักษา Git history ของ repository `pol-merchant` (ubiquitous)
- 1.4  THE SYSTEM SHALL รักษา remote ของ repository `pol-merchant` (ubiquitous)
- 1.5  THE SYSTEM SHALL รักษา operating layer ของ target ตาม Migration Scope (ubiquitous)
- 1.6  THE SYSTEM SHALL รักษา spec history ของ target ตาม Migration Scope (ubiquitous)
- 1.7  IF source มีไฟล์นอก Migration Scope THEN THE SYSTEM SHALL ไม่เพิ่มไฟล์นั้นเข้า target (error handling)
- 1.8  IF ไฟล์ในขอบเขตคัดลอกขาดจาก target THEN THE SYSTEM SHALL ทำให้ migration parity check ล้มเหลวพร้อมชื่อไฟล์ (error handling)
- 1.9  WHEN migration เสร็จ THE SYSTEM SHALL รักษาพฤติกรรม source ภายใน Route Allowlist ที่ไม่ถูก requirement อื่นใน spec นี้แทนที่ (event-driven)
- 1.10 WHEN migration เสร็จ THE SYSTEM SHALL รักษา test files ของ application/runtime source (event-driven)
- 1.11 WHEN migration ทำ exact mirror ของ path ที่คัดลอกจาก source THE SYSTEM SHALL ลบ target-only file ภายใน path เหล่านั้นที่ไม่อยู่ใน Merchant overlay (event-driven)
- 1.12 THE SYSTEM SHALL จำกัดความต่างจาก source baseline ภายใน path ที่คัดลอกไว้เฉพาะ Merchant overlay ตาม Migration Scope (ubiquitous)
- 1.13 IF parity check พบไฟล์ generated หรือ excluded ตาม Migration Scope THEN THE SYSTEM SHALL ไม่นับไฟล์นั้นเป็น migration mismatch (error handling)

## REQ-2: Merchant Product Identity and Surface

**User Story:** As a merchant/producer, I want เห็นระบบที่ระบุว่าเป็น POL Merchant,
so that ไม่สับสนกับ internal Admin portal

**Acceptance Criteria (EARS):**

- 2.1  THE SYSTEM SHALL ใช้ package name `pol-merchant` (ubiquitous)
- 2.2  THE SYSTEM SHALL ใช้ชื่อแสดงผล `POL Merchant` ใน runtime metadata (ubiquitous)
- 2.3  THE SYSTEM SHALL ใช้ชื่อ service เริ่มต้น `pol-merchant` ใน deployment config (ubiquitous)
- 2.4  WHEN ผู้ใช้เปิด `/` THE SYSTEM SHALL นำทางไป `/login` (event-driven)
- 2.5  THE SYSTEM SHALL configure public, protected, health และ blocked route ตาม Route Allowlist (ubiquitous)
- 2.6  THE SYSTEM SHALL ไม่แสดง Admin, control-plane, organization หรือ Minimals demo ใน navigation (ubiquitous)
- 2.7  IF ผู้ใช้เรียก route ใต้ `/admin`, `/control`, `/organization` หรือ `/minimals` THEN THE SYSTEM SHALL ตอบ not-found (error handling)
- 2.8  IF runtime-visible content ยังมีชื่อ `POL Admin` หรือ `pol-admin` THEN THE SYSTEM SHALL ทำให้ identity verification ล้มเหลว (error handling)
- 2.9  THE SYSTEM SHALL อธิบาย target user เป็น merchant/producer ภายนอกใน product documentation (ubiquitous)
- 2.10 THE SYSTEM SHALL ใช้คำว่า Merchant สำหรับ product และใช้คำว่า ตัวแทน/นายหน้า สำหรับบทบาทผู้ใช้ภาษาไทย (ubiquitous)
- 2.11 IF staging หรือ production ได้รับ UI route ที่ไม่อยู่ใน Route Allowlist THEN THE SYSTEM SHALL ตอบ not-found (error handling)
- 2.12 WHERE Merchant session contract ยังไม่พร้อม THE SYSTEM SHALL ทำให้ protected Merchant shell route ใช้งานไม่ได้ใน staging และ production (optional)
- 2.13 WHERE development preview ถูกเปิดแบบ opt-in THE SYSTEM SHALL จำกัด preview ไว้ที่ protected Merchant shell และทำให้กลไกนี้ไม่มีผลใน staging และ production (optional)

## REQ-3: Merchant Entry and Authentication Boundary

**User Story:** As a merchant/producer, I want entry point ที่ไม่พึ่ง Admin session,
so that ระบบไม่ส่งฉันเข้า dead-end ของ internal portal

**Acceptance Criteria (EARS):**

- 3.1  THE SYSTEM SHALL แสดง `/login` ด้วย identity ของ POL Merchant (ubiquitous)
- 3.2  THE SYSTEM SHALL แสดงทางเข้าสมัคร merchant/producer ที่นำไป `/register` (ubiquitous)
- 3.3  THE SYSTEM SHALL ไม่แสดง Admin SSO action บน Merchant login page (ubiquitous)
- 3.4  WHERE Merchant session contract ยังไม่อยู่ใน scope THE SYSTEM SHALL ไม่แสดง Merchant SSO action และไม่เปิด protected landing ใน deployed environment (optional)
- 3.5  WHEN ผู้ใช้เปิด registration link THE SYSTEM SHALL รักษา registration contract จาก source snapshot (event-driven)
- 3.6  THE SYSTEM SHALL ไม่ใช้ `/admin/me` เป็นตัวพิสูจน์ Merchant session (ubiquitous)
- 3.7  THE SYSTEM SHALL ไม่เก็บ access token หรือ ID token ใน browser storage (ubiquitous)
- 3.8  WHERE Merchant session contract ยังไม่พร้อม THE SYSTEM SHALL เปิด public UI ได้เฉพาะ `/login`, `/register` และ `/login-error` หลัง redirect จาก `/` (optional)
- 3.9  WHERE development preview ถูกเปิด THE SYSTEM SHALL ไม่สร้าง session ปลอมหรือจำลอง authorization contract (optional)

## REQ-4: Environment Profiles and Ports

**User Story:** As a developer or operator, I want คำสั่งรันแยกตาม environment,
so that แต่ละเครื่องใช้ port ที่กำหนดโดยไม่ต้องจำ flag เพิ่ม

**Acceptance Criteria (EARS):**

- 4.1  THE SYSTEM SHALL รองรับ profile `development`, `staging` และ `production` (ubiquitous)
- 4.2  WHEN ผู้พัฒนารัน development command THE SYSTEM SHALL รับ request ที่ `http://localhost:5300` (event-driven)
- 4.3  WHEN operator รัน staging command THE SYSTEM SHALL รับ request ที่ port `3000` (event-driven)
- 4.4  WHEN operator รัน production command THE SYSTEM SHALL รับ request ที่ port `3000` (event-driven)
- 4.5  WHILE ระบบอยู่ใน staging THE SYSTEM SHALL รัน optimized production build (state-driven)
- 4.6  WHILE ระบบอยู่ใน production THE SYSTEM SHALL รัน optimized production build (state-driven)
- 4.7  THE SYSTEM SHALL ใช้ `npm run dev`, `npm run start:staging` และ `npm run start:production` เป็นคำสั่งมาตรฐานของแต่ละ environment profile (ubiquitous)
- 4.8  WHEN ใช้ npm command มาตรฐาน THE SYSTEM SHALL ไม่ต้องรับ port flag เพิ่มจากผู้ใช้ (event-driven)
- 4.9  IF port เป้าหมายถูกใช้งานอยู่ THEN THE SYSTEM SHALL จบ startup ด้วย non-zero exit code (error handling)
- 4.10 WHEN รัน `npm run start:staging` หรือ `npm run start:production` THE SYSTEM SHALL ใช้ optimized runtime เดียวกันที่ port `3000` (event-driven)
- 4.11 THE SYSTEM SHALL แยก staging และ production ด้วย deployment context และชื่อคำสั่งโดยไม่บังคับใช้ `APP_ENV` (ubiquitous)

## REQ-5: Cross-Platform Development

**User Story:** As a developer, I want ใช้ workflow เดียวกันบน MacBook และ Windows,
so that ไม่ต้องพึ่ง shell หรือ compatibility layer คนละชุด

**Acceptance Criteria (EARS):**

- 5.1  THE SYSTEM SHALL รองรับ Node.js 22 LTS เป็น development baseline (ubiquitous)
- 5.2  THE SYSTEM SHALL รองรับ npm 11.12.1 เป็น development baseline (ubiquitous)
- 5.3  WHEN รัน `npm ci` บน macOS THE SYSTEM SHALL ติดตั้ง dependency จาก lockfile สำเร็จ (event-driven)
- 5.4  WHEN รัน `npm ci` บน Windows THE SYSTEM SHALL ติดตั้ง dependency จาก lockfile สำเร็จ (event-driven)
- 5.5  WHEN รัน `npm run dev` บน macOS THE SYSTEM SHALL เปิด development server ที่ port `5300` (event-driven)
- 5.6  WHEN รัน `npm run dev` บน Windows THE SYSTEM SHALL เปิด development server ที่ port `5300` (event-driven)
- 5.7  THE SYSTEM SHALL ไม่ใช้ POSIX-only command ใน npm scripts ที่ใช้พัฒนา (ubiquitous)
- 5.8  WHEN รัน clean-development command THE SYSTEM SHALL ล้าง Next.js build cache (event-driven)
- 5.9  WHEN รัน clean-development command THE SYSTEM SHALL ล้าง TypeScript build cache (event-driven)
- 5.10 WHEN clean-development command ล้าง cache สำเร็จ THE SYSTEM SHALL เปิด development server ที่ port `5300` (event-driven)
- 5.11 THE SYSTEM SHALL ไม่บังคับ Windows developer ให้ใช้ WSL (ubiquitous)
- 5.12 THE SYSTEM SHALL ไม่เพิ่ม dependency ใหม่เพื่อทำ file cleanup หรือกำหนด port เท่านั้น (ubiquitous)
- 5.13 THE SYSTEM SHALL ประกาศ `packageManager` เป็น `npm@11.12.1` ใน package manifest (ubiquitous)

## REQ-6: API Origin and Environment Safety

**User Story:** As an operator, I want API routing ตรงกับ environment,
so that development ต่อ local backend และ deployed environments ใช้ reverse proxy เดียวกัน

**Acceptance Criteria (EARS):**

- 6.1  WHILE ระบบอยู่ใน development THE SYSTEM SHALL ใช้ `MERCHANT_API_ORIGIN` เมื่อกำหนดไว้ หรือใช้ `http://localhost:5100` เป็นค่าเริ่มต้น (state-driven)
- 6.2  THE SYSTEM SHALL ใช้ชื่อ config `MERCHANT_API_ORIGIN` สำหรับ development proxy (ubiquitous)
- 6.3  WHILE ระบบอยู่ใน staging THE SYSTEM SHALL เรียก API แบบ same-origin (state-driven)
- 6.4  WHILE ระบบอยู่ใน production THE SYSTEM SHALL เรียก API แบบ same-origin (state-driven)
- 6.5  THE SYSTEM SHALL ไม่ bake `http://localhost:5100` ลง staging bundle (ubiquitous)
- 6.6  THE SYSTEM SHALL ไม่ bake `http://localhost:5100` ลง production bundle (ubiquitous)
- 6.7  THE SYSTEM SHALL เก็บเฉพาะค่าตัวอย่างที่ไม่เป็น secret ใน environment template (ubiquitous)
- 6.8  THE SYSTEM SHALL ignore `.env` และ `.env.*` ที่ไม่ใช่ example file (ubiquitous)
- 6.9  IF development backend request ล้มเหลว THEN THE SYSTEM SHALL คง development server ไว้และแสดง request error ที่ผู้ใช้ลองใหม่ได้ (error handling)
- 6.10 WHILE ระบบอยู่ใน development THE SYSTEM SHALL proxy เฉพาะ `/producer/:path*` ไปยัง Merchant backend origin (state-driven)
- 6.11 IF request path เป็น `/api/health` THEN THE SYSTEM SHALL ไม่ส่ง request นั้นผ่าน Merchant backend proxy (error handling)
- 6.12 WHILE ระบบอยู่ใน staging หรือ production THE SYSTEM SHALL ใช้ reverse-proxy contract จาก same-origin `/producer/*` ไป upstream `/api/v1/merchants/*` (state-driven)
- 6.13 WHEN migration อ่าน source snapshot THE SYSTEM SHALL ไม่คัดลอก source `.env*` และ SHALL ปรับเฉพาะ target `.env.example` ด้วยค่าปลอมที่ไม่เป็น secret (event-driven)

## REQ-7: Ubuntu and Container Deployment

**User Story:** As an operator, I want deploy staging และ production บน Ubuntu 24.04 ได้ทั้ง npm และ container,
so that deployment ไม่ผูกกับเครื่องพัฒนา

**Acceptance Criteria (EARS):**

- 7.1  WHEN รัน staging ผ่าน npm บน Ubuntu 24.04 THE SYSTEM SHALL เปิด service ที่ port `3000` (event-driven)
- 7.2  WHEN รัน production ผ่าน npm บน Ubuntu 24.04 THE SYSTEM SHALL เปิด service ที่ port `3000` (event-driven)
- 7.3  WHERE Docker deployment ถูกใช้ THE SYSTEM SHALL bind service ที่ `0.0.0.0:3000` ภายใน container (optional)
- 7.4  WHERE Docker deployment ถูกใช้ THE SYSTEM SHALL expose container port `3000` (optional)
- 7.5  WHERE Docker Compose ถูกใช้ THE SYSTEM SHALL map host port `3000` ไป container port `3000` (optional)
- 7.6  WHERE Docker deployment ถูกใช้ THE SYSTEM SHALL รัน application process ด้วย non-root user (optional)
- 7.7  WHILE container อยู่ใน staging THE SYSTEM SHALL ใช้ `NODE_ENV=production` (state-driven)
- 7.8  WHILE container อยู่ใน production THE SYSTEM SHALL ใช้ `NODE_ENV=production` (state-driven)
- 7.9  WHEN unauthenticated `GET /api/health` ถูกเรียกบน healthy instance THE SYSTEM SHALL ตอบ HTTP `200` พร้อม JSON body `{ "status": "ok" }` (event-driven)
- 7.10 WHERE Docker healthcheck ถูกใช้ THE SYSTEM SHALL probe `http://127.0.0.1:3000/api/health` (optional)
- 7.11 THE SYSTEM SHALL ไม่ฝัง credential ลง container image (ubiquitous)
- 7.12 THE SYSTEM SHALL เปิด `/api/health` แบบ public โดยไม่ต้องมี Merchant session (ubiquitous)
- 7.13 THE SYSTEM SHALL ไม่ส่งข้อมูล sensitive, dependency detail หรือ environment detail จาก `/api/health` (ubiquitous)
- 7.14 WHEN container image ผ่าน staging verification THE SYSTEM SHALL promote image digest เดิมไป production โดยไม่ rebuild (event-driven)

## REQ-8: Dependency Integrity

**User Story:** As a maintainer, I want dependency set ที่ทำซ้ำและตรวจสอบได้,
so that migration ไม่สร้าง supply-chain risk แบบเงียบ ๆ

**Acceptance Criteria (EARS):**

- 8.1  THE SYSTEM SHALL ใช้ `package-lock.json` จาก source snapshot เป็น dependency baseline (ubiquitous)
- 8.2  THE SYSTEM SHALL ไม่ใช้ floating version `*` หรือ `latest` สำหรับ production dependency (ubiquitous)
- 8.3  WHEN dependency ใหม่เข้าสู่ target THE SYSTEM SHALL บันทึก license ของ dependency นั้น (event-driven)
- 8.4  WHEN dependency ใหม่เข้าสู่ target THE SYSTEM SHALL บันทึก maintenance status ของ dependency นั้น (event-driven)
- 8.5  WHEN production dependency audit ทำงาน THE SYSTEM SHALL มี unresolved Critical vulnerability เท่ากับศูนย์ (event-driven)
- 8.6  IF production dependency audit พบ High vulnerability ที่มี patched version THEN THE SYSTEM SHALL ทำให้ verification ล้มเหลวจน dependency ได้รับ security remediation (error handling)
- 8.7  IF production dependency audit พบ High vulnerability ที่ยังไม่มี patched version THEN THE SYSTEM SHALL รายงาน advisory, dependency path, owner และ review date โดยไม่ suppress ผล audit (error handling)
- 8.8  WHEN design ระบุ dependency ใหม่เทียบกับ target baseline THE SYSTEM SHALL บันทึก license และ maintenance status ของทุก dependency ในตารางเดียว (event-driven)

## REQ-9: Verification and Documentation

**User Story:** As a maintainer, I want evidence ว่า migrated Merchant bootstrap ใช้งานได้จริง,
so that port, platform และ source-parity claims ไม่เป็นเพียง configuration บนกระดาษ

**Acceptance Criteria (EARS):**

- 9.1  WHEN implementation เสร็จ THE SYSTEM SHALL ผ่าน `npm test` (event-driven)
- 9.2  WHEN implementation เสร็จ THE SYSTEM SHALL ผ่าน `npm run lint` (event-driven)
- 9.3  WHEN implementation เสร็จ THE SYSTEM SHALL ผ่าน `npx tsc --noEmit` (event-driven)
- 9.4  WHEN implementation เสร็จ THE SYSTEM SHALL ผ่าน `npm run build` (event-driven)
- 9.5  WHEN implementation เสร็จ THE SYSTEM SHALL ผ่าน secret scan ของ repository (event-driven)
- 9.6  WHEN implementation เสร็จ THE SYSTEM SHALL ไม่มี `.only` หรือ `.skip` ค้างใน test (event-driven)
- 9.7  THE SYSTEM SHALL บันทึก smoke-test evidence สำหรับ development port `5300` (ubiquitous)
- 9.8  THE SYSTEM SHALL บันทึก smoke-test evidence สำหรับ staging port `3000` (ubiquitous)
- 9.9  THE SYSTEM SHALL บันทึก smoke-test evidence สำหรับ production port `3000` (ubiquitous)
- 9.10 THE SYSTEM SHALL บันทึก compatibility evidence สำหรับ macOS (ubiquitous)
- 9.11 THE SYSTEM SHALL บันทึก compatibility evidence สำหรับ Windows (ubiquitous)
- 9.12 THE SYSTEM SHALL บันทึก compatibility evidence สำหรับ Ubuntu 24.04 (ubiquitous)
- 9.13 THE SYSTEM SHALL อธิบาย environment matrix ใน `README.md` (ubiquitous)
- 9.14 THE SYSTEM SHALL อธิบายคำสั่งรันแต่ละ environment ใน `README.md` (ubiquitous)
- 9.15 THE SYSTEM SHALL อธิบาย staging-before-production ใน deployment documentation (ubiquitous)
- 9.16 THE SYSTEM SHALL อธิบาย rollback procedure ใน deployment documentation (ubiquitous)
- 9.17 THE SYSTEM SHALL รัน compatibility CI matrix บน `macos-latest`, `windows-latest` และ `ubuntu-24.04` (ubiquitous)
- 9.18 WHEN CI รันบน `macos-latest` หรือ `windows-latest` THE SYSTEM SHALL ทำ `npm ci` และ development startup smoke test ที่ port `5300` (event-driven)
- 9.19 WHEN CI รันบน `ubuntu-24.04` THE SYSTEM SHALL ทำ `npm ci`, quality checks, optimized build และ staging/production startup smoke test ที่ port `3000` (event-driven)

## REQ-10: UI Compatibility and Accessibility

**User Story:** As a merchant/producer, I want public และ preview UI ใช้งานได้บนขนาดหน้าจอหลักและด้วย keyboard,
so that bootstrap ไม่ถอยหลังด้าน responsive behavior หรือ accessibility พื้นฐาน

**Acceptance Criteria (EARS):**

- 10.1 WHEN UI ถูกตรวจที่ viewport width `375`, `768` และ `1440` pixels THE SYSTEM SHALL ไม่มี horizontal overflow ที่เกิดจาก application layout (event-driven)
- 10.2 THE SYSTEM SHALL ทำให้ interactive control ทุกตัวบน public UI เข้าถึงได้ด้วย keyboard (ubiquitous)
- 10.3 WHILE interactive control ได้ keyboard focus THE SYSTEM SHALL แสดง visible focus indicator (state-driven)
- 10.4 THE SYSTEM SHALL ใช้ semantic element หรือ accessible name สำหรับ form field, link และ button บน public UI (ubiquitous)
- 10.5 WHEN vertical, horizontal หรือ mobile navigation ถูก render THE SYSTEM SHALL ไม่แสดง Admin, control-plane, organization หรือ Minimals entry (event-driven)
- 10.6 WHERE development preview ถูกเปิด THE SYSTEM SHALL ใช้ข้อกำหนด responsive และ accessibility เดียวกับ public UI (optional)

## Edge Cases & Open Questions

| สถานะ | ประเด็น | การตัดสินใจหรือผลกระทบ |
|---|---|---|
| ตัดสินแล้ว | Source working tree มีไฟล์แก้ค้าง | ใช้ commit `bb001b3` เท่านั้น ไม่อ่าน dirty changes เป็น migration input |
| ตัดสินแล้ว | “คัดลอกทั้งหมด” อาจรวม agent framework และประวัติงาน Admin | คัดลอกเฉพาะ application/runtime ตาม Migration Scope |
| ตัดสินแล้ว | Merchant-only surface ชนกับ source ที่มี internal routes | เก็บ shared code ได้ แต่ `/admin`, `/control`, `/organization`, `/minimals` ต้อง route ไม่ได้ |
| ตัดสินแล้ว | Staging และ production ใช้ port เดียวกัน | แยก environment command แต่ใช้ port `3000` ทั้งคู่ |
| ตัดสินแล้ว | Windows ไม่รองรับ `rm -rf` ใน npm script | development scripts ต้อง shell-neutral และไม่บังคับ WSL |
| Follow-up | Source มี Admin guard ผ่าน `/admin/me` แต่ไม่มี Merchant session guard สมบูรณ์ | Bootstrap ไม่ invent contract; Merchant SSO และ protected landing ต้องมี spec หลัง backend contract พร้อม |
| Follow-up | Production deployment จริงต้องผ่าน staging | งานนี้เตรียม config และเอกสารเท่านั้น ไม่ deploy external environment |
| ตัดสินแล้ว | Source lock parity ขัดกับ advisory ใหม่ที่ upstream ยังไม่มี fix | ใช้ source lock เป็น baseline; อนุญาต security remediation ที่บันทึกไว้; Critical บล็อกเสมอ, High ที่มี fix บล็อก, High ที่ไม่มี fix ต้องติดตามแบบเปิดเผย |

### Analysis Log

Audit แบบเต็มอ้าง repository base `d55dcae` ขณะ `requirements.md` ยังเป็น untracked file
จึงไม่มี path-specific commit; pre-amendment SHA-256 คือ
`cf8248c8ed7bf4a4c1fe866d564e8216862e5c75cc277c2188879e298f3b3b4f`

| รหัส | หมวด | Requirement | การตัดสินใจที่อนุมัติ | เหตุผล |
|---|---|---|---|---|
| A1 | Completeness / Conflict | REQ-2, REQ-3 | ใช้ bootstrap shell; deployed UI เปิดเฉพาะ public surface จน Merchant session contract พร้อม; development preview ต้อง opt-in | ตัดความขัดแย้งระหว่าง protected navigation กับการห้าม invent auth contract |
| A2 | Terminology / Scope | REQ-2, REQ-6 | Product ใช้ Merchant, ผู้ใช้ไทยใช้ ตัวแทน/นายหน้า, backend compatibility คง `/producer/*`; กำหนด Route Allowlist ชัดเจน | ทำคำศัพท์และขอบเขต route ให้ทดสอบได้ |
| A3 | Testability | REQ-1.9 | จำกัด source behavior parity ไว้ใน Route Allowlist | หลีกเลี่ยงข้อกำหนดกว้างจนพิสูจน์ไม่ได้ |
| A4 | Completeness | REQ-1 | exact mirror เฉพาะ path ที่ระบุ, ลบ target-only file ภายใน path, ยกเว้น Merchant overlay และ generated exclusion | ทำ migration ซ้ำและตรวจ parity ได้ |
| A5 | Ambiguity | REQ-4, REQ-7 | ใช้ command สามชื่อ, staging/production share optimized runtime และ port, ไม่บังคับ `APP_ENV`, promote image digest เดิม | แยก operator intent โดยไม่สร้าง runtime variant เกินจำเป็น |
| A6 | Completeness / Security | REQ-6 | development override มี default, proxy เฉพาะ `/producer/:path*`, health ไม่ผ่าน proxy, deployed contract ใช้ same-origin | กัน route collision และ localhost รั่วเข้า deployed bundle |
| A7 | Feasibility / Verification | REQ-5, REQ-9 | คง npm `11.12.1`, เพิ่ม `packageManager`, เพิ่ม CI matrix macOS/Windows/Ubuntu | ทำ cross-platform claim ให้มี evidence |
| A8 | Testability / Security | REQ-7 | health endpoint public, response exact `{ "status": "ok" }`, probe ผ่าน loopback และไม่เผย detail | ให้ healthcheck deterministic และไม่รั่วข้อมูล |
| A9 | Security / Completeness | REQ-8 | High/Critical ต้องศูนย์ ไม่มี risk exception; license/maintenance บันทึกเป็นตารางใน design | ปิดช่อง bypass supply-chain gate |
| A10 | Missing UX Requirement | REQ-10 | ตรวจ viewport `375/768/1440`, keyboard, visible focus, accessible name และ navigation ทุก variant | รักษา responsive/accessibility baseline ของ UI ที่ย้ายมา |
| A11 | Feasibility / Security | REQ-8 | Supersede A9 หลัง live audit: Critical ต้องศูนย์; High ที่มี fix ต้อง remediate; High ที่ไม่มี fix ต้องมี advisory path, owner และ review dateโดยไม่ suppress | Source snapshot มี advisory ใหม่ที่ upstream ระบุ `No fix available`; zero-High และ exact lock parity จึงทำพร้อมกันไม่ได้ |
