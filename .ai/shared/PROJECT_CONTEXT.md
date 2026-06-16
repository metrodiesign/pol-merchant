> Canonical source for ALL agents (Claude loads via .claude/rules stub; Codex/OpenCode/Pi read directly).
> แก้ที่นี่ที่เดียว — single source of truth.

# Product Overview

## Purpose

โปรเจกต์ชื่อ **Payment Orchestration Layer (POL)** — repo นี้คือ frontend console ฝั่ง merchant ของ POL
ให้ตัวแทน/นายหน้าประกันภัยรับชำระค่าเบี้ยประกันข้ามหลาย PSP และหลายช่องทางผ่าน orchestration layer เดียว
แล้วบริหาร payment lifecycle, การกระทบยอด (reconciliation) และ integration ทั้งหมดได้จากที่เดียว
(ชื่อ "CentroPay" ที่ปรากฏใน mock data เป็น brand ตัวอย่างเท่านั้น ไม่ใช่ชื่อโปรเจกต์)

## Target Users

ผลิตภัณฑ์นี้เป็น merchant-only console — ผู้ใช้คือฝั่งร้านค้า/ตัวแทนที่รับเงินเท่านั้น ไม่ใช่ end-customer
และไม่ใช่ผู้ดูแล PSP

- ตัวแทนประกันภัย (agent) และนายหน้าประกันภัย (broker) — กลุ่มผู้ใช้หลัก ออกใบแจ้งหนี้/ลิงก์ชำระเงิน
  ติดตามธุรกรรม และดูรายงานกระทบยอดของตัวเอง
- สาขา (branch) และ sub-user ภายใต้ตัวแทน/นายหน้า — เข้าถึงตามสิทธิ์ที่กำหนดด้วย RBAC (role-based)
- ผู้ริเริ่มธุรกรรม (transaction originator) เป็นหนึ่งใน: branch | agent | broker | staff | app
  (app = แอป/ระบบองค์กรที่เชื่อมต่อเข้ามาผ่าน API client; staff = พนักงานภายใน)

## Problem It Solves

การรับชำระค่าเบี้ยประกันในวันนี้กระจัดกระจาย: หลาย PSP, หลายช่องทาง (card, qr, installment, wallet, bank), หลายสาขา
และหลายตัวแทน ทำให้กระทบยอดยาก ตามสถานะธุรกรรมไม่ครบ และคุมสิทธิ์การเข้าถึงได้ลำบาก POL รวมทุก
อย่างไว้ใน orchestration layer เดียว: ส่งธุรกรรมเข้า PSP ตาม routing rule ที่ตั้งไว้ ติดตามทุกสถานะใน
lifecycle เดียวกัน กระทบยอดข้ามช่องทาง/PSP/ผู้ริเริ่ม และเปิดให้เชื่อมต่อระบบองค์กรผ่าน API/webhook โดยยัง
คุมสิทธิ์ผู้ใช้ด้วย RBAC

## Key Features

ฟีเจอร์จัดกลุ่มตาม domain ใต้ `src/components/payment/<feature>/` (ส่วน domain layer มีจริง — ดู Non-Goals
เรื่องสถานะ route):

- Dashboard — KPI grid, volume bar chart, สัดส่วน PSP (donut), channel breakdown, top originators,
  recent transactions และ transaction drawer
- Transactions — payment lifecycle, actions, bulk bar, columns, filter, KPI strip
- Invoices & payment links — hosted payment preview/link, ฟอร์มออกใบแจ้งหนี้, columns, tabs, stat cards
- PSP & routing — provider card, config modal, routing rules + routing-rule modal, history drawer
  (PSP ที่รองรับในข้อมูล mock: 2C2P, Omise)
- Webhooks — endpoints, API keys, event log, integration guide, payload drawer
- API clients — list/row, create modal, secret reveal modal, KPI cards (จัดการ credential ของแอปที่เชื่อมต่อ)
- Notifications — columns, filter, KPI strip, payload drawer, resend dialog
- Users & permissions (RBAC) — users, roles (badge, editor drawer, columns), branches, agents
- Audit — timeline, filter, detail drawer, stats
- Reports — reconciliation table, breakdown ตาม channel/PSP/originator, date range
- Apps — integration cards/grid (จุดเชื่อมต่อเดียวสำหรับแอปองค์กร)

domain types อยู่ที่ `src/types/` (PascalCase types, ไฟล์ kebab-case) และ typed mock data อยู่ที่
`src/lib/mock/<domain>.ts` โดยแยก data ออกจาก presentation ชัดเจน เนื้อหาเป็นภาษาไทย ครอบคลุมประเภท
กรมธรรม์: ประกันรถยนต์ / ประกันชีวิต / ประกันสุขภาพ / ประกันอัคคีภัย / ประกันการเดินทาง / ประกันอุบัติเหตุ

## Business Objectives

- ให้ตัวแทน/นายหน้ารับชำระค่าเบี้ยได้ทุกช่องทางที่รองรับ (card, qr, installment, wallet, bank) ผ่าน orchestration
  layer เดียว โดยไม่ต้องผูกกับ PSP รายใดรายหนึ่ง
- ติดตาม payment lifecycle ของทุกธุรกรรมได้ครบจากจุดเดียว และกระทบยอดข้าม channel/PSP/originator ได้ถูกต้อง
- คุมสิทธิ์การเข้าถึงด้วย RBAC ครบทั้งระดับ branch / agent / broker / sub-user
- เปิดให้ระบบองค์กรเชื่อมต่อผ่าน API client + webhook ได้อย่างปลอดภัยและตรวจสอบย้อนหลังได้ผ่าน audit log

## Non-Goals

- ไม่ใช่ end-customer checkout app (หน้าจ่ายเงินฝั่งลูกค้า)
- ไม่ใช่ PSP/admin backoffice (เครื่องมือฝั่งผู้ดูแล PSP)
- ไม่ใช่ orchestration backend เอง — repo นี้เป็น frontend console ฝั่ง merchant ของ POL เท่านั้น
- ยังไม่มี live backend: ข้อมูลทั้งหมดเป็น typed-mock (deterministic seeded RNG) เพื่อพัฒนา UI
- payment routes ยังไม่ถูก wire เข้า App Router: domain layer (components + types + mock + hooks)
  มีครบแล้ว แต่ปัจจุบันยังไม่มี route ใต้ `src/app` ที่ import `components/payment` — route ของ POL
  จริงจะถูก wire ทีหลัง ขณะที่ `src/app/dashboard/*` และ scaffold หลายส่วนยังเป็นของ Minimal UI
  (Minimals v700) template ที่จะถูก prune/แทนที่
