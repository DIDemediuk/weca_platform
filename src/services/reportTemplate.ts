import { readFileSync } from "node:fs";
import { esc } from "../web/html.js";
import { childMentionName } from "../domain/childName.js";
import { INTELLIGENCE_TYPES, type IntelligenceType } from "../domain/types.js";
import type { IntelligenceContent, Report } from "../domain/types.js";
import { TYPE_COLORS } from "./typeColors.js";

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

function talentStrip(primary: IntelligenceType, secondary?: IntelligenceType): string {
  const segments = INTELLIGENCE_TYPES.map((type) => {
    const flex = type === primary ? 3 : type === secondary ? 2 : 1;
    return `<span data-type="${type}" style="flex:${flex};background:${TYPE_COLORS[type]}"></span>`;
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
  const primaryColor = TYPE_COLORS[r.primaryType];
  const secondaryColor = r.secondaryType ? TYPE_COLORS[r.secondaryType] : C.sky;
  const mentionName = childMentionName(r.childName);

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
    background: ${C.paper};
  }
  .page::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    border-top: 14mm solid #FFF3D7;
    border-right: 14mm solid transparent;
  }
  .page > * { position: relative; }
  .page:last-child { page-break-after: auto; }
  .closing-page {
    padding-bottom: 54mm;
  }
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
    background: #FFFFFF;
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
    min-height: 190mm;
  }
  .insight-flow {
    position: relative;
    height: 35mm;
    margin: 0 0 -2mm;
  }
  .insight-flow svg {
    display: block;
    width: 170mm;
    height: auto;
    margin: 0 auto;
  }
  .intro-kicker {
    position: relative;
    display: inline-block;
    font-size: 11.6pt;
    margin-bottom: 2.6mm;
    background: #FFFFFF;
    z-index: 1;
  }
  .intro-card {
    position: relative;
    margin-top: 0;
    background:
      linear-gradient(135deg, #FFFFFF, #FFF9EC),
      linear-gradient(88deg, #FFFFFF, #EAF7FB);
    border: .55mm solid ${C.line};
    border-radius: 8mm;
    padding: 7mm 8mm 7mm 17mm;
    box-shadow: 0 2mm 0 #E9F1EC;
    overflow: hidden;
  }
  .intro-card::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 8mm;
    background: ${C.orange};
    z-index: 0;
  }
  .intro-card::after {
    content: "";
    position: absolute;
    right: 5mm;
    top: 14mm;
    width: 58mm;
    height: 58mm;
    border-radius: 50%;
    background: #EFF8EF;
    border: 1.2mm solid #DDEBDD;
    z-index: 0;
  }
  .intro-card p {
    position: relative;
    z-index: 1;
    margin: 0;
    font-size: 12.4pt;
    line-height: 1.55;
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
    box-shadow: 0 2mm 0 #DBECEC;
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
    box-shadow: 0 1.4mm 0 #F1ECE2;
  }
  .chart-box {
    width: 101mm;
    margin: 0 auto;
    padding: 2mm;
    overflow: hidden;
    background: #F8FDFF;
  }
  .chart-box svg { width: 93mm; height: auto; display: block; margin: 0 auto; }
  .chart-box.chart-wide { width: 100%; }
  .chart-box.chart-wide svg { width: 150mm; }
  .talents {
    display: grid;
    gap: 4mm;
  }
  .talent-page .talents {
    gap: 9mm;
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
    background: #FFF7E3;
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
    margin-top: 4.5mm;
  }
  .split-grid {
    grid-template-columns: 1fr 1fr;
    gap: 4.5mm;
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
    grid-template-columns: 1fr 52mm;
    gap: 5mm;
    align-items: center;
    margin-top: 0;
    padding: 4mm 6mm;
    min-height: 34mm;
    border-radius: 7mm;
    background: linear-gradient(135deg, ${C.navy} 0%, ${C.navySoft} 58%, ${C.green} 100%);
    color: #fff;
  }
  .future-card h3 { color: #fff; margin-bottom: 1.5mm; font-size: 17pt; }
  .future-card p { color: #D8DFE8; margin-bottom: 0; font-size: 12.6pt; }
  .home-title { margin-top: 6mm; margin-bottom: 0; }
  .contact-card {
    display: grid;
    justify-items: center;
    gap: 1.2mm;
    border-radius: 5mm;
    background: #fff;
    color: ${C.navy};
    font-weight: 900;
    padding: 3mm;
    text-align: center;
  }
  .contact-logo {
    display: block;
    width: 18mm;
    height: auto;
  }
  .contact-card strong {
    display: block;
    color: ${C.navy};
    font-size: 10.4pt;
    line-height: 1.2;
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
  <div class="footer-label">Adventure · Education · Safety</div>
</section>

<section class="page analytics-page">
  ${strip}
  <header class="header">
    <div class="logo"><img class="logo-img" src="${LOGO_SRC}" alt="WestCamp Kids"></div>
    <div class="meta">${esc(shiftName)}</div>
  </header>
  <h2>Множинний інтелект за методикою Говарда Гарднера</h2>
  <div class="chart-box chart-wide">${a.radarSvg}</div>
  <div class="insight-flow">
    <svg viewBox="0 0 820 164" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M644 18 C 560 20, 518 48, 594 66 C 682 87, 620 124, 493 113 C 360 102, 335 136, 176 128"
        fill="none" stroke="#FFF3D7" stroke-width="24" stroke-linecap="round"/>
      <path d="M644 18 C 560 20, 518 48, 594 66 C 682 87, 620 124, 493 113 C 360 102, 335 136, 176 128"
        fill="none" stroke="${C.navySoft}" stroke-width="4.4" stroke-linecap="round" stroke-dasharray="2 14"/>
      <path d="M188 115 l-24 15 26 12" fill="none" stroke="${C.orange}" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="644" cy="18" r="7.5" fill="${primaryColor}" stroke="#FFFFFF" stroke-width="2"/>
      <circle cx="596" cy="66" r="6" fill="${secondaryColor}" stroke="#FFFFFF" stroke-width="2"/>
      <circle cx="505" cy="113" r="4.5" fill="${C.yellow}"/>
      <circle cx="392" cy="115" r="3.8" fill="${C.green}"/>
      <circle cx="260" cy="129" r="3.8" fill="${C.sky}"/>
      <g fill="${C.green}" stroke="${C.navySoft}" stroke-width="1.4" stroke-linejoin="round">
        <path d="M680 27 l10 -18 l10 18 h-6 l8 13 h-24 l8 -13z"/>
        <path d="M704 48 l9 -16 l9 16 h-5 l7 12 h-22 l7 -12z"/>
        <path d="M656 52 l9 -16 l9 16 h-5 l7 12 h-22 l7 -12z"/>
        <path d="M724 77 l8 -15 l8 15 h-5 l7 11 h-20 l7 -11z"/>
        <path d="M636 82 l8 -15 l8 15 h-5 l7 11 h-20 l7 -11z"/>
        <path d="M586 128 l10 -18 l10 18 h-6 l8 13 h-24 l8 -13z"/>
        <path d="M430 88 l8 -15 l8 15 h-5 l7 11 h-20 l7 -11z"/>
        <path d="M304 109 l8 -15 l8 15 h-5 l7 11 h-20 l7 -11z"/>
      </g>
      <g stroke="${C.navySoft}" stroke-width="2" stroke-linecap="round">
        <path d="M690 40 v8"/>
        <path d="M713 60 v8"/>
        <path d="M665 64 v8"/>
        <path d="M732 88 v7"/>
        <path d="M644 93 v7"/>
        <path d="M596 141 v8"/>
        <path d="M438 99 v7"/>
        <path d="M312 120 v7"/>
      </g>
      <path d="M618 42 l18 -8 v28 l-18 -8 z" fill="${C.orange}"/>
      <path d="M618 34 v34" stroke="${C.navy}" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M374 133 c11 -13 27 -11 37 0 c-13 6 -25 6 -37 0z" fill="${C.green}"/>
      <path d="M390 125 c4 9 4 17 0 25" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M474 46 l3.8 9 9 3.8 -9 3.8 -3.8 9 -3.8 -9 -9 -3.8 9 -3.8 z" fill="${C.yellow}"/>
      <g transform="translate(610 61) rotate(9)">
        <path d="M-48 6 h9 l12 -20 h46 l15 20 h9 c7 0 13 6 13 13 v16 h-112 v-16 c0 -7 6 -13 13 -13z"
          fill="${C.orange}" stroke="${C.navy}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M-22 -10 h34 l10 16 h-54z" fill="#FFFFFF" stroke="${C.navySoft}" stroke-width="2"/>
        <rect x="-31" y="9" width="53" height="16" rx="4" fill="#FFFFFF"/>
        <image href="${LOGO_SRC}" x="-47" y="1.8" width="88" height="30.5" preserveAspectRatio="xMidYMid meet"/>
        <circle cx="-36" cy="36" r="9" fill="${C.navy}"/>
        <circle cx="35" cy="36" r="9" fill="${C.navy}"/>
        <circle cx="-36" cy="36" r="3.4" fill="#FFFFFF"/>
        <circle cx="35" cy="36" r="3.4" fill="#FFFFFF"/>
      </g>
      <path d="M231 133 c-8 -9 -19 -9 -27 0" fill="none" stroke="${C.line}" stroke-width="3" stroke-linecap="round"/>
      <path d="M536 92 c-8 -9 -19 -9 -27 0" fill="none" stroke="${C.line}" stroke-width="3" stroke-linecap="round"/>
      <circle cx="132" cy="128" r="33" fill="#FFF7D6" stroke="#FFE19A" stroke-width="3"/>
      <path d="M112 128 h40 M132 108 v40 M118 116 l28 24 M146 116 l-28 24" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/>
      <rect x="112" y="112" width="48" height="32" rx="7" fill="#FFFFFF" stroke="${C.line}" stroke-width="3"/>
      <path d="M124 124 h24 M124 134 h18" stroke="${C.navySoft}" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="153" cy="118" r="5" fill="${C.sky}"/>
    </svg>
  </div>
  <div class="intro-card" style="--primary:${primaryColor};--secondary:${secondaryColor}">
    <p class="kicker intro-kicker">Слово від команди WestCamp</p>
    <p>${esc(INTRO_TEXT)}</p>
  </div>
</section>

<section class="page talent-page">
  ${strip}
  <header class="header">
    <div class="logo"><img class="logo-img" src="${LOGO_SRC}" alt="WestCamp Kids"></div>
    <div class="meta">${esc(shiftName)}</div>
  </header>
  <h2>Найяскравіші таланти дитини</h2>
  <div class="talents">
    ${primaryCard(a.primary, mentionName, r.talentBridge)}
    ${secondaryCard(secondary, mentionName)}
  </div>
</section>

<section class="page closing-page">
  ${strip}
  <header class="header">
    <div class="logo"><img class="logo-img" src="${LOGO_SRC}" alt="WestCamp Kids"></div>
    <div class="meta">Для батьків</div>
  </header>
  <h2>Погляд у майбутнє</h2>
  <div class="parents-grid split-grid">
    ${futureBlock("Хобі, які розвивають", a.primary, secondary, "hobbies")}
    ${futureBlock("Професії майбутнього", a.primary, secondary, "professions")}
  </div>
  <h2 class="home-title">Як взаємодіяти вдома</h2>
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
