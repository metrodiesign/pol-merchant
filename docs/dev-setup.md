# Development setup

คู่มือพัฒนา POL Merchant บน macOS และ Windows รวม smoke test สำหรับ Ubuntu 24.04

## Compatibility

| Profile | OS | Node.js | npm | Port |
|---|---|---:|---:|---:|
| development | macOS, Windows | 22.19.0 | 11.12.1 | 5300 |
| staging | Ubuntu 24.04 | 22.19.0 | 11.12.1 | 3000 |
| production | Ubuntu 24.04 | 22.19.0 | 11.12.1 | 3000 |

ใช้ `npm ci` เสมอเพื่อให้ dependency ตรง `package-lock.json`

## macOS

```bash
git clone https://github.com/metrodiesign/pol-merchant.git
cd pol-merchant
npm ci
cp .env.example .env.local
npm run dev:clean
```

เปิด `http://localhost:5300/login`

## Windows

ใช้ PowerShell:

```powershell
git clone https://github.com/metrodiesign/pol-merchant.git
Set-Location pol-merchant
npm ci
Copy-Item .env.example .env.local
npm run dev:clean
```

เปิด `http://localhost:5300/login`

คำสั่งทั้งหมดใช้ Node.js จึงไม่พึ่ง Bash สำหรับ development

## Development configuration

`.env.example` มีเฉพาะค่าปลอม:

```dotenv
MERCHANT_API_ORIGIN=http://localhost:5100
MERCHANT_SHELL_PREVIEW=false
```

- `MERCHANT_API_ORIGIN` ใช้กับ development rewrite เท่านั้น
- ตั้ง `MERCHANT_SHELL_PREVIEW=true` เมื่อต้องตรวจ protected shell บนเครื่องพัฒนา
- preview ทำงานเฉพาะเมื่อ `NODE_ENV=development`
- ห้ามนำ preview flag หรือ development API origin ไปใช้บน staging/production
- ห้าม commit `.env.local` หรือ secret

หลังเปลี่ยน environment variable ให้ restart development server

## Merchant API

เมื่อเรียก:

```text
http://localhost:5300/producer/users
```

development server rewrite ไป:

```text
http://localhost:5100/api/v1/merchants/users
```

เปลี่ยน host/port backend ได้ผ่าน `MERCHANT_API_ORIGIN` โดยไม่แก้ source code

staging และ production ใช้ reverse proxy ภายนอกแบบ same-origin; Next.js ไม่สร้าง
development rewrite ในสอง environment นี้

## Smoke test

เมื่อ server พร้อม:

```bash
curl --fail http://127.0.0.1:5300/api/health
curl --fail http://127.0.0.1:5300/login
```

ผล health ต้องเป็น:

```json
{"status":"ok"}
```

PowerShell:

```powershell
(Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5300/api/health).Content
(Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5300/login).StatusCode
```

## Port 5300 ถูกใช้งาน

ตรวจบน macOS:

```bash
lsof -nP -iTCP:5300 -sTCP:LISTEN
```

ตรวจบน Windows:

```powershell
Get-NetTCPConnection -LocalPort 5300 -State Listen
```

หยุด application เจ้าของ port แล้วรัน `npm run dev:clean` ใหม่
คำสั่งนี้ลบเฉพาะ `.next` และ `tsconfig.tsbuildinfo` ก่อนเปิด Next.js

## Local quality gate

```bash
npm run audit:production
npm test
npm run lint
npx tsc --noEmit
npm run build
```

`npm run lint` อาจรายงาน warning ที่อนุญาต แต่ต้องไม่มี error
`npm run audit:production` ต้องผ่าน policy ใน
`configs/production-audit-policy.json`

## Ubuntu 24.04 staging smoke

```bash
npm ci
npm run build
npm run start:staging
```

เปิด terminal อีกหน้าตรวจ:

```bash
curl --fail http://127.0.0.1:3000/api/health
curl --fail http://127.0.0.1:3000/login
```

หยุด staging process ก่อนเปิด profile อื่น เพราะ staging และ production ใช้ port 3000

## Ubuntu 24.04 production smoke

ใช้ build artifact เดียวกับ staging:

```bash
npm run start:production
```

ตรวจ:

```bash
curl --fail http://127.0.0.1:3000/api/health
curl --fail http://127.0.0.1:3000/login
```

การ deploy จริงต้อง promote image digest ที่ผ่าน staging แล้ว ห้าม rebuild
ดูขั้นตอน deploy และ rollback ใน `README.md`

## Docker smoke

```bash
docker build --tag pol-merchant:local .
docker run --rm --publish 3000:3000 pol-merchant:local
```

ตรวจจาก terminal อื่น:

```bash
curl --fail http://127.0.0.1:3000/api/health
```

Container ต้องรายงาน `healthy` หลัง health check ผ่าน

## CI coverage

- macOS: `npm run dev:clean` และ development smoke ที่ port 5300
- Windows: `npm run dev:clean` และ development smoke ที่ port 5300
- Ubuntu 24.04: audit, test, lint, TypeScript, build, staging smoke และ production smoke
- Ubuntu: guard regression, secret scan และ spec trace

CI จริงรันเมื่อเปิด PR; ผล local ไม่แทนผล remote CI
