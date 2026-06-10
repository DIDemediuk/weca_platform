import { readFileSync } from "node:fs";
import { esc } from "../web/html.js";
import { INTELLIGENCE_TYPES, type IntelligenceType } from "../domain/types.js";
import type { IntelligenceContent, Report } from "../domain/types.js";

export interface TemplateArgs {
  report: Report;
  primary: IntelligenceContent;
  secondary?: IntelligenceContent;
  radarSvg: string;
}

const C = {
  navy: "#13294B",
  navySoft: "#24507A",
  orange: "#FF7A1A",
  green: "#2F8A57",
  sky: "#5BC0EB",
  yellow: "#FFD166",
  mint: "#DDF7EA",
  paper: "#FFF9EC",
  panel: "#FFFFFF",
  ink: "#223142",
  muted: "#5F6F7E",
  line: "#F0D8A8",
};

const STRIP_COLORS: Record<IntelligenceType, string> = {
  linguistic: C.navy,
  logical: C.orange,
  spatial: C.yellow,
  kinesthetic: C.green,
  musical: C.sky,
  interpersonal: C.orange,
  intrapersonal: C.navy,
  naturalistic: C.green,
};

function talentStrip(primary: IntelligenceType, secondary?: IntelligenceType): string {
  const segments = INTELLIGENCE_TYPES.map((type) => {
    const flex = type === primary ? 3 : type === secondary ? 2 : 1;
    return `<span data-type="${type}" style="flex:${flex};background:${STRIP_COLORS[type]}"></span>`;
  }).join("");
  return `<div class="talent-strip">${segments}</div>`;
}

const LOGO_SRC = `data:image/png;base64,${readFileSync(
  new URL("../public/brand/westcamp-kids-logo.png", import.meta.url)
).toString("base64")}`;

const INTRO_TEXT =
  "Шановні батьки, вас вітає команда WestCamp Kids! Протягом зміни ми приділяємо багато уваги розвитку й дослідженню особистості кожної дитини — це допомагає розкривати її приховані таланти, мрії та можливості. Цієї зміни ми провели кілька активностей, у яких визначали тип інтелекту за методикою Говарда Гарднера: вона підказує, який спосіб сприйняття інформації пасує дитині найбільше. Результати засновані на особистих спостереженнях та аналізі нашої команди.";

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
    hobbies: "",
    professions: "",
  };
}

function shortText(value: string, max = 260): string {
  return value.length > max ? `${value.slice(0, max - 1).trim()}...` : value;
}

function withName(text: string, name: string): string {
  return esc(text).split("{name}").join(esc(name));
}

function primaryCard(c: IntelligenceContent, childName: string, bridge: string): string {
  return `<article class="talent-card">
    <div class="talent-number">01</div>
    <div>
      <h3>${esc(c.title)}</h3>
      <p class="tagline">${esc(c.tagline)}</p>
      <p>${withName(c.strengths, childName)}</p>
      <div class="bridge"><strong>Чому ми це побачили</strong><p>${esc(bridge)}</p></div>
      <div class="mini-grid">
        <div><strong>Як проявлялось у таборі</strong><span>${esc(c.inCamp)}</span></div>
        <div><strong>Зона росту</strong><span>Переносити сильну сторону у команду, навчання та щоденні рішення.</span></div>
      </div>
    </div>
  </article>`;
}

function secondaryCard(c: IntelligenceContent, childName: string): string {
  return `<article class="talent-card secondary-talent">
    <div class="talent-number">02</div>
    <div>
      <h3>${esc(c.title)}</h3>
      <p class="tagline">${esc(c.tagline)}</p>
      <p>${withName(c.strengths, childName)}</p>
      <div class="mini-grid">
        <div><strong>Як проявлялось у таборі</strong><span>${esc(c.inCamp)}</span></div>
      </div>
    </div>
  </article>`;
}

function futureBlock(title: string, primary: IntelligenceContent, secondary: IntelligenceContent, field: "hobbies" | "professions"): string {
  const rows = [primary, secondary]
    .filter((c) => c[field])
    .map((c) => `<div class="future-row"><strong>${esc(c.title)}</strong><span>${esc(c[field])}</span></div>`)
    .join("");
  return `<article class="parent-card future-list"><h3>${esc(title)}</h3>${rows}</article>`;
}

