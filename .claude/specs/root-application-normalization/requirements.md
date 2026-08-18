# Requirements: Root Application Normalization

> Status: approved 2026-08-17 (quick, no gates)

คืน POL Merchant เป็น single Next.js application ที่ repository root ตามโครงสร้างมาตรฐานที่ผู้ใช้ยืนยัน พร้อมรักษา behavior ล่าสุดและ sync เอกสารทั้งหมด

## REQ-1: Root Topology

**User Story:** ในฐานะ maintainer ฉันต้องการโครงสร้าง single-app มาตรฐาน เพื่อค้นหา source และ config ได้จากตำแหน่งเดิมโดยไม่ผ่าน workspace namespace

**Acceptance Criteria (EARS):**

- 1.1 THE SYSTEM SHALL keep application source under root `src` with `app`, `components`, `hooks`, `lib`, and `types` directories.
- 1.2 THE SYSTEM SHALL keep static assets under root `public`.
- 1.3 THE SYSTEM SHALL keep `.env.example`, `components.json`, `next.config.ts`, `postcss.config.mjs`, `tsconfig.json`, `vitest.config.ts`, and `package.json` at repository root.
- 1.4 THE SYSTEM SHALL contain no `apps` or `packages` application workspace directories after migration.
- 1.5 THE SYSTEM SHALL retain repository operating directories such as `.agents`, `.ai`, `.claude`, `.codex`, `.githooks`, `.github`, `.opencode`, `docs`, `retrospectives`, and `scripts`.

## REQ-2: Source Consolidation

**User Story:** ในฐานะผู้พัฒนา ฉันต้องการโค้ดล่าสุดอยู่ใน root app เพื่อใช้งานต่อได้โดยไม่เสีย feature จาก workspace migration

**Acceptance Criteria (EARS):**

- 2.1 THE SYSTEM SHALL move the current Merchant application source and public assets to root without dropping files.
- 2.2 THE SYSTEM SHALL place shared avatar, fieldset, and logo components under root application component directories.
- 2.3 THE SYSTEM SHALL place Merchant user types and validation logic under root `src/types` and `src/lib` without a Merchant directory namespace.
- 2.4 THE SYSTEM SHALL replace every `@pol/ui` and `@pol/shared` import with an app-local `@/` import.
- 2.5 THE SYSTEM SHALL contain no directory named `merchant` below root `src`.
- 2.6 THE SYSTEM SHALL preserve semantic domain identifiers including `Merchant`, `MerchantCode`, `MerchantUser*`, and backend `/producer/*` contracts.

## REQ-3: Behavior Compatibility

**User Story:** ในฐานะผู้ใช้ระบบ ฉันต้องการ behavior เดิมหลังย้ายโครงสร้าง เพื่อไม่เกิด route, auth หรือ API regression

**Acceptance Criteria (EARS):**

- 3.1 THE SYSTEM SHALL preserve canonical `/user/*` and `/role/*` routes.
- 3.2 WHEN a legacy `/merchant/user/*` or `/merchant/role/*` URL is requested THE SYSTEM SHALL return a permanent `308` redirect to the canonical route while preserving query parameters.
- 3.3 THE SYSTEM SHALL preserve Admin UI routes, Admin API adapters, `AuthProvider`, `AuthGuard`, `AdminMe`, and `getMe`.
- 3.4 THE SYSTEM SHALL preserve `/admin/*`, `/producer/*`, and `/api/*` development rewrite contracts.
- 3.5 THE SYSTEM SHALL preserve root `307 Location: /dashboard`, public `/register`, and current protected-route transitions.

## REQ-4: Root Toolchain and Runtime

**User Story:** ในฐานะ developer และ operator ฉันต้องการ root commands และ artifacts เดียว เพื่อ install, test, build และ deploy โดยไม่ต้องระบุ workspace

**Acceptance Criteria (EARS):**

- 4.1 THE SYSTEM SHALL use one root package manifest with application dependencies and no npm workspaces.
- 4.2 THE SYSTEM SHALL use one root lockfile with no local workspace package links.
- 4.3 THE SYSTEM SHALL run development, test, lint, typecheck, build, start, and production audit through root scripts.
- 4.4 THE SYSTEM SHALL configure Next.js standalone output from repository root without monorepo tracing or transpile-package settings.
- 4.5 THE SYSTEM SHALL configure TypeScript, Vitest, ESLint, Tailwind, and shadcn paths for root `src`.
- 4.6 THE SYSTEM SHALL build and run the Docker standalone artifact from root `.next` while preserving non-root UID 1001 and port 3002 health behavior.

## REQ-5: Current Documentation

**User Story:** ในฐานะผู้ร่วมทีม ฉันต้องการเอกสารทั้งหมดตรงกับ root code ล่าสุด เพื่อ setup และทำงานโดยไม่พบ workspace instruction เก่า

**Acceptance Criteria (EARS):**

- 5.1 THE SYSTEM SHALL document the root single-app topology as the current architecture.
- 5.2 THE SYSTEM SHALL update setup, runtime, routes, Docker, CI, dependency audit, hooks, agent, and automation guides to current code and config.
- 5.3 THE SYSTEM SHALL provide a documentation index that separates current guides from historical specs, retrospectives, and completed plans.
- 5.4 WHERE a spec or retrospective records completed historical work THE SYSTEM SHALL preserve its body instead of rewriting past evidence.
- 5.5 IF a current guide references removed workspace paths, packages, commands, or superseded enforcement behavior THEN THE SYSTEM SHALL replace that reference with current ground truth.

## REQ-6: Acceptance

**User Story:** ในฐานะ maintainer ฉันต้องการหลักฐานโครงสร้างและ behavior หลัง migration เพื่อส่งต่อได้อย่างมั่นใจ

**Acceptance Criteria (EARS):**

- 6.1 THE SYSTEM SHALL verify root topology contains required source and config paths and contains no `apps` or `packages` directories.
- 6.2 THE SYSTEM SHALL verify current source contains no `@pol/ui`, `@pol/shared`, obsolete workspace path, or Merchant directory namespace reference.
- 6.3 THE SYSTEM SHALL verify local Markdown links in current guides resolve to existing repository files or documented placeholders.
- 6.4 THE SYSTEM SHALL pass production audit, tests, lint, typecheck, build, secret scan, and spec trace.
- 6.5 THE SYSTEM SHALL verify final route manifest, legacy redirect runtime behavior, and representative browser behavior at required viewports.
- 6.6 THE SYSTEM SHALL create no commit, push, or pull request for this task.

## Assumptions

- Screenshot supplied 2026-08-17 is authoritative for root topology.
- `apps/merchant` contains latest application state before consolidation.
- `packages/ui` and `packages/shared` are extraction artifacts, not required public package contracts.
- Historical specs and retrospectives remain audit evidence even when they describe superseded layouts.

## Requirement Audit

- Logical conflicts: workspace layout is superseded explicitly by root topology.
- Ambiguity: absence of `apps` and `packages` in authoritative screenshot means both directories leave current structure.
- Constraint conflicts: prior `@pol/shared/*` preservation is superseded by explicit root-only structure; semantic types and behavior remain.
- Gaps: package inlining, config rewiring, Docker, docs, route/runtime/browser acceptance are covered.
- Unstated assumptions: migration source and history treatment are recorded above.
