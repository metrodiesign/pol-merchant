# Hooks and Guardrails

Guard logic กลางอยู่ใน `.ai/bin/`. Git และ CI เป็น durable floor สำหรับทุก agent;
harness hooks ให้ feedback ก่อนคำสั่งหรือก่อนจบ task.

## เปิดใช้งานต่อ clone

```bash
./.ai/bin/install.sh
git config --get core.hooksPath
```

ค่าที่ต้องได้คือ `.githooks`.

## Enforcement layers

| ชั้น | Wiring | หน้าที่ |
|---|---|---|
| Git pre-commit | `.githooks/pre-commit` | scan staged secrets; task ที่เพิ่ม `[x]` ต้องมี Evidence ใน block เดียวกัน |
| Git pre-push | `.githooks/pre-push` | block direct push ไป `main`/`develop`, remote ref deletion, non-fast-forward push |
| CI | `.github/workflows/ci.yml` | guard tests, full secret scan, spec trace, app gates และ smoke tests |
| Claude | `.claude/settings.json` -> `.claude/hooks/` | pre-tool guards, spec warning, task gate, session/compact context |
| Codex | `.codex/config.toml` -> `.codex/hooks/` | interactive hooks หลัง review/trust ผ่าน `/hooks` |
| OpenCode | `.opencode/plugins/` | adapters ไป check engine กลาง |
| Pi | manual checks | รัน `.ai/bin/check-*.sh` ก่อน risky shell; พึ่ง Git/CI floor |

## Claude wiring

| Event | Matcher | Handler | ผล |
|---|---|---|---|
| `PreToolUse` | `Bash` | `destructive-guard.sh`, `hook-bypass-guard.sh` | block เมื่อ check engine exit 2 |
| `PreToolUse` | `Edit` | `spec-edit-guard.sh` | เตือนเมื่อแก้ approved requirements ที่ยังมี task ค้าง |
| `PostToolUse` | `Edit|Write` | `task-gate.sh` | mark `[x]` ต้อง typecheck/test green และมี Evidence |
| `SessionStart` | ทุก session | inline command | inject branch และ active specs |
| `PreCompact` | ทุก compact | `precompact-persist.sh` | เตือน persist active state ลง spec |

Wiring ปัจจุบันไม่มี `TaskCreated`, `TaskCompleted` หรือ `Stop` hook.

## Check engine

- `check-destructive.sh`: block destructive shell/SQL, force push และ protected branch operations
- `check-bypass.sh`: block `--no-verify`, hooks-path tamper และ guard tamper
- `check-secrets.sh`: staged scan โดย default; `--all` สำหรับ CI
- `check-spec-edit.sh`: non-blocking advisory
- `gate-task.sh`: auto-detect root `typecheck` และ `test` scripts แล้วตรวจ Evidence per task

Exit 2 จาก pre-tool hook หมายถึง block. ห้าม bypass; แยก command ที่ปลอดภัยออกและแก้ root cause.

## Git hook scope

Pre-commit ตั้งใจเร็ว: ไม่รัน tests หรือ typecheck. Tests/typecheck อยู่ใน task gate และ CI.
Pre-push ตรวจ refs ที่ Git ส่งจริง ไม่พึ่ง regex command spelling.

Guard regression suite อยู่ `.claude/hooks/tests/*.test.sh` และ CI รันทุกไฟล์. เมื่อแก้ guard
ต้องเพิ่มทั้ง blocked case และ allowed case แล้วรัน:

```bash
for test_file in .claude/hooks/tests/*.test.sh; do bash "$test_file"; done
```

รายละเอียด policy: [Security Rules](../.ai/shared/SECURITY_RULES.md).
