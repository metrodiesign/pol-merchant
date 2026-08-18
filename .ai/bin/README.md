# .ai/bin Check Engine

Guard logic กลางสำหรับ harness adapters, Git hooks และ CI.

## Scripts

| Script | Interface | ผล |
|---|---|---|
| `check-destructive.sh` | command ที่ `$1` หรือ stdin | exit 2 เมื่อ shell/SQL/Git operation ถูก block |
| `check-bypass.sh` | command ที่ `$1` หรือ stdin | exit 2 เมื่อพยายามข้ามหรือแก้ enforcement |
| `check-secrets.sh` | default staged; `--all` ทั้ง tracked tree | non-zero เมื่อพบ secret/forbidden credential file |
| `check-spec-edit.sh` | file path ที่ `$1` | stdout warning, exit 0 เสมอ |
| `gate-task.sh` | tasks path + new content | exit 2 เมื่อ code gate แดงหรือ Evidence ขาด |
| `install.sh` | ไม่มี argument | ตั้ง git hooks path และ executable bits |

`check-destructive.sh` และ `check-bypass.sh` ใช้ convention `exit 2 = block`,
`exit 0 = allow`. Adapter ต้องรักษา semantics นี้.

## Task gate

เมื่อ content มี task `- [x]` ใต้ `.claude/specs/*/tasks.md`, `gate-task.sh`:

1. ใช้ `SDD_TYPECHECK_CMD` หรือ auto-detect root `npm run typecheck`
2. ใช้ `SDD_TEST_CMD` หรือ auto-detect root `npm test`
3. ตรวจ `Evidence:` non-placeholder ภายใน block ของ task แต่ละตัว

Git pre-commit ตรวจ Evidence จาก staged diff แต่ตั้งใจไม่รัน typecheck/tests. Claude/Codex/OpenCode
task adapters และ CI ปิดช่อง code-green.

## Callers

| Caller | Source |
|---|---|
| Claude | `.claude/hooks/*.sh` |
| Codex | `.codex/hooks/*.sh` |
| OpenCode | `.opencode/plugins/*.js` |
| Git | `.githooks/pre-commit`, `.githooks/pre-push` |
| CI | `.github/workflows/ci.yml` |

## Setup

```bash
./.ai/bin/install.sh
```

ผล:

```text
core.hooksPath -> .githooks
.githooks/* and .ai/bin/* executable
```

Script นี้ mutate local Git config แบบ idempotent. Codex interactive hooks ต้อง review/trust แยกผ่าน
`/hooks`; headless runs ยังต้องพึ่ง Git/CI floor.

## Testing

Guard regression tests อยู่ `.claude/hooks/tests/*.test.sh`:

```bash
for test_file in .claude/hooks/tests/*.test.sh; do bash "$test_file"; done
```

เมื่อแก้ security-critical pattern ต้องมีทั้ง block และ allow cases. ห้าม duplicate logicใน adapter.
