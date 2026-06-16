> Canonical source for ALL agents (Claude loads via .claude/rules stub; Codex/OpenCode/Pi read directly).
> แก้ที่นี่ที่เดียว — single source of truth.

# Project Structure

## Folder Layout

โครงสร้างจริงของ repo นี้ (ตัว framework เอง) เป็นตัวอย่าง concrete ของการแยก
operating layer ที่ vendor-neutral ออกจาก per-agent adapter:

```
.ai/                  # operating layer ที่ใช้ร่วมทุก agent (durable source of truth)
  shared/             # มาตรฐาน + protocol ที่อ่านได้ทุก agent (PROJECT_CONTEXT, CODING_STANDARDS,
                      #   ARCHITECTURE, LESSONS, TASK_PROTOCOL, EARS, REVIEW/TESTING/SECURITY/...)
  bin/                # check engine จริง (gate-task.sh, check-secrets.sh, check-destructive.sh, ...)
  roles/              # นิยาม role กลาง (spec-architect, bug-investigator, pbt-runner)
  workflows/          # คู่มือ flow ต่อชนิดงาน (feature, bug-fix, code-review, ...)
  templates/          # template ของ artifact (handoff note, review report, task brief, ...)
  agents/             # per-agent adapter map (claude/, codex/, opencode/, pi/)
.claude/              # Claude Code adapter — agents/, commands/, hooks/, rules/ (stub), skills/,
                      #   specs/, settings.json
.codex/               # Codex adapter — agents/, hooks/, config.toml
.opencode/            # OpenCode adapter — agents/, commands/, plugins/
.agents/              # adapter ร่วม (skills/)
.githooks/            # enforcement floor (Tier 1): pre-commit, pre-push
.github/              # CI workflows + pull_request_template.md
scripts/              # automation (pane-loop, cost/trace tooling, spec-state, ...)
docs/                 # คู่มือผู้ใช้ของ framework
retrospectives/       # บันทึก retro รายเดือน
.claude/specs/<feature-name>/   # spec artifact ต่อ feature: requirements.md, design.md, tasks.md
                                #   (+ .github-sync.json sidecar เมื่อ sync แล้ว)
```

> layout นี้เป็นตัวแทนหลัก ไม่ exhaustive — ground truth คือ `ls` จริง;
> /spec-retro มีขั้น steering sync คอยเทียบให้ตรง

## Application structure (per project)

`.ai/` คือ operating layer ของ framework ไม่ใช่ของแอป — แต่ละ project ที่ใช้ framework นี้
จัดวาง source ของตัวเองอย่างไรก็ได้ตาม stack ที่เลือก โดยยึด PRINCIPLE ต่อไปนี้
(ไม่ผูกกับ framework/ภาษาใดภาษาหนึ่ง):

- แยก pure logic ออกจาก presentation — logic คำนวณ/validate/transform อยู่คนละชั้นกับ
  ส่วน UI; ส่วน UI เรียกใช้ ไม่ฝังสูตรไว้ในตัว view
- co-locate unit test ไว้ข้าง logic ที่มันทดสอบ (test อยู่ติดกับโค้ดที่รับผิดชอบ)
- config/design token มี single source ที่เดียว — เรียกผ่าน semantic reference ไม่ทำซ้ำค่าดิบ
- จัด import เป็นชั้น: external ก่อน → internal absolute → relative
- naming convention ชัดและคงเส้นคงวาทั้ง project (ดู Naming Conventions ด้านล่าง)

### This project: Payment Orchestration Layer (POL) merchant console (`src/` layout)

