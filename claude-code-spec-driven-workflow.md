# Spec-Driven Workflow Guide

คู่มือเข้าใช้งาน workflow ปัจจุบัน. Canonical rules อยู่ใน `.ai/shared/`; ไฟล์นี้ไม่ duplicate
รายละเอียด hook, EARS หรือ task protocol เพื่อป้องกัน drift.

## Read order

1. `.ai/shared/PROJECT_CONTEXT.md`
2. `.ai/shared/ARCHITECTURE.md`
3. `.ai/shared/CODING_STANDARDS.md`
4. `.ai/shared/TASK_PROTOCOL.md`
5. `.ai/shared/EARS.md`
6. `.ai/shared/REVIEW_PROTOCOL.md`
7. `.ai/shared/TESTING_PROTOCOL.md`
8. `.ai/shared/SECURITY_RULES.md`
9. `.ai/shared/LESSONS.md`
10. adapter ใต้ `.ai/agents/<agent>/AGENT.md`

## Feature flow

```text
/spec-new
  -> /spec-requirements
  -> approval
  -> /spec-design
  -> approval
  -> /spec-tasks
  -> approval
  -> /spec-implement
  -> verification + Evidence
  -> /spec-retro
```

`/spec-quick` รัน requirements -> design -> tasks -> implementation ต่อเนื่องโดยไม่ pause
approval เหมาะกับงานเล็กที่ scope ชัด. `/spec-bugfix` ใช้ root-cause-first workflow.

Artifact อยู่ที่ `.claude/specs/<feature>/`:

| ไฟล์ | หน้าที่ |
|---|---|
| `requirements.md` | behavior และ EARS criteria |
| `design.md` | architecture และ REQ traceability |
| `tasks.md` | implementation checklist, verification, Evidence |
| `handoff.md` | durable state เมื่อส่งต่อ ถ้า workflow ต้องใช้ |

Approval ต้องอยู่ใน header ของ artifact ไม่ใช่พึ่งข้อความใน chat.

## Task completion

หนึ่ง task ต้องจบเป็น cohesive slice พร้อม test. ก่อน mark `[x]`:

1. รัน test/typecheck ที่เกี่ยวข้อง.
2. รัน browser verification เมื่อ acceptance เป็น UI.
3. บันทึก exact command/result, viewports และ deviations ใน `Evidence:`.
4. รัน `scripts/spec-trace.sh <feature>` ก่อนปิด task สุดท้าย.
5. อัปเดต design/requirements ถ้า implementation decision เปลี่ยน contract.

Root project commands:

```bash
npm run audit:production
npm test
npm run lint
npm run typecheck
npm run build
```

## Automation

`scripts/pane-loop.sh` เป็น optional iTerm controller. ไม่ใส่ task groupsจะใช้ `Batch:` tags;
`all-in-one` ต้องระบุเอง. `CLAUDE_FLAGS` default ว่าง. ดู
[`scripts/pane-loop.md`](scripts/pane-loop.md).

## Enforcement

| ชั้น | กลไก |
|---|---|
| Git | `.githooks/pre-commit` ตรวจ staged secrets + Evidence; `pre-push` กัน protected/force push |
| CI | guard tests, full secret scan, spec trace, production audit, tests, lint, typecheck, build, smoke tests |
| Claude | PreToolUse guards, task gate, spec-edit warning, PreCompact reminder |
| Codex | project hooks หลัง interactive trust; git/CI เป็น durable floor |
| OpenCode | plugin adapters ไป `.ai/bin/` |
| Pi | manual `.ai/bin/check-*` แล้วพึ่ง git/CI floor |

เปิด git hooks ต่อ clone:

```bash
./.ai/bin/install.sh
```

ไม่มี `TaskCreated` หรือ `TaskCompleted` hook ใน wiring ปัจจุบัน. Hook source อยู่
`.claude/settings.json`; check logic กลางอยู่ `.ai/bin/`.

## Context

เลือก session grouping ตาม coupling:

- tightly coupled tasks: batch หรือ `all-in-one` เมื่อ context รวมยังปลอดภัย
- independent/high-risk tasks: แยก fresh session
- ก่อน compact/clear: persist active task, decisions, files, commands, results และ next step ลง spec

## Historical boundary

`.claude/specs/` ที่ปิดแล้ว, `retrospectives/` และ
`docs/sdd-optimization-plan.md` เป็นหลักฐานตามเวลาที่เขียน. อาจอ้าง topology หรือ tool behavior
เก่าได้โดยไม่ใช่ current instruction.
