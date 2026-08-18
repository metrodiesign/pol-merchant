# POL Merchant

Merchant portal แบบ single Next.js application ที่ repository root ใช้ Next.js 16.3.1,
React 19.2.4, TypeScript, Tailwind CSS 4 และ Vitest 4.1.9

## โครงสร้าง

```text
public/                 static assets
src/
  app/                  App Router routes และ layouts
  components/           UI แยกตาม feature
  hooks/                shared React hooks
  lib/                  API adapters, domain logic, mocks, utilities
  types/                shared TypeScript types
docs/                   คู่มือปัจจุบัน
scripts/                audit, spec trace, automation, cost tools
.ai/                    canonical agent/workflow rules
.claude/specs/          feature specs และ Evidence
```

Application config อยู่ root: `.env.example`, `components.json`, `next.config.ts`,
`postcss.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `package.json` และ
`package-lock.json`. Repository นี้ไม่มี npm workspace และไม่มี `apps/` หรือ `packages/`.

## เริ่มใช้งาน

ต้องใช้ Node.js 22.19.0 และ npm 11.12.1

```bash
npm install --global npm@11.12.1
npm ci
cp .env.example .env.local
npm run dev
```

เปิด `https://localhost:3002`. Development server ใช้ self-signed HTTPS; browser อาจขอให้
ยืนยัน certificate ครั้งแรก. ดูขั้นตอน Windows, Docker และ troubleshooting ที่
[`docs/dev-setup.md`](docs/dev-setup.md).

## Environment

| ตัวแปร | ใช้เมื่อ | ค่าเริ่มต้น |
|---|---|---|
| `ADMIN_API_ORIGIN` | Development proxy สำหรับ `/admin/*`, `/producer/*`, `/api/*` | ไม่มี rewrite |
| `NEXT_PUBLIC_API_ORIGIN` | Client API adapters; ค่านี้เปิดเผยต่อ browser | same-origin |

เก็บค่าจริงใน `.env.local` เท่านั้น. Commit ได้เฉพาะ `.env.example` ที่ไม่มี secret.

## Route สำคัญ

- `/` ตอบ `307` ไป `/dashboard`
- `/register` เป็น public route
- `/user/{list,new,read,edit}` และ `/role/{list,create,read,edit}` เป็น canonical Merchant routes
- `/merchant/user/*` และ `/merchant/role/*` ตอบ `308` ไป canonical route และรักษา query string
- `/admin/user/*` และ `/admin/role/*` ยังคงเป็น Admin routes
- `/control/*`, `/organization/*`, `/order/*`, `/transaction/*`, `/policy/*` และ `/checkout/*`
  ใช้โครง App Router เดิม

Domain identifiers เช่น `Merchant`, `MerchantCode`, `MerchantUser*` และ backend contract
`/producer/*` ยังใช้ชื่อเดิม; สิ่งที่ยุบคือ directory/import namespace เท่านั้น.

## คำสั่ง

| คำสั่ง | ผล |
|---|---|
| `npm run dev` | HTTPS development server ที่ port 3002 |
| `npm run dev:clean` | ล้าง generated Next/TypeScript cache แล้วเปิด dev server |
| `npm test` | รัน `src/**/*.test.ts` และ `scripts/**/*.test.mjs` |
| `npm run lint` | รัน ESLint ทั้ง repository ตาม ignore config |
| `npm run typecheck` | รัน TypeScript แบบ no-emit |
| `npm run build` | สร้าง production standalone build |
| `npm start` | รัน production server ที่ port 3002 |
| `npm run audit:production` | ตรวจ production dependency vulnerabilities |

ก่อนส่งมอบให้รันตามลำดับ:

```bash
npm run audit:production
npm test
npm run lint
npm run typecheck
npm run build
```

## Docker

```bash
docker compose build
docker compose up
```

Image ใช้ Node 22.19.0, npm 11.12.1, Next standalone output, non-root UID 1001 และ port 3002.
Healthcheck ต้องเห็น `307 Location: /dashboard` จาก `/`.

## เอกสาร

- [`docs/README.md`](docs/README.md) — index คู่มือปัจจุบันและ historical records
- [`.ai/shared/PROJECT_CONTEXT.md`](.ai/shared/PROJECT_CONTEXT.md) — product context
- [`.ai/shared/ARCHITECTURE.md`](.ai/shared/ARCHITECTURE.md) — canonical architecture
- [`.ai/shared/stack/nextjs.md`](.ai/shared/stack/nextjs.md) — Next.js conventions
- [`claude-code-spec-driven-workflow.md`](claude-code-spec-driven-workflow.md) — workflow entry guide

## Workflow

งาน non-trivial ใช้ spec-first: requirements -> design -> tasks -> implementation.
`/spec-quick` ข้าม approval pauses ได้เมื่อ scope เล็กและชัด. เปิด git hooks ต่อ clone ครั้งเดียว:

```bash
./.ai/bin/install.sh
git config --get core.hooksPath
```

ห้าม push ตรง `main`/`develop`, ห้าม force push, และไม่ merge เมื่อ CI แดง.
