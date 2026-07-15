import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { mkdirSync, createWriteStream } from "node:fs";
import { join, extname } from "node:path";
import { pipeline } from "node:stream/promises";
import { formPage, quotaBlockReason } from "../web/formPage.js";
import { reportInputSchema } from "../domain/validation.js";
import { buildReport, renderReportPdf } from "../services/reportBuilder.js";
import { getQuota, consumeAttempt } from "../db/quota.repo.js";
import { getReport } from "../db/reports.repo.js";

export async function formRoutes(app: FastifyInstance) {
  const cfg = app.appConfig;
  const db = app.db;

  app.get<{ Params: { secret: string } }>("/f/:secret", async (req, reply) => {
    if (req.params.secret !== cfg.formSecret) return reply.code(404).send("Not found");
    return reply.type("text/html").send(formPage(cfg.formSecret, undefined, getQuota(db)));
  });

  app.post<{ Params: { secret: string } }>("/f/:secret", async (req, reply) => {
    if (req.params.secret !== cfg.formSecret) return reply.code(404).send("Not found");

    const quota = getQuota(db);
    if (quotaBlockReason(quota)) {
      return reply.code(403).type("text/html").send(formPage(cfg.formSecret, undefined, quota));
    }

    const fields: Record<string, string> = {};
    let photoPath = "";
    mkdirSync(cfg.uploadDir, { recursive: true });

    const parts = req.parts();
    for await (const part of parts) {
      if (part.type === "file") {
        if (part.fieldname === "photo" && part.filename) {
          const name = `${randomUUID()}${extname(part.filename) || ".jpg"}`;
          photoPath = join(cfg.uploadDir, name);
          await pipeline(part.file, createWriteStream(photoPath));
        } else {
          part.file.resume();
        }
      } else {
        fields[part.fieldname] = String(part.value ?? "");
      }
    }

    const parsed = reportInputSchema.safeParse({
      childName: fields.childName,
      shift: fields.shift,
      primaryType: fields.primaryType,
      secondaryType: fields.secondaryType ? fields.secondaryType : undefined,
      example: fields.example ?? "",
      photoPath: photoPath || "missing",
    });

    if (!parsed.success || !photoPath) {
      const msg = !photoPath ? "Додайте фото дитини." : "Перевірте поля форми.";
      return reply.code(400).type("text/html").send(formPage(cfg.formSecret, msg, quota));
    }

    const { report, pdf } = await buildReport(parsed.data, {
      db,
      deepseekApiKey: cfg.deepseekApiKey,
    });
    consumeAttempt(db);

    const filename = `zvit-${report.childName}-zmina-${report.shift}.pdf`.replace(/\s+/g, "_");
    return reply
      .type("application/pdf")
      .header("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`)
      .send(pdf);
  });

  app.get<{ Params: { secret: string; id: string } }>(
    "/f/:secret/report/:id.pdf",
    async (req, reply) => {
      if (req.params.secret !== cfg.formSecret) return reply.code(404).send("Not found");
      const report = getReport(db, req.params.id);
      if (!report) return reply.code(404).send("Not found");
      const pdf = await renderReportPdf(db, report);
      return reply.type("application/pdf").send(pdf);
    }
  );
}
