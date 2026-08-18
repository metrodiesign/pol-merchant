# Next.js Profile

Conventions สำหรับ root POL Merchant application.

## Versions

| Tool | Version/range source |
|---|---|
| Node.js | `package.json#engines.node` = 22.19.0 |
| npm | `packageManager` = 11.12.1 |
| Next.js | 16.3.1 |
| React / React DOM | 19.2.4 |
| TypeScript | `^5` |
| Tailwind CSS | `^4` |
| Vitest | `^4.1.9` |

Installed Next docs ที่ `node_modules/next/dist/docs/` เป็น authority ก่อนแก้ route, config,
runtime หรือ build behavior.

## Project layout

```text
src/app
src/components
src/hooks
src/lib
src/types
public
```

Config ทั้งหมดอยู่ root. Internal imports ใช้ `@/`. ห้ามใช้ workspace imports หรือเพิ่ม
monorepo-only `outputFileTracingRoot` / `transpilePackages`.

## App Router rules

- Server Component เป็น default
- ใช้ `"use client"` เฉพาะ component ที่ต้องใช้ state, effect, event หรือ browser API
- Route `page.tsx` ประกอบ feature view; shared logic อยู่ `src/lib`
- Layout shared shell อยู่ระดับ route family ที่แคบที่สุด
- ใช้ `next/navigation` สำหรับ `redirect`/router และ `next/link` สำหรับ internal links
- Route/config changes ต้องอัปเดต navigation, breadcrumbs, tests และ docs พร้อมกัน

Canonical Merchant paths คือ `/user/*` และ `/role/*`. Legacy `/merchant/*` อยู่ได้เฉพาะ
redirect source ใน `next.config.ts`.

## Imports and modules

- `@/components/ui/*`: primitives
- `@/components/shared/*`: reusable application UI
- `@/components/<feature>/*`: feature views
- `@/lib/api/*`: network adapters
- `@/lib/<feature>/*`: pure/domain logic
- `@/types/*`: domain/API shapes
- `@/lib/mock/*`: typed mock data

Reuse `@/lib/utils#cn`; ห้ามสร้าง utility สำเนา.

## Styling

Tailwind entry คือ `src/app/globals.css` ผ่าน root `postcss.config.mjs`.
shadcn path aliases อยู่ root `components.json`. ไม่มี `@source` ไป package ภายนอก.

Responsive UI acceptance ใช้ exact viewport/client width 375, 768, 1440 และต้องไม่มี
horizontal overflow หรือ console error.

## API and auth

Development env อยู่ root `.env.local`:

```text
ADMIN_API_ORIGIN=https://localhost:5001
NEXT_PUBLIC_API_ORIGIN=https://localhost:5001
```

`NEXT_PUBLIC_*` ไม่ใช่ secret. API adapters ใช้ `credentials: 'include'`; auth token อยู่ใน
httpOnly cookie. Mutation แนบ CSRF header. Production ใช้ same-origin เป็น default.

Rewrites:

```text
/admin/:path*    -> ADMIN_API_ORIGIN/api/v1/admins/:path*
/producer/:path* -> ADMIN_API_ORIGIN/api/v1/merchants/:path*
/api/:path*      -> ADMIN_API_ORIGIN/api/:path*
```

## Testing

Root `vitest.config.ts` map `@ -> src` และรัน source/script tests ใน command เดียว.
Pure logic test co-locate เช่น `src/lib/user/validation.test.ts`. อย่าทดสอบ CSS class เป็น
behavior proxy.

Full gate:

```bash
npm run audit:production
npm test
npm run lint
npm run typecheck
npm run build
```

ก่อน typecheck/build หลัง route move ให้ใช้ `npm run dev:clean` หรือเก็บ stale `.next` ออก.

## Production

- `output: 'standalone'`
- root artifact `.next/standalone/server.js`
- `npm start` port 3002
- Docker run `node server.js` เป็น UID 1001
- `GET /` -> 307 `/dashboard`
- `GET /register` -> 200
- legacy Merchant redirects -> 308 พร้อม query string
