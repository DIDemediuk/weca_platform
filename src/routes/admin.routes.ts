import type { FastifyInstance } from "fastify";
import formbody from "@fastify/formbody";
import { adminListPage, adminContentPage } from "../web/adminPages.js";
import { listReports, getReport, listReportEvents, logReportEvent } from "../db/reports.repo.js";
import { listIntelligences, updateIntelligence } from "../db/intelligences.repo.js";
import { getQuota, setUnlimited, addAttempts, setAccessEnabled, resetQuota } from "../db/quota.repo.js";
import { renderReportPdf } from "../services/reportBuilder.js";
import { INTELLIGENCE_TYPES, type IntelligenceType } from "../domain/types.js";

export async function adminRoutes(app: FastifyInstance) {
  await app.register(formbody);
  const cfg = app.appConfig;
  const db = app.db;
  const guard = (s: string) => s === cfg.adminSecret;

  app.get<{ Params: { secret: string }; Querystring: { tab?: string } }>("/admin/:secret", async (req, reply) => {
    if (!guard(req.params.secret)) return reply.code(404).send("Not found");
    const tab = req.query.tab === "settings" ? "settings" : "reports";
    return reply.type("text/html").send(adminListPage(cfg.adminSecret, listReports(db), listReportEvents(db), getQuota(db), tab));
  });

  app.post<{ Params: { secret: string }; Body: Record<string, string> }>(
    "/admin/:secret/quota",
    async (req, reply) => {
      if (!guard(req.params.secret)) return reply.code(404).send("Not found");
      const b = req.body;
      switch (b.action) {
        case "unlimited_on": setUnlimited(db, true); break;
        case "unlimited_off": setUnlimited(db, false); break;
        case "add": addAttempts(db, Number(b.amount)); break;
        case "disable": setAccessEnabled(db, false); break;
        case "enable": setAccessEnabled(db, true); break;
        case "reset": resetQuota(db); break;
        default: return reply.code(400).send("Unknown action");
      }
      return reply.redirect(`/admin/${cfg.adminSecret}?tab=settings`);
    }
  );

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
      const pdf = await renderReportPdf(db, report);
      return reply.type("application/pdf").send(pdf);
    }
  );
}
