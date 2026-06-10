# «Живий» звіт на 4 сторінки — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Зробити PDF звіт живішим і персональнішим: 4 сторінки, вступне звернення, хобі/професії для кожного типу, гібридні описи з підстановкою імені, AI-місток talentBridge, виправлення продубльованого parentAdvice.

**Architecture:** Нові поля `hobbies`/`professions` в `IntelligenceContent` проходять наскрізь: міграція SQLite (PRAGMA-перевірка + ALTER TABLE для існуючих БД) → repo → адмінка → шаблон. AI-виклик повертає JSON з двома текстами (`coverQuote` + `talentBridge`), `talentBridge` зберігається в reports. Шаблон перебудовується на 4 секції `.page`.

**Tech Stack:** TypeScript, Fastify, better-sqlite3, vitest, DeepSeek API, Playwright.

**Spec:** `docs/superpowers/specs/2026-06-10-living-report-design.md`

---

### Task 1: Поля hobbies/professions — типи, БД, адмінка

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/db/migrations.ts`
- Modify: `src/db/index.ts`
- Modify: `src/db/intelligences.repo.ts`
- Modify: `src/domain/intelligences.seed.ts` (лише додати 2 поля; переписування strengths — Task 2)
- Modify: `src/web/adminPages.ts`
- Modify: `src/public/react-app.js:271-278`
- Modify: `src/routes/admin.routes.ts:34-38`
- Test: `tests/db/intelligences.repo.test.ts`

- [ ] **Step 1: Написати failing-тести**

Додати в `tests/db/intelligences.repo.test.ts` усередину `describe("intelligences repo", ...)`:

```ts
  it("seeds hobbies and professions for every type", () => {
    const db = openDb(":memory:");
    for (const c of listIntelligences(db)) {
      expect(c.hobbies.length).toBeGreaterThan(10);
      expect(c.professions.length).toBeGreaterThan(10);
    }
  });
  it("updates hobbies and professions", () => {
    const db = openDb(":memory:");
    const c = getIntelligence(db, "musical");
    updateIntelligence(db, { ...c, hobbies: "Нове хобі", professions: "Нова професія" });
    expect(getIntelligence(db, "musical").hobbies).toBe("Нове хобі");
    expect(getIntelligence(db, "musical").professions).toBe("Нова професія");
  });
  it("backfills hobbies into an existing db created before the migration", () => {
    const db = openDb(":memory:");
    db.prepare(`UPDATE intelligences SET hobbies = '', professions = '' WHERE type = 'musical'`).run();
    reapplySeedDefaults(db);
    expect(getIntelligence(db, "musical").hobbies.length).toBeGreaterThan(10);
  });
```

Додати до імпортів тесту: `import { openDb, reapplySeedDefaults } from "../../src/db/index.js";` (замінити поточний імпорт `openDb`).

- [ ] **Step 2: Переконатися, що тести падають**

Run: `npx vitest run tests/db/intelligences.repo.test.ts`
Expected: FAIL — `hobbies` не існує / `reapplySeedDefaults` не експортовано.

- [ ] **Step 3: Реалізація**

3a. `src/domain/types.ts` — додати поля в `IntelligenceContent`:

```ts
export interface IntelligenceContent {
  type: IntelligenceType;
  title: string;        // Ukrainian display name
  tagline: string;      // one warm line
  strengths: string;    // paragraph; may contain {name} placeholder
  inCamp: string;       // how it shows in camp
  parentAdvice: string; // how to support at home
  hobbies: string;      // hobbies that grow this intelligence
  professions: string;  // future professions that fit
}
```

3b. `src/db/migrations.ts` — додати колонки в CREATE TABLE (для нових БД):

```ts
CREATE TABLE IF NOT EXISTS intelligences (
  type TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  tagline TEXT NOT NULL,
  strengths TEXT NOT NULL,
  in_camp TEXT NOT NULL,
  parent_advice TEXT NOT NULL,
  hobbies TEXT NOT NULL DEFAULT '',
  professions TEXT NOT NULL DEFAULT ''
);
```

3c. `src/db/index.ts` — ensureColumn для існуючих БД + backfill, повний новий вміст:

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
  ensureColumn(db, "intelligences", "hobbies", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "intelligences", "professions", "TEXT NOT NULL DEFAULT ''");
  seedIntelligences(db);
  reapplySeedDefaults(db);
  return db;
}

function ensureColumn(db: DB, table: string, column: string, ddl: string): void {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
  }
}

function seedIntelligences(db: DB) {
  const insert = db.prepare(
    `INSERT OR IGNORE INTO intelligences (type, title, tagline, strengths, in_camp, parent_advice, hobbies, professions)
     VALUES (@type, @title, @tagline, @strengths, @inCamp, @parentAdvice, @hobbies, @professions)`
  );
  const tx = db.transaction(() => {
    for (const i of SEED_INTELLIGENCES) insert.run(i);
  });
  tx();
}

/** Існуючі БД отримали нові колонки порожніми — заповнюємо їх із seed, не чіпаючи відредаговані тексти. */
export function reapplySeedDefaults(db: DB): void {
  const update = db.prepare(
    `UPDATE intelligences SET hobbies = @hobbies, professions = @professions
     WHERE type = @type AND hobbies = ''`
  );
  const tx = db.transaction(() => {
    for (const i of SEED_INTELLIGENCES) update.run(i);
  });
  tx();
}
```

