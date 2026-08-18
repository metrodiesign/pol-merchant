---
description: รัน pane-loop orchestrator ใน iTerm โดยจัด session ตาม Batch tag หรือ task groups ที่ระบุ
argument-hint: <feature-name> [all-in-one | task-groups...]
allowed-tools: Bash, Read
---

รัน `scripts/pane-loop.sh $ARGUMENTS` แบบ background task.

ก่อนรัน:

1. ตรวจว่าไม่มี pane-loop process ทำงานบน worktree นี้.
2. อ่าน `.claude/specs/<feature>/tasks.md`.
3. ต้องมี `> Status: approved`; ถ้ายัง draft ให้ขอ approval ใน session ปัจจุบันก่อน.
4. แจ้ง grouping ที่จะใช้:
   - ไม่ใส่ group: auto-group pending tasks ตาม `Batch:`; untagged task แยก pane
   - `all-in-one`: pending tasks ทั้งหมดใน paneเดียว
   - manual เช่น `1 2+3 4`: หนึ่ง argument ต่อหนึ่ง pane

หลังเริ่ม รอประมาณ 18 วินาทีแล้วอ่าน background output. ต้องเห็น:

```text
Feature: <feature> | groups: <groups>
::: group [<ids>] — เปิด pane interactive
::: task <id> — พิมพ์ /spec-implement <id>
```

พบ error หรือ parse ไม่ตรงให้หยุดและรายงาน. ระหว่างรันแจ้งวิธีดู iTerm pane/output และ notify
เมื่อครบทุก group.

ข้อจำกัด:

- macOS + iTerm2 + AppleScript
- ทุก group sequential และแชร์ worktree
- `CLAUDE_FLAGS` default ว่าง; ห้ามสมมติ permission-bypass
- `STEP_TIMEOUT` default 2400 วินาทีต่อ task
- timeout แล้ว script หยุดและคง pane ไว้ตรวจ
