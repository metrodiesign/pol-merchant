# Requirements: Merchant Source Normalization

> Status: approved 2026-08-17 (quick, no gates)

ยุบ namespace `merchant` ที่ซ้ำกับ application boundary ใต้ `apps/merchant/src`
โดยรักษา Merchant domain semantics, Admin surfaces และ runtime behavior เดิม

## Non-Goals

- ไม่เปลี่ยน backend endpoint, authentication contract หรือ session behavior
- ไม่ลบ Admin UI, Admin API adapter, control หรือ organization surface
- ไม่เปลี่ยน `packages/ui` หรือ `packages/shared`
- ไม่แก้ historical evidence ใน spec `merchant-workspace-reset`

## REQ-1: Source Structure Normalization

**User Story:** As a POL developer, I want Merchant app code ไม่ซ้อน Merchant namespace,
so that source structure สื่อ domain โดยไม่มี application context ซ้ำ

**Acceptance Criteria (EARS):**

- 1.1 THE SYSTEM SHALL วาง Merchant user routes ใต้ `src/app/user` (ubiquitous)
- 1.2 THE SYSTEM SHALL วาง Merchant role routes ใต้ `src/app/role` (ubiquitous)
- 1.3 THE SYSTEM SHALL วาง Merchant user และ role components ใต้ `src/components/user` และ `src/components/role` (ubiquitous)
- 1.4 THE SYSTEM SHALL วาง user API, role logic, mock data และ types ที่ normalized paths ตาม design (ubiquitous)
- 1.5 THE SYSTEM SHALL NOT มี directory ชื่อ `merchant` ใต้ `apps/merchant/src` (ubiquitous)
- 1.6 THE SYSTEM SHALL รักษาชื่อ `Merchant`, `MerchantCode`, `MerchantUser*` และชื่ออื่นที่เป็น domain semantics (ubiquitous)
- 1.7 THE SYSTEM SHALL รักษา import contract `@pol/shared/merchant-*` โดยไม่แก้ local packages (ubiquitous)

## REQ-2: Route Migration

**User Story:** As a Merchant portal user, I want short user and role URLs,
so that route structure ไม่ซ้ำ application context และ bookmark เดิมยังทำงาน

**Acceptance Criteria (EARS):**

- 2.1 THE SYSTEM SHALL expose `/user/list`, `/user/new`, `/user/edit` และ `/user/read` (ubiquitous)
- 2.2 THE SYSTEM SHALL expose `/role/list`, `/role/create`, `/role/edit` และ `/role/read` (ubiquitous)
- 2.3 WHEN request ตรง `/merchant/user/:path*` THE SYSTEM SHALL ตอบ permanent redirect `308` ไป `/user/:path*` (event-driven)
- 2.4 WHEN request ตรง `/merchant/role/:path*` THE SYSTEM SHALL ตอบ permanent redirect `308` ไป `/role/:path*` (event-driven)
- 2.5 WHEN legacy URL มี query string THE SYSTEM SHALL รักษา query string ใน redirect destination (event-driven)
- 2.6 THE SYSTEM SHALL ให้ navigation และ internal links ใช้ routes ใหม่โดยไม่ผ่าน redirect (ubiquitous)

## REQ-3: Behavior Preservation

**User Story:** As a POL maintainer, I want structural refactor ไม่เปลี่ยน unrelated behavior,
so that Merchant app ยังคง contract เดิมนอก route migration

**Acceptance Criteria (EARS):**

- 3.1 THE SYSTEM SHALL รักษา `/admin/user/*` และ `/admin/role/*` พร้อม source modules เดิม (ubiquitous)
- 3.2 THE SYSTEM SHALL รักษา Admin auth, API adapter และ organization dependencies เดิม (ubiquitous)
- 3.3 THE SYSTEM SHALL รักษา registration และ Merchant SSO client behavior เดิม (ubiquitous)
- 3.4 THE SYSTEM SHALL รักษา `/producer/*`, `/admin/*` และ `/api/*` rewrite contracts เดิม (ubiquitous)
- 3.5 THE SYSTEM SHALL รักษา root redirect, protected-route guard และ application layouts เดิม (ubiquitous)

## REQ-4: Verification and Canonical Context

**User Story:** As a POL developer, I want automated evidence และเอกสารตรง filesystem,
so that refactor ตรวจซ้ำและส่งต่องานได้

**Acceptance Criteria (EARS):**

- 4.1 THE SYSTEM SHALL ประกาศ `merchant-src-normalization` เป็น current application-structure contract โดยรักษา reset spec เป็น historical evidence (ubiquitous)
- 4.2 THE SYSTEM SHALL ปรับ path-sensitive tests และ allowlists ให้ตรง normalized files (ubiquitous)
- 4.3 WHEN production build เสร็จ THE SYSTEM SHALL มี routes ใหม่ ไม่มี legacy page routes และยังมี Admin routes (event-driven)
- 4.4 WHEN repository verification รัน THE SYSTEM SHALL ผ่าน audit, test, lint, typecheck, build และ spec trace (event-driven)
- 4.5 WHEN browser verification รัน THE SYSTEM SHALL ผ่าน registration และ protected-route transition ที่ exact widths `375`, `768` และ `1440` โดยไม่มี console error หรือ horizontal overflow (event-driven)

## Edge Cases and Analysis

| Category | Decision |
|---|---|
| Logical consistency | ยุบเฉพาะ redundant directory namespace; Merchant entity names ยังจำเป็นเพราะ Admin user/role อยู่ร่วมกัน |
| Ambiguity | route ปลายทางล็อกเป็น singular `/user/*` และ `/role/*` ตาม convention เดิม |
| Conflicting constraints | permanent redirect รักษา compatibility โดย internal links ไม่พึ่ง redirect |
| Gaps | query preservation, route manifest, Admin regression และ path-sensitive test ถูกระบุเป็น acceptance |
| Unstated assumptions | current uncommitted workspace reset เป็นฐาน; ไม่มี commit, push หรือ package change |
