import React, { useState, memo } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { LANGS, LangKey } from "@/lib/constants";
import { ThemeToggle } from "./ThemeToggle";

export const SettingsScreen = memo(() => {
  const { 
    t, lang, setLang,
    dataMode, setDataMode, useRemote, syncFromRemote, 
    setActiveScreen, setBalance, setTransactions, setLimits, setGoals, 
    categories, setCategories, theme, setTheme, setOnboardingComplete
  } = useApp();
  
  const [resetOpen, setResetOpen] = useState(false);
  
  const doReset = () => {
    setBalance(0);
    setTransactions([]);
    setLimits([]);
    setGoals([]);
    setResetOpen(false);
  };
  
  const openBot = () => {
    const BOT_USERNAME = "hamyonmoneybot";
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(`https://t.me/${BOT_USERNAME}`);
    } else {
      window.open(`https://t.me/${BOT_USERNAME}`, "_blank");
    }
  };
  
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
            ←
          </motion.button>
          <div className="flex-1">
            <h1 className="text-title-1 text-foreground">{t.settings}</h1>
          </div>
        </div>
        
        {/* Language */}
        <div className="card-elevated p-4 mb-4">
          <h3 className="text-title-3 text-foreground mb-4">{t.language}</h3>
          <div className="grid grid-cols-3 gap-2">
            {LANGS.map((l) => (
              <button
                key={l.key}
                onClick={() => setLang(l.key as LangKey)}
                className={`py-3 px-4 rounded-xl font-medium transition-all ${
                  lang === l.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {l.flag} {l.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Data Mode */}
        <div className="card-elevated p-4 mb-4">
          <h3 className="text-title-3 text-foreground mb-2">{t.dataMode}</h3>
          <p className="text-caption text-muted-foreground mb-4">
            {useRemote ? "✅ Connected to cloud" : "📱 Offline mode"}
          </p>
          
          <div className="flex gap-2 mb-4">
            {[
              { k: "auto", label: "Auto", icon: "🤖" },
              { k: "local", label: "Local", icon: "📱" },
              { k: "remote", label: "Cloud", icon: "☁️" },
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
                <span className="text-lg">{x.icon}</span>
                <span className="text-body-sm">{x.label}</span>
              </button>
            ))}
          </div>
          
          <button onClick={syncFromRemote} className="btn-primary w-full">
            🔄 {t.sync}
          </button>
        </div>
        
        {/* Telegram Bot */}
        <div className="card-elevated p-4 mb-4">
          <div className="flex items-center gap-4">
            <motion.div 
              className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="text-2xl">🤖</span>
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
        
        {/* Danger Zone */}
        <div className="card-elevated p-4 border-2 border-destructive/20">
          <h3 className="text-title-3 text-foreground mb-4">Danger Zone</h3>
          <button 
            onClick={() => setResetOpen(true)} 
            className="w-full py-4 rounded-xl bg-red-50 text-expense font-semibold"
          >
            🗑 {t.resetLocal}
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
            <h3 className="text-title-2 text-foreground mb-2">Reset all data?</h3>
            <p className="text-body-sm text-muted-foreground mb-6">
              This will delete all your transactions, budgets, and goals.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setResetOpen(false)} className="btn-secondary flex-1">{t.cancel}</button>
              <button onClick={doReset} className="flex-1 py-4 rounded-xl bg-destructive text-destructive-foreground font-semibold">{t.delete}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

SettingsScreen.displayName = "SettingsScreen";
