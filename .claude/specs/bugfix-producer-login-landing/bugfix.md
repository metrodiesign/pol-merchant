# Bugfix: Producer login stuck in registration dead-end
> Status: approved 2026-07-13

## Current Behavior (Defect)

WHEN an already-active producer clicks "เข้าสู่ระบบด้วย Google" in the "สำหรับตัวแทน/นายหน้า"
card on `/login` and completes Google SSO successfully THEN the backend returns them to
`/register` — the hardcoded `PRODUCER_DEFAULT_RETURN_TO` default (`src/lib/api/producer-api.ts:10,13`)
used by the only call site, `producerLogin()` in `src/components/auth/login-view.tsx:107`, which
passes no override. They land on an empty registration form. WHEN they fill it in and submit THEN
`register/page.tsx`'s `handleSave` (`:124-125`) finds no `ticket` query param (tickets are issued
to new/rejected producers only, via the backend callback, never via `returnTo`) and redirects to
`/login-error?reason=registration-link-invalid`. There is no path from a successful producer login
to any working page.

Repro (deterministic, unit-level): `npx vitest run src/lib/api/producer-api.test.ts` currently
PASSES an assertion that locks in the defect — `producerLogin()` called with no args navigates to
`/producer/auth/login?returnTo=%2Fregister`.

Root cause (verified against code + specs, not the fixable symptom): no producer-session-gated
landing exists anywhere in this app. Every non-public route (including `/producer/list`, the route
a 2026-06-23 retrospective TODO originally intended as the target) is wrapped by the admin-only
`AuthGuard`, which checks the admin `/admin/me` endpoint — a producer session cannot pass it because
no producer session mechanism exists. This was speced once (`login-google-sso/requirements.md:92`,
REQ-4.3), deferred, then deliberately cut ("Admin only — ตัด producer audience ทิ้ง",
`login-google-sso/design.md:337-338`, 2026-06-24) without anyone removing the now-dangling producer
login entry point that depended on it.

Separately (same file, same card, discovered during investigation): the "สมัครเป็นตัวแทน" link
required by `producer-management` REQ-11.9 is also absent from `login-view.tsx` today. `tasks.md`
records it as built and verified, but it was lost when commit `1036eca` ("replace merchant scaffold
with pol-admin codebase") replaced `login-view.tsx` with the current version. `/register` currently
has no visible entry point at all from `/login`.

## Expected Behavior

- F1  THE SYSTEM SHALL NOT present a producer Google-login entry point on `/login`, since no
      producer-session-gated landing exists for it to return to.
- F2  THE SYSTEM SHALL present a "สมัครเป็นตัวแทน" link on `/login`, in the card currently labeled
      "สำหรับตัวแทน/นายหน้า", that navigates to `/register` (restores REQ-11.9).
- F3  THE SYSTEM SHALL NOT retain dead code: `producerLogin` and `PRODUCER_DEFAULT_RETURN_TO` in
      `src/lib/api/producer-api.ts` are removed once their only caller is removed, and
      `producer-api.test.ts` no longer asserts on them.

## Unchanged Behavior

- B1  WHEN a new producer opens `/register?ticket=<valid>` (from the backend registration-invite
      callback) and submits a valid form THE SYSTEM SHALL CONTINUE TO call `producerRegister()` and
      show the success panel (REQ-11.7), unchanged.
- B2  WHEN `/register` is submitted with no `ticket` or an invalid one THE SYSTEM SHALL CONTINUE TO
      redirect to `/login-error?reason=registration-link-invalid` — the safety net for a genuinely
      broken/expired invite link, unchanged.
- B3  WHEN staff click "เข้าสู่ระบบด้วย Google" in the "สำหรับพนักงาน" card THE SYSTEM SHALL
      CONTINUE TO call `login(RETURN_TO)` (`login-view.tsx:11,91`) exactly as today — independent
      flow, not touched by this fix.
- B4  THE SYSTEM SHALL CONTINUE TO serve `/producer/list`, `/producer/new`, `/producer/edit`,
      `/producer/read`, `/producer/role/*` as admin-facing management pages behind the existing
      admin `AuthGuard`, unaffected by this change.
- B5  WHEN `/register` is loaded directly THE SYSTEM SHALL CONTINUE TO render as a shell-free public
      page (REQ-11.1, REQ-11.2), unchanged.

## Do-not-modify (hard scope)

- `src/app/register/page.tsx` submit/validation logic (only the entry point into it changes, not
  the page itself)
- `src/lib/api/admin-api.ts`, `src/components/providers/auth-provider.tsx`, admin `AuthGuard` — the
  admin-only BFF auth system is a separate, already-locked design
- `src/app/producer/{list,new,edit,read,role}/*` — admin producer-management CRUD, unrelated
- Building a new producer-session mechanism or producer landing page — out of scope for this
  bugfix (structural gap noted above, left for a future feature spec if/when needed)
