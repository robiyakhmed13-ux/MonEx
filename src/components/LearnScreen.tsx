import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import {
  ArrowLeft,
  Search,
  X,
  GraduationCap,
  BookOpen,
  Lightbulb,
  TrendingUp,
  PiggyBank,
  Shield,
  Target,
  ChevronRight,
  Clock,
  CheckCircle,
  Star,
} from "lucide-react";
import { safeJSON } from "@/lib/storage";

interface LearnArticle {
  id: string;
  category: string;
  icon: React.ReactNode;
  titleKey: string;
  contentKey: string;
  readTime: number; // minutes
  difficulty: "beginner" | "intermediate" | "advanced";
}

const LEARN_ARTICLES: LearnArticle[] = [
  {
    id: "budgeting-basics",
    category: "budgeting",
    icon: <PiggyBank className="w-5 h-5" />,
    titleKey: "learnBudgetingBasics",
    contentKey: "learnBudgetingBasicsContent",
    readTime: 3,
    difficulty: "beginner",
  },
  {
    id: "50-30-20",
    category: "budgeting",
    icon: <Target className="w-5 h-5" />,
    titleKey: "learn503020",
    contentKey: "learn503020Content",
    readTime: 4,
    difficulty: "beginner",
  },
  {
    id: "emergency-fund",
    category: "savings",
    icon: <Shield className="w-5 h-5" />,
    titleKey: "learnEmergencyFund",
    contentKey: "learnEmergencyFundContent",
    readTime: 3,
    difficulty: "beginner",
  },
  {
    id: "saving-goals",
    category: "savings",
    icon: <Target className="w-5 h-5" />,
    titleKey: "learnSavingGoals",
    contentKey: "learnSavingGoalsContent",
    readTime: 4,
    difficulty: "beginner",
  },
  {
    id: "debt-snowball",
    category: "debt",
    icon: <TrendingUp className="w-5 h-5" />,
    titleKey: "learnDebtSnowball",
    contentKey: "learnDebtSnowballContent",
    readTime: 5,
    difficulty: "intermediate",
  },
  {
    id: "debt-avalanche",
    category: "debt",
    icon: <TrendingUp className="w-5 h-5" />,
    titleKey: "learnDebtAvalanche",
    contentKey: "learnDebtAvalancheContent",
    readTime: 5,
    difficulty: "intermediate",
  },
  {
    id: "compound-interest",
    category: "investing",
    icon: <Lightbulb className="w-5 h-5" />,
    titleKey: "learnCompoundInterest",
    contentKey: "learnCompoundInterestContent",
    readTime: 4,
    difficulty: "beginner",
  },
  {
    id: "investing-basics",
    category: "investing",
    icon: <TrendingUp className="w-5 h-5" />,
    titleKey: "learnInvestingBasics",
    contentKey: "learnInvestingBasicsContent",
    readTime: 6,
    difficulty: "intermediate",
  },
  {
    id: "track-expenses",
    category: "habits",
    icon: <BookOpen className="w-5 h-5" />,
    titleKey: "learnTrackExpenses",
    contentKey: "learnTrackExpensesContent",
    readTime: 3,
    difficulty: "beginner",
  },
  {
    id: "financial-goals",
    category: "habits",
    icon: <Star className="w-5 h-5" />,
    titleKey: "learnFinancialGoals",
    contentKey: "learnFinancialGoalsContent",
    readTime: 4,
    difficulty: "beginner",
  },
];

const CATEGORIES = [
  { id: "all", labelKey: "learnCatAll", icon: <BookOpen className="w-4 h-4" /> },
  { id: "budgeting", labelKey: "learnCatBudgeting", icon: <PiggyBank className="w-4 h-4" /> },
  { id: "savings", labelKey: "learnCatSavings", icon: <Shield className="w-4 h-4" /> },
  { id: "debt", labelKey: "learnCatDebt", icon: <TrendingUp className="w-4 h-4" /> },
  { id: "investing", labelKey: "learnCatInvesting", icon: <Lightbulb className="w-4 h-4" /> },
  { id: "habits", labelKey: "learnCatHabits", icon: <Star className="w-4 h-4" /> },
];

