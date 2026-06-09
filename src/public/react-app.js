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
          target: "downloadFrame",
          encType: "multipart/form-data",
          onSubmit: () => {
            setBusy(true);
            window.setTimeout(() => window.location.reload(), 45000);
          },
        },
          h("label", null, "ПІБ дитини", h("input", { name: "childName", required: true, maxLength: 80, placeholder: "Наприклад: Артем Коваль" })),
          h("label", null, "Номер зміни", h("input", { name: "shift", required: true, maxLength: 40, placeholder: "Наприклад: 3" })),
          h("label", null, "Домінуючий тип 1",
            h("select", { name: "primaryType", required: true },
              types.map((t) => h("option", { key: t.value, value: t.value }, t.label))
            )
          ),
          h("label", null, "Домінуючий тип 2",
            h("select", { name: "secondaryType" },
              h("option", { value: "" }, "немає"),
              types.map((t) => h("option", { key: t.value, value: t.value }, t.label))
            )
          ),
          h("label", { className: "wide" }, "Живий приклад з табору",
            h("textarea", {
              name: "example",
              required: true,
              maxLength: 800,
              rows: 5,
              placeholder: "Опишіть конкретний момент: що дитина зробила, як поводилась, у чому проявилася її сильна сторона.",
            })
          ),
          h("label", { className: "wide" }, "Вхідний квест / стартовий вибір",
            h("textarea", {
              name: "questSignal",
              maxLength: 500,
              rows: 3,
              placeholder: "Наприклад: обрав зібрати команду, розгадувати шифр, діяти самостійно або рухатися до цілі через гру.",
            })
          ),
          h("label", { className: "wide" }, "МК та поведінка на них",
            h("textarea", {
              name: "workshopNotes",
              maxLength: 700,
              rows: 3,
              placeholder: "Не лише куди пішов, а що робив: рахував, збирав руками, презентував, допомагав іншим, фокусувався на формі.",
            })
          ),
          h("label", { className: "wide" }, "Спостереження дня 3/6/9",
            h("textarea", {
              name: "observationNotes",
              maxLength: 700,
              rows: 3,
              placeholder: "Вільний час, командні квести, роль у групі: капітан, генератор ідей, підтримка, тихе зосереджене виконання.",
            })
          ),
          h("label", { className: "wide" }, "Вечірні рефлексії та фінальний проєкт",
            h("textarea", {
              name: "reflectionNotes",
              maxLength: 600,
              rows: 3,
              placeholder: "Як говорить про емоції, події й висновки. Яку роль добровільно обрав/обрала у фінальному проєкті.",
            })
          ),
          h("label", { className: "wide" }, "Фінальна добровільна роль",
            h("input", {
              name: "finalProjectNotes",
              maxLength: 220,
              placeholder: "Наприклад: сценарій, декорації, танець, звук, рахунок балів, презентація.",
            })
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
        ),
        h("iframe", {
          name: "downloadFrame",
          title: "PDF download",
          style: { display: "none" },
          onLoad: () => {
            if (busy) window.setTimeout(() => window.location.reload(), 700);
          },
        })
      ) : h(Guide)
    );
  }

  function Guide() {
    return h("div", null,
      h("header", { className: "page-head" },
        h("div", null, h("p", { className: "eyebrow" }, "Підказки"), h("h1", null, "Як заповнювати звіт")),
      ),
      h("div", { className: "method-strip" },
        h("strong", null, "Формула точності"),
        h("span", null, "День 1: ігровий квест"),
        h("span", null, "3 МК: поведінка, не лише вибір"),
        h("span", null, "День 3/6/9: 3 швидкі спостереження"),
        h("span", null, "Фінал: добровільна роль у проєкті")
      ),
      h("div", { className: "info-grid" },
        h("article", null, h("h3", null, "Формула прикладу"), h("p", null, "Пишіть у 3 кроки: ситуація -> що дитина зробила -> який результат це дало команді або їй самій.")),
        h("article", null, h("h3", null, "Не плутайте вибір і прояв"), h("p", null, "Дитина може піти на МК за другом або через харизму ментора. Важливіше, що саме вона робила під час заняття.")),
        h("article", null, h("h3", null, "Комбо-МК"), h("p", null, "Один МК може показати кілька інтелектів: код, форма, рух, презентація, підтримка команди.")),
        h("article", null, h("h3", null, "Без оцінювання"), h("p", null, "Не фіксуйте невдачу як слабкість. Дивіться, чи дитина пробує, як реагує, чи повертається до задачі.")),
        h("article", null, h("h3", null, "Вечірні тички"), h("p", null, "Рефлексії добре показують внутрішньоособистісний, лінгвістичний і логічний прояви.")),
        h("article", null, h("h3", null, "Фото"), h("p", null, "Краще працює світле вертикальне фото, де обличчя добре видно."))
      ),
      h("div", { className: "info-grid guide-examples" },
        h("article", null, h("h3", null, "Добре"), h("p", null, "На робототехніці Іван не просто прийшов за другом: він сам обрав рахувати послідовність кроків і спокійно перевіряв помилки.")),
        h("article", null, h("h3", null, "Слабко"), h("p", null, "Іван був активний, веселий і всім сподобався. Це приємно, але не пояснює, який талант проявився.")),
        h("article", null, h("h3", null, "Що шукати"), h("p", null, "Повторюваність: якщо дитина і на МК, і у вільний час, і у фінальному проєкті бере схожу роль, це сильний сигнал.")),
        h("article", null, h("h3", null, "3 кліки після МК"), h("p", null, "Позначте: роль дитини, спосіб дії, емоційний стан. Наприклад: форма + зосередженість + самостійність.")),
        h("article", null, h("h3", null, "Не діагноз"), h("p", null, "Пишемо не “дитина є логіком”, а “у цій зміні найчастіше проявляла логіко-математичний підхід”.")),
        h("article", null, h("h3", null, "Фінальна перевірка"), h("p", null, "Подивіться, що дитина добровільно взяла у фіналі: сценарій, декор, рух, звук, рахунок, презентацію або підтримку."))
      )
    );
  }

  function AdminApp() {
    const [tab, setTab] = useState(props.activeTab || "reports");
    return h(AppFrame, { mode: "admin", activeTab: tab, setActiveTab: setTab },
      tab === "reports" ? h(ReportsTab, { reports: props.reports || [], secret: props.secret }) : null,
      tab === "content" ? h(ContentTab, { items: props.content || [], secret: props.secret }) : null,
      tab === "settings" ? h(SettingsTab, { secret: props.secret }) : null
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
          h("button", { className: "primary-action", type: "submit" }, "Зберегти опис")
        )
      )
    );
  }

  function SettingsTab({ secret }) {
    return h("div", null,
      h("header", { className: "page-head" },
        h("div", null, h("p", { className: "eyebrow" }, "Розширення"), h("h1", null, "Налаштування"))
      ),
      h("div", { className: "info-grid" },
        h("article", null, h("h3", null, "Посилання форми"), h("p", null, `/f/${secret}`)),
        h("article", null, h("h3", null, "Майбутні модулі"), h("p", null, "Тут можна додати шаблони PDF, користувачів, статистику змін і налаштування бренду.")),
        h("article", null, h("h3", null, "Безпека"), h("p", null, "Для продакшену варто додати пароль або окремий вхід в адмінку."))
      )
    );
  }

  root.render(props.page === "admin" ? h(AdminApp) : h(FormApp));
})();
