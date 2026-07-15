# Design: вкладка "Архів" на формі тімліда (`/f/:secret`)

## Мета

Тімлід, що працює з формою `/f/:secret`, зараз бачить лише дві вкладки: "Новий звіт" і "Підказки". Потрібна третя вкладка "Архів" зі списком усіх раніше згенерованих звітів і можливістю повторно завантажити PDF, без входу в адмінку.

## Область застосування

- Список звітів: усі звіти в базі, без обмежень за періодом чи власником (звіти й так не прив'язані до конкретного secret/тіму — єдина таблиця `reports`).
- Повторне завантаження PDF: так, кнопка "PDF" в рядку списку.
- Логування події `downloaded` в `report_events` при завантаженні з архіву: **ні** — ці події лишаються ознакою адмінських завантажень.

## Архітектура

### Бекенд

1. **`GET /f/:secret`** (`src/routes/form.routes.ts`) — додатково викликає `listReports(db)` і передає результат у `formPage(...)` як новий параметр `reports`.
2. **Новий роут `GET /f/:secret/report/:id.pdf`** (`src/routes/form.routes.ts`) — рендерить PDF за id, guard той самий, що для форми (`secret === cfg.formSecret`). Не викликає `logReportEvent`.
3. **Уникнення дублювання коду рендеру PDF**: логіка рендеру звіту за `Report` (radar SVG → HTML → PDF) зараз інлайнована в `admin.routes.ts` (рядки 64–82). Виношу її в нову функцію `renderReportPdf(db, report): Promise<Buffer>` у `src/services/reportBuilder.ts` (поруч із `buildReport`). Обидва роути (`admin` і `form`) викликають цю функцію; admin-роут додатково викликає `logReportEvent` після.

### Фронтенд (`src/public/react-app.js`)

1. `AppFrame` — для `mode !== "admin"` додаю третій таб `["archive", "Архів"]` у масив `tabs`.
2. `FormApp` — додаю гілку `tab === "archive"` → `h(ArchiveTab, { reports: props.reports || [], secret: props.secret })`.
3. Новий компонент `ArchiveTab({ reports, secret })` — копія структури `ReportsTab` з адмінки: пошук (інпут, фільтр за childName/shift/primaryType/secondaryType), лічильник "N з M", таблиця (Дитина, Зміна, Типи, Дата, кнопка PDF → `href="/f/${secret}/report/${id}.pdf"`).
4. `formPage.ts` (SSR fallback/props) — додаю `reports` у props для гідратації та в `<nav class="tabs">` третю кнопку (non-interactive fallback, як зараз для "Підказки").

### Дані

- `Report[]` вже містить усе необхідне для таблиці (childName, shift, primaryType, secondaryType, createdAt, id) — нових полів у БД не треба.
- Сортування — за `createdAt DESC` (уже так у `listReports`).

## Обробка помилок

- Неправильний `secret` у `/f/:secret/report/:id.pdf` → 404, як у всіх інших роутах форми/адмінки.
- Неіснуючий `id` → 404 (як у admin-роуті).
- Немає звітів → таблиця показує рядок-заглушку "Поки немає звітів." (той самий текст, що в адмінці).

## Тестування

- Route-тест: `GET /f/:secret` повертає HTML, що містить дані звітів (via `window.__APP_PROPS__`).
- Route-тест: `GET /f/:secret/report/:id.pdf` з правильним secret і існуючим id → 200, `content-type: application/pdf`.
- Route-тест: той самий роут з неправильним secret → 404.
- Route-тест: перевірка, що завантаження з `/f/...` **не** створює запис у `report_events` (на відміну від `/admin/...`).