const LEARN_TRANSLATIONS: Record<string, Record<string, string>> = {
  uz: {
    learnTitle: "O'rganish",
    learnSearch: "Qidirish...",
    learnCatAll: "Barchasi",
    learnCatBudgeting: "Byudjet",
    learnCatSavings: "Jamg'arma",
    learnCatDebt: "Qarzlar",
    learnCatInvesting: "Investitsiya",
    learnCatHabits: "Odatlar",
    learnMinRead: "daqiqa o'qish",
    learnBeginner: "Boshlang'ich",
    learnIntermediate: "O'rta",
    learnAdvanced: "Ilg'or",
    learnEmpty: "Hech narsa topilmadi",
    learnBudgetingBasics: "Byudjet asoslari",
    learnBudgetingBasicsContent: "Byudjet - bu daromad va xarajatlarni rejalashtirish. Har oyda qancha pul kirib keladi va qayerga ketadi? Buni bilish moliyaviy muvaffaqiyatning birinchi qadami.\n\n1. Barcha daromadlaringizni yozing\n2. Doimiy xarajatlarni (ijara, kommunal) ajrating\n3. O'zgaruvchan xarajatlarni (oziq-ovqat, transport) kuzating\n4. Jamg'arish uchun pul ajrating\n\nByudjet sizga pulni nazorat qilish imkonini beradi, aksincha emas.",
    learn503020: "50/30/20 qoidasi",
    learn503020Content: "Bu oddiy byudjet qoidasi:\n\n• 50% - Zaruriy xarajatlar: ijara, kommunal, oziq-ovqat, transport\n• 30% - Ixtiyoriy xarajatlar: ko'ngilochar, restoran, xarid\n• 20% - Jamg'arma va qarz to'lash\n\nMasalan, oylik daromad 5 million bo'lsa:\n• 2.5 mln - zaruriy\n• 1.5 mln - ixtiyoriy\n• 1 mln - jamg'arma\n\nBu qoida sodda lekin samarali. O'z ehtiyojlaringizga moslashtirishingiz mumkin.",
    learnEmergencyFund: "Favqulodda fond",
    learnEmergencyFundContent: "Favqulodda fond - kutilmagan vaziyatlar uchun jamg'arilgan pul: ishdan ayrilish, kasallik, avtomobil ta'miri.\n\nQancha kerak?\n• Minimal: 3 oylik xarajatlar\n• Ideal: 6 oylik xarajatlar\n\nQanday boshlash:\n1. Oylik xarajatlaringizni hisoblang\n2. Har oyda kichik summadan boshlang\n3. Avval 1 oy, keyin 3 oy maqsad qo'ying\n4. Alohida hisobda saqlang\n\nFavqulodda fond - moliyaviy xavfsizlik yostig'ingiz.",
    learnSavingGoals: "Jamg'arish maqsadlari",
    learnSavingGoalsContent: "Aniq maqsad bo'lmasa, jamg'arish qiyin. Maqsadlaringizni aniqlang:\n\n1. Qisqa muddatli (1 yilgacha):\n   • Yangi telefon\n   • Ta'til sayohati\n\n2. O'rta muddatli (1-5 yil):\n   • Avtomobil\n   • To'y\n\n3. Uzoq muddatli (5+ yil):\n   • Uy sotib olish\n   • Bolalar ta'limi\n\nHar bir maqsad uchun:\n• Aniq summa belgilang\n• Muddat qo'ying\n• Oylik to'lovni hisoblang",
    learnDebtSnowball: "Snowball usuli",
    learnDebtSnowballContent: "Snowball usuli - qarzlarni eng kichigidan boshlab to'lash:\n\n1. Barcha qarzlarni summasi bo'yicha tartiblang\n2. Minimal to'lovlarni barchasiga to'lang\n3. Qo'shimcha pulni eng kichik qarzga yo'naltiring\n4. Bitta qarz tugagach, keyingisiga o'ting\n\nAfzalliklari:\n• Tez natija ko'rasiz\n• Motivatsiya saqlanadi\n• Psixologik g'alaba his qilasiz\n\nKamchiligi: Jami ko'proq foiz to'lashingiz mumkin.",
    learnDebtAvalanche: "Avalanche usuli",
    learnDebtAvalancheContent: "Avalanche usuli - eng yuqori foizli qarzdan boshlash:\n\n1. Qarzlarni foiz stavkasi bo'yicha tartiblang\n2. Minimal to'lovlarni barchasiga to'lang\n3. Qo'shimcha pulni eng yuqori foizli qarzga yo'naltiring\n4. Bitta qarz tugagach, keyingisiga o'ting\n\nAfzalliklari:\n• Jami kam foiz to'laysiz\n• Matematik jihatdan optimal\n\nKamchiligi: Natija ko'rish uzoqroq vaqt olishi mumkin.",
    learnCompoundInterest: "Murakkab foiz kuchi",
    learnCompoundInterestContent: "Murakkab foiz - foizga ham foiz hisoblash:\n\nMisol: 10 million so'm, yiliga 15% foiz\n• 1-yil: 10 mln → 11.5 mln (+1.5 mln)\n• 5-yil: 10 mln → 20.1 mln (+10.1 mln)\n• 10-yil: 10 mln → 40.5 mln (+30.5 mln)\n\nNima uchun muhim:\n• Erta boshlash katta farq qiladi\n• Vaqt o'tishi bilan o'sish tezlashadi\n• \"Pulning pul ishlashi\"\n\nQoida: Imkon qadar erta boshlang, hatto kichik summadan ham.",
    learnInvestingBasics: "Investitsiya asoslari",
    learnInvestingBasicsContent: "Investitsiya - pulni ishga solish:\n\nTurlari:\n• Aksiyalar - kompaniya ulushi\n• Obligatsiyalar - qarz berish\n• Ko'chmas mulk - uy, er\n• Jamg'arma fondlar - diversifikatsiya\n\nQoidalar:\n1. Avval favqulodda fond yarating\n2. Faqat yo'qotishga tayyor pulni investing qiling\n3. Diversifikatsiya - turli sohalarga tarqating\n4. Uzoq muddatli o'ylang\n5. Muntazam investing qiling\n\nXavf va daromad: Yuqori daromad = yuqori xavf.",
    learnTrackExpenses: "Xarajatlarni kuzatish",
    learnTrackExpensesContent: "Nega kuzatish kerak:\n• Pulingiz qayerga ketayotganini bilasiz\n• Ortiqcha xarajatlarni topasiz\n• Byudjetni boshqara olasiz\n\nQanday kuzatish:\n1. Har bir xarajatni darhol yozing\n2. Kategoriyalarga ajrating\n3. Haftalik tahlil qiling\n4. Oylik hisobot tuzing\n\nMaslahatlar:\n• Ilovadan foydalaning (MonEx!)\n• Ovozli kiritish tez va qulay\n• Naqd pul xarajatlarini unutmang",
    learnFinancialGoals: "Moliyaviy maqsadlar",
    learnFinancialGoalsContent: "SMART maqsadlar qo'ying:\n\n• Specific - Aniq: \"Yangi iPhone\" emas \"Telefon\"\n• Measurable - O'lchovli: 15 million so'm\n• Achievable - Erishish mumkin\n• Relevant - Siz uchun muhim\n• Time-bound - Muddatli: 12 oy ichida\n\nMaqsadlar ierarxiyasi:\n1. Qarzlarni to'lash\n2. Favqulodda fond\n3. Qisqa muddatli maqsadlar\n4. Uzoq muddatli investitsiyalar\n\nHar bir maqsadni kichik qadamlarga bo'ling.",
  },
  ru: {
    learnTitle: "Обучение",
    learnSearch: "Поиск...",
    learnCatAll: "Все",
    learnCatBudgeting: "Бюджет",
    learnCatSavings: "Накопления",
    learnCatDebt: "Долги",
    learnCatInvesting: "Инвестиции",
    learnCatHabits: "Привычки",
    learnMinRead: "мин чтения",
    learnBeginner: "Начинающий",
    learnIntermediate: "Средний",
    learnAdvanced: "Продвинутый",
    learnEmpty: "Ничего не найдено",
    learnBudgetingBasics: "Основы бюджетирования",
    learnBudgetingBasicsContent: "Бюджет - это планирование доходов и расходов. Сколько денег приходит каждый месяц и куда уходит? Знать это - первый шаг к финансовому успеху.\n\n1. Запишите все свои доходы\n2. Выделите постоянные расходы (аренда, коммунальные)\n3. Отслеживайте переменные расходы (еда, транспорт)\n4. Выделяйте деньги на накопления\n\nБюджет позволяет вам контролировать деньги, а не наоборот.",
    learn503020: "Правило 50/30/20",
    learn503020Content: "Это простое правило бюджета:\n\n• 50% - Необходимые расходы: аренда, коммунальные, еда, транспорт\n• 30% - Необязательные расходы: развлечения, рестораны, покупки\n• 20% - Накопления и погашение долгов\n\nНапример, если доход 5 миллионов:\n• 2.5 млн - необходимое\n• 1.5 млн - необязательное\n• 1 млн - накопления\n\nЭто правило простое но эффективное. Можете адаптировать под свои нужды.",
    learnEmergencyFund: "Резервный фонд",
    learnEmergencyFundContent: "Резервный фонд - деньги на непредвиденные ситуации: потеря работы, болезнь, ремонт машины.\n\nСколько нужно?\n• Минимум: 3 месяца расходов\n• Идеально: 6 месяцев расходов\n\nКак начать:\n1. Посчитайте месячные расходы\n2. Начните с небольшой суммы каждый месяц\n3. Сначала цель 1 месяц, потом 3\n4. Храните на отдельном счёте\n\nРезервный фонд - ваша финансовая подушка безопасности.",
    learnSavingGoals: "Цели накопления",
    learnSavingGoalsContent: "Без конкретной цели копить сложно. Определите свои цели:\n\n1. Краткосрочные (до 1 года):\n   • Новый телефон\n   • Отпуск\n\n2. Среднесрочные (1-5 лет):\n   • Автомобиль\n   • Свадьба\n\n3. Долгосрочные (5+ лет):\n   • Покупка жилья\n   • Образование детей\n\nДля каждой цели:\n• Установите конкретную сумму\n• Поставьте срок\n• Рассчитайте ежемесячный платёж",
    learnDebtSnowball: "Метод снежного кома",
    learnDebtSnowballContent: "Метод снежного кома - погашение долгов начиная с самого маленького:\n\n1. Упорядочьте долги по сумме\n2. Платите минимум по всем\n3. Дополнительные деньги направляйте на самый маленький долг\n4. Когда один долг закрыт, переходите к следующему\n\nПреимущества:\n• Быстро видите результат\n• Сохраняется мотивация\n• Чувствуете психологическую победу\n\nНедостаток: Можете заплатить больше процентов в итоге.",
    learnDebtAvalanche: "Метод лавины",
    learnDebtAvalancheContent: "Метод лавины - начать с долга с самой высокой процентной ставкой:\n\n1. Упорядочьте долги по процентной ставке\n2. Платите минимум по всем\n3. Дополнительные деньги направляйте на долг с самым высоким процентом\n4. Когда один долг закрыт, переходите к следующему\n\nПреимущества:\n• Платите меньше процентов в итоге\n• Математически оптимально\n\nНедостаток: Результат может быть виден дольше.",
    learnCompoundInterest: "Сила сложного процента",
    learnCompoundInterestContent: "Сложный процент - начисление процентов на проценты:\n\nПример: 10 миллионов сум, 15% годовых\n• 1-й год: 10 млн → 11.5 млн (+1.5 млн)\n• 5-й год: 10 млн → 20.1 млн (+10.1 млн)\n• 10-й год: 10 млн → 40.5 млн (+30.5 млн)\n\nПочему важно:\n• Раннее начало имеет большое значение\n• Рост ускоряется со временем\n• \"Деньги работают на деньги\"\n\nПравило: Начинайте как можно раньше, даже с небольших сумм.",
    learnInvestingBasics: "Основы инвестирования",
    learnInvestingBasicsContent: "Инвестирование - заставить деньги работать:\n\nВиды:\n• Акции - доля в компании\n• Облигации - дать в долг\n• Недвижимость - дом, земля\n• Фонды - диверсификация\n\nПравила:\n1. Сначала создайте резервный фонд\n2. Инвестируйте только деньги, которые готовы потерять\n3. Диверсификация - распределяйте по разным секторам\n4. Думайте долгосрочно\n5. Инвестируйте регулярно\n\nРиск и доход: Высокий доход = высокий риск.",
    learnTrackExpenses: "Отслеживание расходов",
    learnTrackExpensesContent: "Зачем отслеживать:\n• Знаете куда уходят деньги\n• Находите лишние расходы\n• Можете управлять бюджетом\n\nКак отслеживать:\n1. Записывайте каждый расход сразу\n2. Распределяйте по категориям\n3. Анализируйте еженедельно\n4. Составляйте месячный отчёт\n\nСоветы:\n• Используйте приложение (MonEx!)\n• Голосовой ввод быстрый и удобный\n• Не забывайте про наличные расходы",
    learnFinancialGoals: "Финансовые цели",
    learnFinancialGoalsContent: "Ставьте SMART цели:\n\n• Specific - Конкретные: \"Новый iPhone\" не \"Телефон\"\n• Measurable - Измеримые: 15 миллионов сум\n• Achievable - Достижимые\n• Relevant - Важные для вас\n• Time-bound - С дедлайном: за 12 месяцев\n\nИерархия целей:\n1. Погашение долгов\n2. Резервный фонд\n3. Краткосрочные цели\n4. Долгосрочные инвестиции\n\nРазбейте каждую цель на маленькие шаги.",
  },
  en: {
    learnTitle: "Learn",
    learnSearch: "Search...",
    learnCatAll: "All",
    learnCatBudgeting: "Budgeting",
    learnCatSavings: "Savings",
    learnCatDebt: "Debt",
    learnCatInvesting: "Investing",
    learnCatHabits: "Habits",
    learnMinRead: "min read",
    learnBeginner: "Beginner",
    learnIntermediate: "Intermediate",
    learnAdvanced: "Advanced",
    learnEmpty: "Nothing found",
    learnBudgetingBasics: "Budgeting basics",
    learnBudgetingBasicsContent: "A budget is planning income and expenses. How much money comes in each month and where does it go? Knowing this is the first step to financial success.\n\n1. Write down all your income\n2. Separate fixed expenses (rent, utilities)\n3. Track variable expenses (food, transport)\n4. Set aside money for savings\n\nA budget lets you control money, not the other way around.",
    learn503020: "The 50/30/20 rule",
    learn503020Content: "This is a simple budget rule:\n\n• 50% - Needs: rent, utilities, food, transport\n• 30% - Wants: entertainment, restaurants, shopping\n• 20% - Savings and debt repayment\n\nFor example, if income is 5 million:\n• 2.5M - needs\n• 1.5M - wants\n• 1M - savings\n\nThis rule is simple but effective. You can adapt it to your needs.",
    learnEmergencyFund: "Emergency fund",
    learnEmergencyFundContent: "An emergency fund is money for unexpected situations: job loss, illness, car repair.\n\nHow much do you need?\n• Minimum: 3 months of expenses\n• Ideal: 6 months of expenses\n\nHow to start:\n1. Calculate your monthly expenses\n2. Start with a small amount each month\n3. First goal 1 month, then 3\n4. Keep in a separate account\n\nAn emergency fund is your financial safety net.",
    learnSavingGoals: "Savings goals",
    learnSavingGoalsContent: "Without a specific goal, saving is hard. Define your goals:\n\n1. Short-term (up to 1 year):\n   • New phone\n   • Vacation\n\n2. Medium-term (1-5 years):\n   • Car\n   • Wedding\n\n3. Long-term (5+ years):\n   • Buying a home\n   • Children's education\n\nFor each goal:\n• Set a specific amount\n• Set a deadline\n• Calculate monthly payment",
    learnDebtSnowball: "Debt snowball method",
    learnDebtSnowballContent: "The snowball method - pay off debts starting with the smallest:\n\n1. Order debts by amount\n2. Pay minimum on all\n3. Direct extra money to the smallest debt\n4. When one debt is paid, move to the next\n\nAdvantages:\n• See results quickly\n• Motivation is maintained\n• Feel psychological victory\n\nDisadvantage: You may pay more interest overall.",
    learnDebtAvalanche: "Debt avalanche method",
    learnDebtAvalancheContent: "The avalanche method - start with the highest interest rate debt:\n\n1. Order debts by interest rate\n2. Pay minimum on all\n3. Direct extra money to highest interest debt\n4. When one debt is paid, move to the next\n\nAdvantages:\n• Pay less interest overall\n• Mathematically optimal\n\nDisadvantage: Results may take longer to see.",
    learnCompoundInterest: "The power of compound interest",
    learnCompoundInterestContent: "Compound interest - interest on interest:\n\nExample: 10 million UZS, 15% annual\n• Year 1: 10M → 11.5M (+1.5M)\n• Year 5: 10M → 20.1M (+10.1M)\n• Year 10: 10M → 40.5M (+30.5M)\n\nWhy it matters:\n• Starting early makes a big difference\n• Growth accelerates over time\n• \"Money makes money\"\n\nRule: Start as early as possible, even with small amounts.",
    learnInvestingBasics: "Investing basics",
    learnInvestingBasicsContent: "Investing - making money work:\n\nTypes:\n• Stocks - company shares\n• Bonds - lending money\n• Real estate - property\n• Funds - diversification\n\nRules:\n1. First create an emergency fund\n2. Only invest money you can afford to lose\n3. Diversify - spread across different sectors\n4. Think long-term\n5. Invest regularly\n\nRisk and return: High return = high risk.",
    learnTrackExpenses: "Tracking expenses",
    learnTrackExpensesContent: "Why track:\n• Know where money goes\n• Find unnecessary expenses\n• Can manage budget\n\nHow to track:\n1. Record each expense immediately\n2. Categorize them\n3. Analyze weekly\n4. Create monthly report\n\nTips:\n• Use an app (MonEx!)\n• Voice input is fast and convenient\n• Don't forget cash expenses",
    learnFinancialGoals: "Financial goals",
    learnFinancialGoalsContent: "Set SMART goals:\n\n• Specific: \"New iPhone\" not \"Phone\"\n• Measurable: 15 million UZS\n• Achievable\n• Relevant - important to you\n• Time-bound: within 12 months\n\nGoal hierarchy:\n1. Pay off debts\n2. Emergency fund\n3. Short-term goals\n4. Long-term investments\n\nBreak each goal into small steps.",
  },
};

