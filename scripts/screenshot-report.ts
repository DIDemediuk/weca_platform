import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { SEED_INTELLIGENCES } from "../src/domain/intelligences.seed.js";
import type { IntelligenceType, Report } from "../src/domain/types.js";
import { renderRadarSvg } from "../src/services/radar.js";
import { renderReportHtml } from "../src/services/reportTemplate.js";

const byType = (type: IntelligenceType) => {
  const item = SEED_INTELLIGENCES.find((i) => i.type === type);
  if (!item) throw new Error(`Missing seed content for ${type}`);
  return item;
};

const photo = `data:image/svg+xml;base64,${Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="900" height="1200" fill="#e8f1ed"/><circle cx="450" cy="430" r="130" fill="#f0c35a"/><path d="M250 910c52-180 120-270 200-270s148 90 200 270" fill="#2f6b45"/></svg>`
).toString("base64")}`;

async function shoot(primary: IntelligenceType, secondary: IntelligenceType | undefined, prefix: string) {
  const report: Report = {
    id: "preview",
    childName: "Артем",
    shift: "3 Kids",
    primaryType: primary,
    secondaryType: secondary,
    example: "Капітанство у квесті.",
    wovenExample:
      "Артем зібрав команду навколо себе під час великого квесту і впевнено вів її до фіналу, підтримуючи кожного.",
    talentBridge:
      "«Капітанство у квесті» — саме в таких моментах Артем розкривається найяскравіше. Для нашої команди це живе підтвердження таланту.",
    photoPath: photo,
    createdAt: new Date().toISOString(),
  };
  const html = renderReportHtml({
    report,
    primary: byType(primary),
    secondary: secondary ? byType(secondary) : undefined,
    radarSvg: renderRadarSvg([primary, secondary].filter(Boolean) as IntelligenceType[]),
  });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 1273 } });
  await page.setContent(html, { waitUntil: "networkidle" });
  const sections = page.locator("section.page");
  const count = await sections.count();
  for (let i = 0; i < count; i++) {
    await sections.nth(i).screenshot({ path: `tmp/${prefix}-page${i + 1}.png` });
  }
  await browser.close();
  console.log(`${count} screenshots written for ${prefix}`);
}

await mkdir("tmp", { recursive: true });
await shoot("musical", "intrapersonal", "strip-duo");
await shoot("kinesthetic", undefined, "strip-solo");
