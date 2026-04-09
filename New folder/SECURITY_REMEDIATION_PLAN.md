# Security Remediation Plan

## Summary
This plan addresses the Medium-risk issues identified in the `.env` configuration audit. Implementation focuses on separating environments, securing secrets, and preventing production misconfigurations. Estimated effort: 2-4 hours for core fixes, plus ongoing monitoring.

---

## Remediation Actions

### 1. Secure JWT Secret Management
- **Action**: Remove `JWT_SECRET` from `.env` and use a secrets manager.
- **Steps**:
  1. Install a secrets manager (e.g., AWS Secrets Manager, Azure Key Vault, or HashiCorp Vault).
  2. Update application code to fetch `JWT_SECRET` from the secrets manager at runtime.
  3. Generate a new random secret and rotate the old one.
  4. Add `.env` to `.gitignore` if not already.
- **Verification**: Confirm the app starts without the secret in `.env` and fails gracefully if the secret is unavailable.

### 2. Implement Environment-Specific Configurations
- **Action**: Create separate config files for development, staging, and production.
- **Steps**:
  1. Create `.env.development`, `.env.staging`, and `.env.production` files.
  2. Move SQLite settings to `.env.development` only.
  3. In production, use a managed database (e.g., PostgreSQL on AWS RDS) with connection strings from secrets manager.
  4. Update deployment scripts to load the appropriate `.env` file based on `NODE_ENV`.
- **Verification**: Test that each environment loads the correct config without cross-contamination.

### 3. Configure Production-Ready CORS and API URLs
- **Action**: Restrict origins and base URLs to trusted domains.
- **Steps**:
  1. In `.env.production`, set `CORS_ORIGIN` to your production domain(s), e.g., `https://yourapp.com`.
  2. Update `EXPO_PUBLIC_API_BASE_URL` and `API_BASE_URL` to production API endpoints.
  3. Add validation in code to reject requests from unauthorized origins.
- **Verification**: Use tools like CORS testing sites to confirm only allowed origins are permitted.

### 4. Disable Stubbed Email in Non-Development Environments
- **Action**: Gate `LOCAL_STUB_EMAIL` by environment.
- **Steps**:
  1. Set `LOCAL_STUB_EMAIL=true` only in `.env.development`.
  2. In production, ensure email service is configured (e.g., via SMTP credentials in secrets manager).
  3. Add logging to alert if stubbed email is used outside dev.
- **Verification**: Send a test email in staging/production to confirm delivery.

### 5. Add Environment Validation and Documentation
- **Action**: Prevent misconfigurations at startup.
- **Steps**:
  1. Add code to validate required variables on app start (e.g., throw error if `JWT_SECRET` is missing in production).
  2. Create a `.env.example` file with all required variables (masked or placeholder values).
  3. Document environment setup in README.md.
- **Verification**: Attempt to start the app with incomplete configs and confirm it fails with clear error messages.

---

## Priority Implementation Order

1. Secure JWT secret and add `.env` to `.gitignore`.
2. Create environment-specific config files.
3. Update CORS and API URLs for production.
4. Configure email service for non-dev environments.
5. Add validation and documentation.

---

## Quick Wins (Low Effort, High Impact)

- Immediately add `.env` to `.gitignore` to prevent future commits.
- Introduce `NODE_ENV` checks in code to enforce environment-specific behavior.
- Review git history: `git log --oneline -- .env` to check for past exposures.
- Use tools like `dotenv-safe` to enforce required variables.
- Schedule quarterly secret rotation and config audits.

---

## Resources
- [OWASP Environment Configuration Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Configuration_Cheat_Sheet.html)
- [12 Factor App Config](https://12factor.net/config)
- Secrets management: AWS Secrets Manager, Azure Key Vault, or Vault by HashiCorp.