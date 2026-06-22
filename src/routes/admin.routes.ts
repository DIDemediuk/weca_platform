import type { FastifyInstance } from "fastify";
import formbody from "@fastify/formbody";
import { adminListPage, adminContentPage } from "../web/adminPages.js";
import { listReports, getReport, listReportEvents, logReportEvent } from "../db/reports.repo.js";
import { listIntelligences, getIntelligence, updateIntelligence } from "../db/intelligences.repo.js";
import { renderRadarSvg } from "../services/radar.js";
import { renderReportHtml } from "../services/reportTemplate.js";
import { renderPdf, downscalePhoto } from "../services/pdf.js";
import { imageFileToDataUri } from "../services/imageSrc.js";
import { INTELLIGENCE_TYPES, type IntelligenceType } from "../domain/types.js";

export async function adminRoutes(app: FastifyInstance) {
  await app.register(formbody);
  const cfg = app.appConfig;
  const db = app.db;
  const guard = (s: string) => s === cfg.adminSecret;

  app.get<{ Params: { secret: string } }>("/admin/:secret", async (req, reply) => {
    if (!guard(req.params.secret)) return reply.code(404).send("Not found");
    return reply.type("text/html").send(adminListPage(cfg.adminSecret, listReports(db), listReportEvents(db)));
  });

  app.get<{ Params: { secret: string } }>("/admin/:secret/content", async (req, reply) => {
    if (!guard(req.params.secret)) return reply.code(404).send("Not found");
    return reply.type("text/html").send(adminContentPage(cfg.adminSecret, listIntelligences(db)));
  });

  app.post<{ Params: { secret: string; type: string }; Body: Record<string, string> }>(
    "/admin/:secret/content/:type",
    async (req, reply) => {
      if (!guard(req.params.secret)) return reply.code(404).send("Not found");
      const type = req.params.type as IntelligenceType;
      if (!INTELLIGENCE_TYPES.includes(type)) return reply.code(404).send("Unknown type");
      const b = req.body;
      updateIntelligence(db, {
        type, title: b.title, tagline: b.tagline, strengths: b.strengths,
        inCamp: b.inCamp, parentAdvice: b.parentAdvice,
        hobbies: b.hobbies ?? "", professions: b.professions ?? "",
      });
      return reply.redirect(`/admin/${cfg.adminSecret}/content`);
    }
  );

  app.get<{ Params: { secret: string; id: string } }>(
    "/admin/:secret/report/:id.pdf",
    async (req, reply) => {
      if (!guard(req.params.secret)) return reply.code(404).send("Not found");
      const report = getReport(db, req.params.id);
      if (!report) return reply.code(404).send("Not found");
      logReportEvent(db, report.id, "downloaded");
      const primary = getIntelligence(db, report.primaryType);
      const secondary = report.secondaryType ? getIntelligence(db, report.secondaryType) : undefined;
      const highlighted = [report.primaryType, report.secondaryType].filter(Boolean) as IntelligenceType[];
      const photoSrc = await downscalePhoto(await imageFileToDataUri(report.photoPath));
      const html = renderReportHtml({
        report: { ...report, photoPath: photoSrc },
        primary, secondary, radarSvg: renderRadarSvg(highlighted),
      });
      const pdf = await renderPdf(html);
      return reply.type("application/pdf").send(pdf);
    }
  );
}
