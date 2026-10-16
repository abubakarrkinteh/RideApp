# RideApp demo — food, rides and maps

Public interactive concept for friends and prospective customers. Preserves Ocean Blue branding and the requested soft-blue surfaces. This is a static frontend demo: no accounts, order dispatch, live drivers or payments.

## Current implementation

- `dist/index.html`, `styles.css`, `app.js` and `core.js` are the maintained source and deployable application. No build step is needed.
- Three fictional restaurant menus, search/category filters, item quantities, single-restaurant basket, delivery details, payment selection and simulated order progression.
- Taxi pickup/destination selection, swapping, draggable map pins, optional browser location, example fares, Google Maps handoff and simulated trip progression.
- In-memory activity and example receipts. Reloading resets the session. Inputs are not sent to restaurants, drivers or payment providers.
- `reference/original-demo.html` preserves the earlier small reference. It is not the current deployable source.

## Map implementation and limitations

Leaflet 1.9.4 is vendored under `dist/vendor` with its licence. The map uses OpenStreetMap tiles with visible attribution and the browser's normal caching and referrer behaviour. Tiles load on demand only; no prefetch or offline downloading is implemented.

`dist/routes.js` contains twelve saved directional road-route previews between four sample locations. OSRM returned their distances, driving durations and GeoJSON on 8 October 2026. These are snapshots, without traffic or live driver information. The frontend makes no calls to public routing or geocoding APIs. Custom pins show markers only, without a fabricated connecting road or distance; the Google Maps link provides custom driving directions externally. Example fares are D 75 + D 20/km rounded up to D 5, minimum D 150, or a clearly labelled D 200 placeholder for a custom route. Food delivery uses a fictional flat D 50.

`route-sources.json` records the four OpenStreetMap source objects. Locations are sample area points, not verified restaurant addresses or service coverage. Restaurant names, menus and prices are fictional fixtures. The food photograph is AI-generated illustration, not a partner's product photograph.

Google Maps opens only after the visitor clicks its labelled link. Clicking "Use my location" requests browser permission; custom coordinates remain in memory until the visitor chooses to open the Google Maps link. Map tile requests expose the viewed area to the tile provider. This demo is intended for small-scale testing. Production routing, geocoding, mapping capacity and provider terms must be reviewed before a commercial launch; do not turn public demo endpoints into a production backend.

Primary references:

- https://developers.google.com/maps/documentation/urls/get-started
- https://leafletjs.com/examples/quick-start/
- https://operations.osmfoundation.org/policies/tiles/
- https://operations.osmfoundation.org/policies/nominatim/
- https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server
- https://project-osrm.org/docs/v26.4.0/http

## Validation

JavaScript syntax and targeted data/DOM checks cover quantities and totals, single-restaurant baskets, route links, demo orders/rides, cancellations and activity. Geographic snapshots were retrieved from the routing provider; user-created pins are not falsely shown as computed routes. A real-browser layout/location-permission check was unavailable in this environment. Optional WebMCP navigation is feature-detected; validation in a supported browser context was unavailable.

`.openai/hosting.json` identifies the existing public Site and its static output directory. Publish changes to that same project to retain its shareable URL.
