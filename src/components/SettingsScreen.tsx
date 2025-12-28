import React, { useState, memo } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { LangKey } from "@/lib/constants";
import { ThemeToggle } from "./ThemeToggle";
import { exportTransactionsCSV, CURRENCIES } from "@/lib/exportData";
import { 
  ArrowLeft, Bell, RefreshCw, FileSpreadsheet, Bot, Zap, Trash2,
  Sun, Moon, Monitor, Cloud, Smartphone, Settings2
} from "lucide-react";

export const SettingsScreen = memo(() => {
  const { 
    t, lang, setLang,
    dataMode, setDataMode, useRemote, syncFromRemote, 
    setActiveScreen, setBalance, setTransactions, setLimits, setGoals, 
    theme, setTheme, setOnboardingComplete,
    transactions, allCats, catLabel, currency, setCurrency,
    reminderDays, setReminderDays
  } = useApp();
  
  const [resetOpen, setResetOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  
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
    { key: "uz" as const, label: "UZ" },
    { key: "ru" as const, label: "RU" },
    { key: "en" as const, label: "EN" },
  ];
  
  return (
    <div className="screen-container pb-24 safe-top">
      <div className="px-4 pt-2">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setActiveScreen("home")}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </motion.button>
          <div className="flex-1">
            <h1 className="text-title-1 text-foreground">{t.settings}</h1>
          </div>
        </div>
        
        {/* Language */}
        <div className="card-elevated p-4 mb-4">
          <h3 className="text-title-3 text-foreground mb-4">{t.language}</h3>
          <div className="grid grid-cols-3 gap-2">
            {langs.map((l) => (
              <button
                key={l.key}
                onClick={() => setLang(l.key)}
                className={`py-3 px-4 rounded-xl font-medium transition-all ${
                  lang === l.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Theme */}
        <div className="card-elevated p-4 mb-4">
          <h3 className="text-title-3 text-foreground mb-4">
            {lang === "ru" ? "Тема" : lang === "uz" ? "Mavzu" : "Theme"}
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {([
              { key: "light" as const, icon: Sun, label: lang === "ru" ? "Светлая" : lang === "uz" ? "Yorug'" : "Light" },
              { key: "dark" as const, icon: Moon, label: lang === "ru" ? "Тёмная" : lang === "uz" ? "Tungi" : "Dark" },
              { key: "system" as const, icon: Monitor, label: lang === "ru" ? "Авто" : lang === "uz" ? "Avto" : "Auto" },
            ]).map((item) => (
              <button
                key={item.key}
                onClick={() => setTheme(item.key)}
                className={`py-3 px-3 rounded-xl font-medium transition-all flex flex-col items-center gap-2 ${
                  theme === item.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-sm">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Currency */}
        <div className="card-elevated p-4 mb-4">
          <h3 className="text-title-3 text-foreground mb-4">
            {lang === "ru" ? "Валюта" : lang === "uz" ? "Valyuta" : "Currency"}
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {CURRENCIES.map((c) => (
              <button
                key={c.code}
                onClick={() => setCurrency(c.code)}
                className={`py-3 px-4 rounded-xl font-medium transition-all flex flex-col items-center gap-1 ${
                  currency === c.code
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                <span className="text-lg font-bold">{c.symbol}</span>
                <span className="text-sm">{c.code}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Notification Timing */}
        <div className="card-elevated p-4 mb-4">
          <h3 className="text-title-3 text-foreground mb-2">
            {lang === "ru" ? "Напоминания" : lang === "uz" ? "Eslatmalar" : "Reminders"}
          </h3>
          <p className="text-caption text-muted-foreground mb-4">
            {lang === "ru" ? "За сколько дней напоминать о счетах" : lang === "uz" ? "Hisoblar haqida necha kun oldin eslatish" : "How many days before bills to remind"}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[1, 3, 7].map((days) => (
              <button
                key={days}
                onClick={() => setReminderDays(days)}
                className={`py-3 px-4 rounded-xl font-medium transition-all flex flex-col items-center gap-1 ${
                  reminderDays === days
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                <Bell className="w-5 h-5" />
                <span className="text-sm">
                  {days} {lang === "ru" ? (days === 1 ? "день" : "дней") : lang === "uz" ? "kun" : (days === 1 ? "day" : "days")}
                </span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Data Mode */}
        <div className="card-elevated p-4 mb-4">
          <h3 className="text-title-3 text-foreground mb-2">{t.dataMode}</h3>
          <p className="text-caption text-muted-foreground mb-4">
            {useRemote ? "Connected to cloud" : "Offline mode"}
          </p>
          
          <div className="flex gap-2 mb-4">
            {[
              { k: "auto", label: "Auto", icon: Settings2 },
              { k: "local", label: "Local", icon: Smartphone },
              { k: "remote", label: "Cloud", icon: Cloud },
            ].map((x) => (
              <button
                key={x.k}
                onClick={() => setDataMode(x.k)}
                className={`flex-1 py-3 rounded-xl font-medium flex flex-col items-center gap-1 transition-all ${
                  dataMode === x.k
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                <x.icon className="w-5 h-5" />
                <span className="text-body-sm">{x.label}</span>
              </button>
            ))}
          </div>
          
          <button onClick={syncFromRemote} className="btn-primary w-full flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4" />
            {t.sync}
          </button>
        </div>
        
        {/* Export Data */}
        <div className="card-elevated p-4 mb-4">
          <div className="flex items-center gap-4">
            <motion.div 
              className="w-12 h-12 rounded-xl bg-gradient-to-br from-income/20 to-income/5 flex items-center justify-center"
            >
              <FileSpreadsheet className="w-6 h-6 text-income" />
            </motion.div>
            <div className="flex-1">
              <p className="font-medium text-foreground">
                {lang === "ru" ? "Экспорт данных" : lang === "uz" ? "Ma'lumotlarni eksport" : "Export Data"}
              </p>
              <p className="text-caption text-muted-foreground">
                {lang === "ru" ? "Скачать CSV для бухгалтерии" : lang === "uz" ? "Buxgalteriya uchun CSV yuklab olish" : "Download CSV for accounting"}
              </p>
            </div>
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={handleExportCSV} 
              className="btn-secondary"
            >
              CSV
            </motion.button>
          </div>
        </div>
        
        {/* Telegram Bot */}
        <div className="card-elevated p-4 mb-4">
          <div className="flex items-center gap-4">
            <motion.div 
              className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Bot className="w-6 h-6 text-primary" />
            </motion.div>
            <div className="flex-1">
              <p className="font-medium text-foreground">@hamyonmoneybot</p>
              <p className="text-caption text-muted-foreground">{t.botHint}</p>
            </div>
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={openBot} 
              className="btn-secondary"
            >
              {t.openBot}
            </motion.button>
          </div>
        </div>
        
        {/* Customize Preferences */}
        <div className="card-elevated p-4 mb-4">
          <div className="flex items-center gap-4">
            <motion.div 
              className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 flex items-center justify-center"
            >
              <Zap className="w-6 h-6 text-purple-500" />
            </motion.div>
            <div className="flex-1">
              <p className="font-medium text-foreground">
                {lang === "ru" ? "Быстрые настройки" : lang === "uz" ? "Tez sozlamalar" : "Quick Add Setup"}
              </p>
              <p className="text-caption text-muted-foreground">
                {lang === "ru" ? "Перенастроить быстрые расходы" : lang === "uz" ? "Tez qo'shish tugmalarini qayta sozlash" : "Reconfigure quick add buttons"}
              </p>
            </div>
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => setCustomizeOpen(true)} 
              className="btn-secondary"
            >
              {lang === "ru" ? "Настроить" : lang === "uz" ? "Sozlash" : "Setup"}
            </motion.button>
          </div>
        </div>
        
        {/* Danger Zone */}
        <div className="card-elevated p-4 border-2 border-destructive/20">
          <h3 className="text-title-3 text-foreground mb-4">
            {lang === "ru" ? "Опасная зона" : lang === "uz" ? "Xavfli zona" : "Danger Zone"}
          </h3>
          <button 
            onClick={() => setResetOpen(true)} 
            className="w-full py-4 rounded-xl bg-red-50 dark:bg-red-950/30 text-expense font-semibold flex items-center justify-center gap-2"
          >
            <Trash2 className="w-5 h-5" />
            {t.resetLocal}
          </button>
        </div>
      </div>
      
      {/* Reset Confirmation */}
      {resetOpen && (
        <div className="modal-overlay" onClick={() => setResetOpen(false)}>
          <div 
            className="absolute bottom-0 left-0 right-0 modal-content safe-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-title-2 text-foreground mb-2">
              {lang === "ru" ? "Сбросить все данные?" : lang === "uz" ? "Barcha ma'lumotlarni o'chirish?" : "Reset all data?"}
            </h3>
            <p className="text-body-sm text-muted-foreground mb-6">
              {lang === "ru" ? "Все транзакции, бюджеты и цели будут удалены." : 
               lang === "uz" ? "Barcha tranzaksiyalar, byudjetlar va maqsadlar o'chiriladi." : 
               "This will delete all your transactions, budgets, and goals."}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setResetOpen(false)} className="btn-secondary flex-1">{t.cancel}</button>
              <button onClick={doReset} className="flex-1 py-4 rounded-xl bg-destructive text-destructive-foreground font-semibold">{t.delete}</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Customize Preferences Confirmation */}
      {customizeOpen && (
        <div className="modal-overlay" onClick={() => setCustomizeOpen(false)}>
          <div 
            className="absolute bottom-0 left-0 right-0 modal-content safe-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-title-2 text-foreground mb-2">
              {lang === "ru" ? "Перезапустить настройку?" : lang === "uz" ? "Qayta sozlashni boshlash?" : "Restart setup wizard?"}
            </h3>
            <p className="text-body-sm text-muted-foreground mb-6">
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
          </div>
        </div>
      )}
    </div>
  );
});

SettingsScreen.displayName = "SettingsScreen";
