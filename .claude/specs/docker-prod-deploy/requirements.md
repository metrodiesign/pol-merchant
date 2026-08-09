# Requirements: Docker Production Deployment (pol-admin)
> Status: approved 2026-07-13

## Overview

pol-admin คือ frontend admin portal ภายในของ payment orchestration layer (ดู
`.ai/shared/PROJECT_CONTEXT.md`) — ปัจจุบันมี component/mock data ครบแต่ **ไม่มีทางรัน production
จริง** เลย (ไม่มี Docker artifact ใดๆ ในระบบ). Feature นี้ปิด gap นั้น: สร้าง production Docker
image + local compose สำหรับ pol-admin เดี่ยวๆ ที่รันได้จริงหลัง reverse proxy ตาม topology ที่ repo
ตั้งใจไว้อยู่แล้ว (same-origin กับ `pol-core` BFF auth) — ไม่แตะ CI/registry wiring หรือ sibling
repo ใดๆ ในรอบนี้.

## REQ-1: Containerized Production Build

**User Story:** As an ops/deploy operator, ฉันต้องการ reproducible multi-stage Docker image ของ
pol-admin, so that production deployment ไม่ต้องพึ่ง host environment ที่ config มือ.

**Acceptance Criteria (EARS):**
- 1.1  THE SYSTEM SHALL build a production image ผ่าน multi-stage Dockerfile (`deps` → `builder` →
      `runner`). (ubiquitous — Architecture Overview, Technology Decisions)
- 1.2  WHEN `docker build` รัน THE SYSTEM SHALL สร้าง `runner` stage บน `node:20-alpine` ที่มีแค่
      Next.js standalone output (`.next/standalone`, `.next/static`, `public`) ไม่มี devDependency
      หลงเหลือ. (event-driven — Technology Decisions: build output mode + base image)
- 1.3  THE SYSTEM SHALL รัน application process เป็น non-root user ใน runner stage.
      (ubiquitous — Technology Decisions: runtime user)
- 1.4  IF `npm run build` fail ระหว่าง builder stage THEN THE SYSTEM SHALL หยุด `docker build` ด้วย
      exit code ไม่ใช่ศูนย์ และไม่สร้าง image ออกมา. (error handling — Error Handling Strategy: build-time failure)

## REQ-2: Runtime Configuration ตาม Same-Origin Topology

**User Story:** As an ops operator ที่ deploy pol-admin หลัง reverse proxy, ฉันต้องการให้ runtime
config ของ container ตรงกับ same-origin topology ที่มีอยู่แล้ว, so that OIDC BFF auth ทำงานต่อได้
โดยไม่ต้องแก้โค้ด.