function adviceCard(title: string, first: IntelligenceContent, second: IntelligenceContent): string {
  return `<article class="parent-card">
    <h3>${esc(title)}</h3>
    <div class="advice-row"><strong>${esc(first.title)}</strong><p>${esc(shortText(first.parentAdvice, 260))}</p></div>
    <div class="advice-row"><strong>${esc(second.title)}</strong><p>${esc(shortText(second.parentAdvice, 260))}</p></div>
  </article>`;
}

export function renderReportHtml(a: TemplateArgs): string {
  const { report: r } = a;
  const secondary = optionalType(a.secondary);
  const shiftName = `Зміна ${r.shift}`;
  const date = formatDate(r.createdAt);
  const strip = talentStrip(r.primaryType, r.secondaryType);

  return `<!doctype html><html lang="uk"><head><meta charset="utf-8">
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: ${C.paper};
    color: ${C.ink};
    font-family: "Trebuchet MS", "Nunito", "Segoe UI", Arial, sans-serif;
  }
  .page {
    position: relative;
    width: 210mm;
    height: 297mm;
    overflow: hidden;
    padding: 12.5mm;
    page-break-after: always;
    background:
      linear-gradient(135deg, rgba(255, 209, 102, .22) 0 8mm, transparent 8mm 18mm),
      linear-gradient(180deg, #FFFDF7 0%, ${C.paper} 46%, #F3FFF8 100%);
  }
  .page:last-child { page-break-after: auto; }
  .talent-strip {
    display: flex;
    gap: 2mm;
    height: 2.5mm;
    margin-bottom: 4mm;
  }
  .talent-strip span {
    border-radius: 999px;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8mm;
    color: ${C.navy};
    margin-bottom: 5mm;
  }
  .logo {
    display: flex;
    align-items: center;
    font-weight: 900;
    font-size: 13pt;
  }
  .logo-img {
    display: block;
    width: 47mm;
    height: auto;
    max-height: 17mm;
    object-fit: contain;
  }
  .meta {
    text-align: right;
    color: ${C.navy};
    font-size: 10.4pt;
    line-height: 1.35;
    background: rgba(255,255,255,.78);
    border: .35mm solid ${C.line};
    border-radius: 999px;
    padding: 2.4mm 4.2mm;
  }
  .hero {
    display: grid;
    grid-template-columns: 72mm 1fr;
    gap: 9mm;
    align-items: center;
    min-height: 148mm;
  }
  .cover-page .hero {
    grid-template-columns: 82mm 1fr;
    gap: 9mm;
    min-height: 150mm;
  }
  .intro-card {
    margin-top: 7mm;
    background: ${C.panel};
    border: .55mm solid ${C.line};
    border-radius: 7mm;
    padding: 5.5mm 6mm;
  }
  .intro-card p {
    margin: 0;
    font-size: 10.8pt;
    line-height: 1.42;
    color: ${C.ink};
  }
  .photo-frame {
    position: relative;
    width: 72mm;
    height: 94mm;
    border-radius: 13mm;
    padding: 3mm;
    background: ${C.panel};
    border: 1.4mm solid ${C.orange};
    box-shadow: 0 3mm 0 ${C.yellow};
    transform: rotate(-1.3deg);
  }
  .cover-page .photo-frame {
    width: 82mm;
    height: 109mm;
  }
  .photo-frame img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 10mm;
    display: block;
  }
  .kicker {
    display: inline-block;
    margin: 0 0 4mm;
    color: ${C.navy};
    background: ${C.yellow};
    border-radius: 999px;
    padding: 2mm 4mm;
    font-weight: 900;
    letter-spacing: 0;
    text-transform: uppercase;
    font-size: 10.8pt;
  }
  h1, h2, h3, p { margin-top: 0; }
  h1 {
    color: ${C.navy};
    font-size: 39pt;
    line-height: 1;
    margin-bottom: 5mm;
  }
  h2 {
    color: ${C.navy};
    font-size: 22pt;
    line-height: 1.08;
    margin-bottom: 4.8mm;
  }
  h3 {
    color: ${C.navy};
    font-size: 16pt;
    line-height: 1.2;
    margin-bottom: 2mm;
  }
  p {
    font-size: 11.5pt;
    line-height: 1.38;
    margin-bottom: 2.4mm;
  }
  .quote {
    margin-top: 8mm;
    background: ${C.panel};
    border: .55mm solid ${C.line};
    border-left: 2mm solid ${C.green};
    border-radius: 7mm;
    padding: 5.5mm;
    box-shadow: 0 2mm 0 rgba(91, 192, 235, .22);
  }
  .cover-page .quote {
    margin-top: 7mm;
    padding: 6mm;
  }
  .quote-mark { color: ${C.orange}; font-size: 34pt; line-height: .55; font-weight: 900; }
  .signature { color: ${C.green}; font-weight: 900; margin-top: 3.5mm; }
  .chart-layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: 4mm;
    align-items: start;
  }
  .chart-box, .talent-card, .parent-card, .future-card {
    background: ${C.panel};
    border: .45mm solid ${C.line};
    border-radius: 7mm;
    box-shadow: 0 1.4mm 0 rgba(19, 41, 75, .06);
  }
  .chart-box {
    width: 101mm;
    margin: 0 auto;
    padding: 2mm;
    overflow: hidden;
    background: #F8FDFF;
  }
  .chart-box svg { width: 93mm; height: auto; display: block; margin: 0 auto; }
  .talents {
    display: grid;
    gap: 4mm;
  }
  .talent-card {
    display: grid;
    grid-template-columns: 15mm 1fr;
    gap: 4mm;
    padding: 4.4mm;
    overflow: hidden;
  }
  .talent-card h3 {
    font-size: 17pt;
    margin-bottom: 1mm;
  }
  .talent-card p {
    font-size: 11pt;
    line-height: 1.3;
    margin-bottom: 1.6mm;
  }
  .bridge {
    margin-top: 3mm;
    border-left: 2mm solid ${C.orange};
    border-radius: 2mm;
    background: rgba(255, 209, 102, .18);
    padding: 3mm 4mm;
  }
  .bridge strong {
    display: block;
    color: ${C.navy};
    font-size: 10.2pt;
    margin-bottom: 1mm;
  }
  .bridge p {
    margin: 0;
    font-size: 10.6pt;
    line-height: 1.3;
    color: ${C.ink};
  }
  .future-list { min-height: auto; max-height: none; }
  .future-row {
    border-top: .3mm solid ${C.line};
    padding-top: 2.6mm;
    margin-top: 2.6mm;
  }
  .future-row strong {
    display: block;
    color: ${C.navy};
    font-size: 10.2pt;
    margin-bottom: 1mm;
  }
  .future-row span {
    color: ${C.muted};
    font-size: 10.4pt;
    line-height: 1.3;
  }
  .secondary-talent {
    opacity: .96;
  }
  .talent-number {
    display: grid;
    place-items: center;
    width: 14.5mm;
    height: 14.5mm;
    border-radius: 5mm;
    background: ${C.orange};
    color: #fff;
    font-weight: 900;
    font-size: 11.6pt;
    transform: rotate(-3deg);
  }
  .tagline {
    color: ${C.green};
    font-weight: 900;
    margin-bottom: 2mm;
  }
  .secondary-talent .talent-number {
    background: ${C.sky};
  }
  .secondary-talent .mini-grid {
    grid-template-columns: 1fr;
  }
  .mini-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2mm;
    gap: 2.5mm;
    margin-top: 3mm;
    padding-top: 2.8mm;
    border-top: .3mm solid ${C.line};
  }
  .mini-grid div {
    border-radius: 4mm;
    background: ${C.mint};
    min-height: 18mm;
    padding: 2.8mm;
    overflow: hidden;
  }
  .mini-grid strong, .advice-row strong {
    display: block;
    color: ${C.navy};
    font-size: 10.2pt;
    margin-bottom: 1mm;
  }
  .mini-grid span {
    display: block;
    color: ${C.muted};
    font-size: 9.7pt;
    line-height: 1.2;
  }
  .parents-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 5.5mm;
    margin-top: 7mm;
  }
  .parent-card {
    padding: 5.2mm;
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
    left: 12.5mm;
    right: 12.5mm;
    bottom: 12.5mm;
    display: grid;
    grid-template-columns: 1fr 46mm;
    gap: 5mm;
    align-items: center;
    padding: 6mm;
    background: linear-gradient(135deg, ${C.navy} 0%, ${C.navySoft} 58%, ${C.green} 100%);
    color: #fff;
  }
  .future-card h3 { color: #fff; margin-bottom: 2mm; }
  .future-card p { color: rgba(255,255,255,.82); margin-bottom: 0; }
  .contact-card {
    display: grid;
    justify-items: center;
    gap: 1.8mm;
    border-radius: 5mm;
    background: #fff;
    color: ${C.navy};
    font-size: 8.8pt;
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
    font-size: 9pt;
    line-height: 1.18;
  }
  .footer-label {
    position: absolute;
    left: 15mm;
    bottom: 7mm;
    color: ${C.muted};
    font-size: 9pt;
    font-weight: 800;
  }
  .analytics-page .header {
    margin-bottom: 1.5mm;
  }
  .analytics-page h2 {
    font-size: 21pt;
    margin-bottom: 2.5mm;
  }
  .analytics-page .talent-card h3 {
    font-size: 17.6pt;
  }
  .analytics-page .tagline {
    font-size: 12.4pt;
  }
  .analytics-page .mini-grid strong {
    font-size: 10.8pt;
  }
  .analytics-page .mini-grid span {
    font-size: 10.1pt;
  }
</style></head><body>

<section class="page cover-page">
  ${strip}
  <header class="header">
    <div class="logo"><img class="logo-img" src="${LOGO_SRC}" alt="WestCamp Kids"></div>
    <div class="meta"><strong>${esc(shiftName)}</strong><br>${esc(date)}</div>
  </header>
  <div class="hero">
    <div class="photo-frame"><img src="${esc(r.photoPath)}" alt=""></div>
    <div>
      <p class="kicker">Карта талантів та емоційного інтелекту</p>
      <h1>${esc(r.childName)}</h1>
      <div class="quote">
        <div class="quote-mark">“</div>
        <p>${esc(r.wovenExample)}</p>
        <p class="signature">З любов'ю, ваш тім-лід та WestCamp family</p>
      </div>
    </div>
  </div>
  <div class="intro-card"><p>${esc(INTRO_TEXT)}</p></div>
  <div class="footer-label">Adventure · Education · Safety</div>
</section>

<section class="page analytics-page">
  ${strip}
  <header class="header">
    <div class="logo"><img class="logo-img" src="${LOGO_SRC}" alt="WestCamp Kids"></div>
    <div class="meta">${esc(shiftName)}</div>
  </header>
  <h2>Множинний інтелект за методикою Говарда Гарднера</h2>
  <div class="chart-layout">
    <div class="chart-box">${a.radarSvg}</div>
    <div class="talents">
      ${primaryCard(a.primary, r.childName, r.talentBridge)}
    </div>
  </div>
</section>

<section class="page">
  ${strip}
  <header class="header">
    <div class="logo"><img class="logo-img" src="${LOGO_SRC}" alt="WestCamp Kids"></div>
    <div class="meta">${esc(shiftName)}</div>
  </header>
  <h2>Другий талант і погляд у майбутнє</h2>
  <div class="talents">
    ${secondaryCard(secondary, r.childName)}
  </div>
  <div class="parents-grid">
    ${futureBlock("Хобі, які розвивають", a.primary, secondary, "hobbies")}
    ${futureBlock("Професії майбутнього", a.primary, secondary, "professions")}
  </div>
</section>

<section class="page">
  ${strip}
  <header class="header">
    <div class="logo"><img class="logo-img" src="${LOGO_SRC}" alt="WestCamp Kids"></div>
    <div class="meta">Для батьків</div>
  </header>
  <h2>Як взаємодіяти вдома</h2>
  <p>Ці підказки допоможуть підтримати природні сильні сторони дитини після табору і м'яко перевести їх у щоденні звички.</p>
  <div class="parents-grid">
    ${adviceCard("Прикладні поради", a.primary, secondary)}
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
