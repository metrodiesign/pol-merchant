# Project Context

> Canonical product context สำหรับทุก agent. Source/config ปัจจุบันอยู่ repository root.

## Product

POL Merchant เป็น merchant operations portal ที่รวม Merchant, Admin, control-plane,
organization, order, transaction, policy และ checkout surfaces ใน Next.js application เดียว.

Repository นี้พัฒนาและ deploy เป็นอิสระ. ไม่ใช้ parity, sync หรือ exact-mirror contract กับ
repository อื่น.

## Users

- Merchant operators จัดการผู้ใช้ บทบาท รายการคำสั่งซื้อ ธุรกรรม และกรมธรรม์
- Admin users จัดการ Admin user/role และโครงสร้างองค์กร
- Control-plane users ตรวจ approvals, audit, PSP, routing, webhooks และ reports
- Public users เข้าหน้า register และ checkout

## Current source of truth

```text
public/
src/
  app/
  components/
  hooks/
  lib/
  types/
package.json
package-lock.json
next.config.ts
tsconfig.json
vitest.config.ts
```

เป็น single root package. ไม่มี npm workspaces, `apps/`, `packages/` หรือ package aliases
`@pol/ui` / `@pol/shared`. Internal imports ใช้ `@/`.

## Route contracts

Canonical Merchant routes:

```text
/user/list
/user/new
/user/read
/user/edit
/role/list
/role/create
/role/read
/role/edit
```

Legacy `/merchant/user/*` และ `/merchant/role/*` ตอบ permanent `308` ไป canonical route
และรักษา query string. Admin routes `/admin/user/*` และ `/admin/role/*` ยังคงอยู่.

Root `/` redirect `307` ไป `/dashboard`. `/register` เป็น public. Protected surfaces ใช้
auth state/guard ตาม layout ของแต่ละกลุ่ม.

คำว่า `Merchant`, `MerchantCode`, `MerchantUser*` และ backend path `/producer/*`
เป็น domain/API vocabulary ที่ยังถูกต้อง. ห้ามตีความว่า semantic name เหล่านี้เป็น directory
namespace ที่ต้องยุบ.

## Authentication and API

Frontend ไม่เก็บ bearer token. Admin session อยู่ใน backend-managed httpOnly cookie.

- `AdminMe`: `src/types/auth.ts`
- `getMe` และ authenticated fetch helpers: `src/lib/api/admin/auth.ts`
- `AuthProvider`: `src/components/auth/auth-provider.tsx`
- `AuthGuard`: `src/components/auth/auth-guard.tsx`

Development variables อยู่ root `.env.local` ซึ่งสร้างจาก `.env.example`:

```text
ADMIN_API_ORIGIN=https://localhost:5001
NEXT_PUBLIC_API_ORIGIN=https://localhost:5001
```

เมื่อ `ADMIN_API_ORIGIN` มีค่า:

```text
/admin/*    -> ADMIN_API_ORIGIN/api/v1/admins/*
/producer/* -> ADMIN_API_ORIGIN/api/v1/merchants/*
/api/*      -> ADMIN_API_ORIGIN/api/*
```

Production ปกติใช้ same-origin reverse proxy และไม่สร้าง Next rewrite.

## Runtime

- Node.js 22.19.0
- npm 11.12.1
- Next.js 16.3.1
- React 19.2.4
- HTTPS development port 3002
- Production standalone output
- Docker non-root UID 1001, port 3002

Root scripts เป็น interface เดียวสำหรับ install, audit, test, lint, typecheck, build และ start.

## Quality floor

CI รัน guard tests, secret scan, spec trace, production dependency audit, Vitest, ESLint,
TypeScript, production build และ HTTP/development smoke ตาม OS. Git hooks ตรวจ secrets,
Evidence และ protected/force pushes.

งาน non-trivial ใช้ requirements -> design -> tasks -> implementation. Historical specs และ
retrospectives เก็บ state ตามเวลาที่สร้าง; ไม่ใช่ current architecture.
