import { readFileSync } from "node:fs";
import { esc } from "../web/html.js";
import type { IntelligenceContent, Report } from "../domain/types.js";

export interface TemplateArgs {
  report: Report;
  primary: IntelligenceContent;
  secondary?: IntelligenceContent;
  radarSvg: string;
}

const C = {
  navy: "#13294B",
  navySoft: "#213E6B",
  orange: "#FF7A1A",
  green: "#2F6B45",
  paper: "#F8FAF7",
  panel: "#FFFFFF",
  ink: "#1F2933",
  muted: "#667085",
  line: "#DDE5E0",
};

const LOGO_SRC = `data:image/png;base64,${readFileSync(
  new URL("../public/brand/westcamp-kids-logo.png", import.meta.url)
).toString("base64")}`;

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("uk-UA", { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

function optionalType(c: IntelligenceContent | undefined): IntelligenceContent {
  return c ?? {
    type: "interpersonal",
    title: "Другий талант ще формується",
    tagline: "Його можна буде уточнити після наступних спостережень",
    strengths: "Поки головний фокус звіту - на найяскравішому проявленому таланті дитини.",
    inCamp: "Продовжуйте спостерігати, у яких ролях дитина почувається найбільш живою, сміливою та включеною.",
    parentAdvice: "Підтримуйте різні формати активностей: командні завдання, творчість, рух і самостійні маленькі рішення.",
  };
}

function shortText(value: string, max = 260): string {
  return value.length > max ? `${value.slice(0, max - 1).trim()}...` : value;
}

function typeCard(c: IntelligenceContent, index: 1 | 2): string {
  return `<article class="talent-card ${index === 2 ? "secondary-talent" : ""}">
    <div class="talent-number">0${index}</div>
    <div>
      <h3>${esc(c.title)}</h3>
      <p class="tagline">${esc(c.tagline)}</p>
      <p>${esc(shortText(c.strengths, index === 1 ? 380 : 300))}</p>
      <div class="mini-grid">
        <div><strong>Суперсила в команді</strong><span>${esc(shortText(c.inCamp, index === 1 ? 190 : 175))}</span></div>
        ${index === 1 ? `<div><strong>Зона росту</strong><span>Переносити сильну сторону у команду, навчання та щоденні рішення.</span></div>` : ""}
      </div>
    </div>
  </article>`;
}

function adviceCard(title: string, first: IntelligenceContent, second: IntelligenceContent): string {
  return `<article class="parent-card">
    <h3>${esc(title)}</h3>
    <div class="advice-row"><strong>${esc(first.title)}</strong><p>${esc(shortText(first.parentAdvice, 220))}</p></div>
    <div class="advice-row"><strong>${esc(second.title)}</strong><p>${esc(shortText(second.parentAdvice, 220))}</p></div>
  </article>`;
}

export function renderReportHtml(a: TemplateArgs): string {
  const { report: r } = a;
  const secondary = optionalType(a.secondary);
  const shiftName = `Зміна ${r.shift}`;
  const date = formatDate(r.createdAt);

  return `<!doctype html><html lang="uk"><head><meta charset="utf-8">
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: ${C.paper};
    color: ${C.ink};
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
  }
  .page {
    position: relative;
    width: 210mm;
    height: 297mm;
    overflow: hidden;
    padding: 13mm;
    page-break-after: always;
    background: ${C.paper};
  }
  .page:last-child { page-break-after: auto; }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8mm;
    color: ${C.navy};
    margin-bottom: 6mm;
  }
  .logo {
    display: flex;
    align-items: center;
    font-weight: 900;
    font-size: 13pt;
  }
  .logo-img {
    display: block;
    width: 43mm;
    height: auto;
    max-height: 15mm;
    object-fit: contain;
  }
  .meta { text-align: right; color: ${C.muted}; font-size: 9.5pt; line-height: 1.45; }
  .hero {
    display: grid;
    grid-template-columns: 72mm 1fr;
    gap: 9mm;
    align-items: center;
    min-height: 148mm;
  }
  .photo-frame {
    position: relative;
    width: 72mm;
    height: 94mm;
    border-radius: 9mm;
    padding: 3mm;
    background: ${C.panel};
    border: 1.2mm solid ${C.orange};
  }
  .photo-frame img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 6mm;
    display: block;
  }
  .kicker {
    margin: 0 0 3mm;
    color: ${C.orange};
    font-weight: 900;
    letter-spacing: .02em;
    text-transform: uppercase;
    font-size: 10pt;
  }
  h1, h2, h3, p { margin-top: 0; }
  h1 {
    color: ${C.navy};
    font-size: 30pt;
    line-height: 1.04;
    margin-bottom: 5mm;
  }
  h2 {
    color: ${C.navy};
    font-size: 19.5pt;
    line-height: 1.08;
    margin-bottom: 6mm;
  }
  h3 {
    color: ${C.navy};
    font-size: 15pt;
    line-height: 1.2;
    margin-bottom: 2mm;
  }
  p {
    font-size: 10.8pt;
    line-height: 1.42;
    margin-bottom: 2.4mm;
  }
  .quote {
    margin-top: 7mm;
    background: ${C.panel};
    border-left: 1.5mm solid ${C.orange};
    border-radius: 4mm;
    padding: 5.5mm;
  }
  .quote-mark { color: ${C.orange}; font-size: 28pt; line-height: .6; font-weight: 900; }
  .signature { color: ${C.green}; font-weight: 800; margin-top: 4mm; }
  .chart-layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: 3mm;
    align-items: start;
  }
  .chart-box, .talent-card, .parent-card, .future-card {
    background: ${C.panel};
    border: .35mm solid ${C.line};
    border-radius: 5mm;
  }
  .chart-box {
    width: 124mm;
    margin: 0 auto;
    padding: 2mm;
    overflow: hidden;
  }
  .chart-box svg { width: 112mm; height: auto; display: block; margin: 0 auto; }
  .talents {
    display: grid;
    gap: 2.5mm;
  }
  .talent-card {
    display: grid;
    grid-template-columns: 12mm 1fr;
    gap: 3.5mm;
    padding: 4mm;
    max-height: 64mm;
    overflow: hidden;
  }
  .talent-card h3 {
    font-size: 14pt;
    margin-bottom: 1mm;
  }
  .talent-card p {
    font-size: 10.2pt;
    line-height: 1.32;
    margin-bottom: 1.8mm;
  }
  .secondary-talent {
    opacity: .96;
  }
  .talent-number {
    display: grid;
    place-items: center;
    width: 12mm;
    height: 12mm;
    border-radius: 50%;
    background: ${C.orange};
    color: #fff;
    font-weight: 900;
    font-size: 10pt;
  }
  .tagline {
    color: ${C.green};
    font-weight: 850;
    margin-bottom: 2mm;
  }
  .mini-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2mm;
    margin-top: 2.8mm;
    padding-top: 2.4mm;
    border-top: .3mm solid ${C.line};
  }
  .mini-grid div {
    border-radius: 3mm;
    background: #F1F6F3;
    padding: 2mm;
    overflow: hidden;
  }
  .mini-grid strong, .advice-row strong {
    display: block;
    color: ${C.navy};
    font-size: 8.8pt;
    margin-bottom: 1mm;
  }
  .mini-grid span {
    display: block;
    color: ${C.muted};
    font-size: 8.4pt;
    line-height: 1.22;
  }
  .parents-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 4mm;
    margin-top: 5mm;
  }
  .parent-card {
    padding: 5mm;
    min-height: 54mm;
    max-height: 61mm;
    overflow: hidden;
  }
  .advice-row {
    border-top: .3mm solid ${C.line};
    padding-top: 2.6mm;
    margin-top: 2.6mm;
  }
  .advice-row p { color: ${C.muted}; }
  .future-card {
    position: absolute;
    left: 13mm;
    right: 13mm;
    bottom: 13mm;
    display: grid;
    grid-template-columns: 1fr 46mm;
    gap: 5mm;
    align-items: center;
    padding: 5.5mm;
    background: ${C.navy};
    color: #fff;
  }
  .future-card h3 { color: #fff; margin-bottom: 2mm; }
  .future-card p { color: rgba(255,255,255,.82); margin-bottom: 0; }
  .contact-card {
    display: grid;
    justify-items: center;
    gap: 1.8mm;
    border-radius: 4mm;
    background: #fff;
    color: ${C.navy};
    font-size: 8.4pt;
    font-weight: 900;
    padding: 4mm;
    text-align: center;
  }
  .contact-logo {
    display: block;
    width: 22mm;
    height: auto;
    margin-bottom: .5mm;
  }
  .contact-card strong {
    display: block;
    color: ${C.navy};
    font-size: 8.6pt;
    line-height: 1.18;
  }
  .footer-label {
    position: absolute;
    left: 15mm;
    bottom: 7mm;
    color: ${C.muted};
    font-size: 8.5pt;
  }
  .analytics-page .header {
    margin-bottom: 2mm;
  }
  .analytics-page h2 {
    font-size: 16pt;
    margin-bottom: 2.5mm;
  }
</style></head><body>

<section class="page">
  <header class="header">
    <div class="logo"><img class="logo-img" src="${LOGO_SRC}" alt="WestCamp Kids"></div>
    <div class="meta"><strong>${esc(shiftName)}</strong><br>${esc(date)}</div>
  </header>
  <div class="hero">
    <div class="photo-frame"><img src="${esc(r.photoPath)}" alt=""></div>
    <div>
      <p class="kicker">Карта талантів та емоційного інтелекту</p>
      <h1>${esc(r.childName)}</h1>
      <p>Індивідуальний звіт для батьків про сильні сторони, командні прояви та наступні кроки розвитку дитини.</p>
      <div class="quote">
        <div class="quote-mark">“</div>
        <p>${esc(r.wovenExample)}</p>
        <p class="signature">З любов'ю, ваш тім-лід та WestCamp family</p>
      </div>
    </div>
  </div>
  <div class="footer-label">Adventure · Education · Safety</div>
</section>

<section class="page analytics-page">
  <header class="header">
    <div class="logo"><img class="logo-img" src="${LOGO_SRC}" alt="WestCamp Kids"></div>
    <div class="meta">${esc(shiftName)}</div>
  </header>
  <h2>Множинний інтелект за методикою Говарда Гарднера</h2>
  <div class="chart-layout">
    <div class="chart-box">${a.radarSvg}</div>
    <div class="talents">
      ${typeCard(a.primary, 1)}
      ${typeCard(secondary, 2)}
    </div>
  </div>
</section>

<section class="page">
  <header class="header">
    <div class="logo"><img class="logo-img" src="${LOGO_SRC}" alt="WestCamp Kids"></div>
    <div class="meta">Для батьків</div>
  </header>
  <h2>Як взаємодіяти вдома</h2>
  <p>Ці підказки допоможуть підтримати природні сильні сторони дитини після табору і м'яко перевести їх у щоденні звички.</p>
  <div class="parents-grid">
    ${adviceCard("Ключі мотивації", a.primary, secondary)}
    ${adviceCard("Рекомендації на осінь та хобі", a.primary, secondary)}
  </div>
  <div class="future-card">
    <div>
      <h3>Наступна сходинка розвитку</h3>
      <p>Прокачка лідерських навичок на нашій майбутній зміні. Чекаємо вас знову!</p>
    </div>
    <div class="contact-card">
      <img class="contact-logo" src="${LOGO_SRC}" alt="WestCamp Kids">
      <strong>+38 (093) 092-88-80</strong>
      <strong>kids.westcamp.in.ua</strong>
    </div>
  </div>
</section>

</body></html>`;
}
