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
