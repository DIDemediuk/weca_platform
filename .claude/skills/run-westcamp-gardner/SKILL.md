---
name: run-westcamp-gardner
description: Run, start, build, test, screenshot, or smoke-test the WestCamp Gardner Report server. Use when asked to verify routes, generate a PDF, check admin panel, or confirm a change works end-to-end.
---

This is a Fastify/Node.js web server that generates branded Gardner-intelligence PDF reports.
Driver: `smoke.sh` (curl-based smoke script, no browser needed for route checks; Playwright runs inside the server for PDF rendering).

## Prerequisites

```bash
npm i
npx playwright install chromium   # one-time; needed for PDF rendering
```

## Build

```bash
npm run build   # tsc + copies src/public → dist/public
```

## Run (agent path)

Start server in background, then run the smoke script:

```bash
PORT=4747 FORM_SECRET=smoke ADMIN_SECRET=adm DB_PATH=":memory:" UPLOAD_DIR="./tmp-smoke-uploads" \
  node dist/server.js &
sleep 2

FORM_SECRET=smoke ADMIN_SECRET=adm BASE=http://localhost:4747 \
  bash .claude/skills/run-westcamp-gardner/smoke.sh
```

Expected output (all lines start with `  OK`):
```
=== WestCamp Gardner smoke ===
  OK  health (200)
  OK  form (right secret) (200)
  OK  form (wrong secret) (404)
  OK  admin list (right) (200)
  OK  admin content (right) (200)
  OK  admin (wrong secret) (404)
  OK  static CSS (200)

=== PDF generation (real Playwright render) ===
  OK  form POST
  OK  PDF magic bytes (%PDF)
  PDF size: ~347000 bytes

=== Admin report re-download ===
  OK  admin PDF re-download (report/XXXXXXXX.pdf)

All checks passed.
```

Kill when done (Linux/Mac):
```bash
kill $(lsof -ti:4747) 2>/dev/null || true
```
Kill when done (Windows PowerShell):
```powershell
Get-Process node | Where-Object { $_.MainWindowTitle -eq "" } | Stop-Process -Force
# or: netstat -ano | findstr :4747  → then taskkill /F /PID <pid>
```

## Run (human path)

```bash
cp .env.example .env   # fill FORM_SECRET, ADMIN_SECRET, DEEPSEEK_API_KEY
npm run dev            # tsx watch mode, auto-reload on changes
```
Then open:
- Form: `http://localhost:3000/f/<FORM_SECRET>`
- Admin: `http://localhost:3000/admin/<ADMIN_SECRET>`

## Test suite

```bash
npm test               # 31 tests, ~15s (Vitest)
```

## Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness check → `{"status":"ok"}` |
| GET | `/f/:secret` | Leader form HTML |
| POST | `/f/:secret` | Submit form → PDF download (multipart) |
| GET | `/admin/:secret` | Admin report list |
| GET | `/admin/:secret/content` | Edit 8 intelligence descriptions |
| POST | `/admin/:secret/content/:type` | Save description update → redirect |
| GET | `/admin/:secret/report/:id.pdf` | Re-download a generated PDF |
| GET | `/static/*` | Brand CSS served from `dist/public/` |

## Gotchas

- **In-memory DB (`DB_PATH=:memory:`)** — reports are lost when the process exits. Use a file path (`./data/app.sqlite`) for persistent dev runs.
- **PDF generation takes 2–6 s** — Playwright spins up a shared Chromium instance on first request; subsequent requests reuse it.
- **Windows terminal garbles Cyrillic** — curl output may show replacement characters in the terminal, but the HTTP response body is correctly UTF-8 encoded. Verify bytes, not terminal display.
- **Photo upload required** — form POST returns 400 without a `photo` field. The smoke script uses `placeholder.jpg` (a CSS file renamed) — Playwright accepts any bytes as an image in the template.
- **`buildEvidence` stub fields** — `form.routes.ts` references `questSignal`, `workshopNotes`, `observationNotes`, `reflectionNotes`, `finalProjectNotes` that are not in the form HTML yet. They silently filter out as empty. Not a bug — they're ready for a future multi-field form.
- **Admin PDF re-generation reads photo from disk** — if the photo file is deleted or the volume not mounted on Railway, re-downloading an old PDF from admin will 500.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Error: browserType.launch: Executable doesn't exist` | Run `npx playwright install chromium` |
| Form POST returns 400 "Додайте фото дитини" | Include `-F "photo=@file;type=image/jpeg"` in curl |
| Admin content update shows garbled Cyrillic in terminal | Expected on Windows — data is stored correctly in DB |
| `static/styles.css` returns 404 | Run `npm run build` to copy `src/public → dist/public` |
| Server crashes on start: `Cannot find module` | Run `npm run build` first (dist/ must exist) |