repo นี้คือ MERCHANT-facing console (frontend) ของ **Payment Orchestration Layer (POL)**
สำหรับตัวแทนประกันภัย / นายหน้าประกันภัย (ตลอดจนสาขาและ sub-user ที่คุมด้วย RBAC)
ใช้รวบรับชำระเบี้ยประกันข้าม PSP/channel หลายทางผ่าน orchestration layer เดียว แล้วจัดการ
payment lifecycle, reconciliation และ integration ทั้งหมด (ไม่ใช่ orchestration backend,
ไม่ใช่ end-customer checkout, ไม่ใช่ PSP/admin backoffice). transaction originator เป็นหนึ่งใน
`branch | agent | broker | staff | app`. content เป็นภาษาไทย; PSP = 2C2P, Omise; channel = card,
qr, installment, wallet, bank; policy type = ประกันรถยนต์ / ประกันชีวิต / ประกันสุขภาพ / ประกันอัคคีภัย /
ประกันการเดินทาง / ประกันอุบัติเหตุ.

stack: Next.js 16 (App Router, React Server Components เป็น default) + React 19 +
TypeScript 5 (strict + noUncheckedIndexedAccess); path alias `@/*` -> `src/*`; Tailwind v4
(CSS-first) + shadcn/ui บน `@base-ui/react` (Base UI primitives — ไม่ใช่ Radix);
`@tanstack/react-table` สำหรับ data table; recharts สำหรับ chart; `cn` ที่ `@/lib/utils`.
dev/start รันบน PORT 5300.

```
src/
  app/                    # App Router (RSC). route ปัจจุบัน = scaffold ที่สืบทอดจาก
                          #   Minimal UI (Minimals v700) admin template (app/dashboard/*);
                          #   ยังไม่มี route ของ POL จริง — payment route ยัง PENDING (ดูหมายเหตุล่าง)
  components/
    payment/<feature>/    # ชั้น product domain จริงของ POL (ตรงนี้คือเนื้อจริง)
    ui/                   # shadcn/ui primitives (button, input, dialog/sheet, ... บน @base-ui/react)
    dashboard/            # widget ที่สืบทอดจาก Minimals template (จะถูก prune/แทนเมื่อ wire route จริง)
  types/                  # domain type (PascalCase type, kebab-case ไฟล์)
  lib/
    mock/                 # typed seeded mock data (seeded RNG, แยกออกจาก presentation)
    utils.ts              # cn() = twMerge(clsx(...))
  hooks/                  # use-*.ts รวม table hook ของ @tanstack/react-table
public/                   # static asset (favicon, ...)
```

ชั้น product domain จริงอยู่ใต้ `src/components/payment/<feature>/` (จัดแบบ feature-folder)
feature area ได้แก่:

- `dashboard/` — KPI grid, volume bar chart, PSP donut, channel breakdown, top originators,
  recent transactions, txn drawer
- `transactions/` — lifecycle, action, bulk bar, columns, filter, kpi strip,
  `use-transactions-table`
- `invoices/` — hosted payment preview/link, form, columns, tabs, stat cards
- `psp/` — provider card, config modal, routing rule + routing-rule modal, history drawer
- `webhooks/` — endpoints, api keys card, event log, integration guide, payload drawer, tabs
- `api-clients/` — list/row, create modal, secret reveal modal, kpi cards
- `notifications/` — columns, filter, kpi strip, payload drawer, resend dialog
- `branches/`, `agents/`, `users/`
- `roles/` — RBAC: badge, editor drawer, columns
- `audit/` — timeline, filter, detail drawer, stats
- `reports/` — reconciliation table, breakdown ตาม channel/psp/originator, date range
- `apps/` — integration card/grid

shared payment atom อยู่ที่ราก `components/payment/`: `stat-card`, `status-badge`,
`channel-tag`, `confirm-modal`, `entity-drawer`, `lifecycle-track`, `mini-lifecycle`,
`table-empty`, `table-footer`, `toast/` (toast provider) และ `shell/` (global hotkeys / app shell).

domain type อยู่ใต้ `src/types/` (เช่น `api-client`, `audit`, `invoice`, `originator`,
`permission`, `policy`, `psp`, `role`, `transaction`, `user`, `webhook`) และ typed mock data
คู่กันอยู่ที่ `src/lib/mock/<domain>.ts`. table hook ที่ใช้ `@tanstack/react-table` อยู่ที่
`src/hooks/use-data-table.ts` และ per-feature `use-*-table.ts` (co-located ตาม feature ก็มี).

