import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { ThemeToggle } from "./ThemeToggle";
import { QuickAddPreset } from "@/types";
import { formatUZS } from "@/lib/storage";
import { CURRENCIES } from "@/lib/exportData";
import { DEFAULT_CATEGORIES, Category, LangKey } from "@/lib/constants";
import { CategoryIcon } from "@/components/CategoryIcon";
import { Globe, Palette } from "lucide-react";

interface OnboardingFlowProps {
  onComplete: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const appContext = useApp();
  const { lang, setLang } = appContext;
  const setCurrencyFn = appContext.setCurrency;

  const [step, setStep] = useState(0);
  const [selectedTheme, setSelectedTheme] = useState<"light" | "dark" | "system">("light");
  const [selectedLang, setSelectedLang] = useState<LangKey>(lang);
  const [selectedCurrency, setSelectedCurrency] = useState("UZS");
  const [quickAdds, setQuickAdds] = useState<QuickAddPreset[]>([]);
  const [editingPreset, setEditingPreset] = useState<{ categoryId: string; amount: string } | null>(null);
  const [customCategories] = useState(() => JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)));

  // IMPORTANT: During onboarding we render using the *selected* language, not the persisted one.
  const onboardingLang = selectedLang;

  const t = useMemo(() => {
    // Use AppContext translations (already stable) by temporarily reading from constants via context.
    // AppContext.t is based on persisted lang; since we want immediate UI updates, we map manually here.
    // Keeping it small: only keys used in onboarding.
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
    setLang(selectedLang);
    setCurrencyFn(selectedCurrency);
    onComplete();
  };

  const steps = [
    // Step 0: Language
    <motion.div key="lang" className="w-full">
      <header className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={handleComplete}
          className="text-body-sm text-muted-foreground"
        >
          {onboardingLang === "ru" ? "Закрыть" : onboardingLang === "uz" ? "Yopish" : "Close"}
        </button>
        <div className="text-center">
          <p className="text-title-3 text-foreground">{t.welcomeTitle}</p>
          <p className="text-caption text-muted-foreground">{t.welcomeSubtitle}</p>
        </div>
        <div className="w-12" />
      </header>

      <div className="flex gap-2 mb-6">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-secondary"}`}
          />
        ))}
      </div>

      <div className="card-elevated-lg p-6 text-center">
        <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center">
          <Globe className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-title-1 text-foreground mb-2">{t.chooseLang}</h1>
        <p className="text-body-sm text-muted-foreground mb-6">{t.welcomeSubtitle}</p>

        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { key: "uz", label: "UZ" },
              { key: "ru", label: "RU" },
              { key: "en", label: "EN" },
            ] as const
          ).map((l) => (
            <motion.button
              key={l.key}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setSelectedLang(l.key);
                // Fix: apply immediately so everything renders in chosen language.
                setLang(l.key);
              }}
              className={`py-4 rounded-2xl font-semibold transition-all ${
                selectedLang === l.key ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
              }`}
            >
              {l.label}
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>,

    // Step 1: Currency
    <motion.div key="currency" className="w-full">
      <header className="flex items-center justify-between mb-6">
        <button type="button" onClick={handleComplete} className="text-body-sm text-muted-foreground">
          {onboardingLang === "ru" ? "Закрыть" : onboardingLang === "uz" ? "Yopish" : "Close"}
        </button>
        <div className="text-center">
          <p className="text-title-3 text-foreground">Hamyon</p>
          <p className="text-caption text-muted-foreground">{t.currencySubtitle}</p>
        </div>
        <div className="w-12" />
      </header>

      <div className="flex gap-2 mb-6">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-secondary"}`}
          />
        ))}
      </div>

      <div className="card-elevated-lg p-6">
        <div className="text-center mb-4">
          <div className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center">
            <CategoryIcon categoryId="salary" className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-title-1 text-foreground">{t.chooseCurrency}</h2>
          <p className="text-body-sm text-muted-foreground">{t.currencySubtitle}</p>
        </div>

        <div className="space-y-2">
          {CURRENCIES.map((c, i) => (
            <motion.button
              key={c.code}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedCurrency(c.code)}
              className={`w-full py-4 px-5 rounded-2xl flex items-center gap-4 transition-all ${
                selectedCurrency === c.code ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-card/60 flex items-center justify-center">
                <span className="text-sm font-bold">{c.code}</span>
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold">{c.code}</p>
                <p className={`text-sm ${selectedCurrency === c.code ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{c.name}</p>
              </div>
              <span className="text-xl font-semibold">{c.symbol}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>,

    // Step 2: Theme
    <motion.div key="theme" className="w-full">
      <header className="flex items-center justify-between mb-6">
        <button type="button" onClick={handleComplete} className="text-body-sm text-muted-foreground">
          {onboardingLang === "ru" ? "Закрыть" : onboardingLang === "uz" ? "Yopish" : "Close"}
        </button>
        <div className="text-center">
          <p className="text-title-3 text-foreground">Hamyon</p>
          <p className="text-caption text-muted-foreground">{t.chooseTheme}</p>
        </div>
        <div className="w-12" />
      </header>

      <div className="flex gap-2 mb-6">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-secondary"}`}
          />
        ))}
      </div>

      <div className="card-elevated-lg p-6">
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center">
            <Palette className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-title-1 text-foreground">{t.chooseTheme}</h2>
          <p className="text-body-sm text-muted-foreground">{t.themeSubtitle}</p>
        </div>

        <ThemeToggle theme={selectedTheme} onChange={handleThemeChange} />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 p-6 rounded-2xl bg-card shadow-lg"
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
      <header className="flex items-center justify-between mb-6">
        <button type="button" onClick={handleComplete} className="text-body-sm text-muted-foreground">
          {onboardingLang === "ru" ? "Закрыть" : onboardingLang === "uz" ? "Yopish" : "Close"}
        </button>
        <div className="text-center">
          <p className="text-title-3 text-foreground">Hamyon</p>
          <p className="text-caption text-muted-foreground">{t.quickAddTitle}</p>
        </div>
        <div className="w-12" />
      </header>

      <div className="flex gap-2 mb-6">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-secondary"}`}
          />
        ))}
      </div>

      <div className="card-elevated-lg p-6">
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center">
            <CategoryIcon categoryId="other" className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-title-1 text-foreground">{t.quickAddTitle}</h2>
          <p className="text-body-sm text-muted-foreground">{t.quickAddSubtitle}</p>
        </div>

        <div className="grid grid-cols-3 gap-3 max-h-[45vh] overflow-y-auto pb-4">
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
                    isSelected ? "bg-primary/10 border-2 border-primary" : "bg-secondary border-2 border-transparent"
                  }`}
                >
                  <div className="w-10 h-10 rounded-2xl bg-card flex items-center justify-center">
                    <CategoryIcon categoryId={cat.id} className="w-5 h-5 text-foreground" />
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
  ];


    // Step 1: Currency Selection
    <motion.div key="currency" className="text-center">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-6"
      >
        <span className="text-6xl block mb-4">💱</span>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {lang === "ru" ? "Выберите валюту" :
           lang === "uz" ? "Valyutani tanlang" :
           "Choose your currency"}
        </h2>
        <p className="text-muted-foreground">
          {lang === "ru" ? "Основная валюта для учёта" :
           lang === "uz" ? "Hisobotlar uchun asosiy valyuta" :
           "Primary currency for tracking"}
        </p>
      </motion.div>
      
      <div className="space-y-3">
        {CURRENCIES.map((c, i) => (
          <motion.button
            key={c.code}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedCurrency(c.code)}
            className={`w-full py-4 px-6 rounded-2xl flex items-center gap-4 transition-all ${
              selectedCurrency === c.code
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground"
            }`}
          >
            <span className="text-2xl">{c.flag}</span>
            <div className="flex-1 text-left">
              <p className="font-semibold">{c.code}</p>
              <p className={`text-sm ${selectedCurrency === c.code ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{c.name}</p>
            </div>
            <span className="text-xl font-bold">{c.symbol}</span>
            {selectedCurrency === c.code && (
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-xl"
              >
                ✓
              </motion.span>
            )}
          </motion.button>
        ))}
      </div>
    </motion.div>,

    // Step 2: Theme
    <motion.div key="theme" className="text-center">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-6"
      >
        <span className="text-6xl block mb-4">🎨</span>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {lang === "ru" ? "Выберите тему" :
           lang === "uz" ? "Mavzuni tanlang" :
           "Choose your theme"}
        </h2>
        <p className="text-muted-foreground">
          {lang === "ru" ? "Вы можете изменить это позже" :
           lang === "uz" ? "Keyinroq o'zgartirishingiz mumkin" :
           "You can change this later"}
        </p>
      </motion.div>
      
      <ThemeToggle theme={selectedTheme} onChange={handleThemeChange} />
      
      {/* Preview */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-8 p-6 rounded-2xl bg-card shadow-lg"
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
    </motion.div>,

    // Step 3: Quick Add Setup
    <motion.div key="quickadd">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-6"
      >
        <span className="text-6xl block mb-4">⚡</span>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {lang === "ru" ? "Быстрые расходы" :
           lang === "uz" ? "Tez qo'shish" :
           "Quick Add Setup"}
        </h2>
        <p className="text-muted-foreground">
          {lang === "ru" ? "Выберите категории для быстрого добавления" :
           lang === "uz" ? "Tez qo'shish uchun kategoriyalarni tanlang" :
           "Select categories for one-tap transactions"}
        </p>
      </motion.div>
      
      <div className="grid grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto pb-4">
        {customCategories.expense.map((cat: Category, i: number) => {
          const isSelected = quickAdds.some(q => q.categoryId === cat.id);
          const preset = quickAdds.find(q => q.categoryId === cat.id);
          
          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (!isSelected) {
                    toggleQuickAdd(cat.id, cat.emoji);
                  } else if (editingPreset?.categoryId !== cat.id) {
                    setEditingPreset({ categoryId: cat.id, amount: String(preset?.amount || '') });
                  } else {
                    // Toggle off when clicking again
                    toggleQuickAdd(cat.id, cat.emoji);
                  }
                }}
                className={`w-full p-4 rounded-2xl flex flex-col items-center gap-2 transition-all relative ${
                  isSelected
                    ? "bg-primary/10 border-2 border-primary"
                    : "bg-secondary border-2 border-transparent"
                }`}
              >
                {isSelected && preset && preset.amount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center"
                  >
                    <span className="text-primary-foreground text-xs font-bold">✓</span>
                  </motion.div>
                )}
                <span className="text-2xl">{cat.emoji}</span>
                <span className="text-xs font-medium text-foreground">{lang === "uz" ? cat.uz : lang === "ru" ? cat.ru : cat.en}</span>
                {isSelected && preset && preset.amount > 0 && (
                  <span className="text-xs text-primary font-semibold">
                    {formatUZS(preset.amount)}
                  </span>
                )}
              </motion.button>
              
              {/* Amount editor - shows immediately when selected */}
              {editingPreset?.categoryId === cat.id && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 flex gap-1"
                >
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editingPreset.amount}
                    onChange={(e) => setEditingPreset({ ...editingPreset, amount: e.target.value.replace(/\D/g, '') })}
                    placeholder={lang === "ru" ? "Сумма" : lang === "uz" ? "Summa" : "Amount"}
                    className="flex-1 px-3 py-2 text-sm rounded-lg bg-card border border-border focus:border-primary focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      const amount = Number(editingPreset.amount);
                      if (amount > 0) {
                        updatePresetAmount(cat.id, amount);
                      } else {
                        // Remove if no amount entered
                        setQuickAdds(quickAdds.filter(q => q.categoryId !== cat.id));
                        setEditingPreset(null);
                      }
                    }}
                    className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold"
                  >
                    ✓
                  </button>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
      
      {quickAdds.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-sm text-muted-foreground mt-4"
        >
          {lang === "ru" ? `Выбрано: ${quickAdds.length}. Нажмите на выбранный, чтобы изменить сумму` :
           lang === "uz" ? `Tanlandi: ${quickAdds.length}. Summani o'zgartirish uchun bosing` :
           `Selected: ${quickAdds.length}. Tap selected to edit amount`}
        </motion.p>
      )}
    </motion.div>,

    // Step 4: Category Customization
    <motion.div key="categories">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-6"
      >
        <span className="text-6xl block mb-4">🎨</span>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {lang === "ru" ? "Настройте категории" :
           lang === "uz" ? "Kategoriyalarni sozlang" :
           "Customize Categories"}
        </h2>
        <p className="text-muted-foreground">
          {lang === "ru" ? "Измените иконки и цвета по своему вкусу" :
           lang === "uz" ? "O'zingizga yoqqan belgi va ranglarni tanlang" :
           "Change icons and colors to your preference"}
        </p>
      </motion.div>
      
      <div className="space-y-3 max-h-[50vh] overflow-y-auto pb-4">
        {customCategories.expense.map((cat: Category, i: number) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className="p-3 rounded-xl bg-secondary flex items-center gap-3"
          >
            {/* Emoji selector */}
            <div className="relative">
              <button
                onClick={() => setEditingCategory(
                  editingCategory?.id === cat.id && editingCategory?.field === 'emoji' 
                    ? null 
                    : { id: cat.id, field: 'emoji' }
                )}
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-card border-2 border-border hover:border-primary transition-colors"
              >
                {cat.emoji}
              </button>
              
              {editingCategory?.id === cat.id && editingCategory?.field === 'emoji' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute top-14 left-0 z-50 p-2 bg-card rounded-xl shadow-lg border border-border grid grid-cols-5 gap-1 w-48"
                >
                  {CATEGORY_EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => updateCategoryEmoji(cat.id, emoji)}
                      className={`p-2 rounded-lg text-lg hover:bg-secondary ${cat.emoji === emoji ? 'bg-primary/20 ring-2 ring-primary' : ''}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
            
            {/* Category name */}
            <div className="flex-1">
              <p className="font-medium text-foreground">
                {lang === "uz" ? cat.uz : lang === "ru" ? cat.ru : cat.en}
              </p>
            </div>
            
            {/* Color selector */}
            <div className="relative">
              <button
                onClick={() => setEditingCategory(
                  editingCategory?.id === cat.id && editingCategory?.field === 'color' 
                    ? null 
                    : { id: cat.id, field: 'color' }
                )}
                className="w-10 h-10 rounded-xl flex items-center justify-center border-2 border-border hover:border-primary transition-colors"
                style={{ backgroundColor: cat.color }}
              >
                <Palette className="w-4 h-4 text-white drop-shadow-md" />
              </button>
              
              {editingCategory?.id === cat.id && editingCategory?.field === 'color' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute top-14 right-0 z-50 p-2 bg-card rounded-xl shadow-lg border border-border grid grid-cols-5 gap-1 w-40"
                >
                  {CATEGORY_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => updateCategoryColor(cat.id, color)}
                      className={`w-6 h-6 rounded-lg ${cat.color === color ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center text-sm text-muted-foreground mt-4"
      >
        {lang === "ru" ? "Нажмите на иконку или цвет для изменения" :
         lang === "uz" ? "O'zgartirish uchun belgi yoki rangni bosing" :
         "Tap icon or color to change"}
      </motion.p>
    </motion.div>,

    // Step 5: Ready
    <motion.div key="ready" className="text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-income/20 to-income/5 flex items-center justify-center"
      >
        <motion.span 
          className="text-6xl"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          🎉
        </motion.span>
      </motion.div>
      <h2 className="text-2xl font-bold text-foreground mb-3">
        {lang === "ru" ? "Всё готово!" :
         lang === "uz" ? "Hammasi tayyor!" :
         "You're all set!"}
      </h2>
      <p className="text-muted-foreground mb-8">
        {lang === "ru" ? "Начните отслеживать свои финансы прямо сейчас" :
         lang === "uz" ? "Moliyaviy holatni kuzatishni boshlang" :
         "Start tracking your finances right now"}
      </p>
      
      {/* Summary */}
      <div className="space-y-3 text-left">
        <div className="p-4 rounded-2xl bg-secondary flex items-center gap-4">
          <span className="text-2xl">💱</span>
          <div>
            <p className="font-medium text-foreground">
              {lang === "ru" ? "Валюта" : lang === "uz" ? "Valyuta" : "Currency"}
            </p>
            <p className="text-sm text-muted-foreground">{selectedCurrency}</p>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-secondary flex items-center gap-4">
          <span className="text-2xl">{selectedTheme === "dark" ? "🌙" : "☀️"}</span>
          <div>
            <p className="font-medium text-foreground">
              {lang === "ru" ? "Тема" : lang === "uz" ? "Mavzu" : "Theme"}
            </p>
            <p className="text-sm text-muted-foreground capitalize">{selectedTheme}</p>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-secondary flex items-center gap-4">
          <span className="text-2xl">⚡</span>
          <div>
            <p className="font-medium text-foreground">
              {lang === "ru" ? "Быстрые расходы" : lang === "uz" ? "Tez qo'shish" : "Quick adds"}
            </p>
            <p className="text-sm text-muted-foreground">
              {quickAdds.length > 0 
                ? quickAdds.map(q => q.emoji).join(" ") 
                : (lang === "ru" ? "По умолчанию" : lang === "uz" ? "Standart" : "Default")}
            </p>
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
      {/* Progress */}
      <div className="safe-top px-6 pt-4">
        <div className="flex gap-2 mb-8">
          {steps.map((_, i) => (
            <motion.div
              key={i}
              className={`flex-1 h-1 rounded-full ${
                i <= step ? "bg-primary" : "bg-secondary"
              }`}
              initial={false}
              animate={{ 
                scaleX: i === step ? 1 : i < step ? 1 : 0.5,
                opacity: i <= step ? 1 : 0.5
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 px-6 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            {steps[step]}
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Navigation */}
      <div className="safe-bottom px-6 pb-6 pt-4 flex gap-3">
        {step > 0 && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setStep(step - 1)}
            className="px-6 py-4 rounded-2xl bg-secondary text-foreground font-semibold"
          >
            ←
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
          className="flex-1 py-4 rounded-2xl bg-primary text-primary-foreground font-semibold"
        >
          {step === steps.length - 1 
            ? (lang === "ru" ? "Начать" : lang === "uz" ? "Boshlash" : "Get Started")
            : (lang === "ru" ? "Далее" : lang === "uz" ? "Keyingi" : "Continue")}
        </motion.button>
      </div>
    </motion.div>
  );
};

export default OnboardingFlow;
