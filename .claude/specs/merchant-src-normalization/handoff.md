# Handoff Note: Merchant Source Normalization

## Task Summary

ทำ quick spec `merchant-src-normalization` ครบ Task 1-2 เพื่อยุบ redundant Merchant namespace ใต้ `apps/merchant/src` โดยรักษา Admin UI/API/auth, domain naming, backend contracts และ local packages เดิม

## Current Status

done — source, routes, redirects, tests, canonical docs และ acceptance evidence เสร็จครบ

## Files Changed

- `apps/merchant/src/app/user/` และ `apps/merchant/src/app/role/` — route ใหม่ 8 routes พร้อม parent `MinimalsLayout` (moved/edited)
- `apps/merchant/src/components/user/` และ `apps/merchant/src/components/role/` — Merchant user/role UI หลังยุบ namespace (moved/edited)
- `apps/merchant/src/lib/role/`, `apps/merchant/src/lib/api/user.ts`, `apps/merchant/src/lib/mock/{merchant,users,role}.ts` — logic, API adapter และ mocks หลังยุบ namespace (moved/edited)
- `apps/merchant/src/types/merchant.ts` และ `apps/merchant/src/types/role.ts` — domain types หลังยุบ namespace (moved)
- `apps/merchant/next.config.ts` — permanent redirects จาก legacy user/role routes (edited)
- `README.md`, `.ai/shared/PROJECT_CONTEXT.md`, `.ai/shared/ARCHITECTURE.md`, `.ai/shared/stack/nextjs.md` — current-state documentation (edited)
- `.claude/specs/merchant-src-normalization/` — requirements, design, tasks และ handoff (new)

## Important Decisions

- ใช้ `/user/*` และ `/role/*` เป็น canonical routes
- เก็บ legacy `/merchant/user/*` และ `/merchant/role/*` ด้วย `permanent: true` ซึ่งตอบ 308 และรักษา query string
- เก็บ semantic names `Merchant`, `MerchantCode`, `MerchantUser*`, `/producer/*`, `@pol/shared/merchant-*`, `types/merchant.ts` และ `lib/mock/merchant.ts`
- ไม่แก้ `.claude/specs/merchant-workspace-reset/`; ใช้เป็น historical evidence เท่านั้น
- ล้าง ignored stale `.next` หลัง generated route validator ยังอ้าง legacy routes แล้ว rebuild ใหม่

## Constraints

- worktree เดิมมี uncommitted workspace migration; ต้องรักษาไว้
- ห้ามเพิ่ม dependency หรือแก้ `packages/*` สำหรับ normalization นี้
- ห้าม commit, push หรือเปิด PR ใน task นี้

## Tests Run

- `npm run audit:production` -> passed; critical 0, high 0, total 0
- `npm test` -> passed; 22 files, 240 tests
- `npm run lint` -> passed; 0 errors, 8 pre-existing warnings
- `npm run typecheck` -> passed ทุก workspace
- `npm run build` -> passed; Next.js 16.3.1, 114 static pages
- `.ai/bin/check-secrets.sh --all` -> passed
- `scripts/spec-trace.sh merchant-src-normalization` -> passed 23/23
- `scripts/spec-trace.sh merchant-workspace-reset` -> passed 110/110
- manifest assertions -> new 8, legacy 0, Admin 8, redirects 308 สอง rules
- runtime probes -> legacy user/role URLs ตอบ 308 พร้อม exact `Location` และ query
- browser production probes -> exact `clientWidth` 375/768/1440, no overflow, console error/warn 0
- `git diff --check` -> passed

## Known Issues

- `npm run lint` ยังรายงาน warning เดิม 8 จุดจาก `@next/next/no-location-assign-relative-destination`; ไม่มี error
- `npm start` ใช้งาน smoke test ได้แต่ Next.js เตือนว่า `next start` ไม่ใช่ launcher สำหรับ `output: "standalone"`; ไม่ได้เปลี่ยน runtime script เพราะอยู่นอก scope

## Next Recommended Agent

human review

## Next Steps

1. ตรวจ current worktree และ Evidence ก่อนเลือก commit scope
2. ถ้าจะส่งงาน ให้ review แล้ว commit ผ่าน feature branch/PR ตาม repository workflow
