# Gardner Report Constructor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A mobile-first web app where camp team leaders fill a short form and instantly download a brand-styled personal PDF report (Gardner's multiple intelligences) for one child.

**Architecture:** Single Fastify (Node + TypeScript) server renders the leader form, an admin panel, and builds reports. A report is validated, persisted to SQLite, enriched by DeepSeek (which weaves the leader's live example into warm prose, with a non-AI fallback), composed into a brand HTML template (with an inline-SVG radar chart highlighting the chosen 1-2 of 8 intelligence types), and rendered to PDF by Playwright (headless Chromium). The PDF is streamed to the leader for download and kept in the admin history.

**Tech Stack:** Node 20, TypeScript, Fastify, `@fastify/multipart` (photo upload), `@fastify/static`, better-sqlite3, zod, Playwright (chromium), Vitest. DeepSeek via plain `fetch` (OpenAI-compatible). Docker + Railway.

**Language:** All user-facing text and content is Ukrainian. Code identifiers and comments are English.

---

## File Structure

```
package.json              — deps, scripts (dev/build/start/test)
tsconfig.json             — strict TS, ESM
vitest.config.ts          — test config
Dockerfile                — node + playwright base, chromium
.dockerignore
.gitignore
.env.example              — PORT, FORM_SECRET, ADMIN_SECRET, DEEPSEEK_API_KEY, DB_PATH, UPLOAD_DIR
README.md                 — run + deploy instructions

src/
  config.ts               — typed env loader
  server.ts               — Fastify bootstrap, plugin + route registration
  db/
    index.ts              — better-sqlite3 connection + migrate()
    migrations.ts         — CREATE TABLE statements
    reports.repo.ts       — insert/get/list reports
    shifts.repo.ts        — list/create shifts
    intelligences.repo.ts — get/update intelligence descriptions, seed
  domain/
    types.ts              — IntelligenceType union, Report types, ReportInput
    intelligences.seed.ts — the 8 Ukrainian draft descriptions
    validation.ts         — zod schema for ReportInput
  services/
    ai.ts                 — weaveExample() DeepSeek client + fallback
    radar.ts              — renderRadarSvg(highlighted) -> SVG string
    reportTemplate.ts     — renderReportHtml(report) -> full HTML
    pdf.ts                — renderPdf(html) -> Buffer (Playwright)
    reportBuilder.ts      — buildReport(input) orchestration
  web/
    html.ts               — esc() + tiny layout helpers
    formPage.ts           — leader form HTML
    adminPages.ts         — admin list + edit HTML
  routes/
    health.ts
    form.routes.ts        — GET/POST /f/:secret
    admin.routes.ts       — /admin/:secret ...
  public/
    styles.css            — brand styles for web pages

tests/
  domain/intelligences.seed.test.ts
  domain/validation.test.ts
  db/reports.repo.test.ts
  db/intelligences.repo.test.ts
  services/radar.test.ts
  services/ai.test.ts
  services/reportTemplate.test.ts
  services/pdf.test.ts
  services/reportBuilder.test.ts
  routes/form.routes.test.ts
  routes/admin.routes.test.ts
```

**Brand tokens** (reuse everywhere): forest green `#2F5D3A`, deep wood `#6B4A2B`, turquoise accent `#1FB6A6`, cream bg `#F7F4EC`, ink text `#2B2B2B`, muted `#8A8A8A`. Font stack: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.

---

## Task 1: Project scaffold + health endpoint

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `.env.example`
- Create: `src/config.ts`, `src/server.ts`, `src/routes/health.ts`
- Test: `tests/routes/health.test.ts`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "westcamp-gardner-reports",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@fastify/multipart": "^8.3.0",
    "@fastify/static": "^7.0.4",
    "better-sqlite3": "^11.3.0",
    "fastify": "^4.28.1",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.11",
    "@types/node": "^20.14.0",
    "playwright": "^1.47.0",
    "tsx": "^4.19.0",
    "typescript": "^5.5.4",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
```

- [ ] **Step 4: Create `.gitignore` and `.env.example`**

`.gitignore`:
```
node_modules
dist
data
uploads
*.sqlite
.env
```

`.env.example`:
```
PORT=3000
FORM_SECRET=changeme-form
ADMIN_SECRET=changeme-admin
DEEPSEEK_API_KEY=
DB_PATH=./data/app.sqlite
UPLOAD_DIR=./uploads
```

- [ ] **Step 5: Create `src/config.ts`**

```ts
export interface Config {
  port: number;
  formSecret: string;
  adminSecret: string;
  deepseekApiKey: string;
  dbPath: string;
  uploadDir: string;
}

export function loadConfig(env = process.env): Config {
  return {
    port: Number(env.PORT ?? 3000),
    formSecret: env.FORM_SECRET ?? "changeme-form",
    adminSecret: env.ADMIN_SECRET ?? "changeme-admin",
    deepseekApiKey: env.DEEPSEEK_API_KEY ?? "",
    dbPath: env.DB_PATH ?? "./data/app.sqlite",
    uploadDir: env.UPLOAD_DIR ?? "./uploads",
  };
}
```

- [ ] **Step 6: Write the failing test** `tests/routes/health.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { buildServer } from "../../src/server.js";

describe("health", () => {
  it("returns ok", async () => {
    const app = buildServer();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
    await app.close();
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npm i && npx vitest run tests/routes/health.test.ts`
Expected: FAIL — cannot import `buildServer`.

- [ ] **Step 8: Create `src/routes/health.ts`**

```ts
import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({ status: "ok" }));
}
```

- [ ] **Step 9: Create `src/server.ts`**

```ts
import Fastify, { type FastifyInstance } from "fastify";
import { healthRoutes } from "./routes/health.js";
import { loadConfig } from "./config.js";

export function buildServer(): FastifyInstance {
  const app = Fastify({ logger: false });
  app.register(healthRoutes);
  return app;
}

if (process.argv[1]?.endsWith("server.js") || process.argv[1]?.endsWith("server.ts")) {
  const cfg = loadConfig();
  const app = buildServer();
  app.listen({ port: cfg.port, host: "0.0.0.0" }).then(() => {
    console.log(`listening on ${cfg.port}`);
  });
}
```

- [ ] **Step 10: Run test to verify it passes**

Run: `npx vitest run tests/routes/health.test.ts`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: project scaffold and health endpoint"
```

---

## Task 2: Domain types + 8 intelligence seed descriptions

**Files:**
- Create: `src/domain/types.ts`, `src/domain/intelligences.seed.ts`
- Test: `tests/domain/intelligences.seed.test.ts`

- [ ] **Step 1: Create `src/domain/types.ts`**

```ts
export const INTELLIGENCE_TYPES = [
  "linguistic",
  "logical",
  "spatial",
  "kinesthetic",
  "musical",
  "interpersonal",
  "intrapersonal",
  "naturalistic",
] as const;

export type IntelligenceType = (typeof INTELLIGENCE_TYPES)[number];

export interface IntelligenceContent {
  type: IntelligenceType;
  title: string;        // Ukrainian display name
  tagline: string;      // one warm line
  strengths: string;    // paragraph
  inCamp: string;       // how it shows in camp
  parentAdvice: string; // how to support at home
}

export interface ReportInput {
  childName: string;
  shift: string;
  primaryType: IntelligenceType;
  secondaryType?: IntelligenceType;
  example: string;       // leader's live example
  photoPath: string;     // stored photo path
}

export interface Report extends ReportInput {
  id: string;
  wovenExample: string;  // AI (or fallback) prose
  createdAt: string;     // ISO
}
```

- [ ] **Step 2: Write the failing test** `tests/domain/intelligences.seed.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { INTELLIGENCE_TYPES } from "../../src/domain/types.js";
import { SEED_INTELLIGENCES } from "../../src/domain/intelligences.seed.js";

describe("intelligence seed", () => {
  it("covers all 8 types with non-empty fields", () => {
    expect(SEED_INTELLIGENCES).toHaveLength(8);
    for (const type of INTELLIGENCE_TYPES) {
      const item = SEED_INTELLIGENCES.find((i) => i.type === type);
      expect(item, `missing ${type}`).toBeDefined();
      expect(item!.title.length).toBeGreaterThan(0);
      expect(item!.strengths.length).toBeGreaterThan(20);
      expect(item!.inCamp.length).toBeGreaterThan(20);
      expect(item!.parentAdvice.length).toBeGreaterThan(20);
    }
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/domain/intelligences.seed.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Create `src/domain/intelligences.seed.ts`** (Ukrainian drafts — to be edited later in admin)

```ts
import type { IntelligenceContent } from "./types.js";

export const SEED_INTELLIGENCES: IntelligenceContent[] = [
  {
    type: "linguistic",
    title: "Лінгвістичний інтелект",
    tagline: "Майстер слова й історій",
    strengths:
      "Дитина любить слова: легко переказує, вигадує історії, влучно жартує і швидко вловлює нові поняття через мову. Їй просто даються мови, читання та усні виступи.",
    inCamp:
      "У таборі це помітно, коли дитина веде розповідь біля вогнища, охоче бере слово на ранковому колі, складає кричалки для загону або першою озвучує ідеї команди.",
    parentAdvice:
      "Підтримуйте словесні ігри, читання вголос разом і ведення власного щоденника пригод. Просіть переказувати фільми чи події — це розвиває силу, яка вже є.",
  },
  {
    type: "logical",
    title: "Логіко-математичний інтелект",
    tagline: "Дослідник закономірностей",
    strengths:
      "Дитина мислить структурно: любить рахувати, шукати причини й наслідки, розкладати задачу на кроки і знаходити логічні рішення. Її захоплюють головоломки та стратегії.",
    inCamp:
      "У таборі це видно в квестах і стратегічних іграх: дитина прораховує ходи, помічає закономірність у загадці швидше за інших, веде рахунок і планує дії команди.",
    parentAdvice:
      "Давайте простір для головоломок, настільних стратегій, дрібних експериментів і питань «а чому так?». Залучайте до планування сімейних справ і простих розрахунків.",
  },
  {
    type: "spatial",
    title: "Просторовий інтелект",
    tagline: "Той, хто бачить образами",
    strengths:
      "Дитина мислить картинками: добре орієнтується у просторі, малює, конструює, уявляє об'єкти в об'ємі та помічає деталі, які інші пропускають.",
    inCamp:
      "У таборі це проявляється у творчих майстернях, оформленні загонового куточка, спорудженні споруд із підручних матеріалів і вмінні зорієнтуватися на місцевості.",
    parentAdvice:
      "Підтримуйте малювання, ліплення, конструктори й фотографію. Дозволяйте облаштовувати власний простір — це природний спосіб розвитку цієї сильної сторони.",
  },
  {
    type: "kinesthetic",
    title: "Тілесно-кінестетичний інтелект",
    tagline: "Той, хто пізнає світ рухом",
    strengths:
      "Дитина чудово володіє тілом: спритна, витривала, швидко вчиться через дію та рух, любить спорт, танець і все, що можна зробити руками.",
    inCamp:
      "У таборі це яскраво видно в естафетах, спортивних іграх, танцях і смузі перешкод: дитина в русі, веде команду власним прикладом і не боїться фізичних викликів.",
    parentAdvice:
      "Забезпечте регулярну рухову активність: секції, танці, активні ігри. Дозволяйте вчитися «руками» — через досліди, майстрування, спорт.",
  },
  {
    type: "musical",
    title: "Музичний інтелект",
    tagline: "Той, хто чує ритм світу",
    strengths:
      "Дитина тонко відчуває ритм, мелодію та звук: легко запам'ятовує пісні, відтворює ритми, наспівує і чутлива до настрою через музику.",
    inCamp:
      "У таборі це помітно на репетиціях номерів, у вечірніх піснях біля вогнища, коли дитина задає ритм загонової кричалки або веде за собою на сцені.",
    parentAdvice:
      "Підтримуйте слухання різної музики, спів, ритмічні ігри, за бажанням — навчання інструменту. Музика для такої дитини — природний спосіб виражати себе.",
  },
  {
    type: "interpersonal",
    title: "Міжособистісний інтелект",
    tagline: "Серце команди",
    strengths:
      "Дитина чудово розуміє інших: відчуває настрій, легко знаходить спільну мову, мирить, об'єднує і веде за собою. Природний командний гравець і лідер.",
    inCamp:
      "У таборі це видно, коли дитина бере капітанство, підтримує тих, кому складно, згуртовує загін і стає тим, навколо кого збираються інші.",
    parentAdvice:
      "Давайте простір для командних активностей і відповідальних ролей. Обговорюйте почуття й стосунки — це підживлює природний дар розуміти людей.",
  },
  {
    type: "intrapersonal",
    title: "Внутрішньоособистісний інтелект",
    tagline: "Той, хто знає себе",
    strengths:
      "Дитина добре розуміє власні почуття, мотиви й цілі: вдумлива, самостійна, вміє ставити завдання собі та йти до них у власному темпі.",
    inCamp:
      "У таборі це помітно в умінні спокійно зробити вибір, відрефлексувати день на вечірньому колі, поставити собі ціль на зміну й самостійно її досягти.",
    parentAdvice:
      "Поважайте потребу в особистому просторі й часі на роздуми. Допомагайте ставити власні цілі та проговорювати почуття — не порівнюючи з іншими.",
  },
  {
    type: "naturalistic",
    title: "Натуралістичний інтелект",
    tagline: "Друг природи",
    strengths:
      "Дитина чутлива до природи: помічає рослини й тварин, любить досліджувати довкілля, класифікувати знахідки і дбати про живе.",
    inCamp:
      "У таборі це проявляється в походах і дослідженнях лісу, турботі про табірних тварин чи рослини, вмінні помітити й назвати те, що навколо.",
    parentAdvice:
      "Проводьте більше часу на природі, заведіть рослину чи спостереження за тваринами, підтримуйте колекціонування та екологічні звички.",
  },
];
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/domain/intelligences.seed.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: domain types and 8 intelligence seed descriptions"
```

---

## Task 3: Validation schema

**Files:**
- Create: `src/domain/validation.ts`
- Test: `tests/domain/validation.test.ts`

- [ ] **Step 1: Write the failing test** `tests/domain/validation.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { reportInputSchema } from "../../src/domain/validation.js";

const base = {
  childName: "Артем",
  shift: "3",
  primaryType: "kinesthetic",
  example: "Взяв капітанство у квесті та привів команду до перемоги.",
  photoPath: "/uploads/a.jpg",
};

describe("reportInputSchema", () => {
  it("accepts valid input", () => {
    expect(reportInputSchema.parse(base).primaryType).toBe("kinesthetic");
  });
  it("accepts optional secondaryType", () => {
    const r = reportInputSchema.parse({ ...base, secondaryType: "interpersonal" });
    expect(r.secondaryType).toBe("interpersonal");
  });
  it("rejects empty childName", () => {
    expect(() => reportInputSchema.parse({ ...base, childName: "" })).toThrow();
  });
  it("rejects unknown intelligence type", () => {
    expect(() => reportInputSchema.parse({ ...base, primaryType: "telepathy" })).toThrow();
  });
  it("rejects secondary equal to primary", () => {
    expect(() =>
      reportInputSchema.parse({ ...base, secondaryType: "kinesthetic" })
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/domain/validation.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/domain/validation.ts`**

```ts
import { z } from "zod";
import { INTELLIGENCE_TYPES } from "./types.js";

const typeEnum = z.enum(INTELLIGENCE_TYPES);

export const reportInputSchema = z
  .object({
    childName: z.string().trim().min(1).max(80),
    shift: z.string().trim().min(1).max(40),
    primaryType: typeEnum,
    secondaryType: typeEnum.optional(),
    example: z.string().trim().min(5).max(800),
    photoPath: z.string().trim().min(1),
  })
  .refine((d) => d.secondaryType !== d.primaryType, {
    message: "secondaryType must differ from primaryType",
    path: ["secondaryType"],
  });

export type ReportInputParsed = z.infer<typeof reportInputSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/domain/validation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: report input validation schema"
```

---

## Task 4: Database layer (connection, migrations, repositories)

**Files:**
- Create: `src/db/index.ts`, `src/db/migrations.ts`, `src/db/intelligences.repo.ts`, `src/db/reports.repo.ts`, `src/db/shifts.repo.ts`
- Test: `tests/db/reports.repo.test.ts`, `tests/db/intelligences.repo.test.ts`

- [ ] **Step 1: Create `src/db/migrations.ts`**

```ts
export const MIGRATIONS = `
CREATE TABLE IF NOT EXISTS intelligences (
  type TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  tagline TEXT NOT NULL,
  strengths TEXT NOT NULL,
  in_camp TEXT NOT NULL,
  parent_advice TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS shifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  child_name TEXT NOT NULL,
  shift TEXT NOT NULL,
  primary_type TEXT NOT NULL,
  secondary_type TEXT,
  example TEXT NOT NULL,
  woven_example TEXT NOT NULL,
  photo_path TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;
```

- [ ] **Step 2: Create `src/db/index.ts`**

```ts
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { MIGRATIONS } from "./migrations.js";
import { SEED_INTELLIGENCES } from "../domain/intelligences.seed.js";

export type DB = Database.Database;

export function openDb(path: string): DB {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.exec(MIGRATIONS);
  seedIntelligences(db);
  return db;
}

function seedIntelligences(db: DB) {
  const insert = db.prepare(
    `INSERT OR IGNORE INTO intelligences (type, title, tagline, strengths, in_camp, parent_advice)
     VALUES (@type, @title, @tagline, @strengths, @inCamp, @parentAdvice)`
  );
  const tx = db.transaction(() => {
    for (const i of SEED_INTELLIGENCES) insert.run(i);
  });
  tx();
}
```

- [ ] **Step 3: Create `src/db/intelligences.repo.ts`**

```ts
import type { DB } from "./index.js";
import type { IntelligenceContent, IntelligenceType } from "../domain/types.js";

interface Row {
  type: string; title: string; tagline: string;
  strengths: string; in_camp: string; parent_advice: string;
}
const toContent = (r: Row): IntelligenceContent => ({
  type: r.type as IntelligenceType,
  title: r.title, tagline: r.tagline, strengths: r.strengths,
  inCamp: r.in_camp, parentAdvice: r.parent_advice,
});

export function getIntelligence(db: DB, type: IntelligenceType): IntelligenceContent {
  const row = db.prepare(`SELECT * FROM intelligences WHERE type = ?`).get(type) as Row | undefined;
  if (!row) throw new Error(`unknown intelligence ${type}`);
  return toContent(row);
}

export function listIntelligences(db: DB): IntelligenceContent[] {
  return (db.prepare(`SELECT * FROM intelligences`).all() as Row[]).map(toContent);
}

export function updateIntelligence(db: DB, c: IntelligenceContent): void {
  db.prepare(
    `UPDATE intelligences SET title=@title, tagline=@tagline, strengths=@strengths,
     in_camp=@inCamp, parent_advice=@parentAdvice WHERE type=@type`
  ).run(c);
}
```

- [ ] **Step 4: Create `src/db/shifts.repo.ts`**

```ts
import type { DB } from "./index.js";

export function listShifts(db: DB): string[] {
  return (db.prepare(`SELECT name FROM shifts ORDER BY name`).all() as { name: string }[])
    .map((r) => r.name);
}
export function addShift(db: DB, name: string): void {
  db.prepare(`INSERT OR IGNORE INTO shifts (name) VALUES (?)`).run(name.trim());
}
```

- [ ] **Step 5: Create `src/db/reports.repo.ts`**

```ts
import type { DB } from "./index.js";
import type { Report } from "../domain/types.js";

interface Row {
  id: string; child_name: string; shift: string; primary_type: string;
  secondary_type: string | null; example: string; woven_example: string;
  photo_path: string; created_at: string;
}
const toReport = (r: Row): Report => ({
  id: r.id, childName: r.child_name, shift: r.shift,
  primaryType: r.primary_type as Report["primaryType"],
  secondaryType: (r.secondary_type ?? undefined) as Report["secondaryType"],
  example: r.example, wovenExample: r.woven_example,
  photoPath: r.photo_path, createdAt: r.created_at,
});

export function insertReport(db: DB, r: Report): void {
  db.prepare(
    `INSERT INTO reports (id, child_name, shift, primary_type, secondary_type,
      example, woven_example, photo_path, created_at)
     VALUES (@id, @childName, @shift, @primaryType, @secondaryType,
      @example, @wovenExample, @photoPath, @createdAt)`
  ).run({ ...r, secondaryType: r.secondaryType ?? null });
}

export function getReport(db: DB, id: string): Report | undefined {
  const row = db.prepare(`SELECT * FROM reports WHERE id = ?`).get(id) as Row | undefined;
  return row ? toReport(row) : undefined;
}

export function listReports(db: DB): Report[] {
  return (db.prepare(`SELECT * FROM reports ORDER BY created_at DESC`).all() as Row[]).map(toReport);
}
```

- [ ] **Step 6: Write the failing tests** `tests/db/intelligences.repo.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { openDb } from "../../src/db/index.js";
import { getIntelligence, listIntelligences, updateIntelligence } from "../../src/db/intelligences.repo.js";

describe("intelligences repo", () => {
  it("seeds all 8 and reads one", () => {
    const db = openDb(":memory:");
    expect(listIntelligences(db)).toHaveLength(8);
    expect(getIntelligence(db, "musical").title).toContain("Музичний");
  });
  it("updates a description", () => {
    const db = openDb(":memory:");
    const c = getIntelligence(db, "linguistic");
    updateIntelligence(db, { ...c, tagline: "Новий підпис" });
    expect(getIntelligence(db, "linguistic").tagline).toBe("Новий підпис");
  });
});
```

`tests/db/reports.repo.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { openDb } from "../../src/db/index.js";
import { insertReport, getReport, listReports } from "../../src/db/reports.repo.js";
import type { Report } from "../../src/domain/types.js";

const sample: Report = {
  id: "abc123", childName: "Артем", shift: "3",
  primaryType: "kinesthetic", secondaryType: "interpersonal",
  example: "Капітанство у квесті.", wovenExample: "Оживлений текст.",
  photoPath: "/uploads/a.jpg", createdAt: new Date().toISOString(),
};

describe("reports repo", () => {
  it("inserts and reads back", () => {
    const db = openDb(":memory:");
    insertReport(db, sample);
    expect(getReport(db, "abc123")?.childName).toBe("Артем");
    expect(listReports(db)).toHaveLength(1);
  });
  it("handles missing secondaryType", () => {
    const db = openDb(":memory:");
    insertReport(db, { ...sample, id: "x", secondaryType: undefined });
    expect(getReport(db, "x")?.secondaryType).toBeUndefined();
  });
});
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run tests/db`
Expected: PASS (both files).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: sqlite layer with migrations, seed, and repositories"
```

---

## Task 5: Radar chart SVG generator

**Files:**
- Create: `src/services/radar.ts`
- Test: `tests/services/radar.test.ts`

The radar plots all 8 axes at a fixed "presence" level; highlighted (chosen) types
are drawn at full reach in turquoise, the rest are muted. Order matches `INTELLIGENCE_TYPES`.

- [ ] **Step 1: Write the failing test** `tests/services/radar.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { renderRadarSvg } from "../../src/services/radar.js";

describe("renderRadarSvg", () => {
  it("returns an svg string", () => {
    const svg = renderRadarSvg(["kinesthetic"]);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("</svg>");
  });
  it("includes all 8 axis labels", () => {
    const svg = renderRadarSvg(["musical", "spatial"]);
    for (const label of ["Лінгвіст", "Логіко", "Простор", "Кінест", "Музич", "Міжособ", "Внутріш", "Натурал"]) {
      expect(svg).toContain(label);
    }
  });
  it("marks highlighted axes with accent color", () => {
    const accent = "#1FB6A6";
    const svg = renderRadarSvg(["musical"]);
    expect(svg).toContain(accent);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/services/radar.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/services/radar.ts`**

```ts
import { INTELLIGENCE_TYPES, type IntelligenceType } from "../domain/types.js";

const SHORT_LABELS: Record<IntelligenceType, string> = {
  linguistic: "Лінгвістичний",
  logical: "Логіко-мат.",
  spatial: "Просторовий",
  kinesthetic: "Кінестетичний",
  musical: "Музичний",
  interpersonal: "Міжособистісний",
  intrapersonal: "Внутрішньоособ.",
  naturalistic: "Натуралістичний",
};

const ACCENT = "#1FB6A6";
const MUTED = "#C9D6CC";
const GRID = "#D8E0D6";

export function renderRadarSvg(highlighted: IntelligenceType[]): string {
  const size = 420;
  const cx = size / 2;
  const cy = size / 2;
  const rMax = 150;
  const n = INTELLIGENCE_TYPES.length;
  const baseLevel = 0.45; // non-highlighted reach
  const hiLevel = 1.0;

  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const point = (i: number, level: number) => {
    const a = angle(i);
    return [cx + Math.cos(a) * rMax * level, cy + Math.sin(a) * rMax * level] as const;
  };

  // grid rings
  let rings = "";
  for (const f of [0.25, 0.5, 0.75, 1]) {
    const pts = INTELLIGENCE_TYPES.map((_, i) => point(i, f).join(",")).join(" ");
    rings += `<polygon points="${pts}" fill="none" stroke="${GRID}" stroke-width="1"/>`;
  }
  // spokes + labels
  let spokes = "";
  let labels = "";
  INTELLIGENCE_TYPES.forEach((type, i) => {
    const [x, y] = point(i, 1);
    spokes += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="${GRID}" stroke-width="1"/>`;
    const [lx, ly] = point(i, 1.16);
    const anchor = Math.abs(lx - cx) < 4 ? "middle" : lx > cx ? "start" : "end";
    const isHi = highlighted.includes(type);
    labels += `<text x="${lx}" y="${ly}" font-size="12" text-anchor="${anchor}" dominant-baseline="middle" fill="${isHi ? ACCENT : "#6B7A6E"}" font-weight="${isHi ? 700 : 400}">${SHORT_LABELS[type]}</text>`;
  });
  // data polygon
  const dataPts = INTELLIGENCE_TYPES.map((type, i) =>
    point(i, highlighted.includes(type) ? hiLevel : baseLevel).join(",")
  ).join(" ");
  const fill = ACCENT + "33";
  const polygon = `<polygon points="${dataPts}" fill="${fill}" stroke="${ACCENT}" stroke-width="2.5"/>`;
  // dots on highlighted vertices
  let dots = "";
  INTELLIGENCE_TYPES.forEach((type, i) => {
    if (!highlighted.includes(type)) return;
    const [x, y] = point(i, hiLevel);
    dots += `<circle cx="${x}" cy="${y}" r="5" fill="${ACCENT}"/>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${rings}${spokes}${polygon}${dots}${labels}<circle cx="${cx}" cy="${cy}" r="2.5" fill="${MUTED}"/></svg>`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/services/radar.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: inline-svg radar chart with highlighted axes"
```

---

## Task 6: AI service (DeepSeek) with fallback

**Files:**
- Create: `src/services/ai.ts`
- Test: `tests/services/ai.test.ts`

`weaveExample` calls DeepSeek's OpenAI-compatible endpoint to turn the leader's dry
example into 1-2 warm paragraphs referencing the child by name and chosen types.
On missing key, network error, or bad response it returns a deterministic fallback.

- [ ] **Step 1: Write the failing test** `tests/services/ai.test.ts`

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { weaveExample } from "../../src/services/ai.js";

const args = {
  childName: "Артем",
  example: "Взяв капітанство у квесті та привів команду до перемоги.",
  primaryTitle: "Тілесно-кінестетичний інтелект",
  secondaryTitle: "Міжособистісний інтелект",
};

afterEach(() => vi.restoreAllMocks());

describe("weaveExample", () => {
  it("falls back when no api key", async () => {
    const out = await weaveExample({ ...args, apiKey: "" });
    expect(out).toContain("Артем");
    expect(out).toContain("капітанство");
  });

  it("returns AI content when api responds", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: "Оживлений абзац про Артема." } }] }),
        { status: 200 })
    ));
    const out = await weaveExample({ ...args, apiKey: "key" });
    expect(out).toBe("Оживлений абзац про Артема.");
  });

  it("falls back on http error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("err", { status: 500 })));
    const out = await weaveExample({ ...args, apiKey: "key" });
    expect(out).toContain("капітанство");
  });

  it("falls back on network throw", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const out = await weaveExample({ ...args, apiKey: "key" });
    expect(out).toContain("Артем");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/services/ai.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/services/ai.ts`**

```ts
export interface WeaveArgs {
  childName: string;
  example: string;
  primaryTitle: string;
  secondaryTitle?: string;
  apiKey: string;
}

const ENDPOINT = "https://api.deepseek.com/chat/completions";

function fallback(a: WeaveArgs): string {
  const types = a.secondaryTitle ? `${a.primaryTitle} та ${a.secondaryTitle}` : a.primaryTitle;
  return `Цього сезону ${a.childName} яскраво проявив(-ла) ${types}. Ось момент, який запам'ятався команді: «${a.example.trim()}»`;
}

export async function weaveExample(a: WeaveArgs): Promise<string> {
  if (!a.apiKey) return fallback(a);

  const types = a.secondaryTitle ? `${a.primaryTitle} і ${a.secondaryTitle}` : a.primaryTitle;
  const prompt =
    `Ти пишеш теплий, щирий фрагмент дитячого звіту для батьків українською. ` +
    `Дитина: ${a.childName}. Сильні сторони: ${types}. ` +
    `Реальний приклад від вожатого: "${a.example.trim()}". ` +
    `Напиши 1-2 короткі абзаци (до 90 слів), які природно вплітають цей приклад і підкреслюють сильні сторони. ` +
    `Звертайся до дитини на ім'я. Без переліків, без заголовків, лише живий текст.`;

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${a.apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        temperature: 0.8,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return fallback(a);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text && text.length > 0 ? text : fallback(a);
  } catch {
    return fallback(a);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/services/ai.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: deepseek weaving service with deterministic fallback"
```

---

## Task 7: Report HTML template

**Files:**
- Create: `src/web/html.ts`, `src/services/reportTemplate.ts`
- Test: `tests/services/reportTemplate.test.ts`

The template renders the full A4 report HTML: cover (photo + name + shift), radar,
descriptions of ONLY chosen types, the woven example, and a parent-advice page for
chosen types. Photo is embedded as a `file://` or data URI path passed in.

- [ ] **Step 1: Create `src/web/html.ts`**

```ts
export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
```

- [ ] **Step 2: Write the failing test** `tests/services/reportTemplate.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { renderReportHtml } from "../../src/services/reportTemplate.js";
import { SEED_INTELLIGENCES } from "../../src/domain/intelligences.seed.js";
import type { Report } from "../../src/domain/types.js";

const byType = (t: string) => SEED_INTELLIGENCES.find((i) => i.type === t)!;

const report: Report = {
  id: "abc", childName: "Артем", shift: "3",
  primaryType: "kinesthetic", secondaryType: "interpersonal",
  example: "Капітанство у квесті.", wovenExample: "Оживлений абзац про Артема.",
  photoPath: "file:///uploads/a.jpg", createdAt: new Date().toISOString(),
};

describe("renderReportHtml", () => {
  const html = renderReportHtml({
    report,
    primary: byType("kinesthetic"),
    secondary: byType("interpersonal"),
    radarSvg: "<svg>RADAR</svg>",
  });

  it("shows child name and shift", () => {
    expect(html).toContain("Артем");
    expect(html).toContain("3");
  });
  it("includes chosen type descriptions", () => {
    expect(html).toContain(byType("kinesthetic").title);
    expect(html).toContain(byType("interpersonal").title);
  });
  it("excludes non-chosen type descriptions", () => {
    expect(html).not.toContain(byType("musical").strengths);
    expect(html).not.toContain(byType("linguistic").strengths);
  });
  it("embeds the woven example and the radar", () => {
    expect(html).toContain("Оживлений абзац про Артема.");
    expect(html).toContain("<svg>RADAR</svg>");
  });
  it("escapes html in user content", () => {
    const evil = renderReportHtml({
      report: { ...report, childName: "<b>x</b>" },
      primary: byType("kinesthetic"), radarSvg: "<svg></svg>",
    });
    expect(evil).toContain("&lt;b&gt;x&lt;/b&gt;");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/services/reportTemplate.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Create `src/services/reportTemplate.ts`**

```ts
import { esc } from "../web/html.js";
import type { IntelligenceContent, Report } from "../domain/types.js";

export interface TemplateArgs {
  report: Report;
  primary: IntelligenceContent;
  secondary?: IntelligenceContent;
  radarSvg: string;
}

const C = {
  green: "#2F5D3A", wood: "#6B4A2B", accent: "#1FB6A6",
  cream: "#F7F4EC", ink: "#2B2B2B", muted: "#8A8A8A",
};

function typeSection(c: IntelligenceContent): string {
  return `
  <section class="type">
    <h2>${esc(c.title)}</h2>
    <p class="tagline">${esc(c.tagline)}</p>
    <h3>Сильні сторони</h3><p>${esc(c.strengths)}</p>
    <h3>Як це проявлялося в таборі</h3><p>${esc(c.inCamp)}</p>
  </section>`;
}

function adviceBlock(c: IntelligenceContent): string {
  return `<div class="advice"><h3>${esc(c.title)}</h3><p>${esc(c.parentAdvice)}</p></div>`;
}

export function renderReportHtml(a: TemplateArgs): string {
  const { report: r } = a;
  const chosen = [a.primary, a.secondary].filter(Boolean) as IntelligenceContent[];
  return `<!doctype html><html lang="uk"><head><meta charset="utf-8">
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: ${C.ink}; }
  .page { width: 210mm; min-height: 297mm; padding: 22mm 20mm; page-break-after: always; background: ${C.cream}; }
  .page:last-child { page-break-after: auto; }
  .cover { background: ${C.green}; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  .cover .photo { width: 70mm; height: 70mm; border-radius: 50%; object-fit: cover; border: 6px solid ${C.accent}; margin-bottom: 14mm; }
  .cover h1 { font-size: 30pt; margin: 0 0 6mm; }
  .cover .sub { font-size: 13pt; opacity: .9; }
  .brand { letter-spacing: 2px; text-transform: uppercase; font-size: 10pt; margin-top: 16mm; opacity: .85; }
  h2 { color: ${C.green}; font-size: 20pt; margin: 0 0 2mm; }
  .tagline { color: ${C.accent}; font-weight: 700; margin: 0 0 6mm; }
  h3 { color: ${C.wood}; font-size: 12pt; margin: 6mm 0 1mm; }
  p { line-height: 1.55; font-size: 11.5pt; margin: 0 0 3mm; }
  .radar { text-align: center; margin: 8mm 0; }
  .woven { background: #fff; border-left: 5px solid ${C.accent}; padding: 6mm 7mm; border-radius: 6px; font-size: 12pt; }
  .advice { background: #fff; border-radius: 8px; padding: 6mm 7mm; margin-bottom: 5mm; }
  .section-title { color: ${C.green}; font-size: 16pt; margin-bottom: 5mm; }
</style></head><body>

  <div class="page cover">
    <img class="photo" src="${esc(r.photoPath)}" alt="">
    <h1>${esc(r.childName)}</h1>
    <div class="sub">Зміна ${esc(r.shift)} · Звіт про сильні сторони</div>
    <div class="brand">WestCamp Kids</div>
  </div>

  <div class="page">
    <h2 class="section-title">Профіль сильних сторін</h2>
    <div class="radar">${a.radarSvg}</div>
    <div class="woven">${esc(r.wovenExample)}</div>
  </div>

  <div class="page">
    ${chosen.map(typeSection).join("")}
  </div>

  <div class="page">
    <h2 class="section-title">Як підтримати ці сильні сторони вдома</h2>
    ${chosen.map(adviceBlock).join("")}
  </div>

</body></html>`;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/services/reportTemplate.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: brand-styled report html template"
```

---

## Task 8: PDF renderer (Playwright)

**Files:**
- Create: `src/services/pdf.ts`
- Test: `tests/services/pdf.test.ts`

- [ ] **Step 1: Install Playwright chromium**

Run: `npx playwright install chromium`
Expected: chromium downloaded.

- [ ] **Step 2: Write the failing test** `tests/services/pdf.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { renderPdf } from "../../src/services/pdf.js";

describe("renderPdf", () => {
  it("produces a non-empty PDF buffer", async () => {
    const buf = await renderPdf("<html><body><h1>Тест</h1></body></html>");
    expect(buf.length).toBeGreaterThan(1000);
    expect(buf.subarray(0, 4).toString("latin1")).toBe("%PDF");
  }, 60_000);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/services/pdf.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Create `src/services/pdf.ts`**

```ts
import { chromium, type Browser } from "playwright";

let browserPromise: Promise<Browser> | null = null;

function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.launch({ args: ["--no-sandbox"] });
  }
  return browserPromise;
}

export async function renderPdf(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "networkidle" });
    return await page.pdf({ format: "A4", printBackground: true });
  } finally {
    await page.close();
  }
}

export async function closeBrowser(): Promise<void> {
  if (browserPromise) {
    const b = await browserPromise;
    await b.close();
    browserPromise = null;
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/services/pdf.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: playwright pdf renderer with shared browser"
```

---

## Task 9: Report builder orchestration

**Files:**
- Create: `src/services/reportBuilder.ts`
- Test: `tests/services/reportBuilder.test.ts`

Orchestrates: validated input → woven example (AI) → persist → compose HTML →
render PDF. Takes injected deps (db, weave fn, render fn, idGen, clock) for testability.

- [ ] **Step 1: Write the failing test** `tests/services/reportBuilder.test.ts`

```ts
import { describe, it, expect, vi } from "vitest";
import { openDb } from "../../src/db/index.js";
import { getReport } from "../../src/db/reports.repo.js";
import { buildReport } from "../../src/services/reportBuilder.js";
import type { ReportInputParsed } from "../../src/domain/validation.js";

const input: ReportInputParsed = {
  childName: "Артем", shift: "3", primaryType: "kinesthetic",
  secondaryType: "interpersonal", example: "Капітанство у квесті.",
  photoPath: "/uploads/a.jpg",
};

describe("buildReport", () => {
  it("weaves, persists, and renders a pdf", async () => {
    const db = openDb(":memory:");
    const weave = vi.fn(async () => "Оживлений текст про Артема.");
    const render = vi.fn(async () => Buffer.from("%PDF-fake"));
    const result = await buildReport(input, {
      db, deepseekApiKey: "key", weave, render,
      idGen: () => "id123", now: () => new Date("2026-06-08T10:00:00Z"),
      photoToSrc: (p) => `file://${p}`,
    });

    expect(result.report.id).toBe("id123");
    expect(result.report.wovenExample).toBe("Оживлений текст про Артема.");
    expect(result.pdf.subarray(0, 4).toString("latin1")).toBe("%PDF");
    expect(getReport(db, "id123")?.childName).toBe("Артем");

    // weave received titles, render received html with the woven text
    expect(weave).toHaveBeenCalledWith(expect.objectContaining({
      childName: "Артем", primaryTitle: expect.stringContaining("Кінестетичний"),
    }));
    expect(render).toHaveBeenCalledWith(expect.stringContaining("Оживлений текст про Артема."));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/services/reportBuilder.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/services/reportBuilder.ts`**

```ts
import type { DB } from "../db/index.js";
import { getIntelligence } from "../db/intelligences.repo.js";
import { insertReport } from "../db/reports.repo.js";
import { renderRadarSvg } from "./radar.js";
import { renderReportHtml } from "./reportTemplate.js";
import { weaveExample, type WeaveArgs } from "./ai.js";
import { renderPdf } from "./pdf.js";
import type { Report, IntelligenceType } from "../domain/types.js";
import type { ReportInputParsed } from "../domain/validation.js";

export interface BuildDeps {
  db: DB;
  deepseekApiKey: string;
  weave?: (a: WeaveArgs) => Promise<string>;
  render?: (html: string) => Promise<Buffer>;
  idGen?: () => string;
  now?: () => Date;
  photoToSrc?: (photoPath: string) => string;
}

export interface BuildResult {
  report: Report;
  pdf: Buffer;
}

export async function buildReport(input: ReportInputParsed, deps: BuildDeps): Promise<BuildResult> {
  const weave = deps.weave ?? weaveExample;
  const render = deps.render ?? renderPdf;
  const idGen = deps.idGen ?? (() => Math.random().toString(36).slice(2, 10));
  const now = deps.now ?? (() => new Date());
  const photoToSrc = deps.photoToSrc ?? ((p) => p);

  const primary = getIntelligence(deps.db, input.primaryType);
  const secondary = input.secondaryType
    ? getIntelligence(deps.db, input.secondaryType)
    : undefined;

  const wovenExample = await weave({
    childName: input.childName,
    example: input.example,
    primaryTitle: primary.title,
    secondaryTitle: secondary?.title,
    apiKey: deps.deepseekApiKey,
  });

  const report: Report = {
    id: idGen(),
    childName: input.childName,
    shift: input.shift,
    primaryType: input.primaryType,
    secondaryType: input.secondaryType,
    example: input.example,
    wovenExample,
    photoPath: input.photoPath,
    createdAt: now().toISOString(),
  };
  insertReport(deps.db, report);

  const highlighted = [input.primaryType, input.secondaryType].filter(Boolean) as IntelligenceType[];
  const radarSvg = renderRadarSvg(highlighted);
  const html = renderReportHtml({
    report: { ...report, photoPath: photoToSrc(report.photoPath) },
    primary,
    secondary,
    radarSvg,
  });
  const pdf = await render(html);
  return { report, pdf };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/services/reportBuilder.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: report builder orchestration with injected deps"
```

---

## Task 10: Leader form (pages + routes + photo upload)

**Files:**
- Create: `src/web/formPage.ts`, `src/public/styles.css`, `src/routes/form.routes.ts`
- Modify: `src/server.ts` (register multipart, static, db decorate, form routes)
- Test: `tests/routes/form.routes.test.ts`

- [ ] **Step 1: Create `src/web/formPage.ts`**

```ts
import { esc } from "./html.js";

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "linguistic", label: "Лінгвістичний" },
  { value: "logical", label: "Логіко-математичний" },
  { value: "spatial", label: "Просторовий" },
  { value: "kinesthetic", label: "Тілесно-кінестетичний" },
  { value: "musical", label: "Музичний" },
  { value: "interpersonal", label: "Міжособистісний" },
  { value: "intrapersonal", label: "Внутрішньоособистісний" },
  { value: "naturalistic", label: "Натуралістичний" },
];

function options(includeEmpty: boolean): string {
  const empty = includeEmpty ? `<option value="">— немає —</option>` : "";
  return empty + TYPE_OPTIONS.map((o) => `<option value="${o.value}">${esc(o.label)}</option>`).join("");
}

export function formPage(secret: string, error?: string): string {
  return `<!doctype html><html lang="uk"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Звіт про дитину · WestCamp Kids</title>
<link rel="stylesheet" href="/static/styles.css"></head><body>
<main class="card">
  <h1>Звіт про дитину</h1>
  <p class="lead">Заповніть кілька полів — система згенерує гарний PDF.</p>
  ${error ? `<div class="error">${esc(error)}</div>` : ""}
  <form method="post" action="/f/${esc(secret)}" enctype="multipart/form-data">
    <label>ПІБ дитини<input name="childName" required maxlength="80"></label>
    <label>Номер зміни<input name="shift" required maxlength="40"></label>
    <label>Домінуючий тип 1<select name="primaryType" required>${options(false)}</select></label>
    <label>Домінуючий тип 2 (необов'язково)<select name="secondaryType">${options(true)}</select></label>
    <label>Живий приклад з табору
      <textarea name="example" required maxlength="800" rows="4"
        placeholder="Артем неймовірно проявив себе на 5-й день, коли взяв капітанство у квесті…"></textarea></label>
    <label>Фото дитини<input type="file" name="photo" accept="image/*" required></label>
    <button type="submit">Згенерувати PDF</button>
  </form>
</main></body></html>`;
}
```

- [ ] **Step 2: Create `src/public/styles.css`**

```css
:root{--green:#2F5D3A;--accent:#1FB6A6;--cream:#F7F4EC;--ink:#2B2B2B;--muted:#8A8A8A;}
*{box-sizing:border-box;}
body{margin:0;background:var(--cream);color:var(--ink);
  font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:16px;}
.card{max-width:560px;margin:0 auto;background:#fff;border-radius:16px;
  padding:24px;box-shadow:0 8px 30px rgba(0,0,0,.06);}
h1{color:var(--green);margin:0 0 4px;font-size:24px;}
.lead{color:var(--muted);margin:0 0 18px;}
form{display:flex;flex-direction:column;gap:14px;}
label{display:flex;flex-direction:column;gap:6px;font-weight:600;font-size:14px;}
input,select,textarea{font:inherit;padding:12px;border:1px solid #d8ddd6;
  border-radius:10px;background:#fff;width:100%;}
input:focus,select:focus,textarea:focus{outline:2px solid var(--accent);border-color:var(--accent);}
button{background:var(--accent);color:#fff;border:0;border-radius:12px;
  padding:14px;font-size:16px;font-weight:700;cursor:pointer;margin-top:6px;}
button:hover{filter:brightness(.96);}
.error{background:#fdecea;color:#b3261e;padding:12px;border-radius:10px;margin-bottom:14px;}
table{width:100%;border-collapse:collapse;}
th,td{text-align:left;padding:10px;border-bottom:1px solid #eee;font-size:14px;}
a.btn{display:inline-block;background:var(--green);color:#fff;text-decoration:none;
  padding:8px 14px;border-radius:8px;}
```

- [ ] **Step 3: Write the failing test** `tests/routes/form.routes.test.ts`

```ts
import { describe, it, expect, vi } from "vitest";
import { buildServer } from "../../src/server.js";

vi.mock("../../src/services/pdf.js", () => ({
  renderPdf: vi.fn(async () => Buffer.from("%PDF-1.4 fake")),
  closeBrowser: vi.fn(async () => {}),
}));
vi.mock("../../src/services/ai.js", () => ({
  weaveExample: vi.fn(async () => "Оживлений текст про дитину."),
}));

const cfg = {
  port: 0, formSecret: "S", adminSecret: "A", deepseekApiKey: "",
  dbPath: ":memory:", uploadDir: "./uploads-test",
};

describe("form routes", () => {
  it("serves the form on correct secret", async () => {
    const app = buildServer(cfg);
    const res = await app.inject({ method: "GET", url: "/f/S" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("Звіт про дитину");
    await app.close();
  });

  it("rejects wrong secret", async () => {
    const app = buildServer(cfg);
    const res = await app.inject({ method: "GET", url: "/f/wrong" });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it("generates a pdf on valid submit", async () => {
    const app = buildServer(cfg);
    const form = new FormData();
    form.set("childName", "Артем");
    form.set("shift", "3");
    form.set("primaryType", "kinesthetic");
    form.set("secondaryType", "");
    form.set("example", "Капітанство у квесті та перемога команди.");
    form.set("photo", new Blob([Buffer.from([0xff, 0xd8, 0xff])], { type: "image/jpeg" }), "a.jpg");
    const res = await app.inject({
      method: "POST", url: "/f/S",
      payload: form as unknown as undefined,
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
    expect(res.rawPayload.subarray(0, 4).toString("latin1")).toBe("%PDF");
    await app.close();
  });
});
```

> Note for the engineer: `app.inject` accepts a web `FormData` payload and sets the multipart boundary automatically in Fastify 4 with the light-my-request version bundled. If the bundled version does not, build the multipart body with the `form-data` npm package and pass `payload` + `headers: form.getHeaders()`.

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run tests/routes/form.routes.test.ts`
Expected: FAIL — `buildServer` does not accept config / routes missing.

- [ ] **Step 5: Create `src/routes/form.routes.ts`**

```ts
import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { mkdirSync, createWriteStream } from "node:fs";
import { join, extname } from "node:path";
import { pipeline } from "node:stream/promises";
import { pathToFileURL } from "node:url";
import { formPage } from "../web/formPage.js";
import { reportInputSchema } from "../domain/validation.js";
import { buildReport } from "../services/reportBuilder.js";

export async function formRoutes(app: FastifyInstance) {
  const cfg = app.appConfig;
  const db = app.db;

  app.get<{ Params: { secret: string } }>("/f/:secret", async (req, reply) => {
    if (req.params.secret !== cfg.formSecret) return reply.code(404).send("Not found");
    return reply.type("text/html").send(formPage(cfg.formSecret));
  });

  app.post<{ Params: { secret: string } }>("/f/:secret", async (req, reply) => {
    if (req.params.secret !== cfg.formSecret) return reply.code(404).send("Not found");

    const fields: Record<string, string> = {};
    let photoPath = "";
    mkdirSync(cfg.uploadDir, { recursive: true });

    const parts = req.parts();
    for await (const part of parts) {
      if (part.type === "file") {
        if (part.fieldname === "photo" && part.filename) {
          const name = `${randomUUID()}${extname(part.filename) || ".jpg"}`;
          photoPath = join(cfg.uploadDir, name);
          await pipeline(part.file, createWriteStream(photoPath));
        } else {
          part.file.resume();
        }
      } else {
        fields[part.fieldname] = String(part.value ?? "");
      }
    }

    const parsed = reportInputSchema.safeParse({
      childName: fields.childName,
      shift: fields.shift,
      primaryType: fields.primaryType,
      secondaryType: fields.secondaryType ? fields.secondaryType : undefined,
      example: fields.example,
      photoPath: photoPath || "missing",
    });

    if (!parsed.success || !photoPath) {
      const msg = !photoPath ? "Додайте фото дитини." : "Перевірте поля форми.";
      return reply.code(400).type("text/html").send(formPage(cfg.formSecret, msg));
    }

    const { report, pdf } = await buildReport(parsed.data, {
      db,
      deepseekApiKey: cfg.deepseekApiKey,
      photoToSrc: (p) => pathToFileURL(p).href,
    });

    const filename = `zvit-${report.childName}-zmina-${report.shift}.pdf`.replace(/\s+/g, "_");
    return reply
      .type("application/pdf")
      .header("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`)
      .send(pdf);
  });
}
```

- [ ] **Step 6: Update `src/server.ts`** to accept config, register plugins, decorate db, mount routes

```ts
import Fastify, { type FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { healthRoutes } from "./routes/health.js";
import { formRoutes } from "./routes/form.routes.js";
import { adminRoutes } from "./routes/admin.routes.js";
import { loadConfig, type Config } from "./config.js";
import { openDb, type DB } from "./db/index.js";

declare module "fastify" {
  interface FastifyInstance {
    appConfig: Config;
    db: DB;
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url));

export function buildServer(config: Config = loadConfig()): FastifyInstance {
  const app = Fastify({ logger: false });
  app.decorate("appConfig", config);
  app.decorate("db", openDb(config.dbPath));
  app.register(multipart, { limits: { fileSize: 12 * 1024 * 1024 } });
  app.register(fastifyStatic, { root: join(__dirname, "public"), prefix: "/static/" });
  app.register(healthRoutes);
  app.register(formRoutes);
  app.register(adminRoutes);
  return app;
}

if (process.argv[1]?.endsWith("server.js") || process.argv[1]?.endsWith("server.ts")) {
  const cfg = loadConfig();
  const app = buildServer(cfg);
  app.listen({ port: cfg.port, host: "0.0.0.0" }).then(() =>
    console.log(`listening on ${cfg.port}`)
  );
}
```

> Note: ensure `src/public/styles.css` is copied to `dist/public` on build. Add to `package.json` build script: `"build": "tsc -p tsconfig.json && node -e \"require('fs').cpSync('src/public','dist/public',{recursive:true})\""`.

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run tests/routes/form.routes.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: leader form, photo upload, and pdf download route"
```

---

## Task 11: Admin panel (list reports, manage shifts, edit descriptions)

**Files:**
- Create: `src/web/adminPages.ts`, `src/routes/admin.routes.ts`
- Test: `tests/routes/admin.routes.test.ts`

- [ ] **Step 1: Create `src/web/adminPages.ts`**

```ts
import { esc } from "./html.js";
import type { Report, IntelligenceContent } from "../domain/types.js";

function shell(secret: string, title: string, body: string): string {
  return `<!doctype html><html lang="uk"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · Адмін</title><link rel="stylesheet" href="/static/styles.css"></head>
<body><main class="card"><h1>${esc(title)}</h1>
<p><a href="/admin/${esc(secret)}">Звіти</a> · <a href="/admin/${esc(secret)}/content">Описи типів</a></p>
${body}</main></body></html>`;
}

export function adminListPage(secret: string, reports: Report[]): string {
  const rows = reports.map((r) =>
    `<tr><td>${esc(r.childName)}</td><td>${esc(r.shift)}</td>
     <td>${esc(r.primaryType)}${r.secondaryType ? " + " + esc(r.secondaryType) : ""}</td>
     <td>${esc(r.createdAt.slice(0, 16).replace("T", " "))}</td>
     <td><a class="btn" href="/admin/${esc(secret)}/report/${esc(r.id)}.pdf">PDF</a></td></tr>`
  ).join("");
  const body = `<table><thead><tr><th>Дитина</th><th>Зміна</th><th>Типи</th><th>Дата</th><th></th></tr></thead>
    <tbody>${rows || `<tr><td colspan="5">Поки немає звітів.</td></tr>`}</tbody></table>`;
  return shell(secret, "Звіти", body);
}

export function adminContentPage(secret: string, items: IntelligenceContent[]): string {
  const blocks = items.map((c) =>
    `<form method="post" action="/admin/${esc(secret)}/content/${esc(c.type)}" class="content-block">
      <h3>${esc(c.title)}</h3>
      <label>Назва<input name="title" value="${esc(c.title)}"></label>
      <label>Підпис<input name="tagline" value="${esc(c.tagline)}"></label>
      <label>Сильні сторони<textarea name="strengths" rows="3">${esc(c.strengths)}</textarea></label>
      <label>У таборі<textarea name="inCamp" rows="3">${esc(c.inCamp)}</textarea></label>
      <label>Поради батькам<textarea name="parentAdvice" rows="3">${esc(c.parentAdvice)}</textarea></label>
      <button type="submit">Зберегти</button>
    </form>`
  ).join("<hr>");
  return shell(secret, "Описи типів", blocks);
}
```

- [ ] **Step 2: Write the failing test** `tests/routes/admin.routes.test.ts`

```ts
import { describe, it, expect, vi } from "vitest";
import { buildServer } from "../../src/server.js";
import { insertReport } from "../../src/db/reports.repo.js";
import { getIntelligence } from "../../src/db/intelligences.repo.js";

vi.mock("../../src/services/pdf.js", () => ({
  renderPdf: vi.fn(async () => Buffer.from("%PDF-1.4 fake")),
  closeBrowser: vi.fn(async () => {}),
}));

const cfg = {
  port: 0, formSecret: "S", adminSecret: "A", deepseekApiKey: "",
  dbPath: ":memory:", uploadDir: "./uploads-test",
};

describe("admin routes", () => {
  it("rejects wrong secret", async () => {
    const app = buildServer(cfg);
    const res = await app.inject({ method: "GET", url: "/admin/wrong" });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it("lists reports", async () => {
    const app = buildServer(cfg);
    insertReport(app.db, {
      id: "r1", childName: "Артем", shift: "3", primaryType: "musical",
      secondaryType: undefined, example: "x", wovenExample: "y",
      photoPath: "/uploads/a.jpg", createdAt: "2026-06-08T10:00:00Z",
    });
    const res = await app.inject({ method: "GET", url: "/admin/A" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("Артем");
    await app.close();
  });

  it("updates a content description", async () => {
    const app = buildServer(cfg);
    const form = new URLSearchParams({
      title: "Музичний інтелект", tagline: "Оновлено",
      strengths: "Сильні сторони достатньо довгий текст для опису.",
      inCamp: "Прояв у таборі достатньо довгий текст для опису.",
      parentAdvice: "Поради батькам достатньо довгий текст для опису.",
    });
    const res = await app.inject({
      method: "POST", url: "/admin/A/content/musical",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: form.toString(),
    });
    expect(res.statusCode).toBe(302);
    expect(getIntelligence(app.db, "musical").tagline).toBe("Оновлено");
    await app.close();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/routes/admin.routes.test.ts`
Expected: FAIL — routes missing.

- [ ] **Step 4: Create `src/routes/admin.routes.ts`**

```ts
import type { FastifyInstance } from "fastify";
import formbody from "@fastify/formbody";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { adminListPage, adminContentPage } from "../web/adminPages.js";
import { listReports, getReport } from "../db/reports.repo.js";
import { listIntelligences, getIntelligence, updateIntelligence } from "../db/intelligences.repo.js";
import { renderRadarSvg } from "../services/radar.js";
import { renderReportHtml } from "../services/reportTemplate.js";
import { renderPdf } from "../services/pdf.js";
import { INTELLIGENCE_TYPES, type IntelligenceType } from "../domain/types.js";

export async function adminRoutes(app: FastifyInstance) {
  await app.register(formbody);
  const cfg = app.appConfig;
  const db = app.db;
  const guard = (s: string) => s === cfg.adminSecret;

  app.get<{ Params: { secret: string } }>("/admin/:secret", async (req, reply) => {
    if (!guard(req.params.secret)) return reply.code(404).send("Not found");
    return reply.type("text/html").send(adminListPage(cfg.adminSecret, listReports(db)));
  });

  app.get<{ Params: { secret: string } }>("/admin/:secret/content", async (req, reply) => {
    if (!guard(req.params.secret)) return reply.code(404).send("Not found");
    return reply.type("text/html").send(adminContentPage(cfg.adminSecret, listIntelligences(db)));
  });

  app.post<{ Params: { secret: string; type: string }; Body: Record<string, string> }>(
    "/admin/:secret/content/:type",
    async (req, reply) => {
      if (!guard(req.params.secret)) return reply.code(404).send("Not found");
      const type = req.params.type as IntelligenceType;
      if (!INTELLIGENCE_TYPES.includes(type)) return reply.code(404).send("Unknown type");
      const b = req.body;
      updateIntelligence(db, {
        type, title: b.title, tagline: b.tagline, strengths: b.strengths,
        inCamp: b.inCamp, parentAdvice: b.parentAdvice,
      });
      return reply.redirect(`/admin/${cfg.adminSecret}/content`);
    }
  );

  app.get<{ Params: { secret: string; id: string } }>(
    "/admin/:secret/report/:id.pdf",
    async (req, reply) => {
      if (!guard(req.params.secret)) return reply.code(404).send("Not found");
      const report = getReport(db, req.params.id);
      if (!report) return reply.code(404).send("Not found");
      const primary = getIntelligence(db, report.primaryType);
      const secondary = report.secondaryType ? getIntelligence(db, report.secondaryType) : undefined;
      const highlighted = [report.primaryType, report.secondaryType].filter(Boolean) as IntelligenceType[];
      let photoSrc = report.photoPath;
      try { await readFile(report.photoPath); photoSrc = pathToFileURL(report.photoPath).href; } catch { /* keep as-is */ }
      const html = renderReportHtml({
        report: { ...report, photoPath: photoSrc },
        primary, secondary, radarSvg: renderRadarSvg(highlighted),
      });
      const pdf = await renderPdf(html);
      return reply.type("application/pdf").send(pdf);
    }
  );
}
```

> Add `@fastify/formbody` to dependencies in `package.json` (`"@fastify/formbody": "^7.4.0"`) and run `npm i` before this task's tests.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/routes/admin.routes.test.ts`
Expected: PASS.

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: admin panel for reports, content editing, and pdf re-render"
```

---

## Task 12: Deployment (Docker + Railway + README)

**Files:**
- Create: `Dockerfile`, `.dockerignore`, `README.md`

- [ ] **Step 1: Create `Dockerfile`** (Playwright base image ships chromium + system deps)

```dockerfile
FROM mcr.microsoft.com/playwright:v1.47.0-jammy

WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

- [ ] **Step 2: Create `.dockerignore`**

```
node_modules
dist
data
uploads
.git
.env
```

- [ ] **Step 3: Create `README.md`**

````markdown
# WestCamp Kids — Gardner Report Constructor

Веб-застосунок для генерації персональних PDF-звітів про дітей за теорією Гарднера.

## Локальний запуск

```bash
npm i
npx playwright install chromium
cp .env.example .env   # заповніть FORM_SECRET, ADMIN_SECRET, DEEPSEEK_API_KEY
npm run dev
```

- Форма тім-лідера: `http://localhost:3000/f/<FORM_SECRET>`
- Адмінка: `http://localhost:3000/admin/<ADMIN_SECRET>`

## Тести

```bash
npm test
```

## Деплой на Railway

1. Створіть проєкт із цього репозиторію (Railway підхопить `Dockerfile`).
2. Variables: `FORM_SECRET`, `ADMIN_SECRET`, `DEEPSEEK_API_KEY`, `DB_PATH=/data/app.sqlite`, `UPLOAD_DIR=/data/uploads`.
3. Додайте Volume, змонтований у `/data`, щоб БД і фото зберігались між деплоями.
4. Деплой. Посилання форми та адмінки — як локально, але на домені Railway.

## Безпека

Доступ на старті — за секретними посиланнями. Не публікуйте їх. Для продакшену
рекомендується додати пароль на адмінку (закладено архітектурно).
````

- [ ] **Step 4: Verify production build works**

Run: `npm run build && node -e "require('fs').accessSync('dist/server.js')"`
Expected: no error (build output exists).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: docker, railway deploy config, and readme"
```

---

## Self-Review Notes (completed)

- **Spec coverage:** leader form (T10), admin + content editing + shift mgmt (T11 — shifts repo in T4; shift dropdown is free-text in form, admin shift management via repo, optional UI can be added later), 8 descriptions (T2), AI weave + fallback (T6), radar with highlight (T5), HTML→PDF (T7,T8), download-only delivery (T10), SQLite + Postgres-ready repo isolation (T4), Railway/Docker (T12), error handling (T6 fallback, T10 validation messages), tests at unit + integration levels (all tasks). All spec sections map to a task.
- **Placeholder scan:** no TBD/TODO; all steps contain concrete code or commands.
- **Type consistency:** `IntelligenceType`, `ReportInput`/`Report`, `ReportInputParsed`, repo function names (`getIntelligence`, `insertReport`, `getReport`, `listReports`, `updateIntelligence`), service names (`weaveExample`, `renderRadarSvg`, `renderReportHtml`, `renderPdf`, `buildReport`) are used identically across tasks.

**Known follow-ups (out of scope, intentionally deferred):** admin UI to add/list shifts (repo exists), password/login on admin, persistent report links + web view.
