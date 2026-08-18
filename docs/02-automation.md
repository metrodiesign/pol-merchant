# Automation: Pane Loop

`scripts/pane-loop.sh` ขับ interactive Claude session ใน iTerm2 แบบ sequential. หนึ่ง group
ใช้หนึ่ง pane; task ใน group ใช้ source tree เดียวกัน.

คู่มือคำสั่งเต็ม: [scripts/pane-loop.md](../scripts/pane-loop.md)

## ใช้งานเร็ว

```bash
scripts/pane-loop.sh <feature>
scripts/pane-loop.sh <feature> all-in-one
scripts/pane-loop.sh <feature> 1 2+3 4
```

| รูปแบบ | การจัด group |
|---|---|
| ไม่ใส่ task ids | อ่าน pending tasks และรวมตาม `Batch:`; task ไม่มี tag แยก pane |
| `all-in-one` | รวม pending tasks ทั้งหมดใน pane เดียว |
| `1 2+3 4` | สาม group: `1`, `2+3`, `4` |

Manual groups มี priority เหนือ `Batch:`. Task ที่เป็น `[x]` หรือไม่พบถูกข้าม.

## Environment

| ตัวแปร | ค่าเริ่มต้น | ผล |
|---|---|---|
| `CLAUDE_FLAGS` | ว่าง | flags ที่ส่งให้ interactive `claude` |
| `STEP_TIMEOUT` | `2400` | เวลารอแต่ละ task ขึ้น `[x]` |

ไม่มี permission-bypass flag โดยอัตโนมัติ.

## Flow

```text
เปิด pane -> /spec-implement ต่อ task -> รอ [x]
          -> /spec-retro หนึ่งครั้งต่อ group
          -> /clear -> /exit -> ปิด pane
```

Script ใช้ macOS, iTerm2, AppleScript, zsh และ Python 3. ทุก group รัน sequential เพราะแชร์
worktree. ถ้า timeout script หยุดและเปิด pane ไว้ให้ตรวจ.
