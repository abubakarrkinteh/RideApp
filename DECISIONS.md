# Decision log

Newest first. Record who decided, when, and why. Open questions live at the end.

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

- Backend provider (accounts, database, server functions).
- First live service: Food or Ride.
- Launch area.
- Wave merchant/API eligibility for the Gambian business.
- How the app reaches phones: installable web app, wrapped Android/iPhone app, or both.
- Online code repository (where to push this Git history).
