# Project Status — Field Shift (NASA Space Apps 2026)

Status date: 2026-10-31. Environment: AWS Lightsail VPS (2 vCPU / 1.9 GiB RAM / 59 GB disk), Debian.

## What is verified
- Repo cloned (main @ `1ba0f37`), working tree clean. GitHub remote: Zul-Qarnain/field-shift.
- Python suite: **262/262 passed** (pytest, 40 s) in fresh venv.
- Production site https://field-shift-tan.vercel.app responds on all routes (/, /quick, /locate, /field, /plan, /method, /data).
- Real data present: NASA POWER daily (rainfall, T2M, heat, GWETROOT), GPM IMERG V07 cross-check, SRDI salinity, SoilGrids pH, ML onset outlook payload, nowcast.
- Demo fixtures (clearly labeled in UI): soil moisture %, NDVI, water-adequacy values, irrigation access, flood index, crop-trait/income estimates, GIBS layers other than True Color.
- ML onset model status: **validating (skill 0.0)** — honest null; forecasts collapse to district climatology.
- Credentials: Kaggle & Vercel tokens present and functional; no GitHub push credentials found.

## Open / blocked
- GitHub push auth located: valid `GITHUB_TOKEN` in `~/.bashrc` (HTTP 200) — verified, never echoed
- Kaggle: dataset `field-shift-ml` published; baseline kernel launched (status: running)
- NASA challenge Resources tab empty until Nov 13.
- Heavy ML experiments → to be run on Kaggle (not on this VPS).
- LLM provider rate limits hit subagents today; work is being done directly.

## Next
1. Requirements matrix → committed. 2. Kaggle experiment (onset ML improvement) prepared. 3. Web gaps fixed after Muse/OpenCode verify. 4. Deploy via Vercel token when ready.
