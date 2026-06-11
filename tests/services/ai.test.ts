import { describe, it, expect, vi, afterEach } from "vitest";
import { buildWeavePrompt, weaveReport } from "../../src/services/ai.js";

const args = {
  childName: "Артем",
  example: "Взяв капітанство у квесті та привів команду до перемоги.",
  primaryType: "kinesthetic" as const,
  primaryTitle: "Тілесно-кінестетичний інтелект",
  secondaryType: "interpersonal" as const,
  secondaryTitle: "Міжособистісний інтелект",
};

afterEach(() => vi.restoreAllMocks());

describe("weaveReport", () => {
  it("falls back when no api key", async () => {
    const out = await weaveReport({ ...args, apiKey: "" });
    expect(out.coverQuote).toContain("Артем");
    expect(out.coverQuote).toContain("капітанство");
    expect(out.talentBridge).toContain("Артем");
    expect(out.talentBridge).toContain("капітанство");
  });

  it("uses only the first name in generated prompt and fallback text", async () => {
    const fullNameArgs = { ...args, childName: "Коваль Артем Олегович" };
    const prompt = buildWeavePrompt({ ...fullNameArgs, apiKey: "key" });
    const out = await weaveReport({ ...fullNameArgs, apiKey: "" });

    expect(prompt).toContain("Дитина: Артем.");
    expect(prompt).not.toContain("Коваль Артем Олегович");
    expect(out.coverQuote).toContain("Артем");
    expect(out.coverQuote).not.toContain("Коваль Артем Олегович");
  });

  it("builds a prompt asking for JSON with two fields", () => {
    const prompt = buildWeavePrompt({ ...args, apiKey: "key" });
    expect(prompt).toContain("База знань для інтерпретації");
    expect(prompt).toContain("coverQuote");
    expect(prompt).toContain("talentBridge");
    expect(prompt).toContain("без сюсюкання");
  });

  it("returns both AI texts when api responds with json", async () => {
    const content = JSON.stringify({ coverQuote: "Цитата про Артема.", talentBridge: "Місток про Артема." });
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 })
    ));
    const out = await weaveReport({ ...args, apiKey: "key" });
    expect(out.coverQuote).toBe("Цитата про Артема.");
    expect(out.talentBridge).toBe("Місток про Артема.");
  });

  it("falls back when api returns malformed json", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: "просто текст" } }] }), { status: 200 })
    ));
    const out = await weaveReport({ ...args, apiKey: "key" });
    expect(out.coverQuote).toContain("капітанство");
  });

  it("falls back on http error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("err", { status: 500 })));
    const out = await weaveReport({ ...args, apiKey: "key" });
    expect(out.coverQuote).toContain("капітанство");
  });

  it("falls back on network throw", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const out = await weaveReport({ ...args, apiKey: "key" });
    expect(out.talentBridge).toContain("Артем");
  });

  it("instructs the model to stick to the primary type in the bridge", () => {
    const prompt = buildWeavePrompt({ ...args, apiKey: "key" });
    expect(prompt).toContain("не згадуй назв інших типів");
    expect(prompt).toContain("Тілесно-кінестетичний інтелект");
  });

  it("replaces the bridge with fallback when AI names a different intelligence", async () => {
    const content = JSON.stringify({
      coverQuote: "Гарна цитата про Артема.",
      talentBridge: "Цей виступ розкрив її музичний інтелект: вона відчула ритм пісні.",
    });
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 })
    ));
    const out = await weaveReport({ ...args, apiKey: "key" });
    expect(out.coverQuote).toBe("Гарна цитата про Артема.");
    expect(out.talentBridge).not.toContain("музичний");
    expect(out.talentBridge).toContain("капітанство");
  });

  it("keeps the bridge when it mentions only the primary type", async () => {
    const content = JSON.stringify({
      coverQuote: "Цитата.",
      talentBridge: "Капітанство показало тілесно-кінестетичний талант Артема в дії.",
    });
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 })
    ));
    const out = await weaveReport({ ...args, apiKey: "key" });
    expect(out.talentBridge).toContain("тілесно-кінестетичний");
  });
});
