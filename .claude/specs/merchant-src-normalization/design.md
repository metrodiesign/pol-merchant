# Design: Merchant Source Normalization

> Status: approved 2026-08-17 (quick, no gates)

Mechanical source move พร้อม route compatibility redirects ไม่มี domain logic ใหม่
ใช้ Next.js native redirects และ existing module boundaries เท่านั้น

## Structure Mapping

| Current | Target |
|---|---|
| `src/app/merchant/user` | `src/app/user` |
| `src/app/merchant/role` | `src/app/role` |
| `src/components/merchant/user` | `src/components/user` |
| `src/components/merchant/role` | `src/components/role` |
| `src/lib/merchant/role` | `src/lib/role` |
| `src/lib/api/merchant/user.ts` | `src/lib/api/user.ts` |
| `src/lib/mock/merchant/index.ts` | `src/lib/mock/merchant.ts` |
| `src/lib/mock/merchant/users.ts` | `src/lib/mock/users.ts` |
| `src/lib/mock/merchant/role.ts` | `src/lib/mock/role.ts` |
| `src/types/merchant/index.ts` | `src/types/merchant.ts` |
| `src/types/merchant/role.ts` | `src/types/role.ts` |

## Implementation Design

- `src/app/user/layout.tsx` และ `src/app/role/layout.tsx` ใช้ existing `MinimalsLayout`
- `next.config.ts` เพิ่ม wildcard redirects สองรายการด้วย `permanent: true`
- navigation, page links, router calls, redirects และ comments ใช้ `/user/*` หรือ `/role/*`
- import aliases ชี้ normalized modules; semantic `@/types/merchant` และ `@/lib/mock/merchant` คงเป็น top-level files
- `mock-contract.test.ts` เปลี่ยน imports และ filesystem allowlist ตาม file paths ใหม่
- canonical docs ระบุ reset mirror เป็น historical baseline และ target repository เป็น current owner

## Public Interfaces

| Interface | Contract |
|---|---|
| User routes | `/user/{list,new,edit,read}` |
| Role routes | `/role/{list,create,edit,read}` |
| Legacy user routes | `308` ไป suffix เดียวกันใต้ `/user` พร้อม query |
| Legacy role routes | `308` ไป suffix เดียวกันใต้ `/role` พร้อม query |
| Admin routes | ไม่เปลี่ยน |
| Domain and package exports | ไม่เปลี่ยน |

## Verification Strategy

- filesystem scan ยืนยันไม่มี directory `merchant` ใต้ `src`
- source scan ยืนยัน legacy internal routes เหลือเฉพาะ redirect config
- unit tests พิสูจน์ moved API และ mock contracts
- build manifest พิสูจน์ route replacement และ Admin preservation
- production HTTP smoke พิสูจน์ `308` และ query preservation
- production browser smoke พิสูจน์ registration กับ protected transition ทุก viewport
- full repository gates และ spec trace เป็น completion blocker

## Requirement Traceability

| Requirement | Design element |
|---|---|
| REQ-1 | Structure mapping, normalized imports, semantic-name preservation |
| REQ-2 | Next.js redirects, route moves, internal navigation updates |
| REQ-3 | Admin preservation, unchanged auth/API/package contracts |
| REQ-4 | Path-sensitive tests, canonical docs, static/runtime/browser gates |
