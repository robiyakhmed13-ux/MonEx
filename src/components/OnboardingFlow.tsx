import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { ThemeToggle } from "./ThemeToggle";
import { QuickAddPreset } from "@/types";
import { formatUZS } from "@/lib/storage";

interface OnboardingFlowProps {
  onComplete: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const { t, lang, allCats, getCat, catLabel, setLang } = useApp();
  const [step, setStep] = useState(0);
  const [selectedTheme, setSelectedTheme] = useState<"light" | "dark" | "system">("light");
  const [selectedLang, setSelectedLang] = useState(lang);
  const [quickAdds, setQuickAdds] = useState<QuickAddPreset[]>([]);
  const [editingPreset, setEditingPreset] = useState<{ categoryId: string; amount: string } | null>(null);

  const handleThemeChange = (theme: "light" | "dark" | "system") => {
    setSelectedTheme(theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  };

  const toggleQuickAdd = (categoryId: string, emoji: string, defaultAmount: number) => {
    const exists = quickAdds.find(q => q.categoryId === categoryId);
    if (exists) {
      setQuickAdds(quickAdds.filter(q => q.categoryId !== categoryId));
    } else {
      setQuickAdds([...quickAdds, { 
        id: categoryId, 
        categoryId, 
        emoji, 
        amount: defaultAmount 
      }]);
    }
  };

  const updatePresetAmount = (categoryId: string, amount: number) => {
    setQuickAdds(quickAdds.map(q => 
      q.categoryId === categoryId ? { ...q, amount } : q
    ));
    setEditingPreset(null);
  };

  const handleComplete = () => {
    // Save preferences
    localStorage.setItem("hamyon_theme", selectedTheme);
    localStorage.setItem("hamyon_quickAdds", JSON.stringify(quickAdds));
    localStorage.setItem("hamyon_onboarding", "complete");
    setLang(selectedLang);
    onComplete();
  };

  const steps = [
    // Step 0: Welcome
    <motion.div key="welcome" className="text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center"
      >
        <span className="text-5xl">💰</span>
      </motion.div>
      <h1 className="text-3xl font-bold text-foreground mb-3">
        {lang === "ru" ? "Добро пожаловать в Hamyon" : 
         lang === "uz" ? "Hamyonga xush kelibsiz" : 
         "Welcome to Hamyon"}
      </h1>
      <p className="text-muted-foreground mb-8">
        {lang === "ru" ? "Ваш умный финансовый помощник" :
         lang === "uz" ? "Sizning moliyaviy yordamchingiz" :
         "Your smart financial assistant"}
      </p>
      
      {/* Language Selection */}
      <div className="space-y-3 mb-8">
        {[
          { key: "uz", label: "O'zbekcha", flag: "🇺🇿" },
          { key: "ru", label: "Русский", flag: "🇷🇺" },
          { key: "en", label: "English", flag: "🇬🇧" },
        ].map((l) => (
          <motion.button
            key={l.key}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedLang(l.key as any)}
            className={`w-full py-4 px-6 rounded-2xl flex items-center gap-4 transition-all ${
              selectedLang === l.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground"
            }`}
          >
            <span className="text-2xl">{l.flag}</span>
            <span className="font-semibold">{l.label}</span>
            {selectedLang === l.key && (
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="ml-auto text-xl"
              >
                ✓
              </motion.span>
            )}
          </motion.button>
        ))}
      </div>
    </motion.div>,

    // Step 1: Theme
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
            <p className="font-bold text-foreground">1,250,000 UZS</p>
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

    // Step 2: Quick Add Setup
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
        {allCats.expense.map((cat, i) => {
          const isSelected = quickAdds.some(q => q.categoryId === cat.id);
          const preset = quickAdds.find(q => q.categoryId === cat.id);
          const defaultAmounts: Record<string, number> = {
            coffee: 15000, restaurants: 35000, taxi: 20000, shopping: 100000,
            food: 50000, transport: 10000, bills: 200000, health: 100000,
            entertainment: 50000, education: 100000, fuel: 150000
          };
          
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
                    toggleQuickAdd(cat.id, cat.emoji, defaultAmounts[cat.id] || 50000);
                  } else if (editingPreset?.categoryId !== cat.id) {
                    setEditingPreset({ categoryId: cat.id, amount: String(preset?.amount || 50000) });
                  }
                }}
                onDoubleClick={() => toggleQuickAdd(cat.id, cat.emoji, defaultAmounts[cat.id] || 50000)}
                className={`w-full p-4 rounded-2xl flex flex-col items-center gap-2 transition-all relative ${
                  isSelected
                    ? "bg-primary/10 border-2 border-primary"
                    : "bg-secondary border-2 border-transparent"
                }`}
              >
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center"
                  >
                    <span className="text-primary-foreground text-xs font-bold">✓</span>
                  </motion.div>
                )}
                <span className="text-2xl">{cat.emoji}</span>
                <span className="text-xs font-medium text-foreground">{catLabel(cat)}</span>
                {isSelected && preset && (
                  <span className="text-xs text-primary font-semibold">
                    {formatUZS(preset.amount)}
                  </span>
                )}
              </motion.button>
              
              {/* Amount editor */}
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
                    className="flex-1 px-3 py-2 text-sm rounded-lg bg-card border border-border focus:border-primary focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={() => updatePresetAmount(cat.id, Number(editingPreset.amount) || 50000)}
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

    // Step 3: Ready
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
