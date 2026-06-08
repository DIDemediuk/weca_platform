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
