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

function jsonScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function formPage(secret: string, error?: string): string {
  const props = {
    page: "form",
    secret,
    error,
    types: TYPE_OPTIONS,
    submitUrl: `/f/${secret}`,
  };

  return `<!doctype html><html lang="uk"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Новий звіт · WestCamp Kids</title>
<link rel="stylesheet" href="/static/styles.css"></head><body>
<div id="app"></div>
<script>window.__APP_PROPS__=${jsonScript(props)};</script>
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="/static/react-app.js"></script>
<noscript><main class="app-shell"><section class="panel"><h1>Новий звіт</h1>
${error ? `<div class="error">${esc(error)}</div>` : ""}
<form method="post" action="/f/${esc(secret)}" enctype="multipart/form-data">
<label>ПІБ дитини<input name="childName" required maxlength="80"></label>
<label>Номер зміни<input name="shift" required maxlength="40"></label>
<label>Домінуючий тип 1<select name="primaryType" required>${TYPE_OPTIONS.map((o) => `<option value="${o.value}">${esc(o.label)}</option>`).join("")}</select></label>
<label>Домінуючий тип 2<select name="secondaryType"><option value="">немає</option>${TYPE_OPTIONS.map((o) => `<option value="${o.value}">${esc(o.label)}</option>`).join("")}</select></label>
<label>Живий приклад з табору<textarea name="example" required maxlength="800" rows="4"></textarea></label>
<label>Фото дитини<input type="file" name="photo" accept="image/*" required></label>
<button type="submit">Згенерувати PDF</button>
</form></section></main></noscript>
</body></html>`;
}
