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
