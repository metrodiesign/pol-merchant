# POL Merchant

เว็บพอร์ทัลสำหรับ merchant/producer ภายนอกที่ทำงานในบทบาทตัวแทนและนายหน้า
พัฒนาด้วย Next.js 16 และ React 19

สถานะปัจจุบันเป็น Merchant bootstrap: หน้า public ใช้งานได้ ส่วน protected shell
เปิดดูได้เฉพาะ development เมื่อกำหนด `MERCHANT_SHELL_PREVIEW=true`
จนกว่าจะเชื่อม Merchant authentication จริง

## Runtime matrix

| Environment | ระบบปฏิบัติการ | คำสั่ง | Port | API |
|---|---|---|---:|---|
| development | macOS หรือ Windows | `npm run dev` หรือ `npm run dev:clean` | 5300 | proxy `/producer/*` ไป `MERCHANT_API_ORIGIN` |
| staging | Ubuntu 24.04 | `npm run start:staging` | 3000 | same-origin reverse proxy |
| production | Ubuntu 24.04 | `npm run start:production` | 3000 | same-origin reverse proxy |
| container | Ubuntu 24.04 | `docker compose up -d` | 3000 | same-origin reverse proxy |

`start:staging` และ `start:production` ต้องรันหลัง `npm run build`

## Prerequisites

- Node.js 22.19.0
- npm 11.12.1
- Docker เมื่อทดสอบหรือ deploy container

ตรวจเวอร์ชัน:

```bash
node --version
npm --version
```

## เริ่มพัฒนาบน macOS

```bash
git clone https://github.com/metrodiesign/pol-merchant.git
cd pol-merchant
npm ci
cp .env.example .env.local
npm run dev:clean
```

เปิด `http://localhost:5300`

## เริ่มพัฒนาบน Windows

ใช้ PowerShell:

```powershell
git clone https://github.com/metrodiesign/pol-merchant.git
Set-Location pol-merchant
npm ci
Copy-Item .env.example .env.local
npm run dev:clean
```

เปิด `http://localhost:5300`

## Environment variables

ใช้เฉพาะ development:

| Variable | Default | หน้าที่ |
|---|---|---|
| `MERCHANT_API_ORIGIN` | `http://localhost:5100` | ปลายทาง Merchant API สำหรับ rewrite `/producer/*` |
| `MERCHANT_SHELL_PREVIEW` | `false` | เปิด protected shell เมื่อเป็น `true` และ `NODE_ENV=development` |

ข้อกำหนด:

- ใช้ `.env.example` เป็น template ค่าปลอม
- เก็บค่าจริงใน `.env.local` หรือ secret manager
- ห้าม commit `.env`, `.env.*`, token, password หรือ connection string
- staging และ production ห้ามใช้ development rewrite หรือ preview flag

## คำสั่งหลัก

| คำสั่ง | ผลลัพธ์ |
|---|---|
| `npm ci` | ติดตั้ง dependency ตาม lock file |
| `npm run dev` | development server ที่ port 5300 |
| `npm run dev:clean` | ลบ Next.js cache แล้วเปิด development server ที่ port 5300 |
| `npm run build` | สร้าง production standalone artifact |
| `npm run start:staging` | staging runtime ที่ `0.0.0.0:3000` |
| `npm run start:production` | production runtime ที่ `0.0.0.0:3000` |
| `npm test` | รัน Vitest |
| `npm run lint` | รัน ESLint |
| `npx tsc --noEmit` | ตรวจ TypeScript |
| `npm run audit:production` | บังคับ production dependency audit policy |

## Route surface

Public:

- `/` redirect ไป `/login`
- `/login`
- `/register`
- `/login-error`
- `/api/health` ตอบ `{"status":"ok"}`

Protected Merchant preview:

- `/dashboard`
- `/policy/*`
- `/checkout/*`
- `/order/*`
- `/transaction/*`
- `/merchant/user/*`
- `/merchant/role/*`

เมื่อ preview ปิด protected route ตอบ 404 เพื่อไม่เปิด shell ที่ยังไม่มี
Merchant authentication จริง

## API contract

Development ใช้ Next.js rewrite:

```text
/producer/:path* -> ${MERCHANT_API_ORIGIN}/api/v1/merchants/:path*
```

staging และ production ไม่มี rewrite นี้ ต้องให้ reverse proxy ภายนอก route
`/producer/*` ไป Merchant API แบบ same-origin

## Docker

Build และ smoke test:

```bash
docker build --tag pol-merchant:local .
docker run --rm --detach --name pol-merchant-local --publish 3000:3000 pol-merchant:local
curl --fail http://127.0.0.1:3000/api/health
docker stop pol-merchant-local
```

Compose:

```bash
docker compose up --build --detach
curl --fail http://127.0.0.1:3000/api/health
docker compose down
```

Container ใช้ Node.js 22.19.0, npm 11.12.1, user ที่ไม่ใช่ root และ port 3000

## Deploy

ใช้ image digest เดียวกันทั้ง staging และ production:

1. Build, test และ push image หนึ่งครั้ง
2. บันทึก digest ใหม่และ digest ก่อนหน้า
3. Deploy digest ใหม่เข้า staging บน Ubuntu 24.04
4. ตรวจ `/api/health`, public routes และ protected-route gate
5. Promote digest เดิมเข้า production เมื่อ staging ผ่าน
6. Tag release และอัปเดต changelog

ตัวอย่าง deploy image ที่ build แล้ว:

```bash
POL_MERCHANT_IMAGE=registry.example.com/pol-merchant@sha256:REPLACE_WITH_DIGEST docker compose pull
POL_MERCHANT_IMAGE=registry.example.com/pol-merchant@sha256:REPLACE_WITH_DIGEST docker compose up --detach --no-build
curl --fail http://127.0.0.1:3000/api/health
```

ห้าม build ใหม่ระหว่าง promote จาก staging ไป production

### Rollback

1. ตั้ง `POL_MERCHANT_IMAGE` กลับเป็น digest ก่อนหน้า
2. รัน `docker compose up --detach --no-build`
3. ตรวจ health และ public routes
4. บันทึกเหตุผล rollback ใน release note

production ต้องผ่าน staging ก่อนเสมอ และไม่ deploy ศุกร์เย็นหรือก่อนวันหยุดยาว
ยกเว้น hotfix ฉุกเฉินที่มีผู้อนุมัติ

## Quality gate

ก่อนเปิด PR:

```bash
npm run audit:production
npm test
npm run lint
npx tsc --noEmit
npm run build
```

CI รัน guard/spec trace บน Ubuntu และ application matrix บน macOS, Windows,
Ubuntu 24.04 ทุก PR เข้า `develop` หรือ `main`

รายละเอียดเพิ่ม:

- [Development setup](docs/dev-setup.md)
- [Production dependency audit](docs/dependency-audit.md)
- [Project context](.ai/shared/PROJECT_CONTEXT.md)
- [Architecture](.ai/shared/ARCHITECTURE.md)
