import { describe, it, expect, vi } from "vitest";
import { buildServer } from "../../src/server.js";
import { insertReport } from "../../src/db/reports.repo.js";
import { getIntelligence } from "../../src/db/intelligences.repo.js";
import { getQuota } from "../../src/db/quota.repo.js";

async function postQuota(app: ReturnType<typeof buildServer>, body: Record<string, string>) {
  return app.inject({
    method: "POST", url: "/admin/A/quota",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    payload: new URLSearchParams(body).toString(),
  });
}

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

  it("manages the usage quota", async () => {
    const app = buildServer(cfg);

    expect((await postQuota(app, { action: "unlimited_on" })).statusCode).toBe(302);
    expect(getQuota(app.db).unlimited).toBe(true);

    expect((await postQuota(app, { action: "unlimited_off" })).statusCode).toBe(302);
    expect(getQuota(app.db).unlimited).toBe(false);

    expect((await postQuota(app, { action: "add", amount: "5" })).statusCode).toBe(302);
    expect(getQuota(app.db).remaining).toBe(8);

    expect((await postQuota(app, { action: "disable" })).statusCode).toBe(302);
    expect(getQuota(app.db).accessEnabled).toBe(false);

    expect((await postQuota(app, { action: "enable" })).statusCode).toBe(302);
    expect(getQuota(app.db).accessEnabled).toBe(true);

    expect((await postQuota(app, { action: "reset" })).statusCode).toBe(302);
    expect(getQuota(app.db)).toEqual({ remaining: 3, unlimited: false, accessEnabled: true });

    expect((await postQuota(app, { action: "bogus" })).statusCode).toBe(400);
    await app.close();
  });

  it("rejects quota changes with wrong secret", async () => {
    const app = buildServer(cfg);
    const res = await app.inject({
      method: "POST", url: "/admin/wrong/quota",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: "action=reset",
    });
    expect(res.statusCode).toBe(404);
    await app.close();
  });
});
