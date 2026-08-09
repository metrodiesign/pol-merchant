# Architecture

## Overview

Repository มีสองชั้น:

1. Agent operating layer ใน `.ai/`, `.agents/`, `.claude/` และ `.githooks/`
2. POL Merchant application ใน `src/` พร้อม runtime/deploy files ที่ root

Spec เป็นตัวกำหนดการเปลี่ยน application ทุกงานต้องไหล
requirements -> design -> tasks -> implementation -> evidence

## Repository layout

```text
.ai/
  shared/                 shared project rules และ source of truth
  agents/                 harness adapters
  roles/                  role contracts
  workflows/              spec-driven workflows
  bin/                    guard และ trace scripts
.agents/skills/           spec-* skills
.claude/specs/            feature artifacts และ handoff
.github/workflows/        CI
configs/                  machine-readable policies
docs/                     operating documentation
public/                   static assets
scripts/                  local checks และ runtime helpers
src/
  app/                    Next.js App Router
  components/             UI by domain
  lib/                    domain, API และ shared logic
Dockerfile
docker-compose.yml
next.config.ts
```

## Application routes

Public routes:

| Route | Responsibility |
|---|---|
| `/` | redirect ไป `/login` |
| `/login` | Merchant sign-in entry |
| `/register` | Merchant registration |
| `/login-error` | public authentication error |
| `/api/health` | runtime health response |

Protected Merchant route groups:

| Group | Responsibility |
|---|---|
| `/dashboard` | Merchant overview |
| `/policy`, `/checkout` | policy และ checkout flow |
| `/order` | order workflow |
| `/transaction` | payment transaction views |
| `/merchant/user` | Merchant user management |
| `/merchant/role` | Merchant role and permission management |

ทุก protected layout route ผ่าน `MerchantShellGate`

`MerchantShellGate` render `MinimalsLayout` เฉพาะเมื่อ:

```text
NODE_ENV=development
MERCHANT_SHELL_PREVIEW=true
```

กรณีอื่นตอบ 404 จนกว่า Merchant authentication จริงเข้ามาแทน gate

## Component boundaries

```text
src/app
  -> src/components/<domain>
      -> src/components/shared และ src/components/ui
  -> src/lib/<domain>
      -> src/lib/api/merchant
```

กฎ dependency:

- route ประกอบ page/layout และเรียก domain component
- domain component ไม่ import จาก route
- shared UI ไม่ import domain feature
- API client อยู่ `src/lib/api/merchant`
- validation และ pure domain logic อยู่ `src/lib` และมี unit test ข้างไฟล์
- ห้ามเพิ่ม public route ด้วยการนำ legacy component มา render โดยไม่มี spec

## Layout and navigation

- `src/app/layout.tsx` กำหนด Thai locale, font และ Merchant metadata
- `src/components/layout/minimals-layout.tsx` เป็น protected application shell
- `src/components/layout/nav-config.ts` เป็น navigation source เดียว
- desktop ใช้ sidebar หรือ horizontal navigation ตาม settings
- mobile ใช้ drawer navigation
- logo, title และ browser metadata ต้องเป็น POL Merchant

## Server and client boundaries

- Server Component เป็นค่าเริ่มต้น
- เพิ่ม `"use client"` เฉพาะ component ที่ใช้ state, event, browser API หรือ hook
- environment gate ประเมินบน server
- Client Component รับข้อมูล serializable ผ่าน props
- ห้ามส่ง secret หรือ server-only environment variable ไป client

## API topology

Development rewrite ใน `next.config.ts`:

```text
/producer/:path* -> ${MERCHANT_API_ORIGIN}/api/v1/merchants/:path*
```

rewrite ถูกสร้างเฉพาะ `NODE_ENV=development`

staging และ production ใช้ reverse proxy ภายนอก:

```text
browser -> same-origin /producer/* -> reverse proxy -> Merchant API
```

frontend ไม่รู้ backend origin ใน deployed environment

## Runtime

| Profile | Command | Host | Port |
|---|---|---|---:|
| development | `npm run dev` | localhost | 5300 |
| development clean | `npm run dev:clean` | localhost | 5300 |
| staging | `npm run start:staging` | `0.0.0.0` | 3000 |
| production | `npm run start:production` | `0.0.0.0` | 3000 |

Runtime baseline:

- Node.js 22.19.0
- npm 11.12.1
- Next.js standalone output
- Ubuntu 24.04 สำหรับ staging/production host

`scripts/clean-development.mjs` ใช้ Node.js stdlib ลบ cache จึงทำงานทั้ง macOS
และ Windows โดยไม่เพิ่ม cross-platform dependency

## Container and release

Dockerfile ใช้ multi-stage build:

```text
base -> deps -> builder -> runner
```

runner:

- copy เฉพาะ standalone output และ static assets
- รันด้วย non-root user UID 1001
- expose port 3000
- health check `/api/health`

Compose รับ image ผ่าน `POL_MERCHANT_IMAGE` เพื่อ pin digest

Release flow:

```text
build once -> staging same digest -> verify -> production same digest
```

Rollback เปลี่ยนกลับ digest ก่อนหน้า ไม่ rebuild

## Verification architecture

- Vitest: domain/runtime contracts
- ESLint: code quality
- TypeScript: static type contract
- Next.js build: production compilation
- browser verification: responsive UI, navigation, interaction, hydration
- dependency audit: `scripts/check-production-audit.mjs`
- spec trace: ทุก REQ ต้องมี design และ task coverage
- guard suites: destructive command, bypass, secret และ task-evidence enforcement

CI แยก:

- `verify`: guard, secret scan, spec trace
- `application`: macOS/Windows development smoke และ Ubuntu 24.04 full gate

## Naming and imports

- file/folder: `kebab-case`
- React component/type: `PascalCase`
- function/variable: `camelCase`
- constant: `UPPER_SNAKE_CASE` เมื่อเป็นค่าคงที่จริง
- ใช้ alias `@/*` สำหรับ import ภายใน `src`
- export เฉพาะสิ่งที่มี consumer

## Change rules

- minimal diff ตาม approved spec
- reuse component/helper ที่มีอยู่ก่อนสร้างใหม่
- no dependency ใหม่ถ้า stdlib หรือ dependency เดิมพอ
- test อยู่กับ non-trivial logic
- source-baseline divergence ต้องมี requirement, evidence และ handoff
- security remediation ทำได้เมื่อ audit policy บังคับและบันทึกเหตุผล