**Acceptance Criteria (EARS):**
- 2.1  THE SYSTEM SHALL เปิด application ที่ port 5300 ภายใน container แบบ hardcode — ไม่รองรับ
      `PORT` env override ในรอบนี้ (ตัดสินจาก /spec-analyze finding #4). (ubiquitous — Data Models & Interfaces: container interface)
- 2.2  WHERE `ADMIN_API_ORIGIN` เว้นว่าง/unset THE SYSTEM SHALL เสิร์ฟแอปโดยสมมติว่า reverse proxy
      ภายนอกทำ same-origin routing ไปยัง backend ให้แล้ว. (optional feature — Architecture Overview: runtime topology, Data Models & Interfaces: env contract)
- 2.3  IF ผู้ deploy ตั้งค่า `ADMIN_API_ORIGIN` ใน production env template THEN THE SYSTEM SHALL มี
      comment เตือนชัดเจนใน `docker-compose.yml`/env template ว่าต้องเว้นว่างใน prod.
      (error handling — Error Handling Strategy: env var misconfiguration)
- 2.4  IF `NODE_ENV=production` และมีการตั้งค่า `ADMIN_API_ORIGIN` ไม่ว่างเปล่า THEN THE SYSTEM SHALL
      log startup warning ชัดเจน (ไม่ fail-fast) ก่อนรันแอปต่อ. (error handling — เพิ่มจาก
      /spec-analyze finding #2: doc comment อย่างเดียวจับ silent misconfiguration ไม่ได้จริง)

## REQ-3: Health Check

**User Story:** As a reverse proxy/orchestrator, ฉันต้องการ lightweight liveness endpoint, so that
container ที่ไม่ healthy ถูกตรวจจับและ restart อัตโนมัติ.

**Acceptance Criteria (EARS):**
- 3.1  THE SYSTEM SHALL เปิด `GET /api/health` ที่คืน HTTP 200 body `"ok"` เมื่อ process alive —
      liveness check ล้วน ไม่เช็ค reachability ของ backend/`pol-core` หรือ dependency อื่นใด
      (ตัดสินจาก /spec-analyze finding #3). (ubiquitous — Data Models & Interfaces: health interface, Sequence Diagram #3)
- 3.2  THE SYSTEM SHALL ประกาศ Docker `HEALTHCHECK` ที่ poll `/api/health` ทุก 30 วินาที ผ่าน Node
      เอง (เช่น `node -e` ยิง HTTP request) ไม่ใช่ `curl`/`wget` — เพราะ `node:20-alpine` ไม่มีสองตัวนี้
      ติดมาโดย default (ตัดสินจาก /spec-analyze finding #1). (ubiquitous — Sequence Diagram #3; default interval ตาม Docker convention — ดู Edge Cases)
- 3.3  IF `/api/health` fail ติดกัน 3 ครั้ง THEN THE SYSTEM SHALL mark container เป็น unhealthy
      เพื่อให้ host restart policy ทำงานต่อ. (error handling — Error Handling Strategy: health check fail; threshold = Docker default)
- 3.4  THE SYSTEM SHALL กำหนด `start_period` ~10 วินาทีบน Docker `HEALTHCHECK` เพื่อกัน
      false-unhealthy ระหว่าง container cold start. (ubiquitous — เพิ่มจาก /spec-analyze finding #6)

## REQ-4: Image Tagging & Local Compose

**User Story:** As an ops operator, ฉันต้องการ image tag ที่ trace กลับ commit ได้ + compose file
ที่ scope แค่ app นี้, so that สามารถ smoke-test container แบบ prod-like ก่อน deploy จริง.

**Acceptance Criteria (EARS):**
- 4.1  WHEN build image สำหรับ release THE SYSTEM SHALL tag เป็น `{package.json version}-{git short
      SHA}`. (event-driven — Technology Decisions: image tag, Sequence Diagram #1)
- 4.2  THE SYSTEM SHALL มี `docker-compose.yml` ที่รันเฉพาะ service `pol-admin` (ไม่มี `pol-core`
      หรือ reverse-proxy service อยู่ในไฟล์เดียวกัน). (ubiquitous — Technology Decisions: compose scope, Architecture Overview)
- 4.3  WHERE CI build/push automation อยู่นอก scope ของ feature นี้ THE SYSTEM SHALL มีคำสั่ง
      `docker build`/tag/run ที่ documented ไว้ใน `README.md` ส่วน "Build สำหรับ Production" (ไฟล์เดิม
      ไม่สร้างใหม่ — ตัดสินจาก /spec-analyze finding #7). (optional feature — Technology Decisions: CI wiring decision)

## REQ-5: Secrets & Build-Context Hygiene

**User Story:** As a maintainer ที่ห่วง security, ฉันต้องการให้ build ไม่มีทางหลุด secret/ไฟล์ dev
เข้า image, so that image ที่ ship ออกไปไม่เผย `.env` หรือ artifact ที่ไม่จำเป็น.

**Acceptance Criteria (EARS):**
- 5.1  THE SYSTEM SHALL กัน `.env*`, `node_modules`, `.git`, `.next` (dev build cache) ออกจาก Docker
      build context ผ่าน `.dockerignore`. (ubiquitous — Technology Decisions: .dockerignore)
- 5.2  THE SYSTEM SHALL ไม่มีไฟล์ `.env*` หลงเหลือใน image layer ใดๆ — ตรวจได้ด้วย `docker history
      <image> --no-trunc`. (ubiquitous / testable — Testing Strategy: secret-layer check)

## Edge Cases & Open Questions

- **Base image revisit trigger**: เลือก `node:20-alpine` เพราะ dependency ปัจจุบันเป็น pure JS
  ทั้งหมด (verified) — ถ้าเพิ่ม dependency ที่มี native binding ในอนาคต ต้อง revisit เป็น
  `node:20-slim` (ระบุไว้ใน design.md Non-Functional Considerations แล้ว ไม่ใช่ REQ ของรอบนี้)
- **Git short SHA ไม่มีให้ใช้** (เช่น build จาก tarball ที่ไม่มี `.git`): REQ-4.1 ไม่ได้ระบุ fallback
  ไว้ — ถ้าเจอเคสนี้จริงต้องตัดสินตอน implement (เช่น fallback เป็น `unknown` หรือ fail build)
- **HEALTHCHECK interval/retries** (REQ-3.2/3.3 ใช้ 30s/3 ครั้ง): เป็นค่า default มาตรฐานของ Docker
  ไม่ใช่ค่าที่ user ยืนยันเจาะจง — ปรับได้ถ้ามี requirement เฉพาะจาก host จริงทีหลัง
- **`pol-core`/reverse-proxy compose เต็ม stack**: อยู่นอก scope ตาม decision ที่ confirm ไปแล้วใน
  Plan Mode — ถ้าต้องการทีหลังควรเป็น feature spec แยก (sibling repo ต้อง confirm scope ใหม่)

### /spec-analyze findings — 2026-07-13 (anchor: uncommitted ณ ตอน analyze — commit แรกที่แตะไฟล์นี้คือ anchor จริง)

1. **[REQ-1.2 × REQ-3.2 conflicting constraint]** `node:20-alpine` ไม่มี `curl`/`wget` ติดมาโดย
   default แต่ REQ-3.2 ต้องยิง HTTP healthcheck — **ตัดสิน**: ใช้ Node เองยิง request (แก้ไว้ใน
   REQ-3.2 แล้ว)
2. **[REQ-2.3 gap]** doc comment อย่างเดียวจับ silent misconfiguration ไม่ได้จริง — **ตัดสิน**: เพิ่ม
   REQ-2.4 (startup warning log เมื่อ `ADMIN_API_ORIGIN` ถูกตั้งใน prod)
3. **[REQ-3.1 ambiguity]** liveness vs readiness ไม่ชัด — **ตัดสิน**: liveness ล้วน ไม่เช็ค backend
   (แก้ไว้ใน REQ-3.1 แล้ว)
4. **[REQ-2.1 ambiguity]** hardcode port vs `PORT` env override ไม่ชัด — **ตัดสิน**: hardcode 5300
   (แก้ไว้ใน REQ-2.1 แล้ว)
5. **[Gap]** graceful shutdown (SIGTERM) ไม่มี REQ ครอบ — **ตัดสิน**: ไม่เพิ่ม REQ ใหม่ เชื่อ Next.js
   standalone `server.js` handle เอง — ระบุเป็น risk ต้อง verify ตอน implement ใน tasks.md
6. **[Gap]** REQ-3.2/3.3 ไม่มี `start_period` เสี่ยง false-unhealthy ตอน cold start — **ตัดสิน**:
   เพิ่ม REQ-3.4 (`start_period` ~10s)
7. **[Gap]** REQ-4.3 ไม่ระบุตำแหน่งเอกสาร — **ตัดสิน**: `README.md` ส่วน "Build สำหรับ Production"
   (แก้ไว้ใน REQ-4.3 แล้ว)
8. **[Unstated assumption]** REQ-1.2 สมมติ Next.js 16 standalone output behavior เหมือน version
   ก่อนหน้า ยังไม่ verify จริง (16 เพิ่งออก) — **ตัดสิน**: ไม่ verify ตอนนี้ ระบุเป็น
   implementation-time risk ใน tasks.md แทน ไม่ block analyze phase

**Sync needed**: `design.md` ต้อง patch ต่อ — Technology Decisions (healthcheck impl = Node ไม่ใช่
curl/wget; `start_period`), Error Handling Strategy (เพิ่ม runtime warning behavior จาก REQ-2.4),
Requirement Traceability (เพิ่มแถว REQ-2.4, REQ-3.4), Testing Strategy (เพิ่ม test row สำหรับ
REQ-2.4, REQ-3.4) — รัน `/spec-design` (sync mode) ต่อเพื่อ patch ให้ตรง
