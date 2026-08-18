# Git, Pull Request and Rules

Canonical policy: [Security Rules](../.ai/shared/SECURITY_RULES.md), root `AGENTS.md` และ
`.github/workflows/ci.yml`.

## Branch flow

```text
feature/chore branch -> PR -> develop -> release PR -> main
```

- ห้าม push ตรง `main` หรือ `develop`
- PR ที่ target `main` ต้องมี head `develop`
- ห้าม force push และ non-fast-forward push
- ห้าม remote ref deletion โดยไม่มี human confirmation
- งานนี้ไม่ commit/push จน user ขอ explicit

`.githooks/pre-push` บังคับ ref rules ในเครื่อง; CI `pr-base-guard` บังคับ release PR.

## Required CI

Merge ได้เมื่อ required checks ผ่านทั้งหมด:

- guard regression suite
- full secret scan
- spec trace
- clean install
- production dependency audit
- tests, lint, typecheck
- no focused/skipped tests
- production build
- runtime smoke ตาม OS

ห้าม merge ข้าม failing check หรืออ้าง local green แทน server result.

## Secrets

- Commit ได้เฉพาะ `.env.example` ที่เป็นค่าปลอม/non-secret
- `.env`, `.env.*`, key, token, password, connection string และ credential file ห้าม commit
- ห้าม log token, password หรือ PII
- Secret หลุดต้อง rotate/revoke; การลบ commit ไม่ยกเลิก credential
- Pre-commit เรียก `.ai/bin/check-secrets.sh`; CI เรียก `--all`
- ห้าม bypass ด้วย `--no-verify`, hooks path override หรือ guard tamper

## Destructive operations

- ตรวจ exact target ก่อนลบหรือ overwrite
- ห้าม recursive-force delete, hard reset, forced clean โดยไม่มี explicit confirmation
- Production SQL destructive operation ต้องมี scope, backup, rollback และ human confirmation
- Harness ที่มี pre-tool hook เรียก `.ai/bin/check-destructive.sh`
- Pi/manual path ต้องเรียก check engine เองก่อน command เสี่ยง

## Dependencies

- Dependency ใหม่ต้องมีเหตุผล, license/maintenance review และ approval
- Production version ห้าม `*` หรือ `latest`
- เปลี่ยน manifest ต้อง regenerate/commit root `package-lock.json` ด้วย npm 11.12.1
- `npm run audit:production` เป็น blocking CI gate
- ห้าม `npm audit fix --force`

## Release

- Production ผ่าน staging ก่อน
- Release ต้องมี rollback plan, tag และ changelog
- ไม่ deploy ศุกร์เย็นหรือก่อนวันหยุดยาว ยกเว้น emergency hotfix

## Repository conventions

- Output และการคุยกับ user เป็นภาษาไทย ยกเว้น code/path/command/error/technical term
- ห้าม emoji ในไฟล์ Markdown
- งาน non-trivial ใช้ spec-first และ Evidence
- Source ปัจจุบันเป็น root `src/`; ห้ามสร้าง workspace layout กลับมาโดยไม่มี architecture decision
