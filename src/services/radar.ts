import { INTELLIGENCE_TYPES, type IntelligenceType } from "../domain/types.js";

const SHORT_LABELS: Record<IntelligenceType, [string, string]> = {
  linguistic: ["Лінгв.", "слово"],
  logical: ["Логіко", "матем."],
  spatial: ["Простор.", "образи"],
  kinesthetic: ["Тілесно", "руховий"],
  musical: ["Музич.", "ритм"],
  interpersonal: ["Міжособ.", "команда"],
  intrapersonal: ["Внутріш.", "рефлексія"],
  naturalistic: ["Натурал.", "природа"],
};

const ACCENT = "#1FB6A6";
const MUTED = "#C9D6CC";
const GRID = "#D8E0D6";

export function renderRadarSvg(highlighted: IntelligenceType[]): string {
  const size = 480;
  const cx = size / 2;
  const cy = size / 2;
  const rMax = 140;
  const n = INTELLIGENCE_TYPES.length;
  const baseLevel = 0.45; // non-highlighted reach
  const hiLevel = 1.0;

  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const point = (i: number, level: number) => {
    const a = angle(i);
    return [cx + Math.cos(a) * rMax * level, cy + Math.sin(a) * rMax * level] as const;
  };

  // grid rings
  let rings = "";
  for (const f of [0.25, 0.5, 0.75, 1]) {
    const pts = INTELLIGENCE_TYPES.map((_, i) => point(i, f).join(",")).join(" ");
    rings += `<polygon points="${pts}" fill="none" stroke="${GRID}" stroke-width="1"/>`;
  }
  // spokes + labels
  let spokes = "";
  let labels = "";
  INTELLIGENCE_TYPES.forEach((type, i) => {
    const [x, y] = point(i, 1);
    spokes += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="${GRID}" stroke-width="1"/>`;
    const [lx, ly] = point(i, 1.42);
    const anchor = Math.abs(lx - cx) < 8 ? "middle" : lx > cx ? "start" : "end";
    const isHi = highlighted.includes(type);
    const [line1, line2] = SHORT_LABELS[type];
    labels += `<text x="${lx}" y="${ly - 7}" font-size="12" text-anchor="${anchor}" dominant-baseline="middle" fill="${isHi ? ACCENT : "#6B7A6E"}" font-weight="${isHi ? 700 : 500}">${line1}</text>`;
    labels += `<text x="${lx}" y="${ly + 7}" font-size="10" text-anchor="${anchor}" dominant-baseline="middle" fill="${isHi ? ACCENT : "#6B7A6E"}" font-weight="${isHi ? 700 : 400}">${line2}</text>`;
  });
  // data polygon
  const dataPts = INTELLIGENCE_TYPES.map((type, i) =>
    point(i, highlighted.includes(type) ? hiLevel : baseLevel).join(",")
  ).join(" ");
  const fill = ACCENT + "33";
  const polygon = `<polygon points="${dataPts}" fill="${fill}" stroke="${ACCENT}" stroke-width="2.5"/>`;
  // dots on highlighted vertices
  let dots = "";
  INTELLIGENCE_TYPES.forEach((type, i) => {
    if (!highlighted.includes(type)) return;
    const [x, y] = point(i, hiLevel);
    dots += `<circle cx="${x}" cy="${y}" r="5" fill="${ACCENT}"/>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${rings}${spokes}${polygon}${dots}${labels}<circle cx="${cx}" cy="${cy}" r="2.5" fill="${MUTED}"/></svg>`;
}
