# Form Archive Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Архів" (Archive) tab to the team-leader form page (`/f/:secret`) that lists every previously generated report and lets the leader re-download its PDF, without needing admin access.

**Architecture:** Extract the existing PDF-render-by-`Report` logic out of `admin.routes.ts` into a reusable `renderReportPdf(db, report)` helper in `src/services/reportBuilder.ts`. Add a new `GET /f/:secret/report/:id.pdf` route in `form.routes.ts` that reuses this helper (without logging a `downloaded` event). Pass `listReports(db)` into `formPage(...)` props. On the frontend, add a third "Архів" tab to `AppFrame` for form mode, and a new `ArchiveTab` component (modeled on the existing admin `ReportsTab`) that searches/lists reports and links to the new PDF route.

**Tech Stack:** Fastify, TypeScript, better-sqlite3, vanilla React (no build step — `react-app.js` is hand-written `createElement` calls), vitest for tests.

---

### Task 1: Extract `renderReportPdf` helper and use it in admin routes

**Files:**
- Modify: `src/services/reportBuilder.ts`
- Modify: `src/routes/admin.routes.ts:64-82`
- Test: `tests/services/reportBuilder.test.ts`

- [ ] **Step 1: Write the failing test for `renderReportPdf`**

`tests/services/reportBuilder.test.ts` currently imports `openDb` from `../../src/db/index.js` and `getReport` from `../../src/db/reports.repo.js`, and only tests `buildReport`. Update its imports and add a new test:

```ts
import { describe, it, expect, vi } from "vitest";
import { openDb } from "../../src/db/index.js";
import { getReport, insertReport } from "../../src/db/reports.repo.js";
import { buildReport, renderReportPdf } from "../../src/services/reportBuilder.js";
import type { ReportInputParsed } from "../../src/domain/validation.js";
import type { Report } from "../../src/domain/types.js";
```

Add a new sibling `describe` block at the end of the file (do not nest it inside the existing `describe("buildReport", ...)` block):

```ts
describe("renderReportPdf", () => {
  it("renders a pdf buffer for an existing report", async () => {
    const db = openDb(":memory:");
    const report: Report = {
      id: "r1", childName: "Артем", shift: "3", primaryType: "musical",
      secondaryType: undefined, example: "x", wovenExample: "y", talentBridge: "b",
      photoPath: "/uploads/a.jpg", createdAt: "2026-06-08T10:00:00Z",
    };
    insertReport(db, report);
    const render = vi.fn(async () => Buffer.from("%PDF-1.4 fake"));
    const pdf = await renderReportPdf(db, report, { render, photoToSrc: (p) => `file://${p}` });
    expect(pdf.subarray(0, 4).toString("latin1")).toBe("%PDF");
    expect(render).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/services/reportBuilder.test.ts`
Expected: FAIL with `renderReportPdf is not a function` or similar export error.

- [ ] **Step 3: Implement `renderReportPdf` in `src/services/reportBuilder.ts`**

Add this export (reuses the same imports already present in the file — `getIntelligence`, `renderRadarSvg`, `renderReportHtml`, `renderPdf`, `downscalePhoto`, `imageFileToDataUri`, `IntelligenceType`):

```ts
export interface RenderPdfDeps {
  render?: (html: string) => Promise<Buffer>;
  photoToSrc?: (photoPath: string) => string | Promise<string>;
}

