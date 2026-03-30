# PLXYGROUND Smoke Test Report

Date: 2026-03-26
Environment: local Windows workspace, backend on `http://127.0.0.1:3011`, frontend on `http://127.0.0.1:19006`, admin on `http://127.0.0.1:3012`
Artifacts:
- `.run-logs/full-smoke-test-results.json`
- `.run-logs/auth-smoke-phase2.json`
- `.run-logs/auth-smoke-phase3.json`

## Executive Summary

A full smoke test was completed against the live PLXYGROUND stack and all exercised features passed after one product fix made during the run. The final result was `53/53` passing checks:

- Core application suite: `41/41` passed
- Auth follow-up batch 1: `8/8` passed
- Auth follow-up batch 2: `4/4` passed

The test covered service availability, creator/business/admin authentication, password recovery, creator discovery, profile editing, content creation and moderation, direct messaging, admin user management, audit export, analytics, live alerts, and both dev-server and backend-served UI delivery.

## Issue Found and Resolved During Testing

One defect was discovered during the first end-to-end pass:

- Unpublished content detail access for the owner/admin was failing with `403 Content not available`.
- Root cause: [`backend/src/routes/content.js`](/c:/Users/defin/Desktop/full%20stack%20plxyground/backend/src/routes/content.js) checked `req.user` on `GET /api/content/:id`, but that route did not populate `req.user`.
- Fix applied:
  - added `optionalVerifyToken` in [`backend/src/middleware.js`](/c:/Users/defin/Desktop/full%20stack%20plxyground/backend/src/middleware.js)
  - attached it to `GET /api/content/:id` in [`backend/src/routes/content.js`](/c:/Users/defin/Desktop/full%20stack%20plxyground/backend/src/routes/content.js)
- Verification after fix: the same smoke path passed, confirming draft content remained hidden from the public while becoming accessible to the authenticated owner.

## Test Scope and Results

### 1. Service and UI Availability

Verified healthy responses from:

- `GET /healthz` returned `200` with `{ "status": "ok" }` at `2026-03-26T12:59:37.639Z`
- `GET /` returned API metadata plus `/app` and `/admin` mount points
- frontend dev server returned HTML on port `19006`
- admin dev server returned HTML on port `3012`
- backend-served fallback UIs returned HTML on `/app/` and `/admin/`

Result: all service entry points were live and reachable.

### 2. Authentication and Account Recovery

Verified successful auth flows for all roles:

- admin login succeeded for `admin@plxyground.local`
- creator signup and login succeeded for `smoke_creator_1774529977570@plxyground.local`
- business signup and login succeeded for `smoke_business_1774529977570@plxyground.local`
- suspended creator login was blocked with `ACCOUNT_SUSPENDED`
- creator login succeeded after admin reset-password
- creator forgot-password returned a stub reset token, reset-password succeeded, and login succeeded afterward
- business forgot-password returned a stub reset token, reset-password succeeded, and login succeeded afterward
- admin forgot-password returned a stub reset token

Result: authentication, suspension enforcement, admin reset, and stubbed password-recovery flows all worked.

### 3. Creator Experience

Verified creator-facing features:

- creators list returned records successfully
- creator detail by slug and by id both resolved correctly
- profile update persisted bio, location, image URL, and social links
- draft content creation succeeded and generated queue item `bf2e6ea1-f144-4919-a0cd-bd69bd6c40ea`
- draft content stayed hidden from anonymous users
- draft content became accessible to the authenticated owner after the route fix
- direct publish succeeded for content id `8ad7239d-e90d-41a6-bbb0-17b05d517d5a`
- creator update on published content succeeded
- creator delete on published content succeeded

Result: creator discovery, self-service profile management, and full content CRUD behavior are working.

### 4. Moderation, Messaging, and Admin Operations

Verified moderation and operations coverage:

- admin queue listed new draft content id `43b8daa9-1475-45a4-9945-c3850761e550`
- bulk assign succeeded
- bulk approve succeeded and published the queued content
- approved content appeared in public search
- admin content listing included smoke content
- admin content edit succeeded
- admin content delete succeeded
- direct message conversation creation succeeded with id `03d44759-7847-47bd-a91d-bbac48076ee9`
- message send/fetch succeeded with message id `fc2b5cf4-c9a4-44b9-8bd9-18983a9b46fb`
- conversation lists populated for both participants
- admin user search located the smoke creator
- suspend, reactivate, verify, and admin reset-password all succeeded
- audit log listing returned `50` entries from a total of `77`
- audit CSV export returned the expected header row
- analytics returned KPI values:
  - `totalCreators: 28`
  - `totalBusinesses: 9`
  - `totalContent: 107`
  - `publishedContent: 76`
  - `pendingContent: 31`
  - `last7DaysContent: 5`
- live alerts returned `14` recent items and included smoke-test activity

Result: admin moderation, governance, analytics, auditability, and messaging all functioned successfully.

## Evidence Snapshot

Representative evidence captured in the JSON artifacts includes:

- smoke creator id: `c54fb210-1c41-495d-83d0-71ac5d5f70c0`
- smoke business id: `24e23412-7a45-4a51-a9f9-0a66735f2c88`
- draft content id: `43b8daa9-1475-45a4-9945-c3850761e550`
- moderation queue id: `bf2e6ea1-f144-4919-a0cd-bd69bd6c40ea`
- published content id before deletion: `8ad7239d-e90d-41a6-bbb0-17b05d517d5a`
- conversation id: `03d44759-7847-47bd-a91d-bbac48076ee9`
- message id: `fc2b5cf4-c9a4-44b9-8bd9-18983a9b46fb`

## Conclusion

The PLXYGROUND codebase has now passed a thorough smoke test across its critical user and admin flows. After fixing the unpublished-content detail authorization gap, all tested features were verified working in the live local environment. This report, together with the JSON artifacts in `.run-logs/`, provides concrete proof that the platform’s primary functions are operational as of 2026-03-26.
