# Pane Loop

Controller สำหรับรัน pending spec tasks ผ่าน interactive Claude TUI ใน iTerm2.

## Requirements

- macOS
- iTerm2 เปิดอยู่และมี current window
- `claude`, `zsh`, `python3`, `osascript`
- `.claude/specs/<feature>/tasks.md` ที่ approved และมี pending task

## Usage

```bash
scripts/pane-loop.sh [feature-name] [all-in-one | task-groups...]
```

ตัวอย่าง:

```bash
scripts/pane-loop.sh checkout
scripts/pane-loop.sh checkout all-in-one
scripts/pane-loop.sh checkout 1 2+3 4+5
STEP_TIMEOUT=3600 scripts/pane-loop.sh checkout 4
CLAUDE_FLAGS='--model opus' scripts/pane-loop.sh checkout 4
```

ถ้าไม่ระบุ feature script auto-detect ได้เมื่อมี spec directory เดียวเท่านั้น.

## Grouping

| Input | ผล |
|---|---|
| `checkout` | pending tasks grouped ตาม `Batch:`; task ไม่มี tagแยก session |
| `checkout all-in-one` | pending tasks ทั้งหมดอยู่ session เดียว |
| `checkout 1 2+3 4` | group `1`, group `2+3`, group `4` |

หนึ่ง group เท่ากับหนึ่ง pane/session. ภายใน group script เรียก
`/spec-implement <id>` ตามลำดับ แล้วเรียก `/spec-retro` ครั้งเดียว.

เลือก `all-in-one` เมื่อ tasks พึ่ง shared context หนักและขนาดรวมยังควบคุมได้. แยก group เมื่อ
tasks อิสระหรือต้องการ fresh context. Script ไม่เดา dependency นอก `Batch:`.

## Environment

| ตัวแปร | Default | รายละเอียด |
|---|---|---|
| `CLAUDE_FLAGS` | ว่าง | ส่งตรงให้ interactive `claude` |
| `STEP_TIMEOUT` | `2400` | วินาทีสูงสุดต่อ implementation task |

Script ไม่เติม `--dangerously-skip-permissions`. Permission policy มาจาก Claude/project config.

## State machine

1. ตรวจ `tasks.md` และ pending ids.
2. Re-exec ใต้ zsh เพื่อรองรับ macOS Bash 3.2.
3. เปิด vertical iTerm split และรอ TUI 12 วินาที.
4. ส่ง `/spec-implement <id>`.
5. Poll `tasks.md` ทุก 5 วินาทีจน task เป็น `[x]` หรือ timeout.
6. ทำซ้ำจนครบ group.
7. ส่ง `/spec-retro`; รอ HEAD เปลี่ยนสูงสุด 360 วินาที.
8. ส่ง `/clear`, `/exit`, ปิด pane แล้วเปิด group ถัดไป.

Output หลัก:

```text
Feature: <feature> | groups: <groups>
::: group [<ids>] — เปิด pane interactive
::: task <id> — พิมพ์ /spec-implement <id>
```

## Recovery

- Timeout: pane คงเปิด; อ่าน output และ state ใน `tasks.md` ก่อน resume
- Controller ถูกหยุด: เรียก script ใหม่; task `[x]` ถูกข้าม
- Parse ผิด: หยุดก่อนเริ่ม pane แล้วตรวจ task headings รูป `- [ ] N.`
- ห้ามรัน controller ซ้อนกันบน worktree เดียว
- ห้ามแก้ checkbox มือขณะ controller รอ เพราะ checkbox คือ completion signal

## Scope

Pane loop เป็น optional local automation. CI, git hooks และ task Evidence gate ยังเป็น authority;
pane loop ไม่แทน review หรือ verification.
