# Decision log

Newest first. Record who decided, when, and why. Open questions live at the end.

## 2026-10-19 — Code on GitHub

- **Approved by:** Kinteh.
- **Where:** https://github.com/abubakarrkinteh/RideApp, branch `main`, plus the `baseline-demo-v2` tag. The repo already held a README from 8 October 2026; its history was joined, not overwritten.
- **Not uploaded:** `.env.local` and `node_modules` (ignored by Git). Only the public Supabase URL and publishable key are in the code.

## 2026-10-19 — Food menu read from Supabase

- **Approved by:** Kinteh ("yes").
- **Change:** on start the app reads open restaurants and available menu items from Supabase (`dist/menu.js`) using the public settings in `dist/config.js`, and shows "Menu and prices from the RideApp test database." on the restaurant screen. If the request fails, the built-in demo menu stays and the old "Example menu and prices." text shows. Card details the database does not hold yet (tag, area, emoji, category) still come from the demo data. The page's security policy now allows requests to the Supabase project only.
- **Design:** unchanged. No new screens or styles.
- **Still simulated:** basket totals are worked out in the browser and nothing is sent when a demo order is placed. Real ordering through `place_order` needs sign-in first.
- **Tested:** `npm test` (demo checks run offline and fall back to the demo menu; `checks/menu.mjs` covers the data mapping; database rules). In the in-app browser at phone size the restaurant screen showed the database notice and the basket total was D 575 with no console errors.

## 2026-10-19 — First database tables (applied to Supabase)

- **Approved by:** Kinteh ("yes go for it").
- **Added:** `supabase/migrations/` with accounts, roles, restaurants, menus and food orders, plus `supabase/seed.sql` with the three fictional demo restaurants marked `is_test`.
- **Rules:** every sign-up gets the customer role only; only an admin grants other roles; tables are read-only to the app and all changes go through server functions; the server works out prices in bututs (GMD); a repeated order key returns the first order; a changed price is refused with `PRICE_CHANGED`; prices are copied onto each order line; customers, other restaurants and visitors cannot see someone else's order.
- **Simulated still:** payment (`payment_mode` can only be `simulated`), couriers, drivers, rides. The app screens do not use the database yet.
- **Tested:** `npm test` runs `checks/db.mjs`, which loads the migrations into an in-memory Postgres (PGlite) with a stand-in for Supabase auth. A deliberately broken privacy rule made the check fail. This does not prove the hosted project; that needs a check after the tables are applied.
- **Applied:** 19 October 2026 through the Supabase SQL Editor, as one all-or-nothing transaction. Checked with the publishable key: the 3 test restaurants and 10 menu items are readable; visitors are refused orders, order items, profiles, roles, staff links, `place_order`, `grant_role` and writing to the menu. Signed-in user checks on the hosted project are still to do. Supabase does not record these as CLI migrations yet; mark them applied with `supabase migration repair` before using the CLI.
- **First admin:** set by the project owner in the Supabase SQL editor. No app screen can create an admin.

## 2026-10-19 — Backend provider: Supabase

- **Decided by:** Kinteh.
- **Decision:** Supabase, Free plan, region West EU (London), project `ilktsryrughillibeptz`. Upgrade to Pro later when needed.
- **Why:** Europe is the fastest nearby region for The Gambia; free is enough for building and testing.
- **Settings:** the Project URL and publishable key are in `.env.local`, which Git ignores. The secret key and database password are not stored in this folder and never go in chat. A connection check succeeded on 19 October 2026 (email sign-in on, phone off).

## 2026-10-16 — Build on the demo code

- **Decided by:** Kinteh.
- **Decision:** the real app is built on top of the existing demo code in `dist/` rather than a new codebase. The screens stay 1 to 1 with the approved Ocean Blue demo.
- **Why:** the demo's code is the approved design, so reusing it guarantees an exact visual match. A native rewrite would mean redrawing every screen by hand.
- **Consequence:** mobile apps, if wanted, will package this web code later (for example as an installable web app or a wrapped Android/iPhone app). That packaging choice is still open.

## 2026-10-16 — Baseline saved

- Local Git repository created in this folder. Commit tagged `baseline-demo-v2` is the unchanged demo from `rideapp-claude-code.zip`.
- `dist/` was checked file for file against https://rideapp-ocean-demo.abubakarr-kinteh.chatgpt.site and matches (the hosted `index.html` only adds the host's own security script).
- `npm test` passed; food and ride flows were clicked through in a phone-sized browser without errors.
- Nothing has been pushed to any online repository.

## Open decisions

- How the database tables are applied to Supabase (SQL editor now, Supabase CLI later).
- First live service: Food or Ride.
- Launch area.
- Wave merchant/API eligibility for the Gambian business.
- How the app reaches phones: installable web app, wrapped Android/iPhone app, or both.
