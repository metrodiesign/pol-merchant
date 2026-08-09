# Project context

## Product

POL Merchant คือเว็บพอร์ทัลสำหรับตัวแทนและนายหน้าภายนอก ใช้จัดการงานขาย
กรมธรรม์ คำสั่งซื้อ การชำระเงิน ผู้ใช้งาน และบทบาทในขอบเขต Merchant

ผู้ใช้หลัก:

- ตัวแทนและนายหน้าที่สมัครเข้าใช้งาน
- ผู้ดูแล Merchant organization
- ทีมพัฒนาและปฏิบัติการที่ deploy ระบบ

## Current phase

Repository นี้เป็น Merchant bootstrap ที่คัดลอก baseline จาก source repository
ที่ระบุใน approved spec ณ commit
`bb001b30b1379df2eedd4ecfcb09c9d23afe6434` แล้วเปลี่ยน product/runtime contract
สำหรับ Merchant

สิ่งที่พร้อม:

- Merchant identity และ public entry flow
- route สำหรับ login, registration และ health check
- protected Merchant shell สำหรับตรวจ UI ใน development
- runtime แยก development, staging และ production
- container และ CI gate

สิ่งที่ยังไม่พร้อม:

- Merchant authentication และ session จริง
- backend integration ครบทุก protected feature
- production authorization policy

protected shell จึงปิดเป็นค่าเริ่มต้นและตอบ 404 เปิด preview ได้เฉพาะ development
ด้วย `MERCHANT_SHELL_PREVIEW=true`

## Product boundaries

อยู่ในขอบเขต:

- `/login`, `/register`, `/login-error`
- dashboard และงานขาย Merchant
- policy, checkout, order และ transaction
- Merchant user และ role management
- Merchant API namespace `/producer/*`

ไม่อยู่ในขอบเขต:

- back-office control plane
- organization master-data management
- การใช้ session หรือ credential จากระบบต้นทาง
- การเปิด protected shell บน staging/production ก่อนมี authentication จริง

ไฟล์ legacy ที่ยังอยู่เพื่อรักษา source baseline ไม่ถือเป็น public product surface
และห้ามเพิ่มเข้าการนำทางหรือ route โดยไม่มี spec ใหม่

## Runtime contract

| Environment | Platform | Port | API mode |
|---|---|---:|---|
| development | macOS, Windows | 5300 | Next.js rewrite ไป `MERCHANT_API_ORIGIN` |
| staging | Ubuntu 24.04 | 3000 | same-origin reverse proxy |
| production | Ubuntu 24.04 | 3000 | same-origin reverse proxy |

Runtime ใช้ Node.js 22.19.0 และ npm 11.12.1

staging และ production ต้องใช้ artifact/image digest เดียวกัน production deploy
เกิดได้หลัง staging ผ่านเท่านั้น

## API boundary

Development:

```text
/producer/:path* -> ${MERCHANT_API_ORIGIN}/api/v1/merchants/:path*
```

staging/production:

- browser เรียก `/producer/*` แบบ same-origin
- reverse proxy ภายนอกส่งต่อไป Merchant API
- ห้ามฝัง backend origin หรือ credential ใน client bundle

## Source-baseline policy

source baseline ใช้ตรวจว่าการคัดลอกครบ ไม่ได้ห้ามแก้เพื่อ:

- Merchant identity และ route boundary
- environment/runtime contract
- security remediation ที่มีหลักฐาน
- tests, CI และ operating documentation

ทุก divergence ต้อง trace กลับ requirement/task และบันทึกใน spec handoff

## Success criteria

- ผู้พัฒนารัน development ได้บน macOS และ Windows ที่ port 5300
- staging/production รันบน Ubuntu 24.04 ที่ port 3000
- public UI แสดง Merchant identity โดยไม่มี product identity เดิม
- protected route ไม่เปิดใน deployed environment ก่อน authentication พร้อม
- test, lint, typecheck, build, dependency audit และ spec trace ผ่าน
- production promote ผ่าน staging และมี rollback digest

## Sources of truth

- Requirements/design/tasks: `.claude/specs/merchant-portal-bootstrap/`
- Architecture: `.ai/shared/ARCHITECTURE.md`
- Next.js conventions: `.ai/shared/stack/nextjs.md`
- Coding standards: `.ai/shared/CODING_STANDARDS.md`
- Security rules: `.ai/shared/SECURITY_RULES.md`
- Runbook: `README.md` และ `docs/dev-setup.md`
