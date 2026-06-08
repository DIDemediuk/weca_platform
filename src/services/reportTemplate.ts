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
      <p>${esc(shortText(c.strengths, index === 1 ? 520 : 360))}</p>
      <div class="mini-grid">
        <div><strong>Суперсила в команді</strong><span>${esc(shortText(c.inCamp, 210))}</span></div>
        ${index === 1 ? `<div><strong>Зона росту</strong><span>Навчитися використовувати цю сильну сторону в різних ситуаціях: у команді, навчанні та щоденних рішеннях.</span></div>` : ""}
      </div>
    </div>
  </article>`;
}

function adviceCard(title: string, first: IntelligenceContent, second: IntelligenceContent): string {
  return `<article class="parent-card">
    <h3>${esc(title)}</h3>
    <div class="advice-row"><strong>${esc(first.title)}</strong><p>${esc(shortText(first.parentAdvice, 330))}</p></div>
    <div class="advice-row"><strong>${esc(second.title)}</strong><p>${esc(shortText(second.parentAdvice, 330))}</p></div>
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
    padding: 15mm;
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
    margin-bottom: 10mm;
  }
  .logo {
    display: flex;
    align-items: center;
    gap: 3mm;
    font-weight: 900;
    font-size: 13pt;
  }
  .logo-mark {
    display: inline-grid;
    place-items: center;
    width: 11mm;
    height: 11mm;
    border-radius: 3mm;
    background: ${C.orange};
    color: #fff;
    font-weight: 900;
  }
  .meta { text-align: right; color: ${C.muted}; font-size: 9.5pt; line-height: 1.45; }
  .hero {
    display: grid;
    grid-template-columns: 78mm 1fr;
    gap: 11mm;
    align-items: center;
    min-height: 158mm;
  }
  .photo-frame {
    position: relative;
    width: 78mm;
    height: 102mm;
    border-radius: 9mm;
    padding: 3mm;
    background: ${C.panel};
    border: 1.2mm solid ${C.orange};
    box-shadow: 0 10mm 22mm rgba(19, 41, 75, .16);
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
    font-size: 34pt;
    line-height: 1.04;
    margin-bottom: 5mm;
  }
  h2 {
    color: ${C.navy};
    font-size: 24pt;
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
    font-size: 10.5pt;
    line-height: 1.48;
    margin-bottom: 3mm;
  }
  .quote {
    margin-top: 9mm;
    background: ${C.panel};
    border-left: 1.5mm solid ${C.orange};
    border-radius: 4mm;
    padding: 7mm;
    box-shadow: 0 5mm 18mm rgba(19, 41, 75, .08);
  }
  .quote-mark { color: ${C.orange}; font-size: 28pt; line-height: .6; font-weight: 900; }
  .signature { color: ${C.green}; font-weight: 800; margin-top: 4mm; }
  .chart-layout {
    display: grid;
    grid-template-columns: 68mm 1fr;
    gap: 8mm;
    align-items: start;
  }
  .chart-box, .talent-card, .parent-card, .future-card {
    background: ${C.panel};
    border: .35mm solid ${C.line};
    border-radius: 5mm;
    box-shadow: 0 5mm 16mm rgba(19, 41, 75, .07);
  }
  .chart-box {
    padding: 5mm;
    min-height: 70mm;
    display: grid;
    place-items: center;
  }
  .chart-box svg { max-width: 100%; height: auto; }
  .talents {
    display: grid;
    gap: 5mm;
  }
  .talent-card {
    display: grid;
    grid-template-columns: 14mm 1fr;
    gap: 4mm;
    padding: 6mm;
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
    gap: 3mm;
    margin-top: 3mm;
  }
  .mini-grid div {
    border-radius: 3mm;
    background: #F1F6F3;
    padding: 3mm;
  }
  .mini-grid strong, .advice-row strong {
    display: block;
    color: ${C.navy};
    font-size: 9.5pt;
    margin-bottom: 1mm;
  }
  .mini-grid span {
    display: block;
    color: ${C.muted};
    font-size: 9pt;
    line-height: 1.35;
  }
  .parents-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6mm;
    margin-top: 7mm;
  }
  .parent-card {
    padding: 7mm;
    min-height: 118mm;
  }
  .advice-row {
    border-top: .3mm solid ${C.line};
    padding-top: 4mm;
    margin-top: 4mm;
  }
  .advice-row p { color: ${C.muted}; }
  .future-card {
    position: absolute;
    left: 15mm;
    right: 15mm;
    bottom: 15mm;
    display: grid;
    grid-template-columns: 1fr 34mm;
    gap: 6mm;
    align-items: center;
    padding: 7mm;
    background: ${C.navy};
    color: #fff;
  }
  .future-card h3 { color: #fff; margin-bottom: 2mm; }
  .future-card p { color: rgba(255,255,255,.82); margin-bottom: 0; }
  .qr {
    display: grid;
    place-items: center;
    width: 30mm;
    height: 30mm;
    border-radius: 4mm;
    background: #fff;
    color: ${C.navy};
    font-size: 8pt;
    font-weight: 900;
    text-align: center;
    padding: 3mm;
  }
  .footer-label {
    position: absolute;
    left: 15mm;
    bottom: 7mm;
    color: ${C.muted};
    font-size: 8.5pt;
  }
</style></head><body>

<section class="page">
  <header class="header">
    <div class="logo"><span class="logo-mark">W</span><span>WestCamp Kids</span></div>
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

<section class="page">
  <header class="header">
    <div class="logo"><span class="logo-mark">W</span><span>WestCamp Kids</span></div>
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
    <div class="logo"><span class="logo-mark">W</span><span>WestCamp Kids</span></div>
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
    <div class="qr">LTV<br>Offer<br>Link</div>
  </div>
</section>

</body></html>`;
}
