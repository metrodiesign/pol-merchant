# เอกสาร POL Merchant

เอกสารชุดนี้อธิบาย source และ workflow ปัจจุบันของ single application ที่ repository root.

## เริ่มอ่าน

| ต้องการ | เอกสาร |
|---|---|
| เข้าใจ product และโครง source | [README](../README.md), [Project Context](../.ai/shared/PROJECT_CONTEXT.md), [Architecture](../.ai/shared/ARCHITECTURE.md) |
| ติดตั้งและรัน | [Development Setup](dev-setup.md) |
| ทำงานแบบ spec-first | [Spec-Driven Flow](01-spec-driven-flow.md) |
| รันหลาย task ผ่าน iTerm | [Automation](02-automation.md), [Pane Loop](../scripts/pane-loop.md) |
| ตรวจ cost และทำ retro | [Cost and Retrospective](03-cost-and-retro.md) |
| ใช้ Git และ PR | [Git, PR and Rules](04-git-pr-and-rules.md) |
| เข้าใจ guardrails | [Hooks and Guards](05-hooks.md) |
| sync spec ไป GitHub | [GitHub Issues](06-github-issues.md) |
| ตรวจ dependency | [Dependency Audit](dependency-audit.md) |

## Canonical sources

เมื่อคู่มือขัดกัน ให้ยึดไฟล์ตามลำดับนี้:

1. source/config ที่ใช้งานจริง
2. `.ai/shared/PROJECT_CONTEXT.md`, `ARCHITECTURE.md`, `CODING_STANDARDS.md`
3. `.ai/shared/TASK_PROTOCOL.md`, `TESTING_PROTOCOL.md`, `SECURITY_RULES.md`
4. adapter ของ agent ใต้ `.ai/agents/`
5. คู่มือใน `docs/`

แก้ความรู้กลางที่ `.ai/shared/` ครั้งเดียว. ไฟล์ `.claude/rules/*.md` เป็น pointer stubs.

## Current กับ historical

Current guides คือ root `README.md`, `docs/` ยกเว้นไฟล์ที่ระบุ archived, และ
`.ai/shared/`. Historical records ได้แก่:

- `.claude/specs/<feature>/` ที่ task ปิดแล้ว
- `retrospectives/`
- [SDD Optimization Plan](sdd-optimization-plan.md)
- Evidence ของ migration เก่า เช่น `merchant-workspace-reset`

Historical records อาจอ้างโครงสร้างในเวลานั้นโดยเจตนา. ห้าม rewrite ย้อนหลังเพื่อให้เหมือน source
ปัจจุบัน; สร้าง spec/retro ใหม่เมื่อเกิดงานใหม่.