3d. `src/db/intelligences.repo.ts` — повний новий вміст:

```ts
import type { DB } from "./index.js";
import type { IntelligenceContent, IntelligenceType } from "../domain/types.js";

interface Row {
  type: string; title: string; tagline: string;
  strengths: string; in_camp: string; parent_advice: string;
  hobbies: string; professions: string;
}
const toContent = (r: Row): IntelligenceContent => ({
  type: r.type as IntelligenceType,
  title: r.title, tagline: r.tagline, strengths: r.strengths,
  inCamp: r.in_camp, parentAdvice: r.parent_advice,
  hobbies: r.hobbies, professions: r.professions,
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
     in_camp=@inCamp, parent_advice=@parentAdvice, hobbies=@hobbies, professions=@professions
     WHERE type=@type`
  ).run(c);
}
```

3e. `src/domain/intelligences.seed.ts` — до КОЖНОГО з 8 записів додати два поля (повні тексти):

```ts
// linguistic:
    hobbies:
      "Ведення блогу чи щоденника, настільні ігри зі словами (Scrabble), театральний гурток, дебати, написання віршів чи фанфіків.",
    professions:
      "Журналіст, копірайтер, юрист, дипломат, сценарист, маркетолог, PR-спеціаліст, перекладач.",
// logical:
    hobbies:
      "Шахи, програмування, робототехніка, головоломки (кубик Рубіка, судоку), стратегічні настільні ігри, наукові експерименти.",
    professions:
      "IT-архітектор, дата-аналітик, науковець, фінансист, інженер, криптограф, аудитор, астроном.",
// spatial:
    hobbies:
      "Фотографія, малювання, ліпка, 3D-моделювання, орієнтування за мапою, LEGO без інструкції, дизайн у комп'ютерних іграх.",
    professions:
      "Архітектор, UX/UI-дизайнер, гейм-дизайнер, пілот, кінооператор, скульптор, мультиплікатор, логіст.",
// kinesthetic:
    hobbies:
      "Спорт, танці, акробатика, циркова студія, скелелазіння, рукоділля (дерево, глина, шиття), фокуси.",
    professions:
      "Спортсмен, хірург, хореограф, каскадер, актор, ювелір, майстер ручної роботи, рятувальник.",
// musical:
    hobbies:
      "Гра на інструментах, вокал, створення треків у програмах (DJ-інг), бітбокс, колекціонування музики, концерти.",
    professions:
      "Музикант, композитор, звукорежисер, саунд-дизайнер для кіно та ігор, продюсер, диригент, музичний терапевт.",
// interpersonal:
    hobbies:
      "Командні види спорту, волонтерство, організація свят, настільні рольові ігри (Мафія, D&D), участь у самоврядуванні.",
    professions:
      "Тімлід, HR-директор, дипломат, психолог, політик, бізнес-тренер, менеджер проєктів, педагог.",
// intrapersonal:
    hobbies:
      "Особистий щоденник, йога, медитація, письменництво, тривале малювання, самостійні проєкти, психологічна література.",
    professions:
      "Письменник, філософ, коуч, дослідник, стратегічний планувальник, психотерапевт, підприємець.",
// naturalistic:
    hobbies:
      "Догляд за тваринами, садівництво, піші походи, кемпінг, спостереження за птахами, мікроскоп і досліди.",
    professions:
      "Еколог, ветеринар, біолог, агроном, ландшафтний дизайнер, зоолог, мандрівник-дослідник, гід дикої природи.",
```

3f. `src/web/adminPages.ts` — в `adminContentPage`, після textarea `parentAdvice` додати:

```ts
      <label>Хобі, які розвивають<textarea name="hobbies" rows="2">${esc(c.hobbies)}</textarea></label>
      <label>Професії майбутнього<textarea name="professions" rows="2">${esc(c.professions)}</textarea></label>
```

3g. `src/public/react-app.js` — у формі редагування контенту (рядок ~276), після textarea parentAdvice додати:

```js
          h("label", null, "Хобі, які розвивають", h("textarea", { name: "hobbies", rows: 2, defaultValue: current.hobbies })),
          h("label", null, "Професії майбутнього", h("textarea", { name: "professions", rows: 2, defaultValue: current.professions })),
```

3h. `src/routes/admin.routes.ts` — у POST `/admin/:secret/content/:type` розширити updateIntelligence:

```ts
      updateIntelligence(db, {
        type, title: b.title, tagline: b.tagline, strengths: b.strengths,
        inCamp: b.inCamp, parentAdvice: b.parentAdvice,
        hobbies: b.hobbies ?? "", professions: b.professions ?? "",
      });
```

- [ ] **Step 4: Тести проходять**

Run: `npx vitest run tests/db/intelligences.repo.test.ts`
Expected: PASS.
Run: `npm test`
Expected: усі PASS (типи сумісні, бо нові поля додані в seed).

- [ ] **Step 5: Commit**

```bash
git add src/domain/types.ts src/db/migrations.ts src/db/index.ts src/db/intelligences.repo.ts src/domain/intelligences.seed.ts src/web/adminPages.ts src/public/react-app.js src/routes/admin.routes.ts tests/db/intelligences.repo.test.ts
git commit -m "feat: hobbies and professions fields for intelligence types"
```

---

### Task 2: Переписати seed-контент у гібридному тоні з {name}

**Files:**
- Modify: `src/domain/intelligences.seed.ts` (поля `strengths`, `parentAdvice`)
- Test: `tests/domain/intelligences.seed.test.ts`

- [ ] **Step 1: Написати failing-тести**

Додати в `tests/domain/intelligences.seed.test.ts`:

```ts
  it("every strengths text is personalized with {name} and stays gender-neutral", () => {
    for (const c of SEED_INTELLIGENCES) {
      expect(c.strengths).toContain("{name}");
      // заборонені гендерні форми минулого часу та прикметники
      expect(c.strengths).not.toMatch(/вдумлива|зібрав |проявив |обрала |обрав /);
    }
  });
  it("avoids heavy scientific jargon", () => {
    for (const c of SEED_INTELLIGENCES) {
      expect(c.strengths).not.toMatch(/Брока|Верніке|кортизол|Default Mode|нейробіолог/i);
    }
  });
