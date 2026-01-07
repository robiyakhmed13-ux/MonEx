import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import {
  ArrowLeft,
  Search,
  X,
  HelpCircle,
  MessageSquare,
  Wallet,
  PieChart,
  Target,
  CreditCard,
  Repeat,
  Calculator,
  TrendingUp,
  DollarSign,
  Users,
  ChevronRight,
  ExternalLink,
  Mic,
  Keyboard,
  Bell,
  Settings,
} from "lucide-react";

interface HelpArticle {
  id: string;
  category: string;
  icon: React.ReactNode;
  titleKey: string;
  contentKey: string;
  tags: string[];
}

const HELP_ARTICLES: HelpArticle[] = [
  {
    id: "add-transaction",
    category: "basics",
    icon: <Wallet className="w-5 h-5" />,
    titleKey: "helpAddTransaction",
    contentKey: "helpAddTransactionContent",
    tags: ["expense", "income", "add", "transaction", "xarajat", "daromad", "расход", "доход"],
  },
  {
    id: "voice-input",
    category: "basics",
    icon: <Mic className="w-5 h-5" />,
    titleKey: "helpVoiceInput",
    contentKey: "helpVoiceInputContent",
    tags: ["voice", "ovoz", "голос", "microphone", "speech"],
  },
  {
    id: "quick-add",
    category: "basics",
    icon: <Keyboard className="w-5 h-5" />,
    titleKey: "helpQuickAdd",
    contentKey: "helpQuickAddContent",
    tags: ["quick", "tez", "быстро", "preset", "shortcut"],
  },
  {
    id: "categories",
    category: "basics",
    icon: <PieChart className="w-5 h-5" />,
    titleKey: "helpCategories",
    contentKey: "helpCategoriesContent",
    tags: ["category", "kategoriya", "категория", "expense", "income"],
  },
  {
    id: "limits",
    category: "budgeting",
    icon: <Target className="w-5 h-5" />,
    titleKey: "helpLimits",
    contentKey: "helpLimitsContent",
    tags: ["limit", "budget", "byudjet", "бюджет", "spending"],
  },
  {
    id: "goals",
    category: "budgeting",
    icon: <Target className="w-5 h-5" />,
    titleKey: "helpGoals",
    contentKey: "helpGoalsContent",
    tags: ["goal", "maqsad", "цель", "savings", "jamg'arma", "накопления"],
  },
  {
    id: "accounts",
    category: "accounts",
    icon: <CreditCard className="w-5 h-5" />,
    titleKey: "helpAccounts",
    contentKey: "helpAccountsContent",
    tags: ["account", "hisob", "счёт", "bank", "wallet", "cash"],
  },
  {
    id: "recurring",
    category: "automation",
    icon: <Repeat className="w-5 h-5" />,
    titleKey: "helpRecurring",
    contentKey: "helpRecurringContent",
    tags: ["recurring", "takroriy", "повторяющиеся", "auto", "avtomatik"],
  },
  {
    id: "subscriptions",
    category: "automation",
    icon: <Bell className="w-5 h-5" />,
    titleKey: "helpSubscriptions",
    contentKey: "helpSubscriptionsContent",
    tags: ["subscription", "obuna", "подписка", "netflix", "spotify"],
  },
  {
    id: "analytics",
    category: "reports",
    icon: <PieChart className="w-5 h-5" />,
    titleKey: "helpAnalytics",
    contentKey: "helpAnalyticsContent",
    tags: ["analytics", "statistika", "статистика", "report", "hisobot"],
  },
  {
    id: "debt",
    category: "debt",
    icon: <Calculator className="w-5 h-5" />,
    titleKey: "helpDebt",
    contentKey: "helpDebtContent",
    tags: ["debt", "qarz", "долг", "loan", "kredit", "кредит"],
  },
  {
    id: "investments",
    category: "investments",
    icon: <TrendingUp className="w-5 h-5" />,
    titleKey: "helpInvestments",
    contentKey: "helpInvestmentsContent",
    tags: ["investment", "investitsiya", "инвестиции", "stock", "crypto"],
  },
  {
    id: "bill-split",
    category: "social",
    icon: <Users className="w-5 h-5" />,
    titleKey: "helpBillSplit",
    contentKey: "helpBillSplitContent",
    tags: ["split", "bo'lish", "разделить", "friends", "group"],
  },
  {
    id: "net-worth",
    category: "reports",
    icon: <DollarSign className="w-5 h-5" />,
    titleKey: "helpNetWorth",
    contentKey: "helpNetWorthContent",
    tags: ["net worth", "sof boylik", "чистая стоимость", "assets", "liabilities"],
  },
  {
    id: "telegram",
    category: "integrations",
    icon: <MessageSquare className="w-5 h-5" />,
    titleKey: "helpTelegram",
    contentKey: "helpTelegramContent",
    tags: ["telegram", "bot", "voice", "ovoz", "голос"],
  },
  {
    id: "settings",
    category: "settings",
    icon: <Settings className="w-5 h-5" />,
    titleKey: "helpSettings",
    contentKey: "helpSettingsContent",
    tags: ["settings", "sozlamalar", "настройки", "theme", "currency", "language"],
  },
];

