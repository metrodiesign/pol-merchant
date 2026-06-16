> Stack profile (optional extension) — complements the neutral canon, ไม่แทนที่.
> Canon ที่เป็นกลางอยู่ที่ `../CODING_STANDARDS.md` / `../ARCHITECTURE.md` /
> `../TESTING_PROTOCOL.md`; ไฟล์นี้บันทึกเฉพาะสิ่งที่เจาะจง stack ของโปรเจกต์ POL merchant console.

# Next.js stack profile — Payment Orchestration Layer (POL) Merchant Console

โปรไฟล์นี้บันทึก stack จริงและ convention ที่ปฏิบัติในโค้ดของ repo นี้ (merchant-facing
console). เนื้อหาเป็น stack-specific เสริมจาก canon ที่เป็นกลาง — ใช้ค่าจริงจาก `package.json`,
`tsconfig.json`, `components.json`, `postcss.config.mjs`, `src/app/globals.css` เป็นแหล่งอ้างอิง.

## Product context (สั้น ๆ ให้ agent ไม่หลงทาง)

โปรเจกต์ชื่อ Payment Orchestration Layer (POL). **repo นี้คือ merchant-facing console
(frontend)** ของ POL นั้น — ไม่ใช่ orchestration backend, ไม่ใช่ end-customer checkout,
ไม่ใช่ PSP/admin backoffice. ผู้ใช้เป้าหมายคือ **ตัวแทนประกันภัย / นายหน้าประกันภัย** เท่านั้น
รวมถึง branch และ sub-user ที่คุมด้วย role (RBAC); transaction originator เป็นหนึ่งใน
`branch | agent | broker | staff | app`. จุดประสงค์: ให้ตัวแทน/นายหน้ารับชำระเบี้ยประกันข้าม PSP
และ channel หลายตัวผ่าน orchestration layer เดียว แล้วจัดการ payment lifecycle, reconciliation,
และ integration. เนื้อหา domain เป็นภาษาไทย.

## Stack + versions (ค่าจริง)

- **Next.js 16.2.6** — App Router, React Server Components เป็น default
- **React 19.2.4** + react-dom 19.2.4
- **TypeScript 5** — `strict: true` + `noUncheckedIndexedAccess: true`; path alias `@/*` -> `./src/*`
- **Tailwind CSS v4** (CSS-first) + `@tailwindcss/postcss`
- **shadcn 4.8.0** (registry CLI) บน **@base-ui/react 1.5.0** — Base UI primitives, **ไม่ใช่ Radix**
- **lucide-react 1.16.0** — icon library
- **@tanstack/react-table 8.21.3** — headless data table
- **recharts 3.8.1** — chart
- **simplebar-react 3.3.2** (+ simplebar 6.3.3) — custom scrollbar
- **class-variance-authority 0.7.1** + **clsx 2.1.1** + **tailwind-merge 3.6.0** — class composition
- **tw-animate-css 1.4.0** — animation utility
- dev tooling: eslint 9 + eslint-config-next 16.2.6; @types/node 20, @types/react 19, @types/react-dom 19

## Tailwind v4 — CSS-first setup

ไม่มี `tailwind.config.js` — config ทั้งหมดอยู่ใน CSS:

- `src/app/globals.css` เปิดด้วย `@import "tailwindcss";` + `@import "tw-animate-css";`
  (และ `@import "simplebar-react/dist/simplebar.min.css";`)
- PostCSS: `postcss.config.mjs` โหลด plugin เดียว `@tailwindcss/postcss`
- design token อยู่ใน `@theme { ... }` ใน `globals.css`: brand palette, grey scale, semantic surface,
  radius, shadow
- dark mode: `@custom-variant dark (&:is(.dark *));`
- **custom breakpoints** `mmd` (900px) และ `mlg` (1200px) สำหรับ MUI parity — ประกาศใน `@theme`
  เป็น **rem** (`--breakpoint-mmd: 56.25rem`, `--breakpoint-mlg: 75rem`). ต้องเป็น rem เท่านั้น:
  Tailwind v4 จัดลำดับ media block ตาม rem default — ถ้าใส่ px จะ emit `mmd`/`mlg` ก่อน `sm`/`md`/`lg`
  แล้วทำให้ override แบบ `sm:`->`mmd:` พัง
- ห้ามสร้าง `tailwind.config.js` ใหม่ — เพิ่ม token ใน `@theme` แทน

## Class utility — `cn`

`src/lib/utils.ts` รวม clsx + tailwind-merge:

