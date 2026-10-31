# Blockers — Field Shift

| Blocker | Impact | Workaround / ask |
|---|---|---|
| NASA Resources tab empty (goes live Nov 13 2026) | Extra dataset/API guidance unavailable | Re-visit after Nov 13 |
| LLM provider 429 rate limits (hit subagents today) | Delegation unreliable at peak | Work directly; retry delegation off-peak |
| VPS 1.9 GiB RAM | No heavy ML/dataset processing locally | All heavy work on Kaggle |
| Vercel CLI not installed | Deployment via CLI blocked | Use `npx vercel` with VERCEL_API_TOKEN when ready |
| Kaggle kernel run pending | Baseline reproduction + experiment results not yet in | Poll kernel status; iterate variants |