```

(Переконатися, що файл імпортує `SEED_INTELLIGENCES`; якщо ні — додати.)

- [ ] **Step 2: Переконатися, що тести падають**

Run: `npx vitest run tests/domain/intelligences.seed.test.ts`
Expected: FAIL — поточні strengths не містять `{name}`.

- [ ] **Step 3: Замінити strengths і parentAdvice для всіх 8 типів**

Повні нові тексти (тагляйни, inCamp не чіпати):

```ts
// linguistic
    strengths:
      "{name} тонко відчуває слово: легко переказує, вигадує історії, влучно жартує і швидко вловлює нові поняття через мову. Психолінгвісти відзначають, що такі діти особливо чутливі до звучання, будови та відтінків слів — мова для них не лише спілкування, а спосіб думати й розуміти себе. {name} мислить історіями, відчуває метафори та гру слів, а з віком це виростає в уміння переконувати й вести дискусію.",
    parentAdvice:
      "Заохочуйте дитину висловлювати власну думку, обговорюйте разом прочитані книги та переглянуті фільми. Не обривайте, коли вона багато говорить — саме зараз формується її ораторський талант.",

// logical
    strengths:
      "{name} мислить структурно: шукає причини й наслідки, помічає закономірності та любить розкладати задачу на чіткі кроки. Психологи розвитку відзначають у таких дітей сильне операційне мислення — природну потребу класифікувати світ, виводити правила й перевіряти гіпотези. {name} отримує справжнє задоволення від розв'язаної головоломки: будь-яка проблема — це система, яку можна зрозуміти й покращити.",
    parentAdvice:
      "Давайте дитині простір для досліджень: замість готових відповідей пропонуйте подумати разом — «а як ти гадаєш, чому це відбулося?». Конструктори зі складними схемами та набори для дослідів стануть найкращим подарунком.",

// spatial
    strengths:
      "{name} сприймає світ через образи, форми та простір: подумки обертає об'єкти, легко орієнтується на місцевості й помічає деталі, які інші пропускають. Когнітивні психологи пов'язують це з цілісним образним сприйняттям — візуальна пам'ять такої дитини працює як точний сканер. Схеми, мапи та картинки для неї інформативніші за довгий текст, а власні ідеї природно просяться назовні в малюнку чи моделі.",
    parentAdvice:
      "Забезпечте дитину візуальними матеріалами: альбоми, фарби, графічний планшет. Разом розглядайте мапи в подорожах і дозволяйте самостійно обирати кольори для кімнати чи одягу — так вона самовиражається.",

// kinesthetic
    strengths:
      "{name} пізнає світ через рух і дотик: спритність, відчуття балансу й точність рухів — природна стихія такої дитини. Когнітивна наука підтверджує, що навчання через дію для таких дітей — найефективніший спосіб засвоїти нове: тіло й мислення працюють у тісній зв'язці. Щоб по-справжньому зрозуміти річ, {name} має відчути її вагу, форму й текстуру, а рух допомагає скидати напругу та адаптуватися до нового.",
    parentAdvice:
      "Не сваріть дитину за невгамовність — це її спосіб мислити. Подбайте про щоденну порцію руху та обирайте гуртки, де потрібні точність і дрібна моторика.",

// musical
    strengths:
      "{name} тонко чує світ: легко розрізняє ритм, тембр і мелодію, запам'ятовує пісні з першого разу й вловлює настрій музики. Дослідження показують, що обробка музики залучає майже весь мозок одночасно — тому зарифмоване чи покладене на мелодію запам'ятовується такій дитині значно легше. Музика для неї — не просто розвага, а власна мова: нею дитина налаштовує настрій, фокусує увагу та проживає емоції.",
    parentAdvice:
      "Оточіть дитину якісним звуковим середовищем. Навіть без музичної школи дозвольте експериментувати з інструментами — хоча б укулеле чи перкусією. Музика допомагає їй концентруватися під час навчання.",

// interpersonal
    strengths:
      "{name} чудово відчуває людей: миттєво зчитує настрій, жести та приховані мотиви, легко знаходить підхід до різних характерів. Психологи пов'язують це з високим емоційним інтелектом — здатністю до глибокої емпатії та розуміння групи. У колективі така дитина природно стає неформальним лідером чи миротворцем, а нові ідеї найкраще засвоює саме в команді, обговорюючи їх з іншими.",
    parentAdvice:
      "Підтримуйте прагнення дитини бути серед людей. Створюйте умови для командної роботи вдома — наприклад, доручіть координувати сімейне свято. Вчіть мистецтва емпатії та активного слухання.",

