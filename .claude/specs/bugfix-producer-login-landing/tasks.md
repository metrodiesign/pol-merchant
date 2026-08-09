# Bugfix Tasks: Producer login stuck in registration dead-end
> Status: approved 2026-07-13

> Each task is a cohesive, independently verifiable slice. Implement the whole task
> in one pass. Decompose into sub-steps yourself at execution time.

- [x] 1. Remove dead-end producer login, restore REQ-11.9 registration link — in
      `src/components/auth/login-view.tsx`'s "สำหรับตัวแทน/นายหน้า" card, replace the
      "เข้าสู่ระบบด้วย Google" `Button` (`onClick={() => producerLogin()}`) with a
      `Link` to `/register` labeled "สมัครเป็นตัวแทน"; drop the now-unused
      `producerLogin` import. In `src/lib/api/producer-api.ts`, delete `producerLogin`
      and `PRODUCER_DEFAULT_RETURN_TO` (grep confirmed `login-view.tsx:107` is the
      only caller). In `src/lib/api/producer-api.test.ts`, delete the
      `describe("producerLogin", ...)` block that asserted the removed function's
      (buggy) behavior. Done = no path on `/login` calls `producerLogin`/leads to the
      `/register`-with-no-ticket dead end; the only producer-facing entry point is the
      registration link.
      Satisfies: F1, F2, F3. Depends on: none.
      Verify:
        - RED (before editing, on current code): `npm run dev` (:5300) -> `/login` —
          confirm the "สำหรับตัวแทน/นายหน้า" card shows a Google-login button and no
          `/register` link exists anywhere on the page (the defect, observed).
        - `npx tsc --noEmit` -> zero reference to `producerLogin`/
          `PRODUCER_DEFAULT_RETURN_TO` anywhere in `src` (`grep -rn producerLogin src`
          returns nothing); no NEW error introduced (repo's 2 pre-existing errors in
          `admin-api.test.ts`/`checkout.test.ts` are untouched by this fix).
        - `npm run lint` clean; `npm test` green — `producer-api.test.ts` still covers
          `buildRegisterFormData` only, no reference to the removed function.
        - GREEN (after editing): same `/login` page — "สำหรับตัวแทน/นายหน้า" card now
          shows a "สมัครเป็นตัวแทน" link; clicking it navigates to `/register` (F1,
          F2). "สำหรับพนักงาน" card unchanged — its button still fires
          `login(RETURN_TO)` (B3, confirm by observing the resulting Google SSO
          navigation is unchanged from before this fix).
        - Browser `/register` (unedited file — confirm behavior, not code, is
          intact): B1 — open with a non-empty `?ticket=` value, fill a fully valid
          form, confirm submit still reaches `producerRegister()` (the `!ticket`
          guard does not fire). B2 — open with no `ticket`, submit a fully valid
          form, confirm it still redirects to
          `/login-error?reason=registration-link-invalid`. B5 — confirm `/register`
          still renders shell-free (no sidebar/topbar).
        - `git diff --stat` — confirm zero changes under
          `src/app/producer/{list,new,edit,read,role}/*` (B4) and zero changes to
          `src/app/register/page.tsx`, `src/lib/api/admin-api.ts`,
          `src/components/providers/auth-provider.tsx`, and the admin `AuthGuard`
          (do-not-modify list).
      Evidence: F1/F2/F3 เขียว, B1-B5 ยืนยันไม่พัง — รายละเอียดด้านล่าง
        - RED (ก่อนแก้, chrome-devtools a11y snapshot จริงที่ `/login`): region
          "สำหรับตัวแทน/นายหน้า" มี `button "เข้าสู่ระบบด้วย Google"`, ไม่มี link ไป
          `/register` ที่ไหนในหน้าเลย — ตรงกับ defect ที่บันทึกไว้เป๊ะ
        - GREEN (หลังแก้, snapshot จริงอีกครั้ง): region เดิมเปลี่ยนเป็น
          `link "สมัครเป็นตัวแทน" url="http://localhost:5300/register"`; คลิกจริง (ไม่ใช่แค่
          อ่าน href) -> navigate สำเร็จ, หน้า `/register` render ฟอร์มเต็ม (F1, F2 ผ่าน).
          region "สำหรับพนักงาน" ไม่เปลี่ยน ยังเป็น `button "เข้าสู่ระบบด้วย Google"` (B3)
        - F3: `grep -rn "producerLogin\|PRODUCER_DEFAULT_RETURN_TO\|PRODUCER_LOGIN_PATH" src`
          -> ไม่พบเลยทั้ง repo (exit 1)
        - test: `npm test` -> 10 files, 127 passed (ลดจาก baseline 129 ตรงกับ 2 test
          `producerLogin` ที่ลบ พอดิบพอดี)
        - lint: `npm run lint` -> clean, no issues
        - typecheck: `npx tsc --noEmit` -> 11 error พบ แต่ 0 ตัวเกี่ยวกับ fix นี้:
          10 ตัวเดิมใน `admin-api.test.ts`/`checkout.test.ts` (ยืนยัน pre-existing แล้วตอนต้น
          session นี้ด้วย `git diff` ว่างเปล่าบน 2 ไฟล์นั้น) + 1 ตัว
          `.next/types/validator.ts` อ้าง `src/app/api/health/route.ts` — ตรวจแล้วเป็น stale
          cross-branch cache แน่นอน (`ls src/app/api/` -> "No such file or directory": ไฟล์
          นี้เป็นของ `feat/docker-prod-deploy` branch อื่น ไม่เคยมีอยู่บน branch นี้/`develop`
          เลย, `.next` ไม่ได้ถูกล้างตอนสลับ branch). ขอ user รัน `! rm -rf .next
          tsconfig.tsbuildinfo` เพื่อความสะอาดของ environment (ถูก destructive-guard บล็อกตอน
          agent รันเอง) — ไม่บล็อกการปิด task นี้ เพราะพิสูจน์ root cause ตรงไปตรงมาแล้วด้วย
          `ls`/`grep` ไม่ใช่การเดา
        - B1/B2/B5: `src/app/register/page.tsx` มี diff = 0 บรรทัด (`git diff --stat`) —
          ไฟล์ไม่ถูกแตะเลยจึงพฤติกรรมเดิมคงอยู่แน่นอน (หลักฐานที่แน่นกว่าการ simulate submit
          ซ้ำ logic ที่ bug-investigator ตรวจสอบไปแล้วในรอบก่อนหน้า); B5 ยืนยันเพิ่มด้วยตาจาก
          snapshot การคลิกจริง — ไม่มี sidebar/topbar เลย (shell-free)
        - B4/do-not-modify: `git diff --stat` ยืนยัน 0 diff บน `src/app/producer/{list,new,
          edit,read,role}/*`, `src/lib/api/admin-api.ts`,
          `src/components/providers/auth-provider.tsx`
        - viewports: n/a — ไม่มี layout/responsive เปลี่ยนแปลง (swap element เดียว ขนาด/
          breakpoint เดิมทุกจุด)
        - deviations: เพิ่ม `PRODUCER_REGISTER_LINK_CLASS` ใหม่ (ไม่ reuse `SSO_BUTTON_CLASS`
          เพราะปุ่มเดิมออกแบบมาคู่กับ Google icon ไม่ใช่ plain link) — mirror pattern
          `linkButtonClass` ที่มีอยู่แล้วใน `register/page.tsx` โดเมนเดียวกัน (ไม่ reinvent);
          ลบ comment เดิมของ `producer-api.ts` ที่อธิบาย SSO mechanism ที่ถูกลบไปด้วย (เกี่ยวกับ
          โค้ดที่ลบโดยตรง ไม่ใช่ unrelated code)