const STORAGE_KEY = "hamyon_learn_completed";

export const LearnScreen: React.FC = () => {
  const { setActiveScreen, lang } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);
  const [completedArticles, setCompletedArticles] = useState<string[]>(() =>
    safeJSON.get(STORAGE_KEY, [])
  );

  const language = lang || "en";
  const t = LEARN_TRANSLATIONS[language] || LEARN_TRANSLATIONS.en;

  const toggleCompleted = (id: string) => {
    const updated = completedArticles.includes(id)
      ? completedArticles.filter((a) => a !== id)
      : [...completedArticles, id];
    setCompletedArticles(updated);
    safeJSON.set(STORAGE_KEY, updated);
  };

  const getDifficultyLabel = (difficulty: string) => {
    const labels: Record<string, string> = {
      beginner: t.learnBeginner,
      intermediate: t.learnIntermediate,
      advanced: t.learnAdvanced,
    };
    return labels[difficulty] || difficulty;
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors: Record<string, string> = {
      beginner: "bg-emerald-500/10 text-emerald-500",
      intermediate: "bg-amber-500/10 text-amber-500",
      advanced: "bg-red-500/10 text-red-500",
    };
    return colors[difficulty] || "bg-muted text-muted-foreground";
  };

  const filteredArticles = useMemo(() => {
    let articles = LEARN_ARTICLES;

    if (selectedCategory !== "all") {
      articles = articles.filter((a) => a.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      articles = articles.filter(
        (a) =>
          t[a.titleKey]?.toLowerCase().includes(query) ||
          t[a.contentKey]?.toLowerCase().includes(query)
      );
    }

    return articles;
  }, [selectedCategory, searchQuery, t]);

  const progress = Math.round(
    (completedArticles.length / LEARN_ARTICLES.length) * 100
  );

  return (
    <div className="screen-container">
      <div className="px-4 pt-4 pb-32">
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
            <GraduationCap className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">{t.learnTitle}</h1>
          </div>
        </div>

        {/* Progress */}
        <div className="bg-card rounded-xl p-4 mb-4 border border-border/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              {completedArticles.length}/{LEARN_ARTICLES.length}
            </span>
            <span className="text-sm font-medium text-primary">{progress}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full"
            />
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.learnSearch}
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
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                selectedCategory === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground border border-border/50"
              }`}
            >
              {cat.icon}
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
                  className="w-full p-4 flex items-start gap-3 text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    {article.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-foreground">
                        {t[article.titleKey]}
                      </span>
                      {completedArticles.includes(article.id) && (
                        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {article.readTime} {t.learnMinRead}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full ${getDifficultyColor(
                          article.difficulty
                        )}`}
                      >
                        {getDifficultyLabel(article.difficulty)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-5 h-5 text-muted-foreground transition-transform flex-shrink-0 ${
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
                        <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line mb-4">
                          {t[article.contentKey]}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCompleted(article.id);
                          }}
                          className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                            completedArticles.includes(article.id)
                              ? "bg-emerald-500/10 text-emerald-500"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {completedArticles.includes(article.id) ? (
                            <span className="flex items-center justify-center gap-2">
                              <CheckCircle className="w-4 h-4" />
                              ✓
                            </span>
                          ) : (
                            "Mark as complete"
                          )}
                        </button>
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
            <p className="text-muted-foreground">{t.learnEmpty}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LearnScreen;
