# Production Dependency Audit

บันทึก source baseline, security remediation และ policy สำหรับ production dependency audit ของ
POL Merchant ตรวจล่าสุดวันที่ 2026-08-09.

## Policy

| ระดับ | CI behavior | การติดตาม |
|---|---|---|
| Critical | บล็อกเสมอ | remediate ก่อน merge |
| High ที่มี patched version | บล็อก | update dependency และ lockfile ก่อน merge |
| High ที่ยังไม่มี patched version | ผ่านได้เมื่อ tracking ครบ | ระบุ advisory, dependency path, owner และ review dateใน policy file |

Policy machine-readable อยู่ที่ `configs/production-audit-policy.json`. รายการที่ขาดข้อมูลหรือเลย
review dateทำให้ `npm run audit:production` ล้มเหลว.

## Baseline และ remediation

Source baseline คือ `pol-admin` commit `bb001b30b1379df2eedd4ecfcb09c9d23afe6434`.

| Dependency | Source | Target | เหตุผล |
|---|---:|---:|---|
| `next` | `16.2.6` | `16.3.0` | patched Next.js/PostCSS advisories |
| `sharp` | `0.34.5` | `0.35.3` | patched `GHSA-f88m-g3jw-g9cj` |
| `eslint-config-next` | `16.2.6` | `16.3.0` | ให้ lint contract ตรงกับ Next.js runtime |
| transitive production graph | source lock | `npm audit fix` แบบไม่ force | remediate fixable High chains |

Normalized lock comparison: source 796 entries, target 800 entries, เพิ่ม 4, เปลี่ยน 64 และลบ 0.
รายการต่างทั้งหมดมาจาก direct upgrades ข้างต้นกับ transitive security remediation.

ไม่มี dependency ใหม่จาก remediation. License review ของ dependency ที่ย้ายจาก source อยู่ใน
`design.md` ของ spec `merchant-portal-bootstrap`.

## Current Result

```text
Production audit: critical=0, high=0, total=0
```

Active no-fix High tracking: ไม่มี. Owner สำหรับรอบตรวจถัดไปคือ Platform Engineering;
review date 2026-09-09.

## Commands

```bash
npm ci
npm run audit:production
```