const CATEGORIES = [
  { id: "all", labelKey: "helpCatAll" },
  { id: "basics", labelKey: "helpCatBasics" },
  { id: "budgeting", labelKey: "helpCatBudgeting" },
  { id: "accounts", labelKey: "helpCatAccounts" },
  { id: "automation", labelKey: "helpCatAutomation" },
  { id: "reports", labelKey: "helpCatReports" },
  { id: "debt", labelKey: "helpCatDebt" },
  { id: "investments", labelKey: "helpCatInvestments" },
];

const HELP_TRANSLATIONS: Record<string, Record<string, string>> = {
  uz: {
    helpTitle: "Yordam",
    helpSearch: "Qidirish...",
    helpCatAll: "Barchasi",
    helpCatBasics: "Asosiy",
    helpCatBudgeting: "Byudjet",
    helpCatAccounts: "Hisoblar",
    helpCatAutomation: "Avtomatik",
    helpCatReports: "Hisobotlar",
    helpCatDebt: "Qarzlar",
    helpCatInvestments: "Investitsiyalar",
    helpAddTransaction: "Tranzaksiya qo'shish",
    helpAddTransactionContent: "Xarajat yoki daromad qo'shish uchun bosh ekrandagi + tugmasini bosing. Summa, kategoriya va izohni kiriting. Tez qo'shish uchun old belgilangan tugmalardan foydalaning.",
    helpVoiceInput: "Ovozli kiritish",
    helpVoiceInputContent: "Mikrofon tugmasini bosib ovoz bilan xarajat qo'shing. Masalan: \"Taksi yigirma ming\" yoki \"Kofe o'n besh ming\". Ilova ovozingizni avtomatik taniydi.",
    helpQuickAdd: "Tez qo'shish",
    helpQuickAddContent: "Bosh ekranda tez kirish tugmalari mavjud. Ularni sozlamalar orqali o'zgartirish mumkin. Bir marta bosish bilan tez-tez ishlatiladigan xarajatlarni qo'shing.",
    helpCategories: "Kategoriyalar",
    helpCategoriesContent: "Har bir tranzaksiya kategoriyaga tegishli. Xarajatlar va daromadlar uchun alohida kategoriyalar mavjud. Statistika bo'limida kategoriyalar bo'yicha tahlil ko'ring.",
    helpLimits: "Byudjet limitlari",
    helpLimitsContent: "Har bir kategoriya uchun oylik limit belgilang. Limit yaqinlashganda yoki oshganda bildirishnoma olasiz. Limitlar xarajatlarni nazorat qilishga yordam beradi.",
    helpGoals: "Maqsadlar",
    helpGoalsContent: "Jamg'arish maqsadlarini yarating. Masalan: \"Yangi telefon uchun 5 mln\". Har safar pul qo'shganingizda progress yangilanadi.",
    helpAccounts: "Hisoblar",
    helpAccountsContent: "Bank kartasi, naqd pul, hamyon va boshqa hisoblarni qo'shing. Har bir hisob alohida balansga ega. Hisoblar orasida pul o'tkazish mumkin.",
    helpRecurring: "Takroriy tranzaksiyalar",
    helpRecurringContent: "Oylik to'lovlar, oylik maosh va boshqa takroriy tranzaksiyalarni avtomatlashtirig. Ilova ularni avtomatik qo'shib boradi.",
    helpSubscriptions: "Obunalar",
    helpSubscriptionsContent: "Netflix, Spotify va boshqa obunalarni kuzatib boring. To'lov kunidan oldin eslatma oling. Barcha oylik xarajatlarni bir joyda ko'ring.",
    helpAnalytics: "Statistika",
    helpAnalyticsContent: "Xarajatlaringizni kategoriyalar, kunlar va oylar bo'yicha tahlil qiling. Grafiklar va diagrammalar orqali moliyaviy holatni tushunig.",
    helpDebt: "Qarzlarni boshqarish",
    helpDebtContent: "Qarzlaringizni ro'yxatga oling va to'lov rejasini tuzing. Snowball yoki Avalanche usullaridan foydalaning. Qarz-daromad nisbatini tekshiring.",
    helpInvestments: "Investitsiyalar",
    helpInvestmentsContent: "Aksiyalar, kriptovalyuta va boshqa investitsiyalarni kuzatib boring. Real vaqtda narxlarni ko'ring. Portfolio qiymatini tahlil qiling.",
    helpBillSplit: "Hisobni bo'lish",
    helpBillSplitContent: "Do'stlar bilan restoran yoki sayohat xarajatlarini teng bo'ling. Har bir kishining ulushini hisoblang. Kim to'laganini belgilang.",
    helpNetWorth: "Sof boylik",
    helpNetWorthContent: "Barcha aktivlar va qarzlarni hisobga olib, umumiy moliyaviy holatni ko'ring. Vaqt o'tishi bilan boyligingiz qanday o'zgarishini kuzating.",
    helpTelegram: "Telegram bot",
    helpTelegramContent: "Telegram orqali xarajat qo'shing. @monexuzbot ga yozing: \"taxi 20000\" yoki ovozli xabar yuboring. Kunlik statistika va hisobotlarni oling.",
    helpSettings: "Sozlamalar",
    helpSettingsContent: "Til, valyuta va mavzuni o'zgartiring. Bildirishnomalarni sozlang. Ma'lumotlarni eksport qiling yoki import qiling.",
    helpEmpty: "Hech narsa topilmadi",
  },
  ru: {
    helpTitle: "Помощь",
    helpSearch: "Поиск...",
    helpCatAll: "Все",
    helpCatBasics: "Основы",
    helpCatBudgeting: "Бюджет",
    helpCatAccounts: "Счета",
    helpCatAutomation: "Автоматика",
    helpCatReports: "Отчёты",
    helpCatDebt: "Долги",
    helpCatInvestments: "Инвестиции",
    helpAddTransaction: "Добавление транзакции",
    helpAddTransactionContent: "Нажмите + на главном экране чтобы добавить расход или доход. Введите сумму, категорию и описание. Используйте быстрые кнопки для частых расходов.",
    helpVoiceInput: "Голосовой ввод",
    helpVoiceInputContent: "Нажмите на микрофон и скажите расход голосом. Например: \"Такси двадцать тысяч\" или \"Кофе пятнадцать тысяч\". Приложение автоматически распознает вашу речь.",
    helpQuickAdd: "Быстрое добавление",
    helpQuickAddContent: "На главном экране есть кнопки быстрого добавления. Их можно настроить в настройках. Добавляйте частые расходы одним нажатием.",
    helpCategories: "Категории",
    helpCategoriesContent: "Каждая транзакция относится к категории. Есть отдельные категории для расходов и доходов. Смотрите анализ по категориям в разделе статистики.",
    helpLimits: "Лимиты бюджета",
    helpLimitsContent: "Установите месячный лимит для каждой категории. Получайте уведомления когда лимит приближается или превышен. Лимиты помогают контролировать расходы.",
    helpGoals: "Цели",
    helpGoalsContent: "Создавайте цели накопления. Например: \"Новый телефон 5 млн\". Прогресс обновляется каждый раз когда вы добавляете деньги.",
    helpAccounts: "Счета",
    helpAccountsContent: "Добавьте банковские карты, наличные, кошельки и другие счета. Каждый счёт имеет свой баланс. Можно переводить деньги между счетами.",
    helpRecurring: "Повторяющиеся транзакции",
    helpRecurringContent: "Автоматизируйте ежемесячные платежи, зарплату и другие регулярные транзакции. Приложение добавляет их автоматически.",
    helpSubscriptions: "Подписки",
    helpSubscriptionsContent: "Отслеживайте Netflix, Spotify и другие подписки. Получайте напоминания до даты оплаты. Все ежемесячные расходы в одном месте.",
    helpAnalytics: "Статистика",
    helpAnalyticsContent: "Анализируйте расходы по категориям, дням и месяцам. Понимайте финансовое состояние через графики и диаграммы.",
    helpDebt: "Управление долгами",
    helpDebtContent: "Ведите список долгов и составьте план погашения. Используйте методы Snowball или Avalanche. Проверьте соотношение долга к доходу.",
    helpInvestments: "Инвестиции",
    helpInvestmentsContent: "Отслеживайте акции, криптовалюту и другие инвестиции. Смотрите цены в реальном времени. Анализируйте стоимость портфеля.",
    helpBillSplit: "Разделение счёта",
    helpBillSplitContent: "Делите расходы на ресторан или путешествие с друзьями поровну. Рассчитайте долю каждого. Отметьте кто заплатил.",
    helpNetWorth: "Чистая стоимость",
    helpNetWorthContent: "Смотрите общее финансовое состояние с учётом всех активов и долгов. Отслеживайте как меняется ваше состояние со временем.",
    helpTelegram: "Telegram бот",
    helpTelegramContent: "Добавляйте расходы через Telegram. Напишите @monexuzbot: \"такси 20000\" или отправьте голосовое сообщение. Получайте ежедневную статистику.",
    helpSettings: "Настройки",
    helpSettingsContent: "Измените язык, валюту и тему. Настройте уведомления. Экспортируйте или импортируйте данные.",
    helpEmpty: "Ничего не найдено",
  },
  en: {
    helpTitle: "Help",
    helpSearch: "Search...",
    helpCatAll: "All",
    helpCatBasics: "Basics",
    helpCatBudgeting: "Budgeting",
    helpCatAccounts: "Accounts",
    helpCatAutomation: "Automation",
    helpCatReports: "Reports",
    helpCatDebt: "Debt",
    helpCatInvestments: "Investments",
    helpAddTransaction: "Adding a transaction",
    helpAddTransactionContent: "Tap the + button on the home screen to add an expense or income. Enter amount, category and description. Use quick buttons for frequent expenses.",
    helpVoiceInput: "Voice input",
    helpVoiceInputContent: "Tap the microphone and say your expense by voice. For example: \"Taxi twenty thousand\" or \"Coffee fifteen thousand\". The app automatically recognizes your speech.",
    helpQuickAdd: "Quick add",
    helpQuickAddContent: "Quick add buttons are available on the home screen. You can customize them in settings. Add frequent expenses with one tap.",
    helpCategories: "Categories",
    helpCategoriesContent: "Each transaction belongs to a category. There are separate categories for expenses and income. View category analysis in the statistics section.",
    helpLimits: "Budget limits",
    helpLimitsContent: "Set a monthly limit for each category. Get notifications when a limit is approaching or exceeded. Limits help control spending.",
    helpGoals: "Goals",
    helpGoalsContent: "Create savings goals. For example: \"New phone 5M\". Progress updates every time you add money.",
    helpAccounts: "Accounts",
    helpAccountsContent: "Add bank cards, cash, wallets and other accounts. Each account has its own balance. You can transfer money between accounts.",
    helpRecurring: "Recurring transactions",
    helpRecurringContent: "Automate monthly payments, salary and other regular transactions. The app adds them automatically.",
    helpSubscriptions: "Subscriptions",
    helpSubscriptionsContent: "Track Netflix, Spotify and other subscriptions. Get reminders before payment date. All monthly expenses in one place.",
    helpAnalytics: "Analytics",
    helpAnalyticsContent: "Analyze expenses by categories, days and months. Understand your financial state through charts and graphs.",
    helpDebt: "Debt management",
    helpDebtContent: "Keep a list of debts and create a repayment plan. Use Snowball or Avalanche methods. Check your debt-to-income ratio.",
    helpInvestments: "Investments",
    helpInvestmentsContent: "Track stocks, cryptocurrency and other investments. View prices in real time. Analyze portfolio value.",
    helpBillSplit: "Bill splitting",
    helpBillSplitContent: "Split restaurant or travel expenses with friends evenly. Calculate each person's share. Mark who paid.",
    helpNetWorth: "Net worth",
    helpNetWorthContent: "View your overall financial state with all assets and debts. Track how your wealth changes over time.",
    helpTelegram: "Telegram bot",
    helpTelegramContent: "Add expenses via Telegram. Message @monexuzbot: \"taxi 20000\" or send a voice message. Get daily statistics.",
    helpSettings: "Settings",
    helpSettingsContent: "Change language, currency and theme. Configure notifications. Export or import data.",
    helpEmpty: "Nothing found",
  },
};

