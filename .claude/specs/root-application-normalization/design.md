# Design: Root Application Normalization

> Status: approved 2026-08-17 (quick, no gates)

รวม workspace application และ extracted local packages กลับเป็น root Next.js app โดยย้ายไฟล์ตรงและลด config ที่มีไว้เฉพาะ monorepo

## Target Layout

```text
public/
src/
  app/
  components/
  hooks/
  lib/
  types/
.env.example
components.json
next.config.ts
postcss.config.mjs
tsconfig.json
vitest.config.ts
package.json
package-lock.json
```

ไม่มี `apps/`, `packages/`, หรือ `tsconfig.base.json`

## Source Moves

| Source | Target |
|---|---|
| `apps/merchant/src` | `src` |
| `apps/merchant/public` | `public` |
| `apps/merchant/.env.example` | `.env.example` |
| `apps/merchant/components.json` | `components.json` |
| `apps/merchant/postcss.config.mjs` | `postcss.config.mjs` |
| `packages/ui/src/avatar-upload.tsx` | `src/components/shared/avatar-upload.tsx` |
| `packages/ui/src/fieldset.tsx` | `src/components/shared/fieldset.tsx` |
| `packages/ui/src/logo.tsx` | `src/components/layout/logo.tsx` |
| `packages/shared/src/merchant-user.ts` | `src/types/user.ts` |
| `packages/shared/src/merchant-user-validation.ts` | `src/lib/user/validation.ts` |
| `packages/shared/src/merchant-user-validation.test.ts` | `src/lib/user/validation.test.ts` |

`src/lib/utils.ts` เป็น utility เดิม จึงไม่ย้าย `packages/ui/src/utils.ts`

## Import Mapping

| Workspace import | Root import |
|---|---|
| `@pol/ui/avatar-upload` | `@/components/shared/avatar-upload` |
| `@pol/ui/fieldset` | `@/components/shared/fieldset` |
| `@pol/ui/logo` | `@/components/layout/logo` |
| `@pol/shared/merchant-user` | `@/types/user` |
| `@pol/shared/merchant-user-validation` | `@/lib/user/validation` |

## Root Configuration

- Merge app dependencies and root tooling into one `package.json`.
- Run Vitest once with `src/**/*.test.ts` and `scripts/**/*.test.mjs`.
- Inline `tsconfig.base.json` compiler settings into root `tsconfig.json`.
- Remove package-only ESLint override.
- Keep `output: "standalone"`; remove `outputFileTracingRoot` and `transpilePackages`.
- Keep redirects and rewrites unchanged.
- Build Docker from root package files and copy root `.next/standalone`, `public`, and `.next/static`.

## Safe Migration

- Move latest source/assets to root before removing workspace containers.
- Move residual `apps` and `packages` directories to a recoverable temporary backup after verifying target files.
- Regenerate lockfile from root manifest with npm 11.12.1.
- Remove only ignored stale `.next` output before final typecheck/build.

## Documentation Strategy

- Make root README, `docs/`, `.ai/shared`, and agent guides describe current root app.
- Replace duplicated stale workflow prose with concise links to canonical protocols.
- Mark completed optimization plan archived; do not rewrite historical specs or retrospectives.

## Verification Strategy

- Structural scans for required root paths and forbidden workspace paths/imports.
- Compare route manifest counts and redirect rules after production build.
- Run HTTP probes for root and legacy redirects.
- Run browser probes for `/register` and protected canonical routes at `375`, `768`, `1440`.
- Run audit, test, lint, typecheck, build, secret scan, link validation, and spec trace.

## Requirement Traceability

| Requirement | Design Element |
|---|---|
| REQ-1.1 | target layout and source move |
| REQ-1.2 | public move |
| REQ-1.3 | root configuration move |
| REQ-1.4 | safe migration cleanup |
| REQ-1.5 | untouched operating directories |
| REQ-2.1 | source moves |
| REQ-2.2 | UI component inlining |
| REQ-2.3 | user type and validation inlining |
| REQ-2.4 | import mapping |
| REQ-2.5 | structural scan |
| REQ-2.6 | behavior-preserving local modules |
| REQ-3.1 | existing normalized App Router source |
| REQ-3.2 | retained Next redirects and runtime probes |
| REQ-3.3 | source move without Admin/auth deletion |
| REQ-3.4 | retained Next rewrites |
| REQ-3.5 | manifest, HTTP, and browser probes |
| REQ-4.1 | root package manifest |
| REQ-4.2 | regenerated lockfile |
| REQ-4.3 | root scripts |
| REQ-4.4 | root Next config |
| REQ-4.5 | root tool configs |
| REQ-4.6 | root Docker artifact |
| REQ-5.1 | canonical context and architecture docs |
| REQ-5.2 | current runbooks and guides |
| REQ-5.3 | docs index |
| REQ-5.4 | historical boundary |
| REQ-5.5 | stale-reference audit |
| REQ-6.1 | root topology assertions |
| REQ-6.2 | import and namespace scans |
| REQ-6.3 | Markdown link probe |
| REQ-6.4 | full quality gate |
| REQ-6.5 | manifest, runtime, and browser acceptance |
| REQ-6.6 | no Git publication action |
