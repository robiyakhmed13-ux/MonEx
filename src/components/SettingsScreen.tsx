import React, { useState, memo } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { exportTransactionsCSV, CURRENCIES } from "@/lib/exportData";
import { 
  ArrowLeft, Bell, RefreshCw, FileSpreadsheet, Bot, Zap, Trash2,
  Sun, Moon, Monitor, Cloud, Smartphone, Settings2, User, HelpCircle,
  CreditCard, GraduationCap, ChevronRight, Star, Share2
} from "lucide-react";

export const SettingsScreen = memo(() => {
  const { 
    t, lang, setLang,
    dataMode, setDataMode, useRemote, syncFromRemote, 
    setActiveScreen, setBalance, setTransactions, setLimits, setGoals, 
    theme, setTheme, setOnboardingComplete,
    transactions, allCats, catLabel, currency, setCurrency,
    reminderDays, setReminderDays, tgUser
  } = useApp();
  
  const [resetOpen, setResetOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [showCurrency, setShowCurrency] = useState(false);
  
  const doReset = () => {
    setBalance(0);
    setTransactions([]);
    setLimits([]);
    setGoals([]);
    setResetOpen(false);
  };
  
  const doResetOnboarding = () => {
    localStorage.removeItem("hamyon_onboarding");
    localStorage.removeItem("hamyon_quickAdds");
    setOnboardingComplete(false);
    setCustomizeOpen(false);
    window.location.reload();
  };
  
  const handleExportCSV = () => {
    exportTransactionsCSV({
      transactions,
      categories: allCats,
      lang,
      currency,
      getCatLabel: catLabel,
    });
  };
  
  const openBot = () => {
    const BOT_USERNAME = "hamyonmoneybot";
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(`https://t.me/${BOT_USERNAME}`);
    } else {
      window.open(`https://t.me/${BOT_USERNAME}`, "_blank");
    }
  };

  const langs = [
    { key: "uz" as const, label: "O'zbekcha" },
    { key: "ru" as const, label: "Русский" },
    { key: "en" as const, label: "English" },
  ];

  const themeOptions = [
    { key: "light" as const, icon: Sun, label: lang === "ru" ? "Светлая" : lang === "uz" ? "Yorug'" : "Light" },
    { key: "dark" as const, icon: Moon, label: lang === "ru" ? "Тёмная" : lang === "uz" ? "Tungi" : "Dark" },
    { key: "system" as const, icon: Monitor, label: lang === "ru" ? "Авто" : lang === "uz" ? "Avto" : "Auto" },
  ];

  const getCurrentLangLabel = () => langs.find(l => l.key === lang)?.label || "English";
  const getCurrentThemeLabel = () => themeOptions.find(t => t.key === theme)?.label || "Auto";
  const getCurrentCurrencySymbol = () => CURRENCIES.find(c => c.code === currency)?.symbol || "UZS";
  
  return (
    <div className="min-h-screen bg-background pb-32 safe-top">
      {/* Header */}
      <div className="px-4 pt-4 pb-6">
        <div className="flex items-center gap-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setActiveScreen("home")}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </motion.button>
          <h1 className="text-2xl font-bold text-foreground">{t.settings}</h1>
        </div>
      </div>

      {/* Profile Card */}
      <div className="px-4 mb-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-accent border border-primary/20"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-primary-foreground text-2xl font-bold">
              {(tgUser?.first_name || "U").charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{tgUser?.first_name || "User"}</h2>
              {tgUser?.username && (
                <p className="text-sm text-muted-foreground">@{tgUser.username}</p>
              )}
            </div>
          </div>
          
          {/* Plan & Referral Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-card/60 backdrop-blur">
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Standard</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {lang === "ru" ? "Ваш план" : lang === "uz" ? "Sizning rejangiz" : "Your plan"}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-card/60 backdrop-blur">
              <div className="flex items-center gap-2 mb-1">
                <Share2 className="w-4 h-4 text-income" />
                <span className="text-sm font-semibold text-foreground">
                  {lang === "ru" ? "Рефералы" : lang === "uz" ? "Tavsiyalar" : "Referrals"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {lang === "ru" ? "Пригласи друзей" : lang === "uz" ? "Do'stlarni taklif qil" : "Invite friends"}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Menu Sections */}
      <div className="px-4 space-y-4">
        {/* Main Settings Group */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-card border border-border overflow-hidden"
        >
          <MenuItem 
            icon={<User className="w-5 h-5" />}
            label={lang === "ru" ? "Язык" : lang === "uz" ? "Til" : "Language"}
            value={getCurrentLangLabel()}
            onClick={() => setShowLanguage(true)}
          />
          <MenuItem 
            icon={theme === "dark" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            label={lang === "ru" ? "Тема" : lang === "uz" ? "Mavzu" : "Theme"}
            value={getCurrentThemeLabel()}
            onClick={() => setShowTheme(true)}
          />
          <MenuItem 
            icon={<CreditCard className="w-5 h-5" />}
            label={lang === "ru" ? "Валюта" : lang === "uz" ? "Valyuta" : "Currency"}
            value={getCurrentCurrencySymbol()}
            onClick={() => setShowCurrency(true)}
            isLast
          />
        </motion.div>

        {/* Data & Sync Group */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl bg-card border border-border overflow-hidden"
        >
          <MenuItem 
            icon={<Cloud className="w-5 h-5" />}
            label={lang === "ru" ? "Синхронизация" : lang === "uz" ? "Sinxronlash" : "Sync Data"}
            value={useRemote ? "Cloud" : "Local"}
            onClick={syncFromRemote}
          />
          <MenuItem 
            icon={<FileSpreadsheet className="w-5 h-5" />}
            label={lang === "ru" ? "Экспорт CSV" : lang === "uz" ? "CSV eksport" : "Export CSV"}
            onClick={handleExportCSV}
          />
          <MenuItem 
            icon={<Zap className="w-5 h-5" />}
            label={lang === "ru" ? "Быстрые настройки" : lang === "uz" ? "Tez sozlamalar" : "Quick Setup"}
            onClick={() => setCustomizeOpen(true)}
            isLast
          />
        </motion.div>

        {/* Help & Support Group */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-card border border-border overflow-hidden"
        >
          <MenuItem 
            icon={<HelpCircle className="w-5 h-5" />}
            label={lang === "ru" ? "Помощь" : lang === "uz" ? "Yordam" : "Help"}
            onClick={openBot}
          />
          <MenuItem 
            icon={<Bot className="w-5 h-5" />}
            label="Telegram Bot"
            value="@hamyonmoneybot"
            onClick={openBot}
          />
          <MenuItem 
            icon={<GraduationCap className="w-5 h-5" />}
            label={lang === "ru" ? "Обучение" : lang === "uz" ? "O'rganish" : "Learn"}
            onClick={openBot}
            isLast
          />
        </motion.div>

        {/* Danger Zone */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-2xl bg-card border border-destructive/30 overflow-hidden"
        >
          <MenuItem 
            icon={<Trash2 className="w-5 h-5 text-destructive" />}
            label={t.resetLocal}
            textColor="text-destructive"
            onClick={() => setResetOpen(true)}
            isLast
          />
        </motion.div>
      </div>
      
      {/* Language Picker Modal */}
      {showLanguage && (
        <PickerModal
          title={lang === "ru" ? "Язык" : lang === "uz" ? "Til" : "Language"}
          onClose={() => setShowLanguage(false)}
          options={langs.map(l => ({ key: l.key, label: l.label }))}
          selected={lang}
          onSelect={(key) => { setLang(key as any); setShowLanguage(false); }}
        />
      )}

      {/* Theme Picker Modal */}
      {showTheme && (
        <PickerModal
          title={lang === "ru" ? "Тема" : lang === "uz" ? "Mavzu" : "Theme"}
          onClose={() => setShowTheme(false)}
          options={themeOptions.map(t => ({ key: t.key, label: t.label, icon: t.icon }))}
          selected={theme}
          onSelect={(key) => { setTheme(key as any); setShowTheme(false); }}
        />
      )}

      {/* Currency Picker Modal */}
      {showCurrency && (
        <PickerModal
          title={lang === "ru" ? "Валюта" : lang === "uz" ? "Valyuta" : "Currency"}
          onClose={() => setShowCurrency(false)}
          options={CURRENCIES.map(c => ({ key: c.code, label: `${c.symbol} ${c.code}` }))}
          selected={currency}
          onSelect={(key) => { setCurrency(key); setShowCurrency(false); }}
        />
      )}

      {/* Reset Confirmation */}
      {resetOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={() => setResetOpen(false)}>
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="bg-background rounded-t-3xl p-6 w-full max-w-lg safe-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-foreground mb-2">
              {lang === "ru" ? "Сбросить все данные?" : lang === "uz" ? "Barcha ma'lumotlarni o'chirish?" : "Reset all data?"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {lang === "ru" ? "Все транзакции, бюджеты и цели будут удалены." : 
               lang === "uz" ? "Barcha tranzaksiyalar, byudjetlar va maqsadlar o'chiriladi." : 
               "This will delete all your transactions, budgets, and goals."}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setResetOpen(false)} className="btn-secondary flex-1">{t.cancel}</button>
              <button onClick={doReset} className="flex-1 py-4 rounded-xl bg-destructive text-destructive-foreground font-semibold">{t.delete}</button>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* Customize Preferences Confirmation */}
      {customizeOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={() => setCustomizeOpen(false)}>
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="bg-background rounded-t-3xl p-6 w-full max-w-lg safe-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-foreground mb-2">
              {lang === "ru" ? "Перезапустить настройку?" : lang === "uz" ? "Qayta sozlashni boshlash?" : "Restart setup wizard?"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {lang === "ru" ? "Вы сможете заново настроить быстрые расходы и предпочтения." : 
               lang === "uz" ? "Tez qo'shish va afzalliklarni qayta sozlashingiz mumkin." : 
               "You'll be able to reconfigure quick adds and preferences."}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setCustomizeOpen(false)} className="btn-secondary flex-1">{t.cancel}</button>
              <motion.button 
                whileTap={{ scale: 0.97 }}
                onClick={doResetOnboarding} 
                className="flex-1 py-4 rounded-xl bg-primary text-primary-foreground font-semibold"
              >
                {lang === "ru" ? "Начать" : lang === "uz" ? "Boshlash" : "Start"}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
});

SettingsScreen.displayName = "SettingsScreen";

// Reusable Menu Item Component
const MenuItem = ({ 
  icon, 
  label, 
  value, 
  onClick, 
  isLast = false,
  textColor = "text-foreground"
}: { 
  icon: React.ReactNode; 
  label: string; 
  value?: string; 
  onClick: () => void; 
  isLast?: boolean;
  textColor?: string;
}) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors ${!isLast ? 'border-b border-border' : ''}`}
  >
    <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground">
      {icon}
    </div>
    <span className={`flex-1 text-left font-medium ${textColor}`}>{label}</span>
    {value && <span className="text-sm text-muted-foreground">{value}</span>}
    <ChevronRight className="w-5 h-5 text-muted-foreground" />
  </button>
);

// Reusable Picker Modal
const PickerModal = ({ 
  title, 
  onClose, 
  options, 
  selected, 
  onSelect 
}: { 
  title: string; 
  onClose: () => void; 
  options: Array<{ key: string; label: string; icon?: React.FC<any> }>; 
  selected: string;
  onSelect: (key: string) => void;
}) => (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={onClose}>
    <motion.div 
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      className="bg-background rounded-t-3xl p-6 w-full max-w-lg safe-bottom"
      onClick={(e) => e.stopPropagation()}
    >
      <h3 className="text-xl font-bold text-foreground mb-4">{title}</h3>
      <div className="space-y-2">
        {options.map((opt) => {
          const IconComp = opt.icon;
          return (
            <button
              key={opt.key}
              onClick={() => onSelect(opt.key)}
              className={`w-full p-4 rounded-xl flex items-center gap-3 transition-all ${
                selected === opt.key 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-secondary text-foreground hover:bg-secondary/80'
              }`}
            >
              {IconComp && <IconComp className="w-5 h-5" />}
              <span className="font-medium">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </motion.div>
  </div>
);