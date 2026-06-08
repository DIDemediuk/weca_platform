import { esc } from "../web/html.js";
import type { IntelligenceContent, Report } from "../domain/types.js";

export interface TemplateArgs {
  report: Report;
  primary: IntelligenceContent;
  secondary?: IntelligenceContent;
  radarSvg: string;
}

const C = {
  green: "#2F5D3A", wood: "#6B4A2B", accent: "#1FB6A6",
  cream: "#F7F4EC", ink: "#2B2B2B", muted: "#8A8A8A",
};

function typeSection(c: IntelligenceContent): string {
  return `
  <section class="type">
    <h2>${esc(c.title)}</h2>
    <p class="tagline">${esc(c.tagline)}</p>
    <h3>Сильні сторони</h3><p>${esc(c.strengths)}</p>
    <h3>Як це проявлялося в таборі</h3><p>${esc(c.inCamp)}</p>
  </section>`;
}

function adviceBlock(c: IntelligenceContent): string {
  return `<div class="advice"><h3>${esc(c.title)}</h3><p>${esc(c.parentAdvice)}</p></div>`;
}

export function renderReportHtml(a: TemplateArgs): string {
  const { report: r } = a;
  const chosen = [a.primary, a.secondary].filter(Boolean) as IntelligenceContent[];
  return `<!doctype html><html lang="uk"><head><meta charset="utf-8">
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: ${C.ink}; }
  .page { width: 210mm; min-height: 297mm; padding: 22mm 20mm; page-break-after: always; background: ${C.cream}; }
  .page:last-child { page-break-after: auto; }
  .cover { background: ${C.green}; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  .cover .photo { width: 70mm; height: 70mm; border-radius: 50%; object-fit: cover; border: 6px solid ${C.accent}; margin-bottom: 14mm; }
  .cover h1 { font-size: 30pt; margin: 0 0 6mm; }
  .cover .sub { font-size: 13pt; opacity: .9; }
  .brand { letter-spacing: 2px; text-transform: uppercase; font-size: 10pt; margin-top: 16mm; opacity: .85; }
  h2 { color: ${C.green}; font-size: 20pt; margin: 0 0 2mm; }
  .tagline { color: ${C.accent}; font-weight: 700; margin: 0 0 6mm; }
  h3 { color: ${C.wood}; font-size: 12pt; margin: 6mm 0 1mm; }
  p { line-height: 1.55; font-size: 11.5pt; margin: 0 0 3mm; }
  .radar { text-align: center; margin: 8mm 0; }
  .woven { background: #fff; border-left: 5px solid ${C.accent}; padding: 6mm 7mm; border-radius: 6px; font-size: 12pt; }
  .advice { background: #fff; border-radius: 8px; padding: 6mm 7mm; margin-bottom: 5mm; }
  .section-title { color: ${C.green}; font-size: 16pt; margin-bottom: 5mm; }
</style></head><body>

  <div class="page cover">
    <img class="photo" src="${esc(r.photoPath)}" alt="">
    <h1>${esc(r.childName)}</h1>
    <div class="sub">Зміна ${esc(r.shift)} · Звіт про сильні сторони</div>
    <div class="brand">WestCamp Kids</div>
  </div>

  <div class="page">
    <h2 class="section-title">Профіль сильних сторін</h2>
    <div class="radar">${a.radarSvg}</div>
    <div class="woven">${esc(r.wovenExample)}</div>
  </div>

  <div class="page">
    ${chosen.map(typeSection).join("")}
  </div>

  <div class="page">
    <h2 class="section-title">Як підтримати ці сильні сторони вдома</h2>
    ${chosen.map(adviceBlock).join("")}
  </div>

</body></html>`;
}