// intrapersonal
    strengths:
      "{name} добре розуміє себе: усвідомлює власні почуття, мотиви й цілі та вміє рухатися до них у своєму темпі. Психологи називають це метакогніцією — здатністю аналізувати власні думки та емоції, і саме вона стає фундаментом стійкості й упевненої самостійності. Така дитина має власну шкалу цінностей, потребує моментів тиші, щоб «скласти» досвід, і не чекає постійного схвалення ззовні.",
    parentAdvice:
      "Поважайте потребу дитини в особистому просторі та тиші — у ці моменти вона перезавантажується й осмислює світ. Допомагайте ставити довгострокові цілі та аналізувати кроки до них.",

// naturalistic
    strengths:
      "{name} має особливий зв'язок із природою: помічає найдрібніші зміни в живому довкіллі, любить спостерігати, класифікувати й доглядати. Дослідники відзначають, що взаємодія з природою дає таким дітям стан спокійної зосередженості та помітно знижує напругу. Природа для такої дитини — велика інтерактивна лабораторія, де виростають емпатія, спостережливість і відповідальність.",
    parentAdvice:
      "Частіше вибирайтеся за місто. Подаруйте енциклопедію про тварин, мікроскоп чи бінокль, довірте догляд за рослиною або улюбленцем — це виховує неймовірну відповідальність.",
```

- [ ] **Step 4: Тести проходять**

Run: `npx vitest run tests/domain/intelligences.seed.test.ts`
Expected: PASS.
Run: `npm test`
Expected: можливі падіння в `tests/services/reportTemplate.test.ts` (тест "excludes non-chosen type descriptions" перевіряє повний текст strengths — він зміниться, але логіка лишається коректною). Якщо падає щось інше — STOP і розібратися.

УВАГА: у старих БД (файлових) залишаться старі strengths без {name} — це ок, шаблон у Task 4 робить заміну `{name}` опційною (просто немає що замінювати).

- [ ] **Step 5: Commit**

```bash
git add src/domain/intelligences.seed.ts tests/domain/intelligences.seed.test.ts
git commit -m "feat: hybrid-tone personalized seed content with {name} placeholder"
```

---

### Task 3: AI повертає coverQuote + talentBridge; talentBridge зберігається

**Files:**
- Modify: `src/services/ai.ts`
- Modify: `src/domain/types.ts` (Report)
- Modify: `src/db/migrations.ts`, `src/db/index.ts`, `src/db/reports.repo.ts`
- Modify: `src/services/reportBuilder.ts`
- Modify: `scripts/preview-pdf.ts`
- Test: `tests/services/ai.test.ts`, `tests/services/reportBuilder.test.ts`, `tests/db/reports.repo.test.ts`, `tests/services/reportTemplate.test.ts` (фікстура)

- [ ] **Step 1: Написати failing-тести**

`tests/services/ai.test.ts` — замінити імпорт і describe-блок на:

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { buildWeavePrompt, weaveReport } from "../../src/services/ai.js";

const args = {
  childName: "Артем",
  example: "Взяв капітанство у квесті та привів команду до перемоги.",
  primaryType: "kinesthetic" as const,
  primaryTitle: "Тілесно-кінестетичний інтелект",
  secondaryType: "interpersonal" as const,
  secondaryTitle: "Міжособистісний інтелект",
};

afterEach(() => vi.restoreAllMocks());

describe("weaveReport", () => {
  it("falls back when no api key", async () => {
    const out = await weaveReport({ ...args, apiKey: "" });
    expect(out.coverQuote).toContain("Артем");
    expect(out.coverQuote).toContain("капітанство");
    expect(out.talentBridge).toContain("Артем");
    expect(out.talentBridge).toContain("капітанство");
  });

  it("builds a prompt asking for JSON with two fields", () => {
    const prompt = buildWeavePrompt({ ...args, apiKey: "key" });
    expect(prompt).toContain("База знань для інтерпретації");
    expect(prompt).toContain("coverQuote");
    expect(prompt).toContain("talentBridge");
    expect(prompt).toContain("без сюсюкання");
  });

  it("returns both AI texts when api responds with json", async () => {
    const content = JSON.stringify({ coverQuote: "Цитата про Артема.", talentBridge: "Місток про Артема." });
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 })
    ));
    const out = await weaveReport({ ...args, apiKey: "key" });
    expect(out.coverQuote).toBe("Цитата про Артема.");
    expect(out.talentBridge).toBe("Місток про Артема.");
  });

  it("falls back when api returns malformed json", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: "просто текст" } }] }), { status: 200 })
    ));
    const out = await weaveReport({ ...args, apiKey: "key" });
    expect(out.coverQuote).toContain("капітанство");
  });

  it("falls back on http error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("err", { status: 500 })));
    const out = await weaveReport({ ...args, apiKey: "key" });
    expect(out.coverQuote).toContain("капітанство");
  });

  it("falls back on network throw", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const out = await weaveReport({ ...args, apiKey: "key" });
    expect(out.talentBridge).toContain("Артем");
  });
});
```

`tests/db/reports.repo.test.ts` — у фікстуру `sample` додати поле:

```ts
  wovenExample: "Оживлений текст.", talentBridge: "Місток.",
```

і новий тест:

```ts
  it("persists talentBridge", () => {
    const db = openDb(":memory:");
    insertReport(db, sample);
    expect(getReport(db, "abc123")?.talentBridge).toBe("Місток.");
  });
```

