# Telegram Report-Generation Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After a tim-leader successfully generates a report PDF via `POST /f/:secret`, send a Telegram message to a configured chat with the child's name, shift, and intelligence type(s) — without ever blocking or breaking PDF delivery.

**Architecture:** No bot process, no polling, no webhook. A single fire-and-forget HTTP call to the Telegram Bot API's `sendMessage` endpoint, made from the existing form route right after a report is persisted. Controlled by two optional env vars (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`); if either is empty, the feature is a silent no-op.

**Tech Stack:** Node 20 built-in `fetch`/`Response` (already used the same way in `src/services/ai.ts`), Fastify, Vitest with `vi.stubGlobal("fetch", ...)`.

Reference spec: `docs/superpowers/specs/2026-07-06-telegram-notifications-design.md`

---

### Task 1: Add Telegram settings to app config

**Files:**
- Modify: `src/config.ts`
- Test: `tests/config.test.ts` (new file)

- [ ] **Step 1: Write the failing test**

Create `tests/config.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("defaults telegram settings to empty strings when env vars are unset", () => {
    const cfg = loadConfig({});
    expect(cfg.telegramBotToken).toBe("");
    expect(cfg.telegramChatId).toBe("");
  });

  it("reads telegram settings from env vars when present", () => {
    const cfg = loadConfig({ TELEGRAM_BOT_TOKEN: "123:abc", TELEGRAM_CHAT_ID: "999" });
    expect(cfg.telegramBotToken).toBe("123:abc");
    expect(cfg.telegramChatId).toBe("999");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/config.test.ts`