export const HelpScreen: React.FC = () => {
  const { setActiveScreen, lang } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);

  const language = lang || "en";
  const t = HELP_TRANSLATIONS[language] || HELP_TRANSLATIONS.en;

  const filteredArticles = useMemo(() => {
    let articles = HELP_ARTICLES;

    if (selectedCategory !== "all") {
      articles = articles.filter((a) => a.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      articles = articles.filter(
        (a) =>
          t[a.titleKey]?.toLowerCase().includes(query) ||
          t[a.contentKey]?.toLowerCase().includes(query) ||
          a.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    return articles;
  }, [selectedCategory, searchQuery, t]);

  return (
    <div className="screen-container">
      <div className="px-4 pt-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveScreen("home")}
            className="w-10 h-10 rounded-full bg-card flex items-center justify-center shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          <div className="flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">{t.helpTitle}</h1>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.helpSearch}
            className="w-full pl-10 pr-10 py-3 rounded-xl bg-card border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide -mx-4 px-4">
          {CATEGORIES.map((cat) => (
            <motion.button
              key={cat.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground border border-border/50"
              }`}
            >
              {t[cat.labelKey] || cat.id}
            </motion.button>
          ))}
        </div>

        {/* Articles */}
        <div className="space-y-3">
          <AnimatePresence>
            {filteredArticles.map((article, index) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.03 }}
                className="bg-card rounded-xl border border-border/30 overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpandedArticle(
                      expandedArticle === article.id ? null : article.id
                    )
                  }
                  className="w-full p-4 flex items-center gap-3 text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    {article.icon}
                  </div>
                  <span className="flex-1 font-medium text-foreground">
                    {t[article.titleKey]}
                  </span>
                  <ChevronRight
                    className={`w-5 h-5 text-muted-foreground transition-transform ${
                      expandedArticle === article.id ? "rotate-90" : ""
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {expandedArticle === article.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-0">
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {t[article.contentKey]}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Empty state */}
        {filteredArticles.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">{t.helpEmpty}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HelpScreen;
