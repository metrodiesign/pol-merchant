# GitHub Issues from Specs

`spec-sync-github` mirror spec tasks ไป GitHub เพื่อให้ทีมเห็นงาน; files ใน
`.claude/specs/<feature>/` ยังเป็น source of truth.

## Model

- หนึ่ง feature spec -> หนึ่ง Epic issue
- หนึ่ง task checkbox -> หนึ่ง native sub-issue
- `[ ]` -> open, `[x]` -> closed
- Labels: `spec:<feature>`, `spec-epic`, `spec-task`, `req-spine`
- Manifest `.claude/specs/<feature>/.github-sync.json` ทำให้ sync ซ้ำได้โดยไม่ duplicate

## Commands

```text
/spec-sync-github <feature>
/spec-sync-github <feature> --dry-run
/spec-sync-github <feature> --epic-only
```

รันหลัง task gate ผ่าน. Network sync เป็น on-demand; ไม่มี hook ยิง GitHub ระหว่าง edit.

สร้าง labels ครั้งแรก:

```bash
scripts/bootstrap-labels.sh [feature ...]
```

## Pull request

Feature branch เปิด PR เข้า `develop`. ใช้ `Closes #<epic>` เมื่อ PR ปิดทั้ง feature หรือ
`Refs #<epic>` เมื่อยังไม่ครบ. PR เข้า `main` ต้องมาจาก `develop` เท่านั้น.

## CI ที่ issue/PR ต้องสะท้อน

`.github/workflows/ci.yml` ทำงานบน PR และ push ที่ target `main` หรือ `develop`:

- PR base guard
- guard regression tests
- full-tree secret scan
- spec trace ทุก requirements-based spec
- `npm ci`
- production dependency audit
- 240-source-test baseline และ script tests
- ESLint
- TypeScript
- no `.only` / `.skip`
- production build
- Linux production HTTP smoke
- macOS และ Windows HTTPS development smoke

ห้ามปิด issue หรือ merge PR โดยอ้าง green ในเครื่องเมื่อ required CI ยังแดง.
