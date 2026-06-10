# Смужка «олівці талантів» — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Замінити градієнтну смугу верху сторінок PDF на персоналізовану смужку з 8 сегментів-«олівців» (по одному на кожен інтелект Гарднера), довжина яких залежить від талантів дитини.

**Architecture:** Уся зміна — в одному файлі `src/services/reportTemplate.ts`. CSS-псевдоелементи `.page::before`/`.page::after` (градієнт + тінь) видаляються; замість них нова функція `talentStrip()` генерує реальний HTML-елемент на початку кожної з 3 сторінок, бо вміст залежить від даних звіту.

**Tech Stack:** TypeScript, vitest, Playwright (рендер PDF через `npm run pdf:preview`).

**Spec:** `docs/superpowers/specs/2026-06-10-talent-strip-design.md`

**Відкат на старий дизайн:** `git checkout 864e9ee -- src/services/reportTemplate.ts`

---

### Task 1: Функція talentStrip + вставка на сторінки (TDD)

**Files:**
- Modify: `src/services/reportTemplate.ts`
- Test: `tests/services/reportTemplate.test.ts`

- [ ] **Step 1: Написати failing-тести**

Додати в кінець `describe("renderReportHtml", ...)` у `tests/services/reportTemplate.test.ts` (фікстура `report` має `primaryType: "kinesthetic"`, `secondaryType: "interpersonal"`):

```ts
  it("renders the talent strip on every page", () => {
    const count = html.split('class="talent-strip"').length - 1;
    expect(count).toBe(3);
  });
  it("sizes segments by talent: primary 3x, secondary 2x, rest 1x", () => {
    expect(html).toContain('data-type="kinesthetic" style="flex:3');
    expect(html).toContain('data-type="interpersonal" style="flex:2');
    expect(html).toContain('data-type="musical" style="flex:1');
    expect(html).toContain('data-type="naturalistic" style="flex:1');
  });
  it("renders one long segment when secondary type is missing", () => {
    const solo = renderReportHtml({
      report: { ...report, secondaryType: undefined },
      primary: byType("kinesthetic"),
      radarSvg: "<svg></svg>",
    });
    expect(solo).toContain('data-type="kinesthetic" style="flex:3');
    expect(solo).toContain('data-type="interpersonal" style="flex:1');
  });
  it("drops the old gradient stripe pseudo-elements", () => {
    expect(html).not.toContain(".page::before");
    expect(html).not.toContain(".page::after");
  });
```

- [ ] **Step 2: Переконатися, що тести падають**

Run: `npx vitest run tests/services/reportTemplate.test.ts`
Expected: 4 нові тести FAIL (немає `talent-strip` у HTML), старі PASS.

- [ ] **Step 3: Реалізація в `src/services/reportTemplate.ts`**

3a. Розширити імпорт типів (рядок 3) — додати `INTELLIGENCE_TYPES` (value) та `IntelligenceType`:

```ts
import { INTELLIGENCE_TYPES, type IntelligenceType } from "../domain/types.js";
import type { IntelligenceContent, Report } from "../domain/types.js";
```

3b. Після оголошення палітри `C` додати мапу кольорів і функцію (кольори підібрані так, щоб сусідні сегменти не повторювались):

```ts
const STRIP_COLORS: Record<IntelligenceType, string> = {
  linguistic: C.navy,
  logical: C.orange,
  spatial: C.yellow,
  kinesthetic: C.green,
  musical: C.sky,
  interpersonal: C.orange,
  intrapersonal: C.navy,
  naturalistic: C.green,
};

function talentStrip(primary: IntelligenceType, secondary?: IntelligenceType): string {
  const segments = INTELLIGENCE_TYPES.map((type) => {
    const flex = type === primary ? 3 : type === secondary ? 2 : 1;
    return `<span data-type="${type}" style="flex:${flex};background:${STRIP_COLORS[type]}"></span>`;
  }).join("");
  return `<div class="talent-strip">${segments}</div>`;
}
```

3c. Видалити з CSS блоки `.page::before { ... }` та `.page::after { ... }` (зараз рядки 102–130), а також правило `.page > * { position: relative; z-index: 1; }` — воно існувало лише щоб контент був над псевдоелементами. З фону `.page` (background) перший шар `linear-gradient(135deg, rgba(255, 209, 102, .22) 0 8mm, transparent 8mm 18mm)` залишити як є — це кутовий акцент, не верхня смуга.

3d. Додати CSS для смужки (поряд із `.header`):

```css
  .talent-strip {
    display: flex;
    gap: 2mm;
    height: 2.5mm;
    margin-bottom: 4mm;
  }
  .talent-strip span {
    border-radius: 999px;
  }
```

3e. У `renderReportHtml` після `const date = formatDate(r.createdAt);` додати:

```ts
  const strip = talentStrip(r.primaryType, r.secondaryType);
```

3f. Вставити `${strip}` першим дочірнім елементом у кожну з 3 секцій, перед `<header class="header">`:

```html
<section class="page cover-page">
  ${strip}
  <header class="header">
```

```html
<section class="page analytics-page">
  ${strip}
  <header class="header">
```

```html
<section class="page">
  ${strip}
  <header class="header">
```

- [ ] **Step 4: Переконатися, що всі тести проходять**

Run: `npx vitest run tests/services/reportTemplate.test.ts`
Expected: усі PASS.

Run: `npm test`
Expected: усі тести проекту PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/reportTemplate.ts tests/services/reportTemplate.test.ts
git commit -m "feat: personalized talent-strip page header instead of gradient stripe"
```

---

### Task 2: Візуальна перевірка PDF

**Files:**
- Create: `tmp/report-talent-strip.pdf`, `tmp/report-talent-strip-solo.pdf` (не комітяться)

- [ ] **Step 1: Згенерувати preview з двома талантами**

Run: `npm run pdf:preview -- tmp/report-talent-strip.pdf --primary musical --secondary intrapersonal`
Expected: `PDF preview written to ...`

- [ ] **Step 2: Згенерувати preview лише з головним талантом**

Run: `npm run pdf:preview -- tmp/report-talent-strip-solo.pdf --primary kinesthetic`
Expected: `PDF preview written to ...`

- [ ] **Step 3: Відкрити обидва PDF і перевірити очима**

Чекліст:
- Смужка на всіх 3 сторінках, у межах полів (12.5мм), не торкається країв аркуша
- 8 сегментів, заокруглені, не злипаються, в один рядок
- Довгий сегмент відповідає головному таланту (порівняти з радаром на стор. 2)
- Контент 2-ї та 3-ї сторінок не виліз за нижній край (смужка тепер займає ~6.5мм вертикалі, на відміну від старої absolute-смуги)
- Загальне враження: професійно + тепло, не банально

- [ ] **Step 4: Якщо є дрібні правки геометрії (висота/gap/margin) — поправити CSS, перегенерувати, закомітити**

```bash
git add src/services/reportTemplate.ts
git commit -m "style: tune talent strip geometry"
```