`tests/services/reportBuilder.test.ts` — стаб weave повертає об'єкт:

```ts
    const weave = vi.fn(async () => ({
      coverQuote: "Оживлений текст про Артема.",
      talentBridge: "Місток про Артема.",
    }));
```

і додати перевірки:

```ts
    expect(result.report.talentBridge).toBe("Місток про Артема.");
    expect(getReport(db, "id123")?.talentBridge).toBe("Місток про Артема.");
```

- [ ] **Step 2: Переконатися, що тести падають**

Run: `npx vitest run tests/services/ai.test.ts tests/db/reports.repo.test.ts tests/services/reportBuilder.test.ts`
Expected: FAIL (weaveReport не існує, talentBridge не існує).

- [ ] **Step 3: Реалізація**

3a. `src/domain/types.ts` — у `Report` додати:

```ts
export interface Report extends ReportInput {
  id: string;
  wovenExample: string;  // AI (or fallback) cover quote
  talentBridge: string;  // AI (or fallback) bridge for the primary talent page
  createdAt: string;     // ISO
}
```

3b. `src/db/migrations.ts` — у CREATE TABLE reports додати колонку (після woven_example):

```ts
  woven_example TEXT NOT NULL,
  talent_bridge TEXT NOT NULL DEFAULT '',
```

3c. `src/db/index.ts` — у `openDb` після існуючих ensureColumn додати:

```ts
  ensureColumn(db, "reports", "talent_bridge", "TEXT NOT NULL DEFAULT ''");
```

3d. `src/db/reports.repo.ts` — повний новий вміст:

```ts
import type { DB } from "./index.js";
import type { Report } from "../domain/types.js";

interface Row {
  id: string; child_name: string; shift: string; primary_type: string;
  secondary_type: string | null; example: string; woven_example: string;
  talent_bridge: string; photo_path: string; created_at: string;
}
const toReport = (r: Row): Report => ({
  id: r.id, childName: r.child_name, shift: r.shift,
  primaryType: r.primary_type as Report["primaryType"],
  secondaryType: (r.secondary_type ?? undefined) as Report["secondaryType"],
  example: r.example, wovenExample: r.woven_example,
  talentBridge: r.talent_bridge,
  photoPath: r.photo_path, createdAt: r.created_at,
});

export function insertReport(db: DB, r: Report): void {
  db.prepare(
    `INSERT INTO reports (id, child_name, shift, primary_type, secondary_type,
      example, woven_example, talent_bridge, photo_path, created_at)
     VALUES (@id, @childName, @shift, @primaryType, @secondaryType,
      @example, @wovenExample, @talentBridge, @photoPath, @createdAt)`
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

3e. `src/services/ai.ts` — повний новий вміст:

```ts
import { knowledgeSummary } from "../domain/intelligenceKnowledge.js";
import type { IntelligenceType } from "../domain/types.js";

export interface WeaveArgs {
  childName: string;
  example: string;
  primaryType: IntelligenceType;
  primaryTitle: string;
  secondaryType?: IntelligenceType;
  secondaryTitle?: string;
  apiKey: string;
}

export interface WeaveResult {
  coverQuote: string;   // тепла цитата на обкладинку
  talentBridge: string; // місток "чому ми побачили це саме в дитини" на сторінку таланту
}

const ENDPOINT = "https://api.deepseek.com/chat/completions";

function fallback(a: WeaveArgs): WeaveResult {
  const types = a.secondaryTitle ? `${a.primaryTitle} та ${a.secondaryTitle}` : a.primaryTitle;
  const primaryEssence = knowledgeSummary(a.primaryType).split("\n")[0].replace("Суть: ", "");
  return {
    coverQuote: `Цього сезону ${a.childName} яскраво проявив(-ла) ${types}. Для нас це не сухий тест, а жива історія про те, як дитина обирає, пробує, взаємодіє і поступово розкривається в команді. ${primaryEssence} Саме тому нам запам'ятався момент: «${a.example.trim()}». У ньому добре видно сильну сторону ${a.childName}: не ідеальну картинку, а справжній прояв характеру, цікавості й власного способу мислити.`,
    talentBridge: `«${a.example.trim()}» — саме в таких моментах ${a.childName} розкривається найяскравіше. Для нашої команди це живе підтвердження таланту, про який ідеться в цьому розділі.`,
  };
}

function buildKnowledgeBlock(a: WeaveArgs): string {
  return [
    `Основний тип (${a.primaryTitle}):\n${knowledgeSummary(a.primaryType)}`,
    a.secondaryType && a.secondaryTitle
      ? `Другий тип (${a.secondaryTitle}):\n${knowledgeSummary(a.secondaryType)}`
      : "",
  ].filter(Boolean).join("\n\n");
}

