# Development Setup

คู่มือ single Next.js application ที่ repository root สำหรับ macOS, Windows และ Ubuntu 24.04.

## Prerequisites

- Node.js 22.19.0
- npm 11.12.1
- Git
- Docker Desktop หรือ Docker Engine เมื่อใช้ container

ตรวจเวอร์ชัน:

```bash
node --version
npm --version
```

## Install

macOS และ Linux:

```bash
npm install --global npm@11.12.1
npm ci
cp .env.example .env.local
npm run dev
```

Windows PowerShell:

```powershell
npm install --global npm@11.12.1
npm ci
Copy-Item .env.example .env.local
npm run dev
```

เปิด `https://localhost:3002`. Next.js สร้าง self-signed certificate สำหรับ development;
ยืนยัน certificate ใน browser ครั้งแรกได้. `certificates/` ถูก ignore.

## Environment

Template อยู่ที่ root `.env.example`; ค่าบนเครื่องอยู่ที่ root `.env.local`.

```dotenv
ADMIN_API_ORIGIN=https://localhost:5001
NEXT_PUBLIC_API_ORIGIN=https://localhost:5001
```

- `ADMIN_API_ORIGIN` เปิด development rewrites ใน `next.config.ts`
- `NEXT_PUBLIC_API_ORIGIN` กำหนด origin ที่ client API adapters ใช้; ค่านี้เปิดเผยต่อ browser
- ถ้าไม่กำหนด ตัว client ใช้ same-origin และ Next rewrites เป็น empty list
- Production same-origin ปกติไม่ต้องตั้งสองค่านี้
- ห้ามเก็บ token, password หรือ credential ในไฟล์ที่ commit

เมื่อ `ADMIN_API_ORIGIN` มีค่า:

```text
/admin/:path*    -> ADMIN_API_ORIGIN/api/v1/admins/:path*
/producer/:path* -> ADMIN_API_ORIGIN/api/v1/merchants/:path*
/api/:path*      -> ADMIN_API_ORIGIN/api/:path*
```

## Commands

| คำสั่ง | ใช้ทำอะไร |
|---|---|
| `npm run dev` | HTTPS dev server port 3002 |
| `npm run dev:clean` | เก็บ cache เก่าออกแล้วเปิด dev server |
| `npm test` | รัน Vitest ทั้ง source และ scripts |
| `npm run lint` | รัน ESLint |
| `npm run typecheck` | รัน TypeScript no-emit |
| `npm run build` | สร้าง standalone production build |
| `npm start` | รัน build ที่ port 3002 |
| `npm run audit:production` | ตรวจ production dependency vulnerabilities |

## Verification

```bash
npm run audit:production
npm test
npm run lint
npm run typecheck
npm run build
npm start
```

Production probes:

```bash
curl -i http://127.0.0.1:3002/
curl -i http://127.0.0.1:3002/register
curl -i 'http://127.0.0.1:3002/merchant/user/list?tab=active'
```

ผลที่ต้องได้:

- `/` -> `307 Location: /dashboard`
- `/register` -> `200`
- legacy Merchant URL -> `308 Location: /user/list?tab=active`

## Docker

```bash
docker compose build
docker compose up
```

Container รัน `node server.js` จาก root standalone artifact, UID 1001, port 3002.
Healthcheck ตรวจ root redirect ทุก 30 วินาที.

## Troubleshooting

- Port 3002 ถูกใช้: ปิด process เดิมก่อนเปิด dev/start
- TypeScript อ้าง route ที่ไม่มีแล้ว: รัน `npm run dev:clean` หรือย้าย generated `.next` ออก
- Dependency tree ไม่ตรง lockfile: รัน `npm ci`, อย่าแก้ใน `node_modules`
- API cookie/CORS ผิด: ใช้ relative API path และตั้ง `ADMIN_API_ORIGIN` เพื่อ same-origin proxy
- Node version warning: สลับ runtime ให้ตรง 22.19.0 ก่อนตีความ gate result
