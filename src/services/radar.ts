import { INTELLIGENCE_TYPES, type IntelligenceType } from "../domain/types.js";
import { TYPE_COLORS } from "./typeColors.js";

const ACCENT = "#1FB6A6";
const MUTED = "#C9D6CC";
const GRID = "#D8E0D6";
const FONT = `font-family="Inter, system-ui, sans-serif"`;

// Two-line labels for long compound names (split at natural hyphen boundary)
const LABELS: [string, string?][] = [
  ["Лінгвістичний"],
  ["Логіко-", "математичний"],
  ["Просторовий"],
  ["Тілесно-", "кінестетичний"],
  ["Музичний"],
  ["Між-", "особистісний"],
  ["Внутрішньо-", "особистісний"],
  ["Натуралістичний"],
];

const FS = 12;    // font-size for single-line labels (px in SVG coordinates)
const FS2 = 11;   // font-size for two-line labels
const LH = 14;   // line-height spacing for two-line (px)

function makeLabel(lx: number, ly: number, cx: number, lines: [string, string?], hiColor?: string): string {
  const color = hiColor ?? "#8A9E94";
  const weight = hiColor ? "800" : "500";
  const dx = lx - cx;
  const anchor = Math.abs(dx) < 30 ? "middle" : dx > 0 ? "start" : "end";

  if (lines[1]) {
    const y1 = (ly - LH / 2).toFixed(1);
    const y2 = (ly + LH / 2).toFixed(1);
    return (
      `<text ${FONT} font-size="${FS2}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}">` +
      `<tspan x="${lx.toFixed(1)}" y="${y1}">${lines[0]}</tspan>` +
      `<tspan x="${lx.toFixed(1)}" y="${y2}">${lines[1]}</tspan>` +
      `</text>`
    );
  }
  return (
    `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" ${FONT}` +
    ` font-size="${FS}" font-weight="${weight}" fill="${color}"` +
    ` text-anchor="${anchor}" dominant-baseline="central">${lines[0]}</text>`
  );
}

export function renderRadarSvg(highlighted: IntelligenceType[]): string {
  const width = 640;
  const height = 500;
  const cx = width / 2;
  const cy = height / 2;
  const rMax = 130;
  const n = INTELLIGENCE_TYPES.length;
  const baseLevel = 0.45;
  const hiLevel = 1.0;

  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const point = (i: number, level: number) => {
    const a = angle(i);
    return [cx + Math.cos(a) * rMax * level, cy + Math.sin(a) * rMax * level] as const;
  };

  // Grid rings
  let rings = "";
  for (const f of [0.25, 0.5, 0.75, 1]) {
    const pts = INTELLIGENCE_TYPES.map((_, i) => point(i, f).join(",")).join(" ");
    rings += `<polygon points="${pts}" fill="none" stroke="${GRID}" stroke-width="1"/>`;
  }

  // Spokes
  let spokes = "";
  INTELLIGENCE_TYPES.forEach((_, i) => {
    const [x, y] = point(i, 1);
    spokes += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="${GRID}" stroke-width="1"/>`;
  });

  // Колір головного типу домінує: ним малюється весь профіль дитини.
  const primaryColor = highlighted.length > 0 ? TYPE_COLORS[highlighted[0]] : ACCENT;

  // Data polygon
  const dataPts = INTELLIGENCE_TYPES.map((type, i) =>
    point(i, highlighted.includes(type) ? hiLevel : baseLevel).join(",")
  ).join(" ");
  const polygon = `<polygon points="${dataPts}" fill="${primaryColor}26" stroke="${primaryColor}" stroke-width="2.5"/>`;

  // Dots on highlighted vertices, each in its own header color
  let dots = "";
  INTELLIGENCE_TYPES.forEach((type, i) => {
    if (!highlighted.includes(type)) return;
    const [x, y] = point(i, hiLevel);
    dots += `<circle cx="${x}" cy="${y}" r="5.5" fill="${TYPE_COLORS[type]}" stroke="#FFFFFF" stroke-width="1.6"/>`;
  });

  // Axis tip markers and text labels
  let labels = "";
  INTELLIGENCE_TYPES.forEach((type, i) => {
    const isHi = highlighted.includes(type);
    // Small circle at axis tip
    const [tx, ty] = point(i, 1);
    labels += `<circle cx="${tx}" cy="${ty}" r="3.5" fill="${isHi ? TYPE_COLORS[type] : MUTED}" stroke="${isHi ? TYPE_COLORS[type] : GRID}" stroke-width="1"/>`;
    // Full-name label, kept inside the SVG safe area.
    const [lx, ly] = point(i, 1.52);
    labels += makeLabel(lx, ly, cx, LABELS[i], isHi ? TYPE_COLORS[type] : undefined);
  });

  return (
    `<svg xmlns="http://www.w3.org/2000/svg"` +
    ` width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    rings + spokes + polygon + dots + labels +
    `<circle cx="${cx}" cy="${cy}" r="2.5" fill="${MUTED}"/>` +
    `</svg>`
  );
}