export function buildWeavePrompt(a: WeaveArgs): string {
  const types = a.secondaryTitle ? `${a.primaryTitle} і ${a.secondaryTitle}` : a.primaryTitle;
  return (
    `Ти пишеш теплі, щирі фрагменти дитячого звіту для батьків українською. ` +
    `Дитина: ${a.childName}. Сильні сторони: ${types}. ` +
    `Дані від тім-ліда: "${a.example.trim()}". ` +
    `База знань для інтерпретації:\n${buildKnowledgeBlock(a)}\n\n` +
    `Методика табору: не дорослий тест, а м'яка аналітика з кількох джерел - ігровий стартовий вибір, майстер-класи, спостереження дня 3/6/9, вечірні рефлексії та фінальний добровільний вибір ролі. ` +
    `Врахуй ризики: дитина могла піти "за компанію", обрати харизматичного ментора або закритися після першої невдачі. Не роби категоричних діагнозів; пиши як уважне спостереження. ` +
    `Стиль: живо, людяно, з мовою дитячого табору 8-12 років, але без сюсюкання. Не використовуй канцелярит, медичні діагнози, нейробіологічний пафос і фрази на кшталт "володіє феноменальним рівнем". ` +
    `Поверни СУВОРО валідний JSON без markdown-обгорток, з двома полями:\n` +
    `{"coverQuote": "...", "talentBridge": "..."}\n` +
    `coverQuote: 1-2 короткі абзаци (до 105 слів) для обкладинки - маленька сцена з прикладу тім-ліда, яку сильну сторону вона відкриває, один теплий натяк батькам. Звертайся до дитини на ім'я. ` +
    `talentBridge: 2-3 речення (до 45 слів) для сторінки головного таланту - чому саме цей приклад показав нам головний талант дитини. Без повторення coverQuote дослівно.`
  );
}

export async function weaveReport(a: WeaveArgs): Promise<WeaveResult> {
  if (!a.apiKey) return fallback(a);

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${a.apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        temperature: 0.85,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: buildWeavePrompt(a) }],
      }),
    });
    if (!res.ok) return fallback(a);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return fallback(a);
    const parsed = JSON.parse(text) as Partial<WeaveResult>;
    if (typeof parsed.coverQuote !== "string" || typeof parsed.talentBridge !== "string") return fallback(a);
    if (!parsed.coverQuote.trim() || !parsed.talentBridge.trim()) return fallback(a);
    return { coverQuote: parsed.coverQuote.trim(), talentBridge: parsed.talentBridge.trim() };
  } catch {
    return fallback(a);
  }
}
```

(Функцію `weaveExample` видалити — єдиний споживач `reportBuilder` переходить на `weaveReport`. JSON.parse кинеться на «просто текст» → catch → fallback.)

3f. `src/services/reportBuilder.ts` — оновити:

```ts
import { weaveReport, type WeaveArgs, type WeaveResult } from "./ai.js";
```

```ts
export interface BuildDeps {
  db: DB;
  deepseekApiKey: string;
  weave?: (a: WeaveArgs) => Promise<WeaveResult>;
  render?: (html: string) => Promise<Buffer>;
  idGen?: () => string;
  now?: () => Date;
  photoToSrc?: (photoPath: string) => string | Promise<string>;
}
```

```ts
  const weave = deps.weave ?? weaveReport;
