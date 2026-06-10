import { describe, it, expect, vi, afterEach } from "vitest";
import { buildWeavePrompt, weaveExample } from "../../src/services/ai.js";

const args = {
  childName: "Артем",
  example: "Взяв капітанство у квесті та привів команду до перемоги.",
  primaryType: "kinesthetic" as const,
  primaryTitle: "Тілесно-кінестетичний інтелект",
  secondaryType: "interpersonal" as const,
  secondaryTitle: "Міжособистісний інтелект",
};

afterEach(() => vi.restoreAllMocks());

describe("weaveExample", () => {
  it("falls back when no api key", async () => {
    const out = await weaveExample({ ...args, apiKey: "" });
    expect(out).toContain("Артем");
    expect(out).toContain("капітанство");
    expect(out).toContain("не сухий тест");
  });

  it("builds a richer, warmer prompt with knowledge context", () => {
    const prompt = buildWeavePrompt({ ...args, apiKey: "key" });
    expect(prompt).toContain("База знань для інтерпретації");
    expect(prompt).toContain("спорт");
    expect(prompt).toContain("команд");
    expect(prompt).toContain("без сюсюкання");
    expect(prompt).toContain("Не використовуй канцелярит");
  });

  it("returns AI content when api responds", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: "Оживлений абзац про Артема." } }] }),
        { status: 200 })
    ));
    const out = await weaveExample({ ...args, apiKey: "key" });
    expect(out).toBe("Оживлений абзац про Артема.");
  });

  it("falls back on http error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("err", { status: 500 })));
    const out = await weaveExample({ ...args, apiKey: "key" });
    expect(out).toContain("капітанство");
  });

  it("falls back on network throw", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const out = await weaveExample({ ...args, apiKey: "key" });
    expect(out).toContain("Артем");
  });
});
