# RideApp: continue in Claude Code

Prepared 16 October 2026 from the published version 2 demo. The frontend files are unchanged from the version you approved.

## Your first steps

1. Extract this ZIP into a folder on your computer.
2. Open the extracted `rideapp-claude-code` folder in Claude Code. If you use its terminal version, open a terminal in that folder and run `claude`.
3. Paste the instruction below.

> Read CLAUDE.md, START-HERE.md, BUILD-PLAN.md and DEMO-NOTES.md, then inspect the source code. I approve the current RideApp demo design. Preserve its Ocean Blue colours, soft-blue cards, layout, wording and navigation. First run this exact demo locally and check its existing flows. Then explain the smallest technical steps needed to turn it into a real app. Start with the first local implementation milestone and show a working result. Clearly distinguish demo features from connected services. Do not redesign it or claim that real payments, orders or drivers work before they have been implemented and tested.

Claude Code terminal documentation: https://code.claude.com/docs/en/quickstart

## Preview the existing demo

With a supported Node.js LTS installation (version 22 or newer for this bundle), run:

```sh
npm start
```

Open `http://127.0.0.1:8080` in your browser. This preview uses Node's built-in libraries and requires no package installation. Stop it with Ctrl+C. If Node is missing, ask Claude Code to help you install the current supported LTS release for your computer.

Do not double-click `dist/index.html`: the demo uses JavaScript modules and should run through the local preview server.

To run the included checks:

```sh
npm install
npm test
```

The only development dependency is the DOM test library. The frontend itself is buildless HTML, CSS and JavaScript, with vendored Leaflet assets.

## What this package contains

| File | Purpose |
|---|---|
| `CLAUDE.md` | Instructions to preserve the approved design and develop carefully |
| `BUILD-PLAN.md` | Practical order for replacing simulations with real functionality |
| `DEMO-NOTES.md` | Current implementation, map limitations and source references |
| `dist/index.html` | Application shell and metadata |
| `dist/styles.css` | Approved Ocean Blue design |
| `dist/app.js` | Screens, interactions, cart, map pins and simulated progress |
| `dist/core.js` | Sample menus, locations, totals and route-link helpers |
| `dist/routes.js` | Saved example road routes |
| `dist/assets/` | Illustrative food image |
| `dist/vendor/` | Leaflet map files and licence |
| `checks/demo.mjs` | Targeted data and interaction checks |
| `scripts/serve.mjs` | Local-only static preview server |
| `route-sources.json` | Provenance of the sample map locations |

## What is already working

Restaurant browsing, menu search/filtering, quantities, cart totals, delivery instructions, map pins, sample taxi routes, Google Maps handoff, optional device location, simulated progress, cancellation and temporary activity history.

## What still needs to be built

Real accounts, durable data, partner approval, restaurant/courier/admin tools, secure server-side quotes and order processing, genuine dispatch, payment verification, refunds, operational support, and production integrations.

This is currently a mobile-friendly web demo. It is not an Android APK or an iPhone app. Keep the approved design as the reference for any future native implementation. Decide the mobile delivery approach deliberately; do not silently replace this code with an unrelated template.

The existing shared demo stays available at:
https://rideapp-ocean-demo.abubakarr-kinteh.chatgpt.site

Edits in this downloaded folder do not automatically update that hosted link. Publication is a separate step once changes are ready.
