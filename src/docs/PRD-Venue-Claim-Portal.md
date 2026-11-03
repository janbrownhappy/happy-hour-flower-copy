# PRD — Venue Claim Portal (Standalone Landing Page)

**Status:** Planned (not yet built)
**Created:** 2026-08-09
**Owner:** Happy Hour Flower

---

## 1. Overview

A **standalone, lightweight landing page** — separate from the core Happy Hour Flower app — that lets a venue owner search the existing venue database, find their venue, "claim" it, and add any missing data. On submission, the existing admin approval flow is triggered.

This portal is intentionally **decoupled** from the core mobile/web app so it does not add maintenance overhead or complexity to the App Store (Apple / Google Play) build.

---

## 2. Goals

- Let venue owners self-serve: find and claim their listing without contacting support.
- Decentralize data entry (owners fill in missing venue data), improving directory quality at scale.
- Keep the core app's App Store build **clean and unaffected** by this feature.
- Reuse the existing claim + admin approval + notification logic — do not rebuild it.

## 3. Non-Goals

- This is **not** a mobile app. It is a web landing page / micro-site.
- Not adding this flow into the core app's App Store binary.
- Not replacing the existing admin approval process — the admin panel remains the final gatekeeper.

---

## 4. Architecture Decision

**Chosen approach: Standalone Micro-Site + Shared Base44 Backend.**

- **Separate codebase** (e.g., a simple React/Vite project or basic HTML/JS site) containing only: search form, claim form, success message.
- **Shared backend:** the micro-site makes `fetch`/`axios` calls to Base44 Backend Functions on the main app. Business logic stays centralized in Base44.
- **Cross-origin:** Backend Functions must permit requests from the landing page's domain (CORS).

### Why decoupled
- **Zero App Store impact** — the main iOS/Android binary stays pristine; no reviewer exposure to the claim flow.
- **Independent updates** — change the portal without triggering a new app store review/resubmission.
- **Focused maintenance** — portal stays simple: no heavy state management, routing, or extra dependencies beyond the API client.

---

## 5. User Flow

1. Owner visits the standalone landing page.
2. Types venue name (and/or address/zip) → portal calls a **search** backend function.
3. Backend queries the `Venue` entity and returns matches.
4. Owner selects their venue and fills in missing data (e.g., photo, phone, website, hours, deals).
5. Owner submits → portal calls a **claim submission** backend function.
6. Backend logs the claim (`VenueClaimRequest`) / sets venue to `pending_approval` and triggers the **existing** admin notification flow.
7. Owner sees a success/confirmation message.
8. Admin reviews and approves in the existing admin panel (unchanged).

---

## 6. Technical Approach

### Read (Search)
- A public-facing Backend Function (e.g., `searchVenues(query)`) queries the `Venue` entity by name / address / zip and returns lightweight results.

### Write (Claim / Update)
- A Backend Function (e.g., `submitClaimRequest(venueId, data)`) — **never** direct DB writes from the external site.
- This function creates a `VenueClaimRequest` (or updates `Venue.verification_status` to `pending_approval`) and reuses existing logic (`processVenueClaim`, `notifyNewVenueClaim`).
- Reuse `enrichVenueProfile` so owners get the same enrichment experience as admins when adding missing data.

### On approval (existing flow, keep as-is)
- Admin approves via existing admin panel.
- Consider auto-creating a `VenueCollaborator` record (role owner/editor) so the claimant instantly gets dashboard access in the main app once approved.

### Security
- Search may be public, but the **claim action must be gated**.
- Secure the claim endpoint with an API key stored in app secrets and/or a simple request-secret header.
- Add basic rate-limiting so only the portal uses these endpoints.
- Configure CORS to allow the landing page domain.

---

## 7. Relevant Existing Assets (reuse, don't rebuild)

- **Entities:** `Venue`, `VenueClaimRequest`, `VenueCollaborator`
- **Backend functions:** `processVenueClaim`, `notifyNewVenueClaim`, `enrichVenueProfile`, `enrichVenueContacts`
- **Admin UI:** existing venue claims approval (`AdminVenueClaims`)

New backend functions to add when building: `searchVenues` (read) and `submitClaimRequest` (write) — designed to work as independent, secured API endpoints.

---

## 8. Open Items to Confirm at Build Time

- Exact **searchable fields** (name, address, zip — confirm final list).
- Exact **editable fields** the owner can add/update (photo, phone, website, hours, deals — confirm final list).
- Where the standalone site is deployed (Vercel, Netlify, or a second lightweight Base44 project).
- Whether to auto-create the `VenueCollaborator` on approval.
- Final auth mechanism for the claim endpoint (API key vs. request-secret header).