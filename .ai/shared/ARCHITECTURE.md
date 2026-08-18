# Architecture

> Canonical architecture ของ POL Merchant หลัง root application normalization.

## Topology

```text
.
├── public/                       static assets
├── src/
│   ├── app/                      Next.js App Router
│   ├── components/               feature, layout, shared และ primitive UI
│   ├── hooks/                    shared client hooks
│   ├── lib/                      API adapters, domain logic, mocks, utilities
│   └── types/                    shared domain/API types
├── docs/                         current operating guides
├── scripts/                      audit, spec trace, automation, cost tools
├── .ai/                          shared agent/workflow canon
├── .claude/specs/                feature specs และ Evidence
├── package.json
├── next.config.ts
├── tsconfig.json
└── vitest.config.ts
```

Application และ reusable code อยู่ root `src` ชุดเดียว. ไม่มี workspace/package boundary.

## Dependency direction

```text
src/app
  -> src/components
  -> src/hooks
  -> src/lib
  -> src/types
```

กฎ:

- ใช้ alias `@/* -> src/*`
- Route files ประกอบ view; business/validation logic อยู่ `src/lib`
- Shared API/domain shapes อยู่ `src/types`
- Reusable UI อยู่ `src/components/shared`; primitives อยู่ `src/components/ui`
- Feature components import shared/lib/types ได้
- `src/lib` ห้าม import route modules
- ห้ามสร้าง `@pol/*` local package หรือ `merchant` directory namespace กลับมาเพื่อ reuse ภายใน app

## App Router

Route families หลัก:

| Surface | Paths | Layout |
|---|---|---|
| Merchant users | `/user/list|new|read|edit` | `src/app/user/layout.tsx` -> `MinimalsLayout` |
| Merchant roles | `/role/list|create|read|edit` | `src/app/role/layout.tsx` -> `MinimalsLayout` |
| Admin | `/admin/user/*`, `/admin/role/*` | Admin layout เดิม |
| Control | `/control/*` | control layout |
| Organization | `/organization/*` | organization layout |
| Commerce | `/order/*`, `/transaction/*`, `/policy/*`, `/checkout/*` | feature layouts |
| Public/auth | `/register`, `/login`, `/logout`, `/login-error` | route-specific |

`src/app/page.tsx` ใช้ Next `redirect('/dashboard')`, จึงได้ temporary `307`.

`next.config.ts` เก็บ compatibility redirects:

```text
/merchant/user/:path* -> /user/:path*   308
/merchant/role/:path* -> /role/:path*   308
```

## Merchant normalization boundary

Directory namespace ถูกยุบ แต่ domain vocabulary คงไว้:

| Domain contract | Current path |
|---|---|
| Merchant master type | `src/types/merchant.ts` |
| Merchant user type/form | `src/types/user.ts` |
| Merchant role type | `src/types/role.ts` |
| Merchant user validation | `src/lib/user/validation.ts` |
| Merchant API adapter | `src/lib/api/user.ts` |
| Merchant mocks | `src/lib/mock/merchant.ts`, `users.ts`, `role.ts` |
| Merchant role permissions | `src/lib/role/permissions.ts` |

Directory ชื่อ `merchant` ใต้ `src` ถือว่า architecture regression. Semantic file/type names ข้างบน
ไม่ใช่ regression.

## Authentication flow

```text
protected layout
  -> AuthProvider
     -> getMe('/admin/me', credentials: include)
        -> 200: AdminMe/authed
        -> 401: anon
  -> AuthGuard
     -> loading: placeholder
     -> anon: /login
     -> authed: children
```

Mutation requests แนบ CSRF cookie value เป็น `X-CSRF-Token`. SSO login ใช้ full-page navigation
ไป backend origin; frontend ไม่ถือ token.

Dev-only auth bypass ต้องผ่านทั้ง `NODE_ENV !== 'production'` และ
`NEXT_PUBLIC_SKIP_AUTH === 'true'`; ห้ามใช้เป็น production contract.

## API boundary

`src/lib/api/admin/*` และ `src/lib/api/user.ts` เป็น client adapters. UI เรียก relative path
เมื่อใช้ same-origin. `next.config.ts` ทำ development rewrite เฉพาะเมื่อ
`ADMIN_API_ORIGIN` มีค่า:

```text
/admin/:path*    -> /api/v1/admins/:path*
/producer/:path* -> /api/v1/merchants/:path*
/api/:path*      -> /api/:path*
```

Backend `/producer/*` เป็น contract เดิม แม้ frontend route ใช้ `/user/*`.

## Styling and UI

- Tailwind CSS 4 ผ่าน `src/app/globals.css`
- shadcn aliases จาก root `components.json`
- `cn` utility กลางที่ `src/lib/utils.ts`
- Shared `AvatarUpload`, `Fieldset` และ `Logo` เป็น app-local components
- Server Component เป็น default; ใส่ `"use client"` เมื่อใช้ state/effect/browser API เท่านั้น
- Layout/interactive changes ต้องรักษา keyboard access, semantic markup และ responsive widths

## Test architecture

Vitest config เดียวรัน:

```text
src/**/*.test.ts
scripts/**/*.test.mjs
```

Unit tests co-locate กับ pure logic/API adapter. Browser acceptance ใช้ production build และ
วัด exact `clientWidth` ที่ 375, 768, 1440 เมื่อ spec กำหนด.

## Build and deployment

`next.config.ts` ใช้ `output: 'standalone'`. Build artifact อยู่ root `.next`.
Docker stages:

1. `npm ci` จาก root manifest/lockfile
2. `npm run build`
3. copy `.next/standalone`, `public`, `.next/static`
4. run `node server.js` เป็น UID 1001 ที่ port 3002

Healthcheck ผ่านเมื่อ `GET /` ตอบ `307 Location: /dashboard`.

## Architecture guardrails

- ห้ามเพิ่ม `apps/`, `packages/`, `tsconfig.base.json` หรือ npm workspaces โดยไม่มี architecture decision ใหม่
- ห้ามเปลี่ยน auth/API contract ระหว่าง file-organization refactor
- ห้ามลบ Admin-derived surface เพียงเพราะ Merchant route ถูก normalize
- Dependency ใหม่ต้องผ่าน license/maintenance review และมีเหตุผล
- Next.js change ต้องอ่าน installed docs ที่ `node_modules/next/dist/docs/` ก่อน
