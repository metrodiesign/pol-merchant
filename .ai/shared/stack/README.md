# Stack Profiles

`.ai/shared/` เก็บ workflow/security canon ที่ใช้ได้ทุก stack. Profile ใน directory นี้เพิ่ม
convention ของ runtime ที่ repository ใช้จริง.

## Active profile

- [Next.js](nextjs.md) — root POL Merchant app, App Router, Tailwind, Vitest, standalone/Docker

เมื่อเพิ่ม stack ใหม่ ให้สร้าง `<stack>.md` เฉพาะเมื่อ source ใช้งาน stack นั้นจริง. ห้าม duplicate
กฎกลางจาก `CODING_STANDARDS.md`, `TESTING_PROTOCOL.md` หรือ `SECURITY_RULES.md`.
