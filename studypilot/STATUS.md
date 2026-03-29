# StudyPilot Status

## Current state

- Local mode is working with:
  - floating Codex-style chat
  - file upload
  - website updates into local `data/*.json`
  - local D1 sync
  - direct local D1 mirroring with fallback full sync
- Cloudflare mode is working with:
  - custom domain: `https://studypilot.kevin-apps.com`
  - hosted chat endpoint
  - hosted D1 reads for dashboard, subject pages, mistakes, and review
  - hosted D1 writes from chat updates

## Main live pieces

- Local server:
  - `studypilot/server/app.js`
- Cloudflare Worker:
  - `studypilot/cloudflare/worker.mjs`
- Chat UI:
  - `studypilot/scripts/chat.js`
- D1 schema:
  - `studypilot/d1/migrations/0001_initial_schema.sql`
  - `studypilot/d1/migrations/0002_seed_subjects.sql`
- Local/remote verification:
  - `studypilot/scripts/check_cloudflare_studypilot.ps1`

## Verified flows

- Local upload -> chat -> local JSON update -> local D1 update
- Cloudflare upload -> chat -> remote D1 update
- Dashboard, Science, Math, English, Mistakes, and Review pages now use API-backed reads with fallback behavior

## Remaining follow-up ideas

- tighten Cloudflare asset publishing even further if needed after DNS stabilizes
- add more explicit user-facing sync status in the UI for cloud writes
- optionally add a dedicated admin/debug page for local vs cloud data checks
