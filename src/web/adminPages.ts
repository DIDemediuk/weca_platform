import { esc } from "./html.js";
import type { Report, IntelligenceContent } from "../domain/types.js";

function jsonScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function shell(secret: string, title: string, props: Record<string, unknown>, fallback: string): string {
  return `<!doctype html><html lang="uk"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · WestCamp Kids</title>
<link rel="stylesheet" href="/static/styles.css"></head>
<body>
<div id="app">${fallback}</div>
<script>window.__APP_PROPS__=${jsonScript({ secret, ...props })};</script>
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="/static/react-app.js"></script>
</body></html>`;
}

export function adminListPage(secret: string, reports: Report[]): string {
  const rows = reports.map((r) =>
    `<tr><td>${esc(r.childName)}</td><td>${esc(r.shift)}</td>
     <td>${esc(r.primaryType)}${r.secondaryType ? " + " + esc(r.secondaryType) : ""}</td>
     <td>${esc(r.createdAt.slice(0, 16).replace("T", " "))}</td>
     <td><a class="btn" href="/admin/${esc(secret)}/report/${esc(r.id)}.pdf">PDF</a></td></tr>`
  ).join("");
  const fallback = `<main class="app-shell"><section class="panel"><h1>Звіти</h1>
<p><a href="/admin/${esc(secret)}">Звіти</a> · <a href="/admin/${esc(secret)}/content">Описи типів</a></p>
<table><thead><tr><th>Дитина</th><th>Зміна</th><th>Типи</th><th>Дата</th><th></th></tr></thead>
<tbody>${rows || `<tr><td colspan="5">Поки немає звітів.</td></tr>`}</tbody></table></section></main>`;
  return shell(secret, "Адмінка", { page: "admin", activeTab: "reports", reports }, fallback);
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
  const fallback = `<main class="app-shell"><section class="panel"><h1>Описи типів</h1>
<p><a href="/admin/${esc(secret)}">Звіти</a> · <a href="/admin/${esc(secret)}/content">Описи типів</a></p>${blocks}</section></main>`;
  return shell(secret, "Адмінка", { page: "admin", activeTab: "content", content: items }, fallback);
}