```

```ts
  const woven = await weave({
    childName: input.childName,
    example: input.example,
    primaryType: input.primaryType,
    primaryTitle: primary.title,
    secondaryType: input.secondaryType,
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
    wovenExample: woven.coverQuote,
    talentBridge: woven.talentBridge,
    photoPath: input.photoPath,
    createdAt: now().toISOString(),
  };
```

3g. `scripts/preview-pdf.ts` — у конструюванні `report` (функція `main`) додати:

```ts
    wovenExample: options.example,
    talentBridge: `«${options.example.trim()}» — саме в таких моментах дитина розкривається найяскравіше.`,
```

3h. `tests/services/reportTemplate.test.ts` — у фікстуру `report` додати:

```ts
  talentBridge: "Місток про Артема.",
```

- [ ] **Step 4: Тести проходять**

Run: `npm test`
Expected: усі PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/ai.ts src/domain/types.ts src/db/migrations.ts src/db/index.ts src/db/reports.repo.ts src/services/reportBuilder.ts scripts/preview-pdf.ts tests/services/ai.test.ts tests/db/reports.repo.test.ts tests/services/reportBuilder.test.ts tests/services/reportTemplate.test.ts
git commit -m "feat: AI weave returns cover quote + talent bridge, persisted on report"
```

---

### Task 4: Шаблон — 4 сторінки

**Files:**
- Modify: `src/services/reportTemplate.ts`
- Test: `tests/services/reportTemplate.test.ts`

- [ ] **Step 1: Написати failing-тести**

Спершу ОНОВИТИ існуючий тест "renders the talent strip on every page": замінити `expect(count).toBe(3);` на `expect(count).toBe(4);` (сторінок стає 4).

Потім додати в кінець describe:

```ts
  it("renders four pages with the talent strip on each", () => {
    expect(html.split('<section class="page').length - 1).toBe(4);
    expect(html.split('class="talent-strip"').length - 1).toBe(4);
  });
  it("shows the intro letter on the cover", () => {
    expect(html).toContain("Шановні батьки");
    expect(html).toContain("Гарднера");
  });
  it("substitutes the child name into descriptions", () => {
    expect(html).not.toContain("{name}");
    expect(html).toContain("Артем пізнає світ через рух");
  });
  it("renders the talent bridge on the primary talent page", () => {
    expect(html).toContain("Місток про Артема.");
  });
  it("shows hobbies and professions for both talents", () => {
    expect(html).toContain("Хобі, які розвивають");
    expect(html).toContain("Професії майбутнього");
    expect(html).toContain(byType("kinesthetic").hobbies);
    expect(html).toContain(byType("interpersonal").professions);
  });
  it("does not duplicate parent advice", () => {
    const advice = byType("kinesthetic").parentAdvice;
    expect(html.split(advice).length - 1).toBe(1);
  });
```

- [ ] **Step 2: Переконатися, що тести падають**

Run: `npx vitest run tests/services/reportTemplate.test.ts`
Expected: нові FAIL, старі PASS.

- [ ] **Step 3: Реалізація в `src/services/reportTemplate.ts`**

3a. Хелпер підстановки імені (після `shortText`):

```ts
function withName(text: string, name: string): string {
  return esc(text).split("{name}").join(esc(name));
}
```

3b. Константа вступного звернення (після `LOGO_SRC`):

```ts
const INTRO_TEXT =
  "Шановні батьки, вас вітає команда WestCamp Kids! Протягом зміни ми приділяємо багато уваги розвитку й дослідженню особистості кожної дитини — це допомагає розкривати її приховані таланти, мрії та можливості. Цієї зміни ми провели кілька активностей, у яких визначали тип інтелекту за методикою Говарда Гарднера: вона підказує, який спосіб сприйняття інформації пасує дитині найбільше. Результати засновані на особистих спостереженнях та аналізі нашої команди.";
```

3c. `optionalType` — додати нові поля у фолбек:

```ts
    hobbies: "",
    professions: "",
```

3d. Переписати `typeCard` на дві окремі функції (стара видаляється):

```ts
function primaryCard(c: IntelligenceContent, childName: string, bridge: string): string {
  return `<article class="talent-card">
    <div class="talent-number">01</div>
    <div>
      <h3>${esc(c.title)}</h3>
      <p class="tagline">${esc(c.tagline)}</p>
      <p>${withName(c.strengths, childName)}</p>
      <div class="bridge"><strong>Чому ми це побачили</strong><p>${esc(bridge)}</p></div>
      <div class="mini-grid">
        <div><strong>Як проявлялось у таборі</strong><span>${esc(c.inCamp)}</span></div>
        <div><strong>Зона росту</strong><span>Переносити сильну сторону у команду, навчання та щоденні рішення.</span></div>
      </div>
    </div>
  </article>`;
}

function secondaryCard(c: IntelligenceContent, childName: string): string {
  return `<article class="talent-card secondary-talent">
    <div class="talent-number">02</div>
    <div>
      <h3>${esc(c.title)}</h3>
      <p class="tagline">${esc(c.tagline)}</p>
      <p>${withName(c.strengths, childName)}</p>
      <div class="mini-grid">
        <div><strong>Як проявлялось у таборі</strong><span>${esc(c.inCamp)}</span></div>
      </div>
    </div>
  </article>`;
}

function futureBlock(title: string, primary: IntelligenceContent, secondary: IntelligenceContent, field: "hobbies" | "professions"): string {
  const rows = [primary, secondary]
    .filter((c) => c[field])
    .map((c) => `<div class="future-row"><strong>${esc(c.title)}</strong><span>${esc(c[field])}</span></div>`)
    .join("");
  return `<article class="parent-card future-list"><h3>${esc(title)}</h3>${rows}</article>`;
}
```

3e. `adviceCard` викликати ОДИН раз (дубль зникає) і збільшити ліміт обрізання, бо нові поради довші: у тілі `adviceCard` замінити обидва `shortText(..., 195)` на `shortText(..., 260)` (інакше logical-порада на ~215 символів обріжеться).

3f. Структура сторінок у `renderReportHtml` (замінити поточні 3 секції на 4):

```html
<section class="page cover-page">
  ${strip}
  <header class="header">
    <div class="logo"><img class="logo-img" src="${LOGO_SRC}" alt="WestCamp Kids"></div>
    <div class="meta"><strong>${esc(shiftName)}</strong><br>${esc(date)}</div>
  </header>
  <div class="hero">
    <div class="photo-frame"><img src="${esc(r.photoPath)}" alt=""></div>
    <div>
      <p class="kicker">Карта талантів та емоційного інтелекту</p>
      <h1>${esc(r.childName)}</h1>
      <div class="quote">
        <div class="quote-mark">“</div>
        <p>${esc(r.wovenExample)}</p>
        <p class="signature">З любов'ю, ваш тім-лід та WestCamp family</p>
      </div>
    </div>
  </div>
  <div class="intro-card"><p>${esc(INTRO_TEXT)}</p></div>
  <div class="footer-label">Adventure · Education · Safety</div>
</section>

<section class="page analytics-page">
  ${strip}
  <header class="header">
    <div class="logo"><img class="logo-img" src="${LOGO_SRC}" alt="WestCamp Kids"></div>
    <div class="meta">${esc(shiftName)}</div>
  </header>
  <h2>Множинний інтелект за методикою Говарда Гарднера</h2>
  <div class="chart-layout">
    <div class="chart-box">${a.radarSvg}</div>
    <div class="talents">
      ${primaryCard(a.primary, r.childName, r.talentBridge)}
    </div>
  </div>
</section>

<section class="page">
  ${strip}
  <header class="header">
    <div class="logo"><img class="logo-img" src="${LOGO_SRC}" alt="WestCamp Kids"></div>
    <div class="meta">${esc(shiftName)}</div>
  </header>
  <h2>Другий талант і погляд у майбутнє</h2>
  <div class="talents">
    ${secondaryCard(secondary, r.childName)}
  </div>
  <div class="parents-grid">
    ${futureBlock("Хобі, які розвивають", a.primary, secondary, "hobbies")}
    ${futureBlock("Професії майбутнього", a.primary, secondary, "professions")}
  </div>
</section>

<section class="page">
  ${strip}
  <header class="header">
    <div class="logo"><img class="logo-img" src="${LOGO_SRC}" alt="WestCamp Kids"></div>
    <div class="meta">Для батьків</div>
  </header>
  <h2>Як взаємодіяти вдома</h2>
  <p>Ці підказки допоможуть підтримати природні сильні сторони дитини після табору і м'яко перевести їх у щоденні звички.</p>
  <div class="parents-grid">
    ${adviceCard("Прикладні поради", a.primary, secondary)}
  </div>
  <div class="future-card">
    <div>
      <h3>Наступна сходинка розвитку</h3>
      <p>Прокачка лідерських навичок на нашій майбутній зміні. Чекаємо вас знову!</p>
    </div>
    <div class="contact-card">
      <img class="contact-logo" src="${LOGO_SRC}" alt="WestCamp Kids">
      <strong>+38 (093) 092-88-80</strong>
      <strong>kids.westcamp.in.ua</strong>
    </div>
  </div>
</section>
```

Зміни щодо поточного коду: видалити параграф «Індивідуальний звіт для батьків…» з обкладинки (його роль виконує INTRO_TEXT), `typeCard` більше не існує, `adviceCard` викликається один раз, `shortText`-обрізання для strengths більше не застосовується (місця тепер досить; функцію `shortText` лишити — її використовує `adviceCard`).

3g. CSS — додати/змінити:

```css
  .cover-page .hero {
    grid-template-columns: 82mm 1fr;
    gap: 9mm;
    min-height: 150mm;
  }
  .intro-card {
    margin-top: 7mm;
    background: ${C.panel};
    border: .55mm solid ${C.line};
    border-radius: 7mm;
    padding: 5.5mm 6mm;
  }
  .intro-card p {
    margin: 0;
    font-size: 10.8pt;
    line-height: 1.42;
    color: ${C.ink};
  }
  .bridge {
    margin-top: 3mm;
    border-left: 2mm solid ${C.orange};
    border-radius: 2mm;
    background: rgba(255, 209, 102, .18);
    padding: 3mm 4mm;
  }
  .bridge strong {
    display: block;
    color: ${C.navy};
    font-size: 10.2pt;
    margin-bottom: 1mm;
  }
  .bridge p {
    margin: 0;
    font-size: 10.6pt;
    line-height: 1.3;
    color: ${C.ink};
  }
  .future-list { min-height: auto; max-height: none; }
  .future-row {
    border-top: .3mm solid ${C.line};
    padding-top: 2.6mm;
    margin-top: 2.6mm;
  }
  .future-row strong {
    display: block;
    color: ${C.navy};
    font-size: 10.2pt;
    margin-bottom: 1mm;
  }
  .future-row span {
    color: ${C.muted};
    font-size: 10.4pt;
    line-height: 1.3;
  }
  .talent-card { min-height: auto; }
  .talent-card p { font-size: 11pt; line-height: 1.3; }
```

(Правило `.cover-page .quote { margin-top: 7mm; ... }` лишити; видалити старі обмеження `.talent-card { min-height: 63mm; }` — картки тепер різної висоти.)

- [ ] **Step 4: Тести проходять**

Run: `npx vitest run tests/services/reportTemplate.test.ts`
Expected: PASS. Якщо падає "excludes non-chosen type descriptions" — перевірити, що тест порівнює с `byType("musical").strengths` (повний текст з {name} не зустрічається в html, бо musical не обраний) — має проходити.
Run: `npm test`
Expected: усі PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/reportTemplate.ts tests/services/reportTemplate.test.ts
git commit -m "feat: 4-page report with intro letter, talent bridge, hobbies and professions"
```

---

### Task 5: Візуальна перевірка

**Files:**
- Modify: `tmp/screenshot-report.ts` (додати talentBridge у фікстуру Report)

- [ ] **Step 1: Оновити скрипт скріншотів**

У `tmp/screenshot-report.ts` в об'єкт `report` додати:

```ts
    talentBridge: "«Капітанство у квесті» — саме в таких моментах Артем розкривається найяскравіше.",
```

- [ ] **Step 2: Згенерувати скріншоти**

Run: `npx tsx tmp/screenshot-report.ts`
Expected: `4 screenshots written for strip-duo`, `4 screenshots written for strip-solo`.

- [ ] **Step 3: Переглянути всі 8 PNG (Read tool або очима)**

Чекліст:
- 4 сторінки, смужка талантів на кожній
- Обкладинка: фото + ім'я + цитата + вступне звернення, нічого не вилазить
- Стор. 2: радар + повна картка головного таланту з містком, вміщається
- Стор. 3: другий талант + хобі/професії обох типів; у solo-варіанті — блоки лише головного
- Стор. 4: одна картка порад (без дубля) + контактна картка
- Імена підставлені, «{name}» ніде не видно

- [ ] **Step 4: Якщо щось не вміщається — підкрутити CSS (font-size/line-height/відступи), перегенерувати, закомітити**

```bash
git add src/services/reportTemplate.ts
git commit -m "style: tune 4-page layout spacing"
```

- [ ] **Step 5: Згенерувати фінальний preview PDF**

Run: `npx tsx scripts/preview-pdf.ts tmp/report-living.pdf --primary musical --secondary intrapersonal`
Expected: `PDF preview written to ...` — відкрити і подивитись очима.