Expected: FAIL — `cfg.telegramBotToken` is `undefined`, not `""` (property doesn't exist yet on `Config`).

- [ ] **Step 3: Add the fields to `Config` and `loadConfig`**

In `src/config.ts`, the current file is:

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

Replace it with:

```ts
export interface Config {
  port: number;
  formSecret: string;
  adminSecret: string;
  deepseekApiKey: string;
  dbPath: string;
  uploadDir: string;
  telegramBotToken: string;
  telegramChatId: string;
}

export function loadConfig(env = process.env): Config {
  return {
    port: Number(env.PORT ?? 3000),
    formSecret: env.FORM_SECRET ?? "changeme-form",
    adminSecret: env.ADMIN_SECRET ?? "changeme-admin",
    deepseekApiKey: env.DEEPSEEK_API_KEY ?? "",
    dbPath: env.DB_PATH ?? "./data/app.sqlite",
    uploadDir: env.UPLOAD_DIR ?? "./uploads",
    telegramBotToken: env.TELEGRAM_BOT_TOKEN ?? "",
    telegramChatId: env.TELEGRAM_CHAT_ID ?? "",
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/config.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Fix the two existing test files that build a literal `Config` object**

`Config` is now a wider interface, so the hand-written `cfg` objects in `tests/routes/form.routes.test.ts` and `tests/routes/admin.routes.test.ts` need the two new fields or `tsc` will fail (excess/missing property checks don't block object literals used as loose `const`, but `buildServer(cfg)` expects a full `Config`, so TypeScript will report missing properties).

In `tests/routes/form.routes.test.ts`, find:

```ts
const cfg = {
  port: 0, formSecret: "S", adminSecret: "A", deepseekApiKey: "",
  dbPath: ":memory:", uploadDir: "./uploads-test",
};
```

Replace with:

```ts
const cfg = {
  port: 0, formSecret: "S", adminSecret: "A", deepseekApiKey: "",
  dbPath: ":memory:", uploadDir: "./uploads-test",
  telegramBotToken: "", telegramChatId: "",
};
```

In `tests/routes/admin.routes.test.ts`, find:

```ts
const cfg = {
  port: 0, formSecret: "S", adminSecret: "A", deepseekApiKey: "",
  dbPath: ":memory:", uploadDir: "./uploads-test",
};
```

Replace with the same addition:

```ts
const cfg = {
  port: 0, formSecret: "S", adminSecret: "A", deepseekApiKey: "",
  dbPath: ":memory:", uploadDir: "./uploads-test",
  telegramBotToken: "", telegramChatId: "",
};
```

- [ ] **Step 6: Typecheck and run the full suite**

Run: `npx tsc -p tsconfig.json --noEmit && npx vitest run`
Expected: no type errors, all tests pass (existing suite + 2 new config tests).

- [ ] **Step 7: Commit**

```bash
git add src/config.ts tests/config.test.ts tests/routes/form.routes.test.ts tests/routes/admin.routes.test.ts
git commit -m "feat(config): add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID settings"
```

---

### Task 2: Telegram notification service

**Files:**
- Create: `src/services/telegram.ts`
- Test: `tests/services/telegram.test.ts` (new file)

- [ ] **Step 1: Write the failing tests**

Create `tests/services/telegram.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { notifyReportGenerated } from "../../src/services/telegram.js";

const info = {
  childName: "Артем",
  shift: "3",
  primaryTitle: "Тілесно-кінестетичний інтелект",
  secondaryTitle: "Міжособистісний інтелект",
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("notifyReportGenerated", () => {
  it("does nothing when the bot token is missing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await notifyReportGenerated({ telegramBotToken: "", telegramChatId: "999" }, info);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does nothing when the chat id is missing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await notifyReportGenerated({ telegramBotToken: "123:abc", telegramChatId: "" }, info);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends a message to the right url with chat id and details in the text", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await notifyReportGenerated({ telegramBotToken: "123:abc", telegramChatId: "999" }, info);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.telegram.org/bot123:abc/sendMessage");
    const body = JSON.parse(options.body as string);
    expect(body.chat_id).toBe("999");
    expect(body.text).toContain("Артем");
    expect(body.text).toContain("3");
    expect(body.text).toContain("Тілесно-кінестетичний інтелект + Міжособистісний інтелект");
  });

  it("omits the secondary type from the text when there is none", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await notifyReportGenerated(
      { telegramBotToken: "123:abc", telegramChatId: "999" },
      { childName: "Артем", shift: "3", primaryTitle: "Музичний інтелект" }
    );

    const options = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(options.body as string);
    expect(body.text).toContain("Музичний інтелект");
    expect(body.text).not.toContain("+");
  });

  it("does not throw when telegram responds with an error status", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("bad request", { status: 400 })));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(notifyReportGenerated({ telegramBotToken: "123:abc", telegramChatId: "999" }, info))
      .resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("does not throw when fetch itself fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(notifyReportGenerated({ telegramBotToken: "123:abc", telegramChatId: "999" }, info))
      .resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/services/telegram.test.ts`
Expected: FAIL — `Cannot find module '../../src/services/telegram.js'`

- [ ] **Step 3: Implement the service**

Create `src/services/telegram.ts`:

```ts
export interface TelegramConfig {
  telegramBotToken: string;
  telegramChatId: string;
}

export interface ReportNotification {
  childName: string;
  shift: string;
  primaryTitle: string;
  secondaryTitle?: string;
}

function buildText(info: ReportNotification): string {
  const types = info.secondaryTitle ? `${info.primaryTitle} + ${info.secondaryTitle}` : info.primaryTitle;
  return `🆕 Новий звіт\nДитина: ${info.childName}\nЗміна: ${info.shift}\nТип: ${types}`;
}

/**
 * Best-effort push notification — never throws, never blocks the caller on
 * network latency beyond its own await. Silently disabled when either env
 * setting is empty.
 */
export async function notifyReportGenerated(cfg: TelegramConfig, info: ReportNotification): Promise<void> {
  if (!cfg.telegramBotToken || !cfg.telegramChatId) return;

  try {
    const res = await fetch(`https://api.telegram.org/bot${cfg.telegramBotToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: cfg.telegramChatId, text: buildText(info) }),
    });
    if (!res.ok) {
      console.error("Telegram notify failed:", res.status, await res.text().catch(() => ""));
    }
  } catch (err) {
    console.error("Telegram notify error:", err);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/services/telegram.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/services/telegram.ts tests/services/telegram.test.ts
git commit -m "feat: add best-effort Telegram sendMessage notification service"
```

---

### Task 3: Wire notifications into the form route

**Files:**
- Modify: `src/routes/form.routes.ts`
- Test: `tests/routes/form.routes.test.ts`

- [ ] **Step 1: Write the failing tests**

In `tests/routes/form.routes.test.ts`, add `afterEach` cleanup for stubbed globals and two new tests. The top of the file currently is:

```ts
import { describe, it, expect, vi } from "vitest";
import { buildServer } from "../../src/server.js";
```

Replace with:

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { buildServer } from "../../src/server.js";
```

Right after the `vi.mock("../../src/services/ai.js", ...)` block (before `const cfg = {...}`), add:

```ts
afterEach(() => {
  vi.unstubAllGlobals();
});
```

At the end of the `describe("form routes", ...)` block, right before the closing `});` (i.e. after the `"does not consume attempts in unlimited mode"` test), add two new tests:

```ts
  it("notifies telegram when a report is generated", async () => {
    const telegramFetch = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", telegramFetch);
    const app = buildServer({ ...cfg, telegramBotToken: "123:abc", telegramChatId: "999" });

    const res = await submitReport(app);
    expect(res.statusCode).toBe(200);

    expect(telegramFetch).toHaveBeenCalledTimes(1);
    const [url, options] = telegramFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.telegram.org/bot123:abc/sendMessage");
    const body = JSON.parse(options.body as string);
    expect(body.chat_id).toBe("999");
    expect(body.text).toContain("Артем");
    await app.close();
  });

  it("still returns the pdf when the telegram notification fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("telegram down"); }));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const app = buildServer({ ...cfg, telegramBotToken: "123:abc", telegramChatId: "999" });

    const res = await submitReport(app);
    expect(res.statusCode).toBe(200);
    expect(res.rawPayload.subarray(0, 4).toString("latin1")).toBe("%PDF");

    errorSpy.mockRestore();
    await app.close();
  });
```

Note: `cfg.telegramBotToken`/`cfg.telegramChatId` are `""` by default (from Task 1), so none of the *other* tests in this file trigger any `fetch` call — the notify function early-returns before touching the network.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/routes/form.routes.test.ts`
Expected: FAIL on the two new tests — `telegramFetch` is never called (route doesn't call `notifyReportGenerated` yet).

- [ ] **Step 3: Wire the call into the route**

In `src/routes/form.routes.ts`, the imports are currently:

```ts
import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { mkdirSync, createWriteStream } from "node:fs";
import { join, extname } from "node:path";
import { pipeline } from "node:stream/promises";
import { formPage, quotaBlockReason } from "../web/formPage.js";
import { reportInputSchema } from "../domain/validation.js";
import { buildReport } from "../services/reportBuilder.js";
import { getQuota, consumeAttempt } from "../db/quota.repo.js";
```

Replace with:

```ts
import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { mkdirSync, createWriteStream } from "node:fs";
import { join, extname } from "node:path";
import { pipeline } from "node:stream/promises";
import { formPage, quotaBlockReason } from "../web/formPage.js";
import { reportInputSchema } from "../domain/validation.js";
import { buildReport } from "../services/reportBuilder.js";
import { getQuota, consumeAttempt } from "../db/quota.repo.js";
import { getIntelligence } from "../db/intelligences.repo.js";
import { notifyReportGenerated } from "../services/telegram.js";
```

Then find:

```ts
    const { report, pdf } = await buildReport(parsed.data, {
      db,
      deepseekApiKey: cfg.deepseekApiKey,
    });
    consumeAttempt(db);
```

Replace with:

```ts
    const { report, pdf } = await buildReport(parsed.data, {
      db,
      deepseekApiKey: cfg.deepseekApiKey,
    });
    consumeAttempt(db);

    const primary = getIntelligence(db, report.primaryType);
    const secondary = report.secondaryType ? getIntelligence(db, report.secondaryType) : undefined;
    void notifyReportGenerated(cfg, {
      childName: report.childName,
      shift: report.shift,
      primaryTitle: primary.title,
      secondaryTitle: secondary?.title,
    });
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/routes/form.routes.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Run the full suite and typecheck**

Run: `npx tsc -p tsconfig.json --noEmit && npx vitest run`
Expected: no type errors, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/routes/form.routes.ts tests/routes/form.routes.test.ts
git commit -m "feat: notify Telegram on successful report generation"
```

---

### Task 4: Document the new env vars

**Files:**
- Modify: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Add the two variables to `.env.example`**

Current file:

```
PORT=3000
FORM_SECRET=changeme-form
ADMIN_SECRET=changeme-admin
DEEPSEEK_API_KEY=
DB_PATH=./data/app.sqlite
UPLOAD_DIR=./uploads
```

Replace with:

```
PORT=3000
FORM_SECRET=changeme-form
ADMIN_SECRET=changeme-admin
DEEPSEEK_API_KEY=
DB_PATH=./data/app.sqlite
UPLOAD_DIR=./uploads
# Опційно: сповіщення в Telegram про кожен згенерований звіт.
# Залиште порожніми, щоб вимкнути.
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

- [ ] **Step 2: Add a short section to `README.md`**

Find:

```markdown
## Безпека

Доступ на старті — за секретними посиланнями. Не публікуйте їх. Для продакшену
рекомендується додати пароль на адмінку (закладено архітектурно).
```

Replace with:

```markdown
## Сповіщення в Telegram

Опційно: сервіс може надсилати повідомлення в Telegram щоразу, коли тім-лідер
успішно генерує звіт (ім'я дитини, зміна, тип інтелекту).

1. Створіть бота через [@BotFather](https://t.me/BotFather), отримайте токен.
2. Напишіть боту будь-яке повідомлення, потім відкрийте в браузері
   `https://api.telegram.org/bot<TOKEN>/getUpdates` і знайдіть `chat.id` —
   це і є `TELEGRAM_CHAT_ID` (для групи — додайте бота в групу, потім там
   само знайдіть `id` групового чату).
3. Додайте `TELEGRAM_BOT_TOKEN` і `TELEGRAM_CHAT_ID` у Variables (локально —
   у `.env`).

Якщо обидві змінні порожні, сповіщення просто не надсилаються — решта
сервісу працює як завжди.

## Безпека

Доступ на старті — за секретними посиланнями. Не публікуйте їх. Для продакшену
рекомендується додати пароль на адмінку (закладено архітектурно).
```

- [ ] **Step 3: Commit**

```bash
git add .env.example README.md
git commit -m "docs: document Telegram notification env vars"
```

---

### Task 5: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck and test suite**

Run: `npx tsc -p tsconfig.json --noEmit && npx vitest run`
Expected: no type errors; all test files pass (existing suite + `config.test.ts` + `telegram.test.ts` + 2 new tests in `form.routes.test.ts`).

- [ ] **Step 2: Build and live smoke test with a real (fake) Telegram token**

```bash
npm run build
PORT=4760 FORM_SECRET=smoke ADMIN_SECRET=adm DB_PATH=":memory:" UPLOAD_DIR="./tmp-smoke-uploads6" \
  TELEGRAM_BOT_TOKEN="000:fake" TELEGRAM_CHAT_ID="123" node dist/server.js &
sleep 3
curl -s -X POST http://localhost:4760/f/smoke \
  -F "childName=Тест" -F "shift=1 Kids" -F "primaryType=musical" -F "secondaryType=" \
  -F "example=Дитина гарно співала на ватрі." \
  -F "photo=@.claude/skills/run-westcamp-gardner/placeholder.jpg;type=image/jpeg" \
  -o /tmp-out.pdf -w "%{http_code}\n"
```

Expected: `200` printed, and the server log shows a `Telegram notify failed:` or `Telegram notify error:` line (because `000:fake` is not a real token) — proving the call was attempted, failed gracefully, and did **not** stop the PDF from being generated (curl still got a 200 and a PDF).

Stop the server afterward:

```bash
netstat -ano | grep :4760 | grep LISTEN | awk '{print $5}' | sort -u | while read pid; do
  powershell -Command "Stop-Process -Id $pid -Force" 2>/dev/null
done
rm -rf tmp-smoke-uploads6 /tmp-out.pdf
```

- [ ] **Step 3: Report completion to the user**

Summarize: which env vars to set in Railway to turn the feature on, and confirm no behavior changed for anyone who leaves them unset.