project นี้ทำให้ principle ข้างบนเป็นจริงดังนี้: logic/mock data ถูกแยกออกจาก presentation
(mock อยู่ใน `src/lib/mock/` แบบ typed + seeded, view เพียงเรียกใช้ ไม่ inline ก้อนข้อมูล);
จัด component แบบ feature-folder (`components/payment/<feature>/`) โดย shadcn primitive
แยกไว้ที่ `components/ui/`; เรียก internal module ผ่าน alias `@/*`; "use client" ใส่เฉพาะจุดที่
ต้องมี interactivity (RSC เป็น default).

หมายเหตุสำคัญ (route status): ชั้น `payment/*` (component + type + mock + hook) มีอยู่ครบในระดับ
domain แต่ payment route ยัง "ไม่ถูก wire" เข้า App Router — ไม่มี route ใต้ `src/app` ที่
import `components/payment` เลย. route ใต้ `src/app/dashboard/*` และไฟล์ `components/dashboard/*`
+ `lib/mock/*` หลายตัว (analytics, banking, booking, calendar, ecommerce, kanban, mail, ...) คือ
scaffold ที่สืบทอดจาก Minimals template รอ prune/แทนเมื่อ wire route POL จริง. อย่าอ้างว่า
payment route มีอยู่แล้ว.

`.github-sync.json` ใน `.claude/specs/<feature>/` = sidecar manifest ของ `/spec-sync-github`
(link map issue<->task) — commit เข้า repo, เฉพาะคำสั่ง sync เขียน; ห้ามแก้มือ,
ห้ามใส่ link ลง tasks.md

## Naming Conventions

- type/interface: PascalCase
- ไฟล์ logic/data: ตาม convention ของภาษา/stack ที่ project เลือก แต่คงเส้นคงวาทั้ง repo
- ค่าคงที่ที่ export: ตั้งชื่อสื่อความหมาย + มี type ชัด

## Import Ordering

1. external (dependency ของภายนอก)
2. internal absolute (โมดูลภายใน project)
3. relative (`./...`)

## Architectural Patterns

- logic คำนวณ/validate แยกเป็นชั้นของตัวเอง — ส่วน UI เรียกใช้ ไม่ฝังสูตรไว้ในตัว view
- data แยกจากตัว presentation — ส่งผ่าน props หรือ import โดยตรง ไม่ inline ก้อนใหญ่ในไฟล์ view
- design token อยู่ที่เดียว — เรียกผ่าน semantic reference
- ถ้า project มี UI: องค์ประกอบ interactive มี state ครบ (default/hover/focus/active/disabled)
  และ accessible เป็น principle (keyboard reachable, focus มองเห็น, contrast พอ)
- โค้ดพิสูจน์ว่าเขียวด้วย `.ai/bin/gate-task.sh` ตอน flip task เป็น `[x]`: gate อ่าน
  `SDD_TYPECHECK_CMD` / `SDD_TEST_CMD` (auto-detect script ใน package.json ให้ project แบบ Node)
  เพื่อรัน typecheck/test; เมื่อไม่มีทั้งคู่จะข้าม code-green แล้วเหลือเพียง Evidence gate

## Anti-Patterns

- ห้าม duplicate magic constant / ค่าดิบซ้ำหลายที่ (ใช้ single source แทน)
- ห้าม inline data ก้อนใหญ่ในไฟล์ presentation
- ห้ามฝังสูตรคำนวณ/business logic ตรงในตัว view
- ห้าม mark task `[x]` ทั้งที่ typecheck/test ยังไม่เขียว หรือไม่มี Evidence
- test ต้อง assert พฤติกรรมที่สังเกตได้ ไม่ใช่ snapshot รายละเอียดภายในที่เปราะ
