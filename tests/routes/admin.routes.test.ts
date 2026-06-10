import { describe, it, expect, vi } from "vitest";
import { buildServer } from "../../src/server.js";
import { insertReport } from "../../src/db/reports.repo.js";
import { getIntelligence } from "../../src/db/intelligences.repo.js";

vi.mock("../../src/services/pdf.js", () => ({
  renderPdf: vi.fn(async () => Buffer.from("%PDF-1.4 fake")),
  closeBrowser: vi.fn(async () => {}),
  downscalePhoto: vi.fn(async (s: string) => s),
}));

const cfg = {
  port: 0, formSecret: "S", adminSecret: "A", deepseekApiKey: "",
  dbPath: ":memory:", uploadDir: "./uploads-test",
};

describe("admin routes", () => {
  it("rejects wrong secret", async () => {
    const app = buildServer(cfg);
    const res = await app.inject({ method: "GET", url: "/admin/wrong" });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it("lists reports", async () => {
    const app = buildServer(cfg);
    insertReport(app.db, {
      id: "r1", childName: "Артем", shift: "3", primaryType: "musical",
      secondaryType: undefined, example: "x", wovenExample: "y", talentBridge: "b",
      photoPath: "/uploads/a.jpg", createdAt: "2026-06-08T10:00:00Z",
    });
    const res = await app.inject({ method: "GET", url: "/admin/A" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("Артем");
    await app.close();
  });

  it("updates a content description", async () => {
    const app = buildServer(cfg);
    const form = new URLSearchParams({
      title: "Музичний інтелект", tagline: "Оновлено",
      strengths: "Сильні сторони достатньо довгий текст для опису.",
      inCamp: "Прояв у таборі достатньо довгий текст для опису.",
      parentAdvice: "Поради батькам достатньо довгий текст для опису.",
    });
    const res = await app.inject({
      method: "POST", url: "/admin/A/content/musical",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: form.toString(),
    });
    expect(res.statusCode).toBe(302);
    expect(getIntelligence(app.db, "musical").tagline).toBe("Оновлено");
    await app.close();
  });
});
