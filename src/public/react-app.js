(function () {
  if (!window.React || !window.ReactDOM) return;

  const { createElement: h, useMemo, useState } = React;
  const root = ReactDOM.createRoot(document.getElementById("app"));
  const props = window.__APP_PROPS__ || {};

  const typeNames = {
    linguistic: "Лінгвістичний",
    logical: "Логіко-математичний",
    spatial: "Просторовий",
    kinesthetic: "Тілесно-кінестетичний",
    musical: "Музичний",
    interpersonal: "Міжособистісний",
    intrapersonal: "Внутрішньоособистісний",
    naturalistic: "Натуралістичний",
  };

  function AppFrame({ mode, activeTab, setActiveTab, children }) {
    const isAdmin = mode === "admin";
    const tabs = isAdmin
      ? [
          ["reports", "Звіти"],
          ["content", "Описи"],
          ["settings", "Налаштування"],
        ]
      : [
          ["form", "Новий звіт"],
          ["guide", "Підказки"],
        ];

    return h("main", { className: "app-shell" },
      h("aside", { className: "sidebar" },
        h("div", { className: "brand" },
          h("img", { className: "brand-logo", src: "/static/brand/westcamp-kids-logo.png", alt: "WestCamp Kids" }),
          h("div", null,
            h("strong", null, "WestCamp Kids"),
            h("small", null, "Gardner reports")
          )
        ),
        h("nav", { className: "tabs", "aria-label": "Розділи" },
          tabs.map(([id, label]) =>
            h("button", {
              key: id,
              className: activeTab === id ? "tab active" : "tab",
              type: "button",
              onClick: () => setActiveTab(id),
            }, label)
          )
        ),
        h("div", { className: "sidebar-note" },
          isAdmin ? "Керування звітами, текстами та майбутніми модулями." : "Швидке створення персонального PDF для батьків."
        )
      ),
      h("section", { className: "workspace" }, children)
    );
  }

  function FormApp() {
    const [tab, setTab] = useState("form");
    const [photo, setPhoto] = useState("");
    const [busy, setBusy] = useState(false);
    const types = props.types || Object.entries(typeNames).map(([value, label]) => ({ value, label }));
    const [primaryType, setPrimaryType] = useState((types[0] && types[0].value) || "linguistic");
    const selectedGuide = guideCards.find((item) => item.id === primaryType) || guideCards[0];
    if (props.blocked) {
      return h(AppFrame, { mode: "form", activeTab: tab, setActiveTab: setTab },
        tab === "form" ? h("div", null,
          h("header", { className: "page-head" },
            h("div", null,
              h("p", { className: "eyebrow" }, "Форма тім-лідера"),
              h("h1", null, "Новий звіт про дитину")
            )
          ),
          h("section", { className: "guide-panel" },
            h("div", { className: "guide-summary" },
              h("h3", null, "Ліміт вичерпано"),
              h("p", null, props.blocked)
            )
          )
        ) : h(Guide)
      );
    }

    return h(AppFrame, { mode: "form", activeTab: tab, setActiveTab: setTab },
      tab === "form" ? h("div", null,
        h("header", { className: "page-head" },
          h("div", null,
            h("p", { className: "eyebrow" }, "Форма тім-лідера"),
            h("h1", null, "Новий звіт про дитину")
          ),
          h("span", { className: "status-pill" }, "PDF")
        ),
        props.error ? h("div", { className: "error" }, props.error) : null,
        h("form", {
          className: "form-grid",
          method: "post",
          action: props.submitUrl,
          encType: "multipart/form-data",
          onSubmit: async (event) => {
            event.preventDefault();
            setBusy(true);
            const data = new FormData(event.target);
            try {
              const res = await fetch(props.submitUrl, { method: "POST", body: data });
              if (res.ok) {
                const blob = await res.blob();
                const disposition = res.headers.get("content-disposition") || "";
                const match = disposition.match(/filename\*=UTF-8''([^;]+)/);
                const filename = match ? decodeURIComponent(match[1]) : "zvit.pdf";
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                link.remove();
                URL.revokeObjectURL(url);
                window.location.reload();
              } else {
                const html = await res.text();
                document.open();
                document.write(html);
                document.close();
              }
            } catch (err) {
              setBusy(false);
              window.alert("Не вдалося згенерувати звіт. Перевірте зʼєднання та спробуйте ще раз.");
            }
          },
        },
          h("label", null, "ПІБ дитини", h("input", { name: "childName", required: true, maxLength: 80, placeholder: "Наприклад: Артем Коваль" })),
          h("label", null, "Зміна",
            h("select", { name: "shift", required: true },
              (props.shifts || ["1 Kids", "2 Kids", "3 Kids", "4 Kids", "5 Kids", "6 Kids", "7 Kids"]).map((s) =>
                h("option", { key: s, value: s }, s)
              )
            )
          ),
          h("label", null, "Домінуючий тип 1",
            h("select", {
              name: "primaryType",
              required: true,
              value: primaryType,
              onChange: (event) => setPrimaryType(event.target.value),
            },
              types.map((t) => h("option", { key: t.value, value: t.value }, t.label))
            )
          ),
          h("label", null, "Домінуючий тип 2",
            h("select", { name: "secondaryType" },
              h("option", { value: "" }, "немає"),
              types.map((t) => h("option", { key: t.value, value: t.value }, t.label))
            )
          ),
          h("label", { className: "wide" }, "Згадка про дитину — живий приклад з табору",
            h("textarea", {
              name: "example",
              required: true,
              maxLength: 800,
              rows: 5,
              placeholder: "Опишіть момент, де проявився саме обраний талант: що дитина зробила, як поводилась, у чому була її сильна сторона.",
            })
          ),
          h("div", { className: "type-writing-hint wide" },
            h("div", { className: "hint-formula" },
              h("span", null, "Формула"),
              h("p", null, "Де це було → що [Ім'я] зробив/зробила → що це показало.")
            ),
            h("div", { className: "hint-phrases" },
              h("div", { className: "hint-example" },
                h("span", null, `Приклад: ${selectedGuide.title}`),
                h("p", null, selectedGuide.phrases[0][1])
              )
            )
          ),
          h("label", { className: "wide upload-box" }, "Фото дитини",
            h("input", {
              type: "file",
              name: "photo",
              accept: "image/*",
              required: true,
              onChange: (event) => {
                const file = event.target.files && event.target.files[0];
                setPhoto(file ? URL.createObjectURL(file) : "");
              },
            }),
            photo ? h("img", { className: "photo-preview", src: photo, alt: "Превʼю фото" }) : h("span", null, "JPG або PNG до 12 MB")
          ),
          h("button", { className: "primary-action wide", type: "submit", disabled: busy }, busy ? "Генерується PDF..." : "Згенерувати PDF")
        )
      ) : h(Guide)
    );
  }

  const guideCards = [
    {
      id: "linguistic",
      title: "Вербально-лінгвістичний",
      role: "Майстер слова",
      notice: "Дитина любить говорити, слухати, читати, легко запам'ятовує імена, таборові пісні, девізи та сленг.",
      signals: ["Активно виступає на вечірніх рефлексіях і описує свої емоції.", "Захищає команду під час суперечок або презентацій проєктів.", "У вільний час читає, вигадує історії, жарти або веде щоденник."],
      phrases: [["Проєктний", "Це яскраво проявилося під час фінального командного проєкту, коли [Ім'я дитини] взяла на себе роль головного спікера, чітко презентувала ідею команди та захистила її перед усім табором."], ["Побут / ватра", "Ми помітили це під час вечірніх фідбеків: [Ім'я дитини] дуже влучно формулює думки, вміє вислухати та підтримати друзів правильними словами."]],
    },
    {
      id: "logical",
      title: "Логіко-математичний",
      role: "Стратег та аналітик",
      notice: "Дитина шукає логіку, закономірності та правила, добре рахує бали команди, любить порядок і структуру.",
      signals: ["Під час квестів береться за шифри, загадки та тактику карти.", "У вільний час обирає настільні ігри, шахи або складні головоломки.", "Ставить питання: чому так, які правила, що буде далі."],
      phrases: [["Квест", "[Ім'я дитини] блискуче проявила себе під час стратегічного квесту. Поки в команді вирували емоції, вона спокійно розгадала складний шифр та прорахувала переможну тактику."], ["Настільні ігри / МК", "Це було помітно на майстер-класах з логіки та під час настільних ігор: дитина миттєво зчитує правила, прораховує кроки наперед і діє як справжній стратег."]],
    },
    {
      id: "spatial",
      title: "Візуально-просторовий",
      role: "Архітектор ідей",
      notice: "Дитина мислить картинками, чутлива до форми, кольору, деталей і має сильну зорову пам'ять.",
      signals: ["Малює командний прапор, логотип або декор кімнати.", "На гончарстві, моделюванні чи Stop Motion створює деталізовані роботи.", "Легко орієнтується по карті табору або запам'ятовує візуальні орієнтири."],
      phrases: [["Майстер-класи", "Це стало очевидним на майстер-класі з гончарства та моделювання. [Ім'я дитини] тонко відчуває форму та колір, працює зосереджено і створює речі з власним стилем."], ["Побут / стиль", "Дитина творчо підходила до організації простору в кімнаті та підготовки командної атрибутики. Вона бачить красу в деталях і вміє втілити її в життя."]],
    },
    {
      id: "kinesthetic",
      title: "Тілесно-кінестетичний",
      role: "Володар руху",
      notice: "Дитині важко всидіти на місці: вона пізнає світ через дотики, біг, стрибки та активні дії.",
      signals: ["Першою викликається бігти на квестах, лізти на скеледром або проходити активні виклики.", "Має добру координацію в басейні, естафетах або мотузковому парку.", "Жестикулює, любить хай-файви, швидко схоплює фізичні навички."],
      phrases: [["Спорт / драйв", "[Ім'я дитини] була справжнім локомотивом в активних іграх та мотузковому парку. Вона має чудову координацію, швидку реакцію і веде команду за собою власним прикладом."], ["Енергія", "Нам запам'яталося, з яким драйвом дитина проходила спортивні виклики та естафети: вона схоплює фізичні навички на льоту і не боїться пробувати нове."]],
    },
    {
      id: "musical",
      title: "Музичний",
      role: "Генератор атмосфери",
      notice: "Дитина наспівує, відстукує ритм, швидко запам'ятовує треки, кричалки й емоційно реагує на звук.",
      signals: ["Активно підтримує командні кричалки та музичні челенджі.", "На ватрах фокусується на гітарі, підспівує, тримає ритм.", "Помітно реагує на зміну музики та настрою в групі."],
      phrases: [["Творчі вечори", "[Ім'я дитини] задавала ритм творчим вечорам. Вона відчуває музику, першою підтримувала музичні челенджі та допомагала створювати драйвову атмосферу в команді."], ["Рефлексія", "Дитина дуже чутлива до звуків та настрою. Вона часто наспівувала улюблені треки у вільний час і через музику передавала свій позитивний вайб команді."]],
    },
    {
      id: "interpersonal",
      title: "Міжособистісний / соціальний",
      role: "Дипломат",
      notice: "Дитина легко зчитує емоції інших, швидко заводить друзів, може бути лідером або миротворцем.",
      signals: ["Ініціює спільні ігри, часто збирає навколо себе інших дітей.", "Підтримує тих, хто сумує за домом, допомагає заспокоїти друзів.", "Допомагає тімліду організувати команду, коли група розфокусована."],
      phrases: [["Адаптація / дружба", "[Ім'я дитини] стала соціальним магнітом зміни. Вона з першого дня знаходила підхід до кожного, підтримувала тих, хто сумував за домом, і допомагала об'єднати команду."], ["Конфлікти", "Ми помітили це в побуті: дитина має сильну емпатію, швидко відчуває настрій друзів, вміє підтримати та дипломатично вирішити суперечку."]],
    },
    {
      id: "intrapersonal",
      title: "Внутрішньоособистісний",
      role: "Глибокий мислитель",
      notice: "Дитина самостійна, зріла, добре розуміє, що їй подобається, а що ні, і потребує простору для власних думок.",
      signals: ["У вільний час може побути наодинці, читати, малювати або думати.", "На фідбеках дає глибокі відповіді й аналізує свої вчинки.", "Не піддається масовому тиску, має внутрішній стрижень."],
      phrases: [["Фідбеки", "Висновки [Ім'я дитини] на вечірніх рефлексіях вражали глибиною. Вона вміє аналізувати власні емоції, перемоги та зони росту."], ["Автономія", "Це проявилося у внутрішній зрілості та самостійності. Дитині інколи потрібен час наодинці з книжкою чи блокнотом, щоб перезавантажитись, і це показує сильний внутрішній стрижень."]],
    },
    {
      id: "naturalistic",
      title: "Натуралістичний",
      role: "Дослідник природи",
      notice: "Дитина оживає на вулиці, у лісі або в горах, цікавиться рослинами, тваринами та природними деталями.",
      signals: ["Під час хайкінгу помічає дерева, камінці, трави, маршрути.", "Цікавиться тваринами Карпат, розпитує про довкілля.", "Проявляє еко-свідомість: дбає про чистоту й порядок на природі."],
      phrases: [["Походи", "Під час хайкінгу та прогулянок Карпатськими лісами [Ім'я дитини] почувалася у своїй стихії. Вона помічала рослини, тварин, цікавилася екологією та дбала про чистоту природи."], ["Тварини / локація", "Ми помітили це в її трепетному ставленні до всього живого. Дитина з захопленням вивчала гірські маршрути, збирала карпатські трави для чаю та проявляла турботу про природу."]],
    },
  ];

  function Guide() {
    const [selectedType, setSelectedType] = useState("linguistic");
    const current = guideCards.find((item) => item.id === selectedType) || guideCards[0];

    return h("div", null,
      h("header", { className: "page-head" },
        h("div", null, h("p", { className: "eyebrow" }, "Підказки"), h("h1", null, "Карта талантів WestCamp Kids"))
      ),
      h("section", { className: "guide-panel" },
        h("div", { className: "guide-summary" },
          h("h3", null, "Два правила"),
          h("p", null, "Тип — це те, що дитина робить добровільно і що повторюється у різних ситуаціях. Згадка — 2-3 речення: де це було → що дитина зробила → що це показало.")
        )
      ),
      h("section", { className: "talent-guide" },
        h("label", { className: "guide-select" },
          "Тип інтелекту",
          h("select", { value: selectedType, onChange: (event) => setSelectedType(event.target.value) },
            guideCards.map((item) => h("option", { key: item.id, value: item.id }, `${item.title} - ${item.role}`))
          )
        ),
        h("article", { className: "guide-card" },
          h("div", { className: "guide-card-head" },
            h("div", null, h("h2", null, current.title), h("p", null, current.role)),
            h("span", null, typeNames[current.id] || current.title)
          ),
          h("div", { className: "guide-section" }, h("h3", null, "Що помітити"), h("p", null, current.notice)),
          h("div", { className: "guide-section" },
            h("h3", null, "Де проявляється"),
            h("ul", null, current.signals.map((signal) => h("li", { key: signal }, signal)))
          ),
          h("div", { className: "phrase-grid" },
            current.phrases.map(([label, text]) =>
              h("div", { className: "phrase-card", key: label }, h("strong", null, label), h("p", null, text))
            )
          )
        )
      )
    );
  }

  function AdminApp() {
    const [tab, setTab] = useState(props.activeTab || "reports");
    return h(AppFrame, { mode: "admin", activeTab: tab, setActiveTab: setTab },
      tab === "reports" ? h(ReportsTab, { reports: props.reports || [], secret: props.secret }) : null,
      tab === "content" ? h(ContentTab, { items: props.content || [], secret: props.secret }) : null,
      tab === "settings" ? h(SettingsTab, { secret: props.secret, quota: props.quota }) : null
    );
  }

  function ReportsTab({ reports, secret }) {
    const [query, setQuery] = useState("");
    const filtered = useMemo(() => {
      const q = query.trim().toLowerCase();
      if (!q) return reports;
      return reports.filter((r) => [r.childName, r.shift, r.primaryType, r.secondaryType].filter(Boolean).join(" ").toLowerCase().includes(q));
    }, [reports, query]);

    return h("div", null,
      h("header", { className: "page-head" },
        h("div", null, h("p", { className: "eyebrow" }, "Адмінка"), h("h1", null, "Звіти")),
        h("a", { className: "secondary-action", href: `/f/${secret}` }, "Відкрити форму")
      ),
      h("div", { className: "toolbar" },
        h("input", { value: query, onChange: (e) => setQuery(e.target.value), placeholder: "Пошук за дитиною, зміною або типом" }),
        h("span", null, `${filtered.length} з ${reports.length}`)
      ),
      h("div", { className: "table-wrap" },
        h("table", null,
          h("thead", null, h("tr", null, h("th", null, "Дитина"), h("th", null, "Зміна"), h("th", null, "Типи"), h("th", null, "Дата"), h("th", null, ""))),
          h("tbody", null,
            filtered.length ? filtered.map((r) =>
              h("tr", { key: r.id },
                h("td", null, r.childName),
                h("td", null, r.shift),
                h("td", null, h("span", { className: "type-chip" }, typeNames[r.primaryType] || r.primaryType), r.secondaryType ? h("span", { className: "type-chip muted-chip" }, typeNames[r.secondaryType] || r.secondaryType) : null),
                h("td", null, String(r.createdAt || "").slice(0, 16).replace("T", " ")),
                h("td", null, h("a", { className: "btn", href: `/admin/${secret}/report/${r.id}.pdf` }, "PDF"))
              )
            ) : h("tr", null, h("td", { colSpan: 5 }, "Поки немає звітів."))
          )
        )
      )
    );
  }

  function ContentTab({ items, secret }) {
    const [selected, setSelected] = useState((items[0] && items[0].type) || "");
    const current = items.find((item) => item.type === selected) || items[0];

    if (!current) {
      return h("div", null, h("h1", null, "Описи типів"), h("p", null, "Дані ще не завантажені."));
    }

    return h("div", null,
      h("header", { className: "page-head" },
        h("div", null, h("p", { className: "eyebrow" }, "Контент PDF"), h("h1", null, "Описи типів інтелекту"))
      ),
      h("div", { className: "content-layout" },
        h("div", { className: "type-list" },
          items.map((item) => h("button", {
            key: item.type,
            type: "button",
            className: item.type === current.type ? "type-button active" : "type-button",
            onClick: () => setSelected(item.type),
          }, item.title))
        ),
        h("form", { className: "editor-panel", method: "post", action: `/admin/${secret}/content/${current.type}`, key: current.type },
          h("label", null, "Назва", h("input", { name: "title", defaultValue: current.title })),
          h("label", null, "Підпис", h("input", { name: "tagline", defaultValue: current.tagline })),
          h("label", null, "Сильні сторони", h("textarea", { name: "strengths", rows: 4, defaultValue: current.strengths })),
          h("label", null, "У таборі", h("textarea", { name: "inCamp", rows: 4, defaultValue: current.inCamp })),
          h("label", null, "Поради батькам", h("textarea", { name: "parentAdvice", rows: 4, defaultValue: current.parentAdvice })),
          h("label", null, "Хобі, які розвивають", h("textarea", { name: "hobbies", rows: 2, defaultValue: current.hobbies })),
          h("label", null, "Професії майбутнього", h("textarea", { name: "professions", rows: 2, defaultValue: current.professions })),
          h("button", { className: "primary-action", type: "submit" }, "Зберегти опис")
        )
      )
    );
  }

  function QuotaPanel({ secret, quota }) {
    const [amount, setAmount] = useState(1);
    if (!quota) return null;
    const action = `/admin/${secret}/quota`;
    const status = !quota.accessEnabled
      ? "⛔ Доступ до форми відключено"
      : quota.unlimited
        ? "♾️ Безлімітне використання"
        : `Залишилось генерацій: ${quota.remaining}`;

    const hiddenForm = (actionValue, label, extra) =>
      h("form", { method: "post", action, style: { display: "inline-block", marginRight: "0.5rem", marginTop: "0.5rem" } },
        h("input", { type: "hidden", name: "action", value: actionValue }),
        extra || null,
        h("button", { className: "btn", type: "submit" }, label)
      );

    return h("article", null,
      h("h3", null, "Тарифний план"),
      h("p", null, status),
      hiddenForm(quota.unlimited ? "unlimited_off" : "unlimited_on", quota.unlimited ? "Вимкнути безліміт" : "Увімкнути безліміт"),
      hiddenForm("add", "Додати спроби",
        h("input", {
          type: "number", name: "amount", min: 1, value: amount,
          onChange: (e) => setAmount(e.target.value),
          style: { width: "4.5rem", marginRight: "0.4rem" },
        })
      ),
      hiddenForm(quota.accessEnabled ? "disable" : "enable", quota.accessEnabled ? "Відключити доступ" : "Увімкнути доступ"),
      hiddenForm("reset", "Скинути до 10 спроб")
    );
  }

  function SettingsTab({ secret, quota }) {
    return h("div", null,
      h("header", { className: "page-head" },
        h("div", null, h("p", { className: "eyebrow" }, "Розширення"), h("h1", null, "Налаштування"))
      ),
      h("div", { className: "info-grid" },
        h(QuotaPanel, { secret, quota }),
        h("article", null, h("h3", null, "Посилання форми"), h("p", null, `/f/${secret}`)),
        h("article", null, h("h3", null, "Майбутні модулі"), h("p", null, "Тут можна додати шаблони PDF, користувачів, статистику змін і налаштування бренду.")),
        h("article", null, h("h3", null, "Безпека"), h("p", null, "Для продакшену варто додати пароль або окремий вхід в адмінку."))
      )
    );
  }

  root.render(props.page === "admin" ? h(AdminApp) : h(FormApp));
})();
