# Deployment — Field Shift

- Production: https://field-shift-tan.vercel.app (Vercel).
- Repo: https://github.com/Zul-Qarnain/field-shift (main).
- Credentials: VERCEL_API_TOKEN / VERCEL_FULL_ACCESS_TOKEN present in environment. Vercel CLI not installed — use `npx vercel` (token env) or Vercel REST API for deploys.
- Policy: preview deploy for significant changes; verify build/tests; confirm deployed commit after deploy; never alter billing/projects/domains without approval.
- Rollback: keep prior good deploy reference; Vercel instant rollback supported via dashboard/CLI.
- Notes: static export (Next.js) with runtime fetching of NASA POWER/nowcast; data packs are committed build artifacts.
