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
  const fallback = `<main class="app-shell"><aside class="sidebar">
<div class="brand"><img class="brand-logo" src="/static/brand/westcamp-kids-logo.png" alt="WestCamp Kids"><div><strong>WestCamp Kids</strong><small>Gardner reports</small></div></div>
<nav class="tabs"><button class="tab active" type="button">Новий звіт</button><button class="tab" type="button">Підказки</button></nav>
</aside><section class="workspace"><header class="page-head"><div><p class="eyebrow">Форма тім-лідера</p><h1>Новий звіт</h1></div></header>
${error ? `<div class="error">${esc(error)}</div>` : ""}
<form class="form-grid" method="post" action="/f/${esc(secret)}" enctype="multipart/form-data">
<label>ПІБ дитини<input name="childName" required maxlength="80"></label>
<label>Номер зміни<input name="shift" required maxlength="40"></label>
<label>Домінуючий тип 1<select name="primaryType" required>${TYPE_OPTIONS.map((o) => `<option value="${o.value}">${esc(o.label)}</option>`).join("")}</select></label>
<label>Домінуючий тип 2<select name="secondaryType"><option value="">немає</option>${TYPE_OPTIONS.map((o) => `<option value="${o.value}">${esc(o.label)}</option>`).join("")}</select></label>
<label class="wide">Живий приклад з табору<textarea name="example" required maxlength="800" rows="4"></textarea></label>
<label class="wide">Вхідний квест / стартовий вибір<textarea name="questSignal" maxlength="500" rows="3"></textarea></label>
<label class="wide">МК та поведінка на них<textarea name="workshopNotes" maxlength="700" rows="3"></textarea></label>
<label class="wide">Спостереження дня 3/6/9<textarea name="observationNotes" maxlength="700" rows="3"></textarea></label>
<label class="wide">Вечірні рефлексії<textarea name="reflectionNotes" maxlength="600" rows="3"></textarea></label>
<label class="wide">Фінальна добровільна роль<input name="finalProjectNotes" maxlength="220"></label>
<label class="wide upload-box">Фото дитини<input type="file" name="photo" accept="image/*" required></label>
<button class="primary-action wide" type="submit">Згенерувати PDF</button>
</form></section></main>`;

  return `<!doctype html><html lang="uk"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Новий звіт · WestCamp Kids</title>
<link rel="stylesheet" href="/static/styles.css"></head><body>
<div id="app">${fallback}</div>
<script>window.__APP_PROPS__=${jsonScript(props)};</script>
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="/static/react-app.js"></script>
</body></html>`;
}
