# From the approved demo to a working RideApp

The visual design is approved. Concentrate on real functionality and reliable operations. Keep both Food and Ride visible in the design, with server-controlled availability for the eventual pilot.

## Phase 1A — reproduce and preserve

Run the supplied demo unchanged. Verify its cart, delivery details, map links, taxi journey and progress screens. Record the baseline and capture local browser views for design comparison if the environment supports it. Keep the current source under version control in the owner's own repository.

Document the existing screens and identify which actions are currently simulations. Do not replace the design with a generic starter.

## Phase 1B — architecture and foundation

Propose the smallest maintainable backend for accounts, database, server commands and storage. A managed service can be a candidate, but the provider is not approved by this document. Explain required external accounts and costs before paid provisioning.

Also decide how the finished mobile product will be delivered: a web app, a packaged web app, or native Android/iOS code. The existing source is a web implementation; native delivery may require rebuilding the interface in another framework while matching this design. Do not describe a responsive website as a completed native app.

Implement migrations, a local/test environment, authentication, role-scoped data access, configuration and a server API contract. Customers, restaurant staff, drivers/couriers and admins need distinct authorisation. Users cannot grant themselves partner or admin status.

Use stable IDs, server timestamps, explicit currencies and exact integer money amounts. Preserve historical item and price snapshots. Never rely on browser totals or client-editable payment status.

## Phase 1C — one complete food-ordering slice

Recommended first connected workflow: customer chooses a real test menu, receives a server quote, submits an order, restaurant staff accepts it, an approved courier receives the assignment, and all participants see the persisted status.

Add the supporting restaurant, courier and admin screens in the approved visual style. Include rejection, timeout, cancellation, unassigned orders and support paths. An order must survive app restart. Retrying confirmation must not create duplicate orders.

Keep payments simulated while this workflow is being validated. Make the simulation explicit. Do not enable a service for real customers until its operational and payment requirements are satisfied.

Acceptance: authorised test accounts can complete the workflow; a different customer or restaurant cannot read the order; two couriers cannot claim the same assignment; price changes require customer reconfirmation.

## Phase 1D — connected taxi workflow

Add persisted ride quotes, approved drivers/vehicles, availability, assignments, pickup confirmation, trip start/completion and receipts. Prevent conflicting active assignments. Define the no-driver outcome and the cancellation policy.

Choose and integrate a routing provider with suitable Gambian coverage and operating terms. Replace saved route snapshots only when the live service is connected. Device location must be optional where manual entry is feasible. Actual driver tracking requires a driver application, location permissions, secure location transport and stale-location handling.

Acceptance: the customer sees the correct authorised driver and vehicle; route failures are handled clearly; no-driver and cancellation paths resolve; a saved location is not displayed as live tracking.

## Phase 1E — verified payments and settlement

Wave is the desired digital payment option. Confirm the Gambian business's merchant/API eligibility, supported currency, collection model, fees, refund capabilities and settlement arrangements directly with the provider. Do not assume capabilities from another country's Wave documentation.

Payment secrets stay on the server. Create payment attempts idempotently, validate authenticated provider events, compare expected amount/currency/reference, reconcile ambiguous results, and track refunds separately. Returning to the app is not payment confirmation.

Keep fulfilment and payment states separate. Account for restaurant and driver earnings, platform revenue, adjustments and settlements without duplicate payouts. If cash is enabled, define who collects it and how it is reconciled. No production cash policy or commission rate has been agreed.

## Phase 1F — technical readiness

Test permissions, price manipulation, duplicate submissions, simultaneous acceptance, payment failures, refunds and dropped connections. Then test intended phones, location permissions, SMS delivery if used, notification delivery and external payment handoff.

Agree the actual launch zone, partner roster, prices, opening hours and support process. Remove fictional partners from the live environment. Prepare the chosen mobile/web distribution and appropriate production data/privacy controls. Review relevant local operating requirements with qualified local support.

## Phase 2 — controlled live pilot

Start with one selected service in one selected area, using a small number of genuine partners. Track completed jobs, cancellations, waiting times, support issues, payment reconciliation and the cost/earnings of each job. Expand after the service works reliably.

## Decisions still open

Final brand clearance; launch zone; first live service; backend provider; Android/iOS delivery approach; real partners; commercial fees and commissions; Wave approval; cash policy; map/SMS/notification providers; support and settlement processes. Do useful local development while documenting these dependencies rather than pretending they are settled.