```typescript
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

ใช้ `cn` จาก `@/lib/utils` สำหรับ compose class แบบ conditional ที่ merge ชนกันได้อย่างปลอดภัย.
ไฟล์เดียวกันยังมี `formatTHB` / `formatTHBPlain` (Intl `th-TH`, currency THB) — ใช้ตัวที่มีอยู่
อย่าเขียน formatter ซ้ำ.

## shadcn/ui บน Base UI (ไม่ใช่ Radix)

`components.json`: `style: "base-nova"`, `baseColor: "neutral"`, `rsc: true`, `iconLibrary: "lucide"`,
`tailwind.css: "src/app/globals.css"`, `cssVariables: true`. alias: `ui -> @/components/ui`,
`utils -> @/lib/utils`.

- primitives ของ shadcn อยู่ใน `src/components/ui/*.tsx` (gen โดย shadcn CLI)
- substrate คือ **@base-ui/react** — เช่น `button.tsx` wrap `@base-ui/react` primitive ด้วย CVA variants;
  **อย่าเพิ่ม `@radix-ui/*`** หรือสมมติว่า component เป็น Radix
- icon ใช้ `lucide-react` เท่านั้น

## Data table pattern

- hook กลาง `src/hooks/use-data-table.ts` (manual TanStack Table pattern: core row model, sorting,
  filtering, pagination, row selection)
- ต่อ feature มี hook co-located `use-*-table.ts` (เช่น `src/components/payment/transactions/
  use-transactions-table.ts`) ที่ต่อยอด `useDataTable()` ด้วย domain filter + derived state
- column นิยามแบบ typed `ColumnDef<T>[]` (เช่น `txnColumns: ColumnDef<Transaction>[]`);
  per-column styling metadata ผ่าน `src/types/table-meta.ts`
- chart ใช้ recharts; scroll container ใช้ simplebar-react

## Fonts

ผ่าน `next/font/google` ใน `src/app/layout.tsx` — default **Public Sans**; ทางเลือก Barlow, Inter,
DM Sans, Nunito Sans (inject เป็น CSS var `--font-public-sans`, `--font-barlow`, `--font-inter`,
`--font-dm-sans`, `--font-nunito-sans`). อย่าโหลด font ผ่าน `<link>` หรือ `@import` ใน CSS — ใช้
`next/font/google` เพื่อให้ Next optimize.

## Conventions (ที่ปฏิบัติจริงในโค้ด)

- **file naming**: kebab-case ทุกไฟล์ (component `component-name.tsx`, type `kebab-case.ts`,
  mock `kebab-case.ts`)
- **hooks**: `use-*.ts` — อยู่ใน `src/hooks/` หรือ co-located `use-*-table.ts` ใน feature dir
- **domain types**: PascalCase export ใน `src/types/<domain>.ts` (kebab-case filename) — api-client,
  audit, invoice, originator, permission, policy, psp, role, transaction, user, webhook
- **mock data**: typed + seeded ใน `src/lib/mock/<domain>.ts` — ใช้ deterministic seeded RNG,
  แยกข้อมูลออกจาก presentation, อย่าฝัง logic ลงในข้อมูล. DOMAIN จาก `src/lib/mock/transactions.ts`:
  PSP = 2C2P, Omise; channel = card, qr, installment, wallet, bank; policy type = ประกันรถยนต์ / ประกันชีวิต /
  ประกันสุขภาพ / ประกันอัคคีภัย / ประกันการเดินทาง / ประกันอุบัติเหตุ
- **feature-folder organization**: จัด component ตาม feature ใต้ `src/components/payment/<feature>/`;
  shadcn primitives อยู่ใน `src/components/ui/`
- **`"use client"`**: ใส่เฉพาะที่ต้อง interactivity จริง (form, drawer, filter, table ที่มี event
  handler); RSC เป็น default — server component ไม่ต้องประกาศ
- **import order**: external (react, next/*, @base-ui, @tanstack, recharts, lucide-react) ->
  internal absolute (`@/...`) -> relative (`./`, `../`)

## Payment domain layer (real product) — routes ยัง PENDING

`src/components/payment/<feature>/` + `src/types/` + `src/lib/mock/` + hooks คือ **domain จริงของ
product**. แต่ ณ ตอนนี้ **ยังไม่มี route ใต้ `src/app` ที่ import `components/payment` เลย** —
payment route **ยังไม่ถูก wire เข้า App Router** (grep ยืนยัน: ไม่มีไฟล์ใน `src/app` import
`components/payment`). อย่าอ้างว่ามี payment route แล้ว.

`src/app/dashboard/*` ปัจจุบัน รวมถึง `components/dashboard/*` และ `lib/mock/*` หลายตัว (analytics,
banking, booking, calendar, chat, course, ecommerce, file, file-manager, job, kanban, mail, order,
post, product, tour, user, invoice-minimals ...) เป็น **scaffold ที่สืบทอดมาจาก Minimal UI
(Minimals v700) admin template** — รอ prune/replace เมื่อ route POL จริงถูก wire.

feature dir ใต้ `payment/`: dashboard, transactions, invoices, psp, webhooks, api-clients,
notifications, branches, agents, users, roles (RBAC), audit, reports, apps. shared payment atoms ที่
ราก `payment/`: `stat-card`, `status-badge`, `channel-tag`, `confirm-modal`, `entity-drawer`,
`lifecycle-track`, `mini-lifecycle`, `table-empty`, `table-footer`, `toast/`.

## Tooling / port (port 5300 บังคับ)

scripts ใน `package.json`:

```json
{
  "dev": "next dev -p 5300",
  "build": "next build",
  "start": "next start -p 5300",
  "lint": "eslint"
}
```

โปรเจกต์ต้องรันที่ **port 5300** ทั้ง dev และ start. lint ผ่าน `eslint` (eslint-config-next).
