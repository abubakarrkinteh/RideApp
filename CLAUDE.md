# RideApp project instructions

Read START-HERE.md, BUILD-PLAN.md and DEMO-NOTES.md before changing the application.

## Approved product and design

- Founders: Abu and Musa. Initial market: The Gambia. Food ordering and taxi booking are the intended services.
- The owner explicitly approves the current demo design and called it perfect. The current `dist/` files are the visual source of truth.
- Preserve Ocean Blue branding, soft-blue surfaces, typography, component shapes, layout, customer journeys and English interface. Do not reintroduce the rejected white-card redesign.
- Primary blue: #1F56B4. Light background: #EDF4FF. Card fill: #E2EDFC. Highlight fill: #C9DFFF. Read the CSS for the complete theme, including dark colours.
- Extend the same component language for missing screens. Discuss a substantial redesign or framework migration before undertaking it. Routine bug fixes and accessibility improvements may proceed while preserving the appearance.
- RideApp is a working brand name; final naming clearance is not established.

## Scope and truthfulness

- Phase 1 includes app development, branding, design, backend functionality, integrations and technical testing. Phase 2 is the controlled live pilot.
- The shipped source is an interactive web demo. Menus, restaurant names, prices, driver progress and payment selection are simulated. Do not present them as live services.
- Map tiles are live external resources; road routes are saved snapshots from 8 October 2026. Google Maps opens externally when clicked. Custom map pins have no in-app computed road route or distance.
- Keep demo mode clearly distinguishable from connected functionality until each integration is actually implemented and verified.
- No backend provider, native framework, production Wave account or launch zone has been definitively selected. The owner has Claude Code and wants to use this design to build the real app.

## Engineering approach

- Start by running the existing demo and its checks. Keep a reversible baseline and a decision log.
- Work in small complete slices; demonstrate behaviour, verify important failure cases, then continue.
- Keep business rules, server commands and UI rendering separate. Move authority for prices, permissions, assignments and payment state to the server.
- Use database constraints and idempotency for operations that must happen once. Enforce customer/restaurant/driver/admin access on the backend.
- Keep secrets out of browser code, committed files and chat messages. Use secure provider configuration when credentials are needed.
- Never treat a Wave redirect, screenshot or user claim as proof of payment. The intended Gambian business's Wave API and GMD access must be confirmed.
- Do not build production routing/geocoding around unrestricted use of public demonstration services. Use an appropriate provider or self-hosted service with the necessary capacity and terms.
- Preserve upstream attribution and licences. The supplied food photo is illustrative, not a photograph from a real restaurant.
- Use mocks for external dependencies when necessary, clearly labelled. Document the exact remaining steps for connecting and testing them.

## Local commands

- `npm start`: serve the existing demo at http://127.0.0.1:8080; no install needed for preview.
- `npm install`, then `npm test`: run the targeted data/DOM checks.
- Browser-based appearance, location permission and mobile device behaviour need real-browser/device checks. Passing DOM tests does not prove those behaviours.

## Ownership and delivery

This export intentionally contains no hosting credentials, repository history or account-bound deployment configuration. Changes here do not automatically publish to the shared demo. Explain what works, what is mocked, what was tested, and any material blocker after each milestone.
