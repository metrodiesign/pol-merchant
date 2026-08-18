# Dependency Audit

สถานะตรวจล่าสุด: 2026-08-18

## Runtime baseline

| รายการ | เวอร์ชัน/นโยบาย |
|---|---|
| Node.js | 22.19.0 |
| npm | 11.12.1 |
| Next.js | 16.3.1 |
| React / React DOM | 19.2.4 |
| Vitest | 4.1.9 |
| Lockfile | root `package-lock.json`, lockfileVersion 3 |
| Workspace packages | ไม่มี |

เวอร์ชันจริงต้องอ่านจาก root `package.json` และ `package-lock.json`; ตารางนี้เป็น snapshot
สำหรับอ่านเร็ว.

## คำสั่งบังคับ

```bash
npm ci
npm run audit:production
```

`audit:production` เรียก `npm audit --omit=dev --json` ผ่าน
`scripts/check-production-audit.mjs` และ fail เมื่อพบ production `high` หรือ `critical`.
CI รันบน Linux ก่อน test/lint/typecheck/build.

ผลล่าสุด:

```text
Production audit: critical=0, high=0, total=0
```

`npm audit` แบบรวม dev dependencies รายงาน `brace-expansion` 1 high ผ่าน tooling chain.
ไม่กระทบ production audit ณ snapshot นี้ แต่ต้องทบทวนเมื่ออัปเดต lockfile.

## นโยบาย

- ห้ามเพิ่ม dependency โดยไม่ตรวจ license, maintenance และเหตุผลการใช้งาน
- Production dependency ห้ามใช้ `*` หรือ `latest`
- เปลี่ยน manifest แล้วต้อง commit lockfile ที่ regenerate ด้วย npm 11.12.1
- ห้ามรัน `npm audit fix --force`; ประเมิน breaking change และ production exposure ก่อน
- ช่องโหว่ production ระดับ high/critical เป็น blocker
- Dev-only advisory ต้องบันทึกไว้และทบทวนเมื่อ dependency ต้นทางออก patch

ดู enforcement เพิ่มที่ [Security Rules](../.ai/shared/SECURITY_RULES.md).
