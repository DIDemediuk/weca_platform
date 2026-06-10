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

const ENDPOINT = "https://api.deepseek.com/chat/completions";

function fallback(a: WeaveArgs): string {
  const types = a.secondaryTitle ? `${a.primaryTitle} та ${a.secondaryTitle}` : a.primaryTitle;
  const primaryEssence = knowledgeSummary(a.primaryType).split("\n")[0].replace("Суть: ", "");
  return `Цього сезону ${a.childName} яскраво проявив(-ла) ${types}. Для нас це не сухий тест, а жива історія про те, як дитина обирає, пробує, взаємодіє і поступово розкривається в команді. ${primaryEssence} Саме тому нам запам'ятався момент: «${a.example.trim()}». У ньому добре видно сильну сторону ${a.childName}: не ідеальну картинку, а справжній прояв характеру, цікавості й власного способу мислити.`;
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
    `Ти пишеш теплий, щирий фрагмент дитячого звіту для батьків українською. ` +
    `Дитина: ${a.childName}. Сильні сторони: ${types}. ` +
    `Дані від тім-ліда: "${a.example.trim()}". ` +
    `База знань для інтерпретації:\n${buildKnowledgeBlock(a)}\n\n` +
    `Методика табору: не дорослий тест, а м'яка аналітика з кількох джерел - ігровий стартовий вибір, майстер-класи, спостереження дня 3/6/9, вечірні рефлексії та фінальний добровільний вибір ролі. ` +
    `Врахуй ризики: дитина могла піти "за компанію", обрати харизматичного ментора або закритися після першої невдачі. Не роби категоричних діагнозів; пиши як уважне спостереження. ` +
    `Стиль: живо, людяно, з мовою дитячого табору 8-12 років, але без сюсюкання. Не використовуй канцелярит, медичні діагнози, нейробіологічний пафос і фрази на кшталт "володіє феноменальним рівнем". ` +
    `Замість сухих висновків покажи маленьку сцену з прикладу, а потім м'яко поясни, яку сильну сторону вона відкриває. ` +
    `Напиши 1-2 короткі абзаци (до 105 слів), які природно вплітають докази, сильні сторони і один теплий натяк для батьків, як підтримати це вдома. ` +
    `Звертайся до дитини на ім'я. Без переліків, без заголовків, лише живий текст.`
  );
}

export async function weaveExample(a: WeaveArgs): Promise<string> {
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
        messages: [{ role: "user", content: buildWeavePrompt(a) }],
      }),
    });
    if (!res.ok) return fallback(a);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text && text.length > 0 ? text : fallback(a);
  } catch {
    return fallback(a);
  }
}
