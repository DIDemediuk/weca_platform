import type { DB } from "../db/index.js";
import { getIntelligence } from "../db/intelligences.repo.js";
import { insertReport } from "../db/reports.repo.js";
import { renderRadarSvg } from "./radar.js";
import { renderReportHtml } from "./reportTemplate.js";
import { weaveExample, type WeaveArgs } from "./ai.js";
import { renderPdf } from "./pdf.js";
import type { Report, IntelligenceType } from "../domain/types.js";
import type { ReportInputParsed } from "../domain/validation.js";

export interface BuildDeps {
  db: DB;
  deepseekApiKey: string;
  weave?: (a: WeaveArgs) => Promise<string>;
  render?: (html: string) => Promise<Buffer>;
  idGen?: () => string;
  now?: () => Date;
  photoToSrc?: (photoPath: string) => string;
}

export interface BuildResult {
  report: Report;
  pdf: Buffer;
}

export async function buildReport(input: ReportInputParsed, deps: BuildDeps): Promise<BuildResult> {
  const weave = deps.weave ?? weaveExample;
  const render = deps.render ?? renderPdf;
  const idGen = deps.idGen ?? (() => Math.random().toString(36).slice(2, 10));
  const now = deps.now ?? (() => new Date());
  const photoToSrc = deps.photoToSrc ?? ((p) => p);

  const primary = getIntelligence(deps.db, input.primaryType);
  const secondary = input.secondaryType
    ? getIntelligence(deps.db, input.secondaryType)
    : undefined;

  const wovenExample = await weave({
    childName: input.childName,
    example: input.example,
    primaryTitle: primary.title,
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
    wovenExample,
    photoPath: input.photoPath,
    createdAt: now().toISOString(),
  };
  insertReport(deps.db, report);

  const highlighted = [input.primaryType, input.secondaryType].filter(Boolean) as IntelligenceType[];
  const radarSvg = renderRadarSvg(highlighted);
  const html = renderReportHtml({
    report: { ...report, photoPath: photoToSrc(report.photoPath) },
    primary,
    secondary,
    radarSvg,
  });
  const pdf = await render(html);
  return { report, pdf };
}
