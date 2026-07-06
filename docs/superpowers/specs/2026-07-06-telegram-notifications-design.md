# Telegram-сповіщення про генерацію звіту

## Мета

Адміністратор отримує повідомлення в Telegram щоразу, коли тім-лідер успішно генерує звіт через форму `/f/:secret`.

## Що це не є

Це не окремий бот-процес із командами чи діалогом. Це один HTTP-виклик до Telegram Bot API (`sendMessage`), зроблений сервером одразу після генерації PDF. Немає polling, немає webhook, немає обробки вхідних повідомлень від Telegram.

## Конфігурація

Дві нові env-змінні, за зразком `FORM_SECRET`/`ADMIN_SECRET`:

- `TELEGRAM_BOT_TOKEN` — токен бота від @BotFather.
- `TELEGRAM_CHAT_ID` — chat_id, куди надсилати повідомлення.

Якщо хоч одна з них порожня — фіча вимкнена, сервер працює як раніше, без помилок і попереджень.

`Config` (`src/config.ts`) отримує два нові поля: `telegramBotToken: string`, `telegramChatId: string`, обидва за замовчуванням `""`.

## Компонент: `src/services/telegram.ts`

Єдиний експорт:

```ts
export async function notifyReportGenerated(
  cfg: { telegramBotToken: string; telegramChatId: string },
  info: { childName: string; shift: string; primaryTitle: string; secondaryTitle?: string }
): Promise<void>
```

Поведінка:
1. Якщо `cfg.telegramBotToken` або `cfg.telegramChatId` порожні — одразу `return` (no-op).
2. Формує текст повідомлення (див. нижче).
3. Робить `fetch("https://api.telegram.org/bot<token>/sendMessage", { method: "POST", ... })` з JSON-тілом `{ chat_id, text }`.
4. Будь-яка помилка (мережа, не-2xx статус, виняток) ловиться всередині функції й логується через `console.error` — функція ніколи не кидає назовні.

Текст повідомлення:
```
🆕 Новий звіт
Дитина: {childName}
Зміна: {shift}
Тип: {primaryTitle}{ + secondaryTitle, якщо є}
```

`primaryTitle`/`secondaryTitle` — це людські назви типів інтелекту (`title` з `getIntelligence`), а не машинні ключі (`musical`, `kinesthetic`).

## Точка виклику: `src/routes/form.routes.ts`

Одразу після `consumeAttempt(db)`, перед формуванням `filename`:

```ts
const primary = getIntelligence(db, report.primaryType);
const secondary = report.secondaryType ? getIntelligence(db, report.secondaryType) : undefined;
void notifyReportGenerated(cfg, {
  childName: report.childName,
  shift: report.shift,
  primaryTitle: primary.title,
  secondaryTitle: secondary?.title,
});
```

Виклик **fire-and-forget** (`void`, без `await`) — відповідь користувачу (PDF) не чекає на Telegram і не блокується, навіть якщо Telegram API повільний або недоступний.

## Обробка помилок / edge cases

- Немає токена/chat_id → тихий no-op, підтверджується тестом.
- Telegram API повертає помилку або недоступний → логується в консоль, генерація PDF та відповідь користувачу не зачіпаються.
- Немає ретраїв — сповіщення best-effort, не критична функція.

## Тестування

Нові тести в `tests/services/telegram.test.ts`:
- З валідними `telegramBotToken`/`telegramChatId` — `fetch` викликається з правильним URL і тілом (перевірити `chat_id` і що `text` містить ім'я дитини, зміну й назви типів).
- З порожнім `telegramBotToken` (або `telegramChatId`) — `fetch` не викликається.
- `fetch` кидає помилку — `notifyReportGenerated` не кидає (resolves), помилка йде в `console.error` (можна замокати `console.error` і перевірити виклик).

Оновлення в `tests/routes/form.routes.test.ts`:
- Мок `global.fetch`, що симулює падіння Telegram API — переконатись, що POST `/f/:secret` все одно повертає 200 і коректний PDF.

## Документація

- `.env.example`: додати `TELEGRAM_BOT_TOKEN=` і `TELEGRAM_CHAT_ID=` з коментарем, де їх узяти.
- `README.md`: короткий розділ "Сповіщення в Telegram" — як отримати токен у @BotFather і chat_id (наприклад, через `https://api.telegram.org/bot<token>/getUpdates` після першого повідомлення боту).

## Поза межами цієї роботи

- Немає сповіщень про заблоковані спроби (вичерпаний ліміт) — тільки про успішну генерацію.
- Немає налаштування chat_id через адмінку — лише env-змінна, зміна вимагає редеплою.
- Немає повторних спроб доставки чи черги повідомлень.
