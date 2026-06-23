import { knowledgeSummary } from "../domain/intelligenceKnowledge.js";
import { childMentionName } from "../domain/childName.js";
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

/**
 * Світ WestCamp у двох-трьох реченнях — щоб текст звучав як про конкретний табір,
 * а не як універсальна "тепла" заготовка. Скілтайм під тип дитини додається окремо з бази знань.
 */
const CAMP_WORLD =
  "WestCamp — карпатський табір зі своїм світом. Зміна побудована на 8 скілтаймах за типами інтелекту Гарднера; " +
  "у дітей є «Мапа талантів» зі значками за пройдені активності (як скаутські бейджі), життя загонами-«племенами», " +
  "«Колесо обов'язків» у кімнатах (Майстер світла, Охоронець сну тощо), вечірні ватри й рефлексії, чіл-тайми на природі біля річки, " +
  "детокс від телефонів і «пошта голубами» — листи від батьків, оформлені як старовинні послання.";

// Розпізнавальні корені назв типів — щоб зловити місток, який говорить про чужий талант.
const TYPE_KEYWORDS: Record<IntelligenceType, string> = {
  linguistic: "лінгвіст",
  logical: "логіко",
  spatial: "просторов",
  kinesthetic: "кінестет",
  musical: "музичн",
  interpersonal: "міжособист",
  intrapersonal: "внутрішньоособист",
  naturalistic: "натураліст",
};

/** Місток має говорити лише про головний талант; згадка іншого типу — ознака, що AI пішов за прикладом, а не за вибором тім-ліда. */
function bridgeContradictsPrimary(bridge: string, primary: IntelligenceType): boolean {
  const low = bridge.toLowerCase();
  return (Object.entries(TYPE_KEYWORDS) as [IntelligenceType, string][]).some(
    ([type, keyword]) => type !== primary && low.includes(keyword)
  );
}

function fallback(a: WeaveArgs): WeaveResult {
  const name = childMentionName(a.childName);
  const types = a.secondaryTitle ? `${a.primaryTitle} та ${a.secondaryTitle}` : a.primaryTitle;
  const primaryEssence = knowledgeSummary(a.primaryType).split("\n")[0].replace("Суть: ", "");
  return {
    coverQuote: `Цього сезону ${name} яскраво проявив(-ла) ${types}. Для нас це не сухий тест, а жива історія про те, як дитина обирає, пробує, взаємодіє і поступово розкривається в команді. ${primaryEssence} Саме тому нам запам'ятався момент: «${a.example.trim()}». У ньому добре видно сильну сторону ${name}: не ідеальну картинку, а справжній прояв характеру, цікавості й власного способу мислити.`,
    talentBridge: `«${a.example.trim()}» — саме в таких моментах ${name} розкривається найяскравіше. Для нашої команди це живе підтвердження таланту, про який ідеться в цьому розділі.`,
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
  const name = childMentionName(a.childName);
  const types = a.secondaryTitle ? `${a.primaryTitle} і ${a.secondaryTitle}` : a.primaryTitle;
  return (
    `Ти пишеш теплі, щирі фрагменти дитячого звіту для батьків українською. ` +
    `Дитина: ${name}. Сильні сторони: ${types}. ` +
    `Дані від тім-ліда: "${a.example.trim()}". ` +
    `База знань для інтерпретації:\n${buildKnowledgeBlock(a)}\n\n` +
    `Реалії WestCamp (звідки беруться спостереження):\n${CAMP_WORLD}\n` +
    `Методика табору: не дорослий тест, а м'яка аналітика з кількох джерел - ігровий стартовий вибір, скілтайми за типами інтелекту, спостереження дня 3/6/9, вечірні рефлексії на ватрі та фінальний добровільний вибір ролі. ` +
    `Прив'язуй текст до конкретних активностей WestCamp із блоків вище (насамперед до скілтайму під головний тип дитини), а не до абстракцій. ` +
    `ПРАВИЛО ВІРНОСТІ (форма vs факти): подію, її учасників і місце бери ВИКЛЮЧНО з прикладу тім-ліда - не вигадуй нових подій, дат чи часу («наступного дня»), локацій, дій чи людей, яких там немає. Але художню ФОРМУ додавати можна і треба: метафори, атмосферу, ритм, порівняння, настрій (на кшталт «наче бачив ліс наскрізь», «навіть вітер затих, слухаючи») - це образне прочитання тієї самої сцени, а не нові факти. Реалії WestCamp і скілтайми бери лише щоб правильно НАЗВАТИ й розтлумачити те, що описав тім-лід, а не щоб додати нові події чи активності. Загальний світ табору вплітай тільки тоді, коли приклад надто скупий. ` +
    `Врахуй ризики: дитина могла піти "за компанію", обрати харизматичного ментора або закритися після першої невдачі. Не роби категоричних діагнозів; пиши як уважне спостереження. ` +
    `Стиль: живо, людяно, з мовою дитячого табору 8-12 років, але без сюсюкання. Не використовуй канцелярит, медичні діагнози, нейробіологічний пафос і фрази на кшталт "володіє феноменальним рівнем". ` +
    `Поверни СУВОРО валідний JSON без markdown-обгорток, з двома полями:\n` +
    `{"coverQuote": "...", "talentBridge": "..."}\n` +
    `coverQuote: 1-2 короткі абзаци (до 105 слів) для обкладинки - жива, образна сцена з прикладу тім-ліда (у тілі звертайся до дитини на ім'я), яку сильну сторону вона відкриває. ОСТАННЄ речення - пряме звертання до батьків, що називає талант простими словами (без термінів Гарднера) і завершується теплим ярликом сильної сторони. ВАРІЮЙ цей ярлик, не повторюй щоразу одне слово: «це його суперсила», «його сильна сторона», «те, що робить його собою», «його справжній дар» тощо. Зразок фіналу: «Батьки, Іван вміє оживляти світ словом і простором — це його суперсила.» ` +
    `talentBridge: 2-3 речення (до 45 слів) для сторінки головного таланту. ` +
    `ВАЖЛИВО про talentBridge: головний талант дитини - «${a.primaryTitle}», і місток має пояснювати зв'язок прикладу САМЕ з цим типом; не згадуй назв інших типів інтелекту. ` +
    `Якщо приклад тім-ліда слабко пов'язаний з головним типом або дуже короткий - не натягуй висновок: прив'яжи талант до конкретного скілтайму WestCamp під цей тип (назви активність із бази знань), а приклад використай як штрих до характеру дитини. ` +
    `СУВОРО про ФАКТИ: не вигадуй нових подій, назв активностей, локацій, дат чи учасників, яких немає в прикладі тім-ліда або в блоці «Реалії WestCamp» (образні порівняння й атмосфера - це не «нова подія», їх додавати можна). Краще згадати реальний скілтайм, ніж вигадати красиву подію. Без повторення coverQuote дослівно.`
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
        temperature: 0.55,        // нижче за 0.85 — менше "польоту" й вигаданих сцен, ближче до фактів
        frequency_penalty: 0.4,   // прибиває повторювані кліше ("яскраво проявив", "жива історія")
        max_tokens: 700,          // страховка від обірваного JSON і зайвої довжини
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
    const bridge = bridgeContradictsPrimary(parsed.talentBridge, a.primaryType)
      ? fallback(a).talentBridge
      : parsed.talentBridge.trim();
    return { coverQuote: parsed.coverQuote.trim(), talentBridge: bridge };
  } catch {
    return fallback(a);
  }
}
