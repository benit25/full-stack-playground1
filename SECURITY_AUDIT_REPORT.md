# Security Audit Report

## Summary
This `.env` file appears to be a local development configuration for backend, frontend, and admin services. However, it contains a sensitive secret and several settings that should not be reused in production without proper separation.

> Overall risk level: **Medium**
> Top priority concern: `JWT_SECRET` stored in an environment file that may be committed or leaked.

---

## Findings

### 1. Hardcoded JWT secret in environment file
- Severity: **High**
- Affected variable:
  - `JWT_SECRET`
- Risk explanation:
  - A JWT signing secret stored in a plaintext `.env` file is a high-risk secret management issue. If this file is committed to source control or otherwise leaked, attackers can forge tokens and impersonate users.
- Recommended remediation:
  - Move `JWT_SECRET` out of checked-in configuration.
  - Use a secrets manager, runtime secrets injection, or deployment platform secret store.
  - Rotate the key after migration.

### 2. Local SQLite database configuration is not production-safe
- Severity: **Medium**
- Affected variables:
  - `DB_PROVIDER`
  - `DATABASE_URL`
- Risk explanation:
  - `DB_PROVIDER=sqlite` with `DATABASE_URL=./plxyground.db` is appropriate for local dev but unacceptable for production. A relative file path implies the database is stored on the app host, which is fragile and insecure for real deployments.
- Recommended remediation:
  - Separate development and production configuration files.
  - Use a managed database service with explicit credentials in production.
  - Do not rely on relative filesystem paths for production database connections.

### 3. Development-local origins and base URLs
- Severity: **Medium**
- Affected variables:
  - `CORS_ORIGIN`
  - `EXPO_PUBLIC_API_BASE_URL`
  - `API_BASE_URL`
- Risk explanation:
  - All listed origins and base URLs point to `localhost`, which indicates this file is for local development. If reused in staging or production, it can result in insecure or broken deployment behavior and may expose the app to origin-related misconfigurations.
- Recommended remediation:
  - Use environment-specific CORS and API base URL values.
  - Restrict `CORS_ORIGIN` to trusted production domains in prod.
  - Keep `localhost` values only in local/dev configs.

### 4. Stubbed email mode enabled
- Severity: **Low**
- Affected variable:
  - `LOCAL_STUB_EMAIL`
- Risk explanation:
  - `LOCAL_STUB_EMAIL=true` indicates email sending is stubbed. In non-dev environments, this may silently prevent important notifications from being delivered.
- Recommended remediation:
  - Ensure this flag is enabled only in local/dev configuration.
  - Add explicit environment gating so production never runs with stubbed email.

### 5. No explicit production secret variables present
- Severity: **Informational**
- Affected variables:
  - none directly
- Risk explanation:
  - This file contains no SMTP, cloud provider, or production database credentials, which reinforces that it is a dev-only configuration. If this `.env` is intended for production, the absence of those variables is a gap.
- Recommended remediation:
  - Clearly separate dev and prod `.env` files.
  - Document required production secrets separately.
  - Validate environment selection at startup.

---

## Additional observations

- There are no obvious placeholder credentials like `password` or `test` values.
- `JWT_EXPIRES_IN=7d` is acceptable, but expiry policy should be reviewed based on application risk.
- `API_BASE_URL` and `EXPO_PUBLIC_API_BASE_URL` both point to the same endpoint; this is not insecure but could be simplified with clearer environment-specific naming.

---

## Priority Fixes

1. Protect `JWT_SECRET` by removing it from source-managed `.env` files and using a secure secret store.
2. Separate local dev config from production config; do not use `sqlite` or `./plxyground.db` in production.
3. Restrict CORS origins and API base URLs to appropriate production values.
4. Disable `LOCAL_STUB_EMAIL` outside of local development.
5. Add a deployment gate that prevents this `.env` from being used in production.

---

## Quick Wins

- Add `.env` to `.gitignore` if not already ignored.
- Mask secrets in any shared config snippets and avoid pasting actual values.
- Introduce an explicit `ENVIRONMENT=development` or `NODE_ENV=development` variable to prevent accidental environment mismatch.
- Review repository history for accidental `.env` commits.
- Add a short README listing required env variables by environment type.
