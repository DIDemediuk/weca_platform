export interface WeaveArgs {
  childName: string;
  example: string;
  primaryTitle: string;
  secondaryTitle?: string;
  apiKey: string;
}

const ENDPOINT = "https://api.deepseek.com/chat/completions";

function fallback(a: WeaveArgs): string {
  const types = a.secondaryTitle ? `${a.primaryTitle} та ${a.secondaryTitle}` : a.primaryTitle;
  return `Цього сезону ${a.childName} яскраво проявив(-ла) ${types}. Ось момент, який запам'ятався команді: «${a.example.trim()}»`;
}

export async function weaveExample(a: WeaveArgs): Promise<string> {
  if (!a.apiKey) return fallback(a);

  const types = a.secondaryTitle ? `${a.primaryTitle} і ${a.secondaryTitle}` : a.primaryTitle;
  const prompt =
    `Ти пишеш теплий, щирий фрагмент дитячого звіту для батьків українською. ` +
    `Дитина: ${a.childName}. Сильні сторони: ${types}. ` +
    `Реальний приклад від вожатого: "${a.example.trim()}". ` +
    `Напиши 1-2 короткі абзаци (до 90 слів), які природно вплітають цей приклад і підкреслюють сильні сторони. ` +
    `Звертайся до дитини на ім'я. Без переліків, без заголовків, лише живий текст.`;

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${a.apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        temperature: 0.8,
        messages: [{ role: "user", content: prompt }],
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
