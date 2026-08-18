# .ai Operating Layer

`.ai/` เป็น source กลางสำหรับ project knowledge, protocols, roles และ guard check engine.
Claude, Codex, OpenCode และ Pi ใช้เนื้อหาเดียวกันผ่าน adapter ของแต่ละ harness.

## Map

```text
.ai/
  shared/       product, architecture, standards, protocols, lessons
  workflows/    feature, bugfix, review, test, frontend procedures
  roles/        spec architect, bug investigator, PBT runner
  bin/          guard/check engine และ installer
  agents/       harness adapters
  templates/    brief, plan, review, handoff, changelog
```

Phase procedures อยู่ `.claude/skills/spec-*/SKILL.md`. Agent Skills ใต้
`.agents/skills/spec-*/` และ OpenCode commands เป็น routers ไป source เดียวกัน.

## Read order

1. `shared/PROJECT_CONTEXT.md`
2. `shared/ARCHITECTURE.md`
3. `shared/CODING_STANDARDS.md`
4. `shared/TASK_PROTOCOL.md`
5. `shared/EARS.md`
6. `shared/REVIEW_PROTOCOL.md`
7. `shared/TESTING_PROTOCOL.md`
8. `shared/SECURITY_RULES.md`
9. `shared/LESSONS.md`
10. `agents/<harness>/AGENT.md`

## Harness map

| Harness | Spec entry | Guard adapter |
|---|---|---|
| Claude | `.claude/skills/spec-*` | `.claude/settings.json`, `.claude/hooks/` |
| Codex | `.agents/skills/spec-*` | `.codex/config.toml`, interactive trust ผ่าน `/hooks` |
| OpenCode | `.agents/skills/`, `.opencode/commands/` | `.opencode/plugins/` |
| Pi | `.agents/skills/spec-*` | manual `.ai/bin/check-*`; Git/CI floor |

ทุก adapter ต้อง delegate logic ไป `.ai/bin/`; ห้าม fork guard regex/policy ต่อ harness.

## Setup

Repository มี root `package.json`; dependency install และ git-hook wiring เป็นคนละขั้น:

```bash
npm ci
./.ai/bin/install.sh
git config --get core.hooksPath
```

`install.sh` ตั้ง `core.hooksPath=.githooks` และ chmod scripts แบบ idempotent. มัน mutate
clone config โดยตั้งใจ; ไม่ได้แค่พิมพ์คำสั่ง.

เปิดแล้วได้:

- pre-commit: staged secret scan + Evidence check ต่อ task
- pre-push: block direct push ไป `main`/`develop`, ref deletion และ non-fast-forward
- CI: server-side full gates ไม่ขึ้นกับ local hook

## Golden rules

- Spec first สำหรับงาน non-trivial
- Minimal change และใช้ pattern เดิมก่อนเพิ่ม abstraction/dependency
- Tests/Evidence เป็นส่วนของ task
- Persist state ลง spec ก่อน handoff/compact
- ไม่ push ตรง protected branches, ไม่ force push, ไม่ bypass guards

Current application architecture อยู่ `shared/PROJECT_CONTEXT.md` และ `shared/ARCHITECTURE.md`.
