import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { ThemeToggle } from "./ThemeToggle";
import { QuickAddPreset } from "@/types";
import { formatUZS } from "@/lib/storage";
import { CURRENCIES } from "@/lib/exportData";
import { DEFAULT_CATEGORIES, Category, LangKey } from "@/lib/constants";
import { CategoryIcon } from "@/components/CategoryIcon";
import { Globe, Palette, Sun, Moon, Monitor, Check, Sparkles } from "lucide-react";

interface OnboardingFlowProps {
  onComplete: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const appContext = useApp();
  const { lang, setLang } = appContext;
  const setCurrencyFn = appContext.setCurrency;

  const [step, setStep] = useState(0);
  const [selectedTheme, setSelectedTheme] = useState<"light" | "dark" | "system">("light");
  const [selectedLang, setSelectedLang] = useState<LangKey>(() => {
    // Auto-detect browser language, default to English
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('uz')) return 'uz';
    if (browserLang.startsWith('ru')) return 'ru';
    return 'en';
  });
  const [selectedCurrency, setSelectedCurrency] = useState("UZS");
  const [quickAdds, setQuickAdds] = useState<QuickAddPreset[]>([]);
  const [editingPreset, setEditingPreset] = useState<{ categoryId: string; amount: string } | null>(null);
  const [customCategories] = useState(() => JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)));

  // During onboarding, render using the *selected* language for immediate feedback
  const onboardingLang = selectedLang;

  const t = useMemo(() => {
    const copy = {
      uz: {
        welcomeTitle: "Hamyonga xush kelibsiz",
        welcomeSubtitle: "Sizning moliyaviy yordamchingiz",
        chooseLang: "Tilni tanlang",
        chooseCurrency: "Valyutani tanlang",
        currencySubtitle: "Hisobotlar uchun asosiy valyuta",
        chooseTheme: "Mavzuni tanlang",
        themeSubtitle: "Keyinroq o'zgartirishingiz mumkin",
        quickAddTitle: "Tez qo'shish",
        quickAddSubtitle: "Bir bosishda qo'shish uchun kategoriyalarni tanlang",
        next: "Keyingi",
        done: "Boshlash",
        amount: "Summa",
        close: "Yopish",
        allSet: "Hammasi tayyor!",
        startTracking: "Moliyaviy holatni kuzatishni boshlang",
        currency: "Valyuta",
        theme: "Mavzu",
        quickAdds: "Tez qo'shish",
        default: "Standart",
        light: "Yorug'",
        dark: "Tungi",
        auto: "Avtomatik",
        selectedHint: (n: number) => `Tanlandi: ${n}. Summani o'zgartirish uchun bosing`,
      },
      ru: {
        welcomeTitle: "Добро пожаловать в Hamyon",
        welcomeSubtitle: "Ваш финансовый помощник",
        chooseLang: "Выберите язык",
        chooseCurrency: "Выберите валюту",
        currencySubtitle: "Основная валюта для учёта",
        chooseTheme: "Выберите тему",
        themeSubtitle: "Вы сможете изменить это позже",
        quickAddTitle: "Быстро добавить",
        quickAddSubtitle: "Выберите категории для быстрого добавления",
        next: "Далее",
        done: "Начать",
        amount: "Сумма",
        close: "Закрыть",
        allSet: "Всё готово!",
        startTracking: "Начните отслеживать свои финансы прямо сейчас",
        currency: "Валюта",
        theme: "Тема",
        quickAdds: "Быстрые расходы",
        default: "По умолчанию",
        light: "Светлая",
        dark: "Тёмная",
        auto: "Авто",
        selectedHint: (n: number) => `Выбрано: ${n}. Нажмите выбранный, чтобы изменить сумму`,
      },
      en: {
        welcomeTitle: "Welcome to Hamyon",
        welcomeSubtitle: "Your smart financial assistant",
        chooseLang: "Choose language",
        chooseCurrency: "Choose your currency",
        currencySubtitle: "Primary currency for tracking",
        chooseTheme: "Choose your theme",
        themeSubtitle: "You can change this later",
        quickAddTitle: "Quick add",
        quickAddSubtitle: "Select categories for one-tap transactions",
        next: "Next",
        done: "Get started",
        amount: "Amount",
        close: "Close",
        allSet: "You're all set!",
        startTracking: "Start tracking your finances right now",
        currency: "Currency",
        theme: "Theme",
        quickAdds: "Quick adds",
        default: "Default",
        light: "Light",
        dark: "Dark",
        auto: "Auto",
        selectedHint: (n: number) => `Selected: ${n}. Tap a selected one to edit amount`,
      },
    } as const;

    return copy[onboardingLang];
  }, [onboardingLang]);

  const handleThemeChange = (theme: "light" | "dark" | "system") => {
    setSelectedTheme(theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  };

  const toggleQuickAdd = (categoryId: string) => {
    const exists = quickAdds.find((q) => q.categoryId === categoryId);
    if (exists) {
      setQuickAdds(quickAdds.filter((q) => q.categoryId !== categoryId));
      if (editingPreset?.categoryId === categoryId) {
        setEditingPreset(null);
      }
    } else {
      setQuickAdds([
        ...quickAdds,
        {
          id: categoryId,
          categoryId,
          emoji: "", // placeholder; we no longer use emojis
          amount: 0,
        },
      ]);
      setEditingPreset({ categoryId, amount: "" });
    }
  };

  const updatePresetAmount = (categoryId: string, amount: number) => {
    setQuickAdds(quickAdds.map((q) => (q.categoryId === categoryId ? { ...q, amount } : q)));
    setEditingPreset(null);
  };

  const handleComplete = () => {
    localStorage.setItem("hamyon_theme", selectedTheme);
    localStorage.setItem("hamyon_quickAdds", JSON.stringify(quickAdds));
    localStorage.setItem("hamyon_currency", selectedCurrency);
    localStorage.setItem("hamyon_categories", JSON.stringify(customCategories));
    localStorage.setItem("hamyon_onboarding", "complete");
    localStorage.setItem("hamyon_lang", selectedLang);
    setLang(selectedLang);
    setCurrencyFn(selectedCurrency);
    onComplete();
  };

  const handleLangSelect = (newLang: LangKey) => {
    setSelectedLang(newLang);
    // Also persist immediately so AppContext updates translations
    setLang(newLang);
  };

  const renderHeader = () => (
    <header className="flex items-center justify-between mb-6">
      <button
        type="button"
        onClick={handleComplete}
        className="text-body-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {t.close}
      </button>
      <div className="text-center">
        <p className="text-title-3 text-foreground font-semibold">Hamyon</p>
      </div>
      <div className="w-12" />
    </header>
  );

  const renderProgress = () => (
    <div className="flex gap-2 mb-6">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-secondary"}`}
          initial={false}
          animate={{ scaleX: i <= step ? 1 : 0.7 }}
        />
      ))}
    </div>
  );

  const steps = [
    // Step 0: Language
    <motion.div key="lang" className="w-full">
      {renderHeader()}
      {renderProgress()}

      <div className="card-elevated-lg p-6 text-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center"
        >
          <Globe className="w-8 h-8 text-primary" />
        </motion.div>
        <h1 className="text-title-1 text-foreground mb-2">{t.chooseLang}</h1>
        <p className="text-body-sm text-muted-foreground mb-6">{t.welcomeSubtitle}</p>

        <div className="space-y-3">
          {([
            { key: "uz" as const, label: "O'zbekcha", native: "UZ" },
            { key: "ru" as const, label: "Русский", native: "RU" },
            { key: "en" as const, label: "English", native: "EN" },
          ]).map((l) => (
            <motion.button
              key={l.key}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleLangSelect(l.key)}
              className={`w-full py-4 px-5 rounded-2xl flex items-center gap-4 transition-all ${
                selectedLang === l.key ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                selectedLang === l.key ? "bg-primary-foreground/20" : "bg-card"
              }`}>
                {l.native}
              </div>
              <span className="flex-1 text-left font-semibold">{l.label}</span>
              {selectedLang === l.key && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <Check className="w-5 h-5" />
                </motion.div>
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>,

    // Step 1: Currency
    <motion.div key="currency" className="w-full">
      {renderHeader()}
      {renderProgress()}

      <div className="card-elevated-lg p-6">
        <div className="text-center mb-6">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-income/20 to-income/5 flex items-center justify-center"
          >
            <CategoryIcon categoryId="salary" className="w-8 h-8 text-income" />
          </motion.div>
          <h2 className="text-title-1 text-foreground mb-2">{t.chooseCurrency}</h2>
          <p className="text-body-sm text-muted-foreground">{t.currencySubtitle}</p>
        </div>

        <div className="space-y-2">
          {CURRENCIES.map((c, i) => (
            <motion.button
              key={c.code}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedCurrency(c.code)}
              className={`w-full py-4 px-5 rounded-2xl flex items-center gap-4 transition-all ${
                selectedCurrency === c.code ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                selectedCurrency === c.code ? "bg-primary-foreground/20" : "bg-card"
              }`}>
                {c.symbol}
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold">{c.code}</p>
                <p className={`text-sm ${selectedCurrency === c.code ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{c.name}</p>
              </div>
              {selectedCurrency === c.code && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <Check className="w-5 h-5" />
                </motion.div>
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>,

    // Step 2: Theme
    <motion.div key="theme" className="w-full">
      {renderHeader()}
      {renderProgress()}

      <div className="card-elevated-lg p-6">
        <div className="text-center mb-6">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 flex items-center justify-center"
          >
            <Palette className="w-8 h-8 text-purple-500" />
          </motion.div>
          <h2 className="text-title-1 text-foreground mb-2">{t.chooseTheme}</h2>
          <p className="text-body-sm text-muted-foreground">{t.themeSubtitle}</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {([
            { key: "light" as const, icon: Sun, label: t.light },
            { key: "dark" as const, icon: Moon, label: t.dark },
            { key: "system" as const, icon: Monitor, label: t.auto },
          ]).map((item) => (
            <motion.button
              key={item.key}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleThemeChange(item.key)}
              className={`py-4 px-3 rounded-2xl flex flex-col items-center gap-2 transition-all ${
                selectedTheme === item.key ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"
              }`}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-sm font-medium">{item.label}</span>
            </motion.button>
          ))}
        </div>

        {/* Preview card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-5 rounded-2xl bg-card border border-border shadow-sm"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
              U
            </div>
            <div className="text-left">
              <p className="text-sm text-muted-foreground">Balance</p>
              <p className="font-bold text-foreground">1,250,000 {selectedCurrency}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 p-3 rounded-xl bg-red-50 dark:bg-red-950/30">
              <p className="text-xs text-muted-foreground">Expenses</p>
              <p className="font-semibold text-expense">-125,000</p>
            </div>
            <div className="flex-1 p-3 rounded-xl bg-green-50 dark:bg-green-950/30">
              <p className="text-xs text-muted-foreground">Income</p>
              <p className="font-semibold text-income">+500,000</p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>,

    // Step 3: Quick Add
    <motion.div key="quickadd" className="w-full">
      {renderHeader()}
      {renderProgress()}

      <div className="card-elevated-lg p-6">
        <div className="text-center mb-6">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center"
          >
            <Sparkles className="w-8 h-8 text-amber-500" />
          </motion.div>
          <h2 className="text-title-1 text-foreground mb-2">{t.quickAddTitle}</h2>
          <p className="text-body-sm text-muted-foreground">{t.quickAddSubtitle}</p>
        </div>

        <div className="grid grid-cols-3 gap-3 max-h-[40vh] overflow-y-auto pb-4">
          {customCategories.expense.map((cat: Category, i: number) => {
            const isSelected = quickAdds.some((q) => q.categoryId === cat.id);
            const preset = quickAdds.find((q) => q.categoryId === cat.id);

            return (
              <motion.div key={cat.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    if (!isSelected) {
                      toggleQuickAdd(cat.id);
                    } else if (editingPreset?.categoryId !== cat.id) {
                      setEditingPreset({ categoryId: cat.id, amount: String(preset?.amount || "") });
                    } else {
                      toggleQuickAdd(cat.id);
                    }
                  }}
                  className={`w-full p-4 rounded-2xl flex flex-col items-center gap-2 transition-all relative ${
                    isSelected ? "bg-primary/10 border-2 border-primary" : "bg-secondary border-2 border-transparent hover:border-border"
                  }`}
                >
                  {isSelected && preset && preset.amount > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center"
                    >
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </motion.div>
                  )}
                  <div className="w-10 h-10 rounded-2xl bg-card flex items-center justify-center" style={{ backgroundColor: cat.color + "20" }}>
                    <CategoryIcon categoryId={cat.id} className="w-5 h-5" style={{ color: cat.color }} />
                  </div>
                  <span className="text-xs font-medium text-foreground">{onboardingLang === "uz" ? cat.uz : onboardingLang === "ru" ? cat.ru : cat.en}</span>
                  {isSelected && preset && preset.amount > 0 && (
                    <span className="text-xs text-primary font-semibold">{formatUZS(preset.amount)}</span>
                  )}
                </motion.button>

                {editingPreset?.categoryId === cat.id && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mt-2 flex gap-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={editingPreset.amount}
                      onChange={(e) => setEditingPreset({ ...editingPreset, amount: e.target.value.replace(/\D/g, "") })}
                      placeholder={t.amount}
                      className="flex-1 px-3 py-2 text-sm rounded-lg bg-card border border-border focus:border-primary focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        const amount = Number(editingPreset.amount);
                        if (amount > 0) updatePresetAmount(cat.id, amount);
                        else {
                          setQuickAdds(quickAdds.filter((q) => q.categoryId !== cat.id));
                          setEditingPreset(null);
                        }
                      }}
                      className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold"
                    >
                      OK
                    </button>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        {quickAdds.length > 0 && (
          <p className="text-center text-sm text-muted-foreground mt-4">{t.selectedHint(quickAdds.length)}</p>
        )}
      </div>
    </motion.div>,

    // Step 4: Ready
    <motion.div key="ready" className="w-full">
      {renderHeader()}
      {renderProgress()}

      <div className="card-elevated-lg p-6 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="mx-auto mb-6 w-20 h-20 rounded-full bg-gradient-to-br from-income/20 to-income/5 flex items-center justify-center"
        >
          <Check className="w-10 h-10 text-income" />
        </motion.div>
        <h2 className="text-title-1 text-foreground mb-2">{t.allSet}</h2>
        <p className="text-body-sm text-muted-foreground mb-8">{t.startTracking}</p>

        {/* Summary */}
        <div className="space-y-3 text-left">
          <div className="p-4 rounded-2xl bg-secondary flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-income/10 flex items-center justify-center">
              <CategoryIcon categoryId="salary" className="w-5 h-5 text-income" />
            </div>
            <div>
              <p className="font-medium text-foreground">{t.currency}</p>
              <p className="text-sm text-muted-foreground">{selectedCurrency}</p>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-secondary flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              {selectedTheme === "dark" ? <Moon className="w-5 h-5 text-purple-500" /> : <Sun className="w-5 h-5 text-amber-500" />}
            </div>
            <div>
              <p className="font-medium text-foreground">{t.theme}</p>
              <p className="text-sm text-muted-foreground capitalize">{selectedTheme === "light" ? t.light : selectedTheme === "dark" ? t.dark : t.auto}</p>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-secondary flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="font-medium text-foreground">{t.quickAdds}</p>
              <p className="text-sm text-muted-foreground">
                {quickAdds.length > 0 ? `${quickAdds.length} selected` : t.default}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>,
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[200] bg-background flex flex-col"
    >
      {/* Content */}
      <div className="flex-1 px-4 pt-4 overflow-y-auto safe-top">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.25 }}
          >
            {steps[step]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="safe-bottom px-4 pb-6 pt-4 flex gap-3">
        {step > 0 && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setStep(step - 1)}
            className="w-14 h-14 rounded-2xl bg-secondary text-foreground font-semibold flex items-center justify-center"
          >
            <span className="text-xl">←</span>
          </motion.button>
        )}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            if (step < steps.length - 1) {
              setStep(step + 1);
            } else {
              handleComplete();
            }
          }}
          className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-semibold text-lg"
        >
          {step === steps.length - 1 ? t.done : t.next}
        </motion.button>
      </div>
    </motion.div>
  );
};

export default OnboardingFlow;
