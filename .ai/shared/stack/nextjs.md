# Next.js stack

Conventions สำหรับ POL Merchant application

## Versions

| Tool | Version |
|---|---:|
| Node.js | 22.19.0 |
| npm | 11.12.1 |
| Next.js | 16.3.0 |
| React / React DOM | 19.2.4 |
| TypeScript | 5.x |
| Tailwind CSS | 4.x |
| Vitest | 4.1.9 |
| sharp | 0.35.3 |

`package-lock.json` เป็น source of truth ใช้ `npm ci` ห้ามใช้ floating version
สำหรับ production dependency

## App Router

- ใช้ `src/app`
- `page.tsx` เป็น route entry
- `layout.tsx` เป็น shared route boundary
- `route.ts` ใช้สำหรับ HTTP endpoint เช่น `/api/health`
- Server Component เป็นค่าเริ่มต้น
- ใช้ `"use client"` เฉพาะเมื่อจำเป็น

Root route redirect ไป `/login`

Public surface:

```text
/login
/register
/login-error
/api/health
```

Protected surface:

```text
/dashboard
/policy/*
/checkout/*
/order/*
/transaction/*
/merchant/user/*
/merchant/role/*
```

## Protected shell

protected layouts เรียก `MerchantShellGate` จุดเดียว

Gate เปิดเมื่อ:

```text
NODE_ENV=development
MERCHANT_SHELL_PREVIEW=true
```

นอกเงื่อนไขตอบ 404 ห้าม duplicate environment check ในแต่ละ page

preview เป็นเครื่องมือตรวจ UI ไม่ใช่ authentication หรือ authorization
เมื่อเพิ่ม Merchant auth จริง ให้เปลี่ยน shared gate ตาม spec ใหม่

## Metadata and language

`src/app/layout.tsx` ต้อง:

- ใช้ `lang="th"`
- ตั้ง title และ description เป็น POL Merchant
- โหลด Thai font coverage
- ไม่แสดง product identity จากระบบต้นทาง

## Components

ลำดับ reuse:

1. domain component ใน `src/components/<domain>`
2. shared component ใน `src/components/shared`
3. primitive ใน `src/components/ui`
4. native HTML/CSS
5. dependency ที่ติดตั้งอยู่แล้ว

ไม่สร้าง wrapper, hook หรือ abstraction เมื่อมี consumer เดียวและไม่ได้ลดความซับซ้อน

## Styling and responsive behavior

- ใช้ Tailwind CSS 4 และ global tokens ใน `src/app/globals.css`
- mobile-first
- breakpoint ตาม utilities ที่มีอยู่
- ห้าม horizontal overflow ที่ viewport 375, 768 และ 1440
- keyboard focus ต้องมองเห็น
- mobile navigation ต้องเปิด/ปิดได้ด้วย keyboard
- desktop navigation รองรับ sidebar/horizontal variant ตาม settings

## Data and state

- server data เริ่มจาก Server Component เมื่อทำได้
- interaction state เก็บใกล้ component ที่ใช้
- shared setting ใช้ provider เดิม
- pure transform/validation อยู่ `src/lib`
- ห้ามสร้าง global store ถ้า local state หรือ URL state พอ
- mock data ที่เหลือจาก bootstrap ห้ามถูกเข้าใจว่าเป็น production integration

## Merchant API

API client อยู่:

```text
src/lib/api/merchant/
```

Development:

```text
/producer/:path* -> ${MERCHANT_API_ORIGIN}/api/v1/merchants/:path*
```

rewrite ใน `next.config.ts` คืนค่า empty list เมื่อไม่ใช่ development

staging/production:

- client ใช้ relative URL `/producer/*`
- reverse proxy ภายนอกเลือก backend origin
- ห้ามใช้ `NEXT_PUBLIC_*` เก็บ credential
- ห้าม hardcode token, password หรือ connection string

## Runtime commands

| Environment | Command | Port |
|---|---|---:|
| development | `npm run dev` | 5300 |
| development clean | `npm run dev:clean` | 5300 |
| staging | `npm run start:staging` | 3000 |
| production | `npm run start:production` | 3000 |

`start:staging` และ `start:production` ต้องใช้ผลจาก `npm run build`

`next.config.ts` กำหนด `output: "standalone"` สำหรับ Docker runtime

## Docker

- build ด้วย Node.js 22.19.0 และ npm 11.12.1
- multi-stage build
- runner เป็น non-root
- listen `0.0.0.0:3000`
- health check `GET /api/health`
- deployed image pin ด้วย immutable digest

artifact เดียวต้องผ่าน staging ก่อน promote เข้า production

## Tests

วาง unit test ข้าง logic:

```text
src/lib/<domain>/<name>.test.ts
scripts/<name>.test.mjs
```

ขั้นต่ำก่อน handoff:

```bash
npm run audit:production
npm test
npm run lint
npx tsc --noEmit
npm run build
```

UI-facing change ต้องตรวจ production runtime ด้วย browser:

- viewport 375, 768, 1440
- public routes
- protected preview ใน development
- sidebar/horizontal/mobile navigation
- keyboard focus และ interaction
- hydration/runtime console error

## Security and dependency policy

- production audit ต้องมี Critical = 0
- fixable High block จนแก้
- no-fix High ผ่านได้เมื่อบันทึก advisory, path, owner และ review date
- ห้าม suppress advisory เงียบ
- security remediation ที่ทำให้ source baseline ต่างต้องบันทึกใน spec handoff

รายละเอียด policy: `docs/dependency-audit.md`