export async function renderReportPdf(db: DB, report: Report, deps: RenderPdfDeps = {}): Promise<Buffer> {
  const render = deps.render ?? renderPdf;
  const photoToSrc = deps.photoToSrc ?? (async (p: string) => downscalePhoto(await imageFileToDataUri(p)));

  const primary = getIntelligence(db, report.primaryType);
  const secondary = report.secondaryType ? getIntelligence(db, report.secondaryType) : undefined;
  const highlighted = [report.primaryType, report.secondaryType].filter(Boolean) as IntelligenceType[];
  const photoSrc = await photoToSrc(report.photoPath);
  const html = renderReportHtml({
    report: { ...report, photoPath: photoSrc },
    primary,
    secondary,
    radarSvg: renderRadarSvg(highlighted),
  });
  return render(html);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/services/reportBuilder.test.ts`
Expected: PASS

- [ ] **Step 5: Replace the inline logic in `admin.routes.ts` with the new helper**

In `src/routes/admin.routes.ts`, replace lines 64-82:

```ts
  app.get<{ Params: { secret: string; id: string } }>(
    "/admin/:secret/report/:id.pdf",
    async (req, reply) => {
      if (!guard(req.params.secret)) return reply.code(404).send("Not found");
      const report = getReport(db, req.params.id);
      if (!report) return reply.code(404).send("Not found");
      logReportEvent(db, report.id, "downloaded");
      const pdf = await renderReportPdf(db, report);
      return reply.type("application/pdf").send(pdf);
    }
  );
```

Update the imports at the top of `admin.routes.ts`: remove `renderRadarSvg`, `renderReportHtml`, `downscalePhoto`, `imageFileToDataUri` (no longer used directly in this file — verify nothing else in the file uses them first), and add `renderReportPdf` from `../services/reportBuilder.js`.

- [ ] **Step 6: Run the full test suite to check nothing broke**

Run: `npx vitest run tests/routes/admin.routes.test.ts tests/services/reportBuilder.test.ts`
Expected: PASS (all existing admin route tests, e.g. "lists reports", still pass — the PDF-generating route itself isn't directly tested there yet, but nothing should regress)

- [ ] **Step 7: Commit**

```bash
git add src/services/reportBuilder.ts src/routes/admin.routes.ts tests/services/reportBuilder.test.ts
git commit -m "refactor: extract renderReportPdf helper from admin routes"
```

---

### Task 2: Add `GET /f/:secret/report/:id.pdf` route

**Files:**
- Modify: `src/routes/form.routes.ts`
- Test: `tests/routes/form.routes.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `tests/routes/form.routes.test.ts` (inside the `describe("form routes", ...)` block), and add `insertReport` to the imports at the top:

```ts
import { insertReport } from "../../src/db/reports.repo.js";
```

```ts
  it("re-downloads a pdf from the archive route", async () => {
    const app = buildServer(cfg);
    insertReport(app.db, {
      id: "r1", childName: "Артем", shift: "3", primaryType: "musical",
      secondaryType: undefined, example: "x", wovenExample: "y", talentBridge: "b",
      photoPath: "/uploads/a.jpg", createdAt: "2026-06-08T10:00:00Z",
    });
    const res = await app.inject({ method: "GET", url: "/f/S/report/r1.pdf" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
    await app.close();
  });

  it("rejects archive pdf download with wrong secret", async () => {
    const app = buildServer(cfg);
    insertReport(app.db, {
      id: "r1", childName: "Артем", shift: "3", primaryType: "musical",
      secondaryType: undefined, example: "x", wovenExample: "y", talentBridge: "b",
      photoPath: "/uploads/a.jpg", createdAt: "2026-06-08T10:00:00Z",
    });
    const res = await app.inject({ method: "GET", url: "/f/wrong/report/r1.pdf" });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it("404s for unknown report id in archive route", async () => {
    const app = buildServer(cfg);
    const res = await app.inject({ method: "GET", url: "/f/S/report/missing.pdf" });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it("does not log a downloaded event when re-downloading from the archive", async () => {
    const app = buildServer(cfg);
    insertReport(app.db, {
      id: "r1", childName: "Артем", shift: "3", primaryType: "musical",
      secondaryType: undefined, example: "x", wovenExample: "y", talentBridge: "b",
      photoPath: "/uploads/a.jpg", createdAt: "2026-06-08T10:00:00Z",
    });
    await app.inject({ method: "GET", url: "/f/S/report/r1.pdf" });
    const events = app.db.prepare(`SELECT * FROM report_events WHERE report_id = 'r1'`).all();
    expect(events.length).toBe(0);
    await app.close();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/routes/form.routes.test.ts`
Expected: FAIL — the route doesn't exist yet, so requests to `/f/S/report/r1.pdf` will 404 (route not found) which happens to match the "wrong secret"/"unknown id" expectations but NOT the "re-downloads" and "does not log" tests (200 expected, gets 404).

- [ ] **Step 3: Implement the route in `src/routes/form.routes.ts`**

Update imports at the top of the file:

```ts
import { formPage, quotaBlockReason } from "../web/formPage.js";
import { reportInputSchema } from "../domain/validation.js";
import { buildReport, renderReportPdf } from "../services/reportBuilder.js";
import { getQuota, consumeAttempt } from "../db/quota.repo.js";
import { getReport, listReports } from "../db/reports.repo.js";
```

Add the new route inside `formRoutes`, after the existing `POST /f/:secret` handler (before the closing `}` of the function):

```ts
  app.get<{ Params: { secret: string; id: string } }>(
    "/f/:secret/report/:id.pdf",
    async (req, reply) => {
      if (req.params.secret !== cfg.formSecret) return reply.code(404).send("Not found");
      const report = getReport(db, req.params.id);
      if (!report) return reply.code(404).send("Not found");
      const pdf = await renderReportPdf(db, report);
      return reply.type("application/pdf").send(pdf);
    }
  );
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/routes/form.routes.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/routes/form.routes.ts tests/routes/form.routes.test.ts
git commit -m "feat: add pdf re-download route for team-leader form"
```

---

### Task 3: Pass `reports` into `formPage` props

**Files:**
- Modify: `src/routes/form.routes.ts`
- Modify: `src/web/formPage.ts`
- Test: `tests/routes/form.routes.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `tests/routes/form.routes.test.ts`:

```ts
  it("includes reports in the form page props for the archive tab", async () => {
    const app = buildServer(cfg);
    insertReport(app.db, {
      id: "r1", childName: "Артем", shift: "3", primaryType: "musical",
      secondaryType: undefined, example: "x", wovenExample: "y", talentBridge: "b",
      photoPath: "/uploads/a.jpg", createdAt: "2026-06-08T10:00:00Z",
    });
    const res = await app.inject({ method: "GET", url: "/f/S" });
    expect(res.body).toContain('"childName":"Артем"');
    await app.close();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/routes/form.routes.test.ts`
Expected: FAIL — `formPage` doesn't currently serialize `reports` into `window.__APP_PROPS__`.

- [ ] **Step 3: Update `formPage` signature in `src/web/formPage.ts`**

Add the `Report` type import at the top:

```ts
import { esc } from "./html.js";
import type { Quota } from "../db/quota.repo.js";
import type { Report } from "../domain/types.js";
```

Change the function signature (currently `export function formPage(secret: string, error?: string, quota?: Quota): string {`) to:

```ts
export function formPage(secret: string, error?: string, quota?: Quota, reports: Report[] = []): string {
```

Add `reports` into the `props` object (currently at lines 34-43):

```ts
  const props = {
    page: "form",
    secret,
    error,
    types: TYPE_OPTIONS,
    shifts: SHIFT_OPTIONS,
    submitUrl: `/f/${secret}`,
    quota,
    blocked,
    reports,
  };
```

Add a third tab button to the static fallback `<nav>` (currently line 58):

```ts
<nav class="tabs"><button class="tab active" type="button">Новий звіт</button><button class="tab" type="button">Архів</button><button class="tab" type="button">Підказки</button></nav>
```

- [ ] **Step 4: Wire it up in `src/routes/form.routes.ts`**

Update both `formPage(...)` calls in the `GET /f/:secret` and `POST /f/:secret` handlers to pass `listReports(db)` as the fourth argument:

```ts
  app.get<{ Params: { secret: string } }>("/f/:secret", async (req, reply) => {
    if (req.params.secret !== cfg.formSecret) return reply.code(404).send("Not found");
    return reply.type("text/html").send(formPage(cfg.formSecret, undefined, getQuota(db), listReports(db)));
  });

  app.post<{ Params: { secret: string } }>("/f/:secret", async (req, reply) => {
    if (req.params.secret !== cfg.formSecret) return reply.code(404).send("Not found");

    const quota = getQuota(db);
    if (quotaBlockReason(quota)) {
      return reply.code(403).type("text/html").send(formPage(cfg.formSecret, undefined, quota, listReports(db)));
    }
    // ... rest unchanged until the error-path return:
```

And further down, the validation-error return:

```ts
    if (!parsed.success || !photoPath) {
      const msg = !photoPath ? "Додайте фото дитини." : "Перевірте поля форми.";
      return reply.code(400).type("text/html").send(formPage(cfg.formSecret, msg, quota, listReports(db)));
    }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/routes/form.routes.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/routes/form.routes.ts src/web/formPage.ts tests/routes/form.routes.test.ts
git commit -m "feat: pass generated reports into team-leader form page props"
```

---

### Task 4: Add "Архів" tab and `ArchiveTab` component to the frontend

**Files:**
- Modify: `src/public/react-app.js`

There are no existing frontend unit tests for `react-app.js` (it's a hand-rolled script, no build/test tooling wired to it). Verification for this task is manual, via the `run-westcamp-gardner` skill, in Task 5.

- [ ] **Step 1: Add the "Архів" tab to `AppFrame`**

In `src/public/react-app.js`, update the `tabs` array inside `AppFrame` (currently lines 21-30):

```js
    const tabs = isAdmin
      ? [
          ["reports", "Звіти"],
          ["content", "Описи"],
          ["settings", "Налаштування"],
        ]
      : [
          ["form", "Новий звіт"],
          ["archive", "Архів"],
          ["guide", "Підказки"],
        ];
```

- [ ] **Step 2: Route the "archive" tab in `FormApp`**

`FormApp` currently renders `tab === "form" ? (...) : h(Guide)` in two places (the `props.blocked` branch and the main branch). Change both ternaries to explicit branching. Replace the `props.blocked` branch (currently lines 66-83):

```js
    if (props.blocked) {
      return h(AppFrame, { mode: "form", activeTab: tab, setActiveTab: setTab },
        tab === "form" ? h("div", null,
          h("header", { className: "page-head" },
            h("div", null,
              h("p", { className: "eyebrow" }, "Форма тім-лідера"),
              h("h1", null, "Новий звіт про дитину")
            )
          ),
          h("section", { className: "guide-panel" },
            h("div", { className: "guide-summary" },
              h("h3", null, "Ліміт вичерпано"),
              h("p", null, props.blocked)
            )
          )
        ) : tab === "archive" ? h(ArchiveTab, { reports: props.reports || [], secret: props.secret }) : h(Guide)
      );
    }
```

Replace the final ternary in the main return (currently line 192, `) : h(Guide)`) with:

```js
      ) : tab === "archive" ? h(ArchiveTab, { reports: props.reports || [], secret: props.secret }) : h(Guide)
    );
  }
```

(This closes the `tab === "form" ? h("div", ...) : ...` conditional that starts at line 86 — only the final branch changes, the `form` branch body stays exactly as-is.)

- [ ] **Step 3: Add the `ArchiveTab` component**

Add this new function after `FormApp` closes (i.e. right before the `const guideCards = [...]` block, currently starting at line 196):

```js
  function ArchiveTab({ reports, secret }) {
    const [query, setQuery] = useState("");
    const filtered = useMemo(() => {
      const q = query.trim().toLowerCase();
      if (!q) return reports;
      return reports.filter((r) => [r.childName, r.shift, r.primaryType, r.secondaryType].filter(Boolean).join(" ").toLowerCase().includes(q));
    }, [reports, query]);

    return h("div", null,
      h("header", { className: "page-head" },
        h("div", null, h("p", { className: "eyebrow" }, "Архів"), h("h1", null, "Раніше згенеровані звіти"))
      ),
      h("div", { className: "toolbar" },
        h("input", { value: query, onChange: (e) => setQuery(e.target.value), placeholder: "Пошук за дитиною, зміною або типом" }),
        h("span", null, `${filtered.length} з ${reports.length}`)
      ),
      h("div", { className: "table-wrap" },
        h("table", null,
          h("thead", null, h("tr", null, h("th", null, "Дитина"), h("th", null, "Зміна"), h("th", null, "Типи"), h("th", null, "Дата"), h("th", null, ""))),
          h("tbody", null,
            filtered.length ? filtered.map((r) =>
              h("tr", { key: r.id },
                h("td", null, r.childName),
                h("td", null, r.shift),
                h("td", null, h("span", { className: "type-chip" }, typeNames[r.primaryType] || r.primaryType), r.secondaryType ? h("span", { className: "type-chip muted-chip" }, typeNames[r.secondaryType] || r.secondaryType) : null),
                h("td", null, String(r.createdAt || "").slice(0, 16).replace("T", " ")),
                h("td", null, h("a", { className: "btn", href: `/f/${secret}/report/${r.id}.pdf` }, "PDF"))
              )
            ) : h("tr", null, h("td", { colSpan: 5 }, "Поки немає звітів."))
          )
        )
      )
    );
  }
```

- [ ] **Step 4: Commit**

```bash
git add src/public/react-app.js
git commit -m "feat: add archive tab UI to team-leader form"
```

---

### Task 5: Manual end-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full automated test suite**

Run: `npx vitest run`
Expected: PASS — all tests green, including the new ones from Tasks 1-3.

- [ ] **Step 2: Launch the app and exercise the archive tab**

Use the `run-westcamp-gardner` skill to start the server, then:
1. Open `/f/<FORM_SECRET>` (check `.env` for the current `FORM_SECRET` value).
2. Submit a report through "Новий звіт" to ensure at least one row exists.
3. Click the "Архів" tab — confirm the submitted report appears in the table with correct child name, shift, type chips, and date.
4. Type into the search box — confirm filtering works.
5. Click the "PDF" button for a row — confirm a PDF downloads successfully.
6. Reload the page and confirm the "Архів" tab still shows the same list (i.e. props survive a fresh page load, not just client-side state).

- [ ] **Step 3: Confirm no unintended event logging**

Check that the `report_events` table only gained a `created` event for the report submitted in Step 2, not an extra `downloaded` event from clicking "PDF" in the archive (this was a deliberate design decision — admin downloads log, form-archive downloads don't).

- [ ] **Step 4: Report results to the user**

Summarize pass/fail for each verification point above. Do not claim the feature works unless Steps 1-3 all passed.
