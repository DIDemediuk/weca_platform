import type { DB } from "../db/index.js";
import { getIntelligence } from "../db/intelligences.repo.js";
import { insertReport, logReportEvent } from "../db/reports.repo.js";
import { renderRadarSvg } from "./radar.js";
import { renderReportHtml } from "./reportTemplate.js";
import { weaveReport, type WeaveArgs, type WeaveResult } from "./ai.js";
import { renderPdf, downscalePhoto } from "./pdf.js";
import { imageFileToDataUri } from "./imageSrc.js";
import type { Report, IntelligenceType } from "../domain/types.js";
import type { ReportInputParsed } from "../domain/validation.js";

export interface BuildDeps {
  db: DB;
  deepseekApiKey: string;
  weave?: (a: WeaveArgs) => Promise<WeaveResult>;
  render?: (html: string) => Promise<Buffer>;
  idGen?: () => string;
  now?: () => Date;
  photoToSrc?: (photoPath: string) => string | Promise<string>;
}

export interface BuildResult {
  report: Report;
  pdf: Buffer;
}

export async function buildReport(input: ReportInputParsed, deps: BuildDeps): Promise<BuildResult> {
  const weave = deps.weave ?? weaveReport;
  const render = deps.render ?? renderPdf;
  const idGen = deps.idGen ?? (() => Math.random().toString(36).slice(2, 10));
  const now = deps.now ?? (() => new Date());
  const photoToSrc = deps.photoToSrc ?? (async (p: string) => downscalePhoto(await imageFileToDataUri(p)));

  const primary = getIntelligence(deps.db, input.primaryType);
  const secondary = input.secondaryType
    ? getIntelligence(deps.db, input.secondaryType)
    : undefined;

  const woven = await weave({
    childName: input.childName,
    example: input.example,
    primaryType: input.primaryType,
    primaryTitle: primary.title,
    secondaryType: input.secondaryType,
    secondaryTitle: secondary?.title,
    apiKey: deps.deepseekApiKey,
  });

  const report: Report = {
    id: idGen(),
    childName: input.childName,
    shift: input.shift,
    primaryType: input.primaryType,
    secondaryType: input.secondaryType,
    example: input.example,
    wovenExample: woven.coverQuote,
    talentBridge: woven.talentBridge,
    photoPath: input.photoPath,
    createdAt: now().toISOString(),
  };
  insertReport(deps.db, report);
  logReportEvent(deps.db, report.id, "created");

  const highlighted = [input.primaryType, input.secondaryType].filter(Boolean) as IntelligenceType[];
  const radarSvg = renderRadarSvg(highlighted);
  const photoSrc = await photoToSrc(report.photoPath);
  const html = renderReportHtml({
    report: { ...report, photoPath: photoSrc },
    primary,
    secondary,
    radarSvg,
  });
  const pdf = await render(html);
  return { report, pdf };
}
