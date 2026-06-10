import { knowledgeSummary } from "../domain/intelligenceKnowledge.js";
import type { IntelligenceType } from "../domain/types.js";

export interface WeaveArgs {
  childName: string;
  example: string;
  primaryType: IntelligenceType;
  primaryTitle: string;
  secondaryType?: IntelligenceType;
  secondaryTitle?: string;
  apiKey: string;
}

export interface WeaveResult {
  coverQuote: string;   // тепла цитата на обкладинку
  talentBridge: string; // місток "чому ми побачили це саме в дитини" на сторінку таланту
}

const ENDPOINT = "https://api.deepseek.com/chat/completions";

function fallback(a: WeaveArgs): WeaveResult {
  const types = a.secondaryTitle ? `${a.primaryTitle} та ${a.secondaryTitle}` : a.primaryTitle;
  const primaryEssence = knowledgeSummary(a.primaryType).split("\n")[0].replace("Суть: ", "");
  return {
    coverQuote: `Цього сезону ${a.childName} яскраво проявив(-ла) ${types}. Для нас це не сухий тест, а жива історія про те, як дитина обирає, пробує, взаємодіє і поступово розкривається в команді. ${primaryEssence} Саме тому нам запам'ятався момент: «${a.example.trim()}». У ньому добре видно сильну сторону ${a.childName}: не ідеальну картинку, а справжній прояв характеру, цікавості й власного способу мислити.`,
    talentBridge: `«${a.example.trim()}» — саме в таких моментах ${a.childName} розкривається найяскравіше. Для нашої команди це живе підтвердження таланту, про який ідеться в цьому розділі.`,
  };
}

function buildKnowledgeBlock(a: WeaveArgs): string {
  return [
    `Основний тип (${a.primaryTitle}):\n${knowledgeSummary(a.primaryType)}`,
    a.secondaryType && a.secondaryTitle
      ? `Другий тип (${a.secondaryTitle}):\n${knowledgeSummary(a.secondaryType)}`
      : "",
  ].filter(Boolean).join("\n\n");
}

export function buildWeavePrompt(a: WeaveArgs): string {
  const types = a.secondaryTitle ? `${a.primaryTitle} і ${a.secondaryTitle}` : a.primaryTitle;
  return (
    `Ти пишеш теплі, щирі фрагменти дитячого звіту для батьків українською. ` +
    `Дитина: ${a.childName}. Сильні сторони: ${types}. ` +
    `Дані від тім-ліда: "${a.example.trim()}". ` +
    `База знань для інтерпретації:\n${buildKnowledgeBlock(a)}\n\n` +
    `Методика табору: не дорослий тест, а м'яка аналітика з кількох джерел - ігровий стартовий вибір, майстер-класи, спостереження дня 3/6/9, вечірні рефлексії та фінальний добровільний вибір ролі. ` +
    `Врахуй ризики: дитина могла піти "за компанію", обрати харизматичного ментора або закритися після першої невдачі. Не роби категоричних діагнозів; пиши як уважне спостереження. ` +
    `Стиль: живо, людяно, з мовою дитячого табору 8-12 років, але без сюсюкання. Не використовуй канцелярит, медичні діагнози, нейробіологічний пафос і фрази на кшталт "володіє феноменальним рівнем". ` +
    `Поверни СУВОРО валідний JSON без markdown-обгорток, з двома полями:\n` +
    `{"coverQuote": "...", "talentBridge": "..."}\n` +
    `coverQuote: 1-2 короткі абзаци (до 105 слів) для обкладинки - маленька сцена з прикладу тім-ліда, яку сильну сторону вона відкриває, один теплий натяк батькам. Звертайся до дитини на ім'я. ` +
    `talentBridge: 2-3 речення (до 45 слів) для сторінки головного таланту - чому саме цей приклад показав нам головний талант дитини. Без повторення coverQuote дослівно.`
  );
}

export async function weaveReport(a: WeaveArgs): Promise<WeaveResult> {
  if (!a.apiKey) return fallback(a);

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${a.apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        temperature: 0.85,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: buildWeavePrompt(a) }],
      }),
    });
    if (!res.ok) return fallback(a);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return fallback(a);
    const parsed = JSON.parse(text) as Partial<WeaveResult>;
    if (typeof parsed.coverQuote !== "string" || typeof parsed.talentBridge !== "string") return fallback(a);
    if (!parsed.coverQuote.trim() || !parsed.talentBridge.trim()) return fallback(a);
    return { coverQuote: parsed.coverQuote.trim(), talentBridge: parsed.talentBridge.trim() };
  } catch {
    return fallback(a);
  }
}
