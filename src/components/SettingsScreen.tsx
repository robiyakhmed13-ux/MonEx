import React, { useState, memo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { exportTransactionsCSV, CURRENCIES } from "@/lib/exportData";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowLeft, RefreshCw, FileSpreadsheet, Zap, Trash2,
  Sun, Moon, Monitor, Cloud, User, HelpCircle,
  CreditCard, GraduationCap, ChevronRight, Star, Share2,
  LogIn, LogOut, Mail, MessageCircle, Link2, Unlink, ExternalLink, Copy, Check
} from "lucide-react";

export const SettingsScreen = memo(() => {
  const navigate = useNavigate();
  const { 
    t, lang, setLang,
    dataMode, setDataMode, useRemote, syncFromRemote, 
    setActiveScreen, setBalance, setTransactions, setLimits, setGoals, 
    theme, setTheme, setOnboardingComplete,
    transactions, allCats, catLabel, currency, setCurrency,
    reminderDays, setReminderDays, tgUser,
    // Auth
    user, profile, isAuthenticated, signOut
  } = useApp();
  
  const [resetOpen, setResetOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [showCurrency, setShowCurrency] = useState(false);
  const [showTelegramLink, setShowTelegramLink] = useState(false);
  const [linkingCode, setLinkingCode] = useState<string | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  
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
  
  const BOT_USERNAME = "hamyon_uz_aibot";
  
  const openBot = () => {
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(`https://t.me/${BOT_USERNAME}`);
    } else {
      window.open(`https://t.me/${BOT_USERNAME}`, "_blank");
    }
  };

  const generateLinkingCode = async () => {
    if (!user?.id) return;
    setIsGeneratingCode(true);
    
    try {
      // Generate a random 6-character code
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      // Store the code in telegram_users table or create new entry
      const { error } = await supabase
        .from('telegram_users')
        .upsert({
          telegram_id: 0, // Placeholder, will be updated when user links via bot
          linking_code: code,
          code_expires_at: expiresAt.toISOString(),
          user_id: user.id,
        }, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        });
      
      if (error) {
        console.error('Error generating linking code:', error);
        // Try insert instead
        const { error: insertError } = await supabase
          .from('telegram_users')
          .insert({
            telegram_id: Date.now(), // Unique placeholder
            linking_code: code,
            code_expires_at: expiresAt.toISOString(),
            user_id: user.id,
          });
        
        if (insertError) {
          console.error('Insert error:', insertError);
        } else {
          setLinkingCode(code);
        }
      } else {
        setLinkingCode(code);
      }
    } catch (err) {
      console.error('Failed to generate linking code:', err);
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const copyCode = async () => {
    if (!linkingCode) return;
    await navigator.clipboard.writeText(linkingCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const unlinkTelegram = async () => {
    if (!user?.id) return;
    
    try {
      await supabase
        .from('profiles')
        .update({ telegram_id: null, telegram_username: null })
        .eq('id', user.id);
      
      await supabase
        .from('telegram_users')
        .delete()
        .eq('user_id', user.id);
      
      // Force refresh
      window.location.reload();
    } catch (err) {
      console.error('Failed to unlink Telegram:', err);
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
    <div className="screen-container overflow-y-auto">
      {/* Header - Large Title */}
      <div className="screen-header sticky top-0 bg-background/95 backdrop-blur-sm z-10 -mx-4 px-4 py-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveScreen("home")}
            className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center active:opacity-80 transition-opacity shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-large-title text-foreground">{t.settings}</h1>
        </div>
      </div>

      {/* Profile Card - Info Card style */}
      <div className="mb-section">
        <div className="card-elevated p-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold">
              {isAuthenticated 
                ? (profile?.full_name || user?.email || "U").charAt(0).toUpperCase()
                : (tgUser?.first_name || "U").charAt(0)
              }
            </div>
            <div className="flex-1">
              <p className="text-caption">
                {lang === "ru" ? "Привет" : lang === "uz" ? "Salom" : "Hello"}
              </p>
              <h2 className="text-title text-foreground">
                {isAuthenticated 
                  ? (profile?.full_name || user?.email?.split('@')[0] || "User")
                  : (tgUser?.first_name || "Guest")
                }
              </h2>
              {isAuthenticated ? (
                <p className="text-caption flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {user?.email}
                </p>
              ) : tgUser?.username ? (
                <p className="text-caption">@{tgUser.username}</p>
              ) : (
                <p className="text-caption">
                  {lang === "ru" ? "Гость" : lang === "uz" ? "Mehmon" : "Guest"}
                </p>
              )}
            </div>
          </div>

          {/* Auth Button */}
          {isAuthenticated ? (
            <button
              onClick={async () => {
                await signOut();
                navigate('/auth');
              }}
              className="w-full py-3 rounded-xl bg-destructive/10 text-destructive font-medium flex items-center justify-center gap-2 active:opacity-80 transition-opacity"
            >
              <LogOut className="w-4 h-4" />
              {lang === "ru" ? "Выйти" : lang === "uz" ? "Chiqish" : "Sign Out"}
            </button>
          ) : (
            <button
              onClick={() => navigate('/auth')}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              {lang === "ru" ? "Войти / Регистрация" : lang === "uz" ? "Kirish / Ro'yxat" : "Sign In / Sign Up"}
            </button>
          )}
          
          {/* Plan & Sync Cards */}
          {isAuthenticated && (
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 rounded-xl bg-secondary">
                <div className="flex items-center gap-2 mb-1">
                  <Star className="w-4 h-4 text-primary" />
                  <span className="text-body-medium text-foreground">Standard</span>
                </div>
                <p className="text-caption">
                  {lang === "ru" ? "Ваш план" : lang === "uz" ? "Sizning rejangiz" : "Your plan"}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-secondary">
                <div className="flex items-center gap-2 mb-1">
                  <Cloud className="w-4 h-4 text-income" />
                  <span className="text-body-medium text-foreground">
                    {lang === "ru" ? "Синхрон" : lang === "uz" ? "Sinxron" : "Synced"}
                  </span>
                </div>
                <p className="text-caption">
                  {lang === "ru" ? "Данные в облаке" : lang === "uz" ? "Ma'lumotlar bulutda" : "Data in cloud"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Menu Sections - Spacing 16px between sections */}
      <div className="space-y-4">
        {/* Main Settings Group */}
        <div className="card-elevated overflow-hidden">
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
        </div>

        {/* Telegram Integration Group - Only for authenticated users */}
        {isAuthenticated && (
          <div className="card-elevated overflow-hidden">
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0088cc] flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-body-medium text-foreground">
                    {lang === "ru" ? "Telegram бот" : lang === "uz" ? "Telegram bot" : "Telegram Bot"}
                  </h3>
                  <p className="text-caption">@{BOT_USERNAME}</p>
                </div>
                {profile?.telegram_id && (
                  <span className="chip chip-primary">
                    {lang === "ru" ? "Связан" : lang === "uz" ? "Ulangan" : "Linked"}
                  </span>
                )}
              </div>
            </div>
            
            {profile?.telegram_id ? (
              <>
                <div className="p-4 border-b border-border">
                  <p className="text-caption mb-1">
                    {lang === "ru" ? "Аккаунт связан" : lang === "uz" ? "Hisob ulangan" : "Account linked"}
                  </p>
                  <p className="text-body-medium text-foreground">
                    {profile?.telegram_username ? `@${profile.telegram_username}` : `ID: ${profile.telegram_id}`}
                  </p>
                </div>
                <MenuItem 
                  icon={<ExternalLink className="w-5 h-5 text-[#0088cc]" />}
                  label={lang === "ru" ? "Открыть бот" : lang === "uz" ? "Botni ochish" : "Open Bot"}
                  onClick={openBot}
                />
                <MenuItem 
                  icon={<Unlink className="w-5 h-5 text-destructive" />}
                  label={lang === "ru" ? "Отвязать" : lang === "uz" ? "Uzish" : "Unlink"}
                  textColor="text-destructive"
                  onClick={unlinkTelegram}
                  isLast
                />
              </>
            ) : (
              <MenuItem 
                icon={<Link2 className="w-5 h-5 text-[#0088cc]" />}
                label={lang === "ru" ? "Связать Telegram" : lang === "uz" ? "Telegramni ulash" : "Link Telegram"}
                onClick={() => setShowTelegramLink(true)}
                isLast
              />
            )}
          </div>
        )}

        {/* Data & Sync Group */}
        <div className="card-elevated overflow-hidden">
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
        </div>

        {/* Help & Support Group */}
        <div className="card-elevated overflow-hidden">
          <MenuItem 
            icon={<HelpCircle className="w-5 h-5" />}
            label={lang === "ru" ? "Помощь" : lang === "uz" ? "Yordam" : "Help"}
            onClick={() => setActiveScreen("help")}
          />
          <MenuItem 
            icon={<GraduationCap className="w-5 h-5" />}
            label={lang === "ru" ? "Обучение" : lang === "uz" ? "O'rganish" : "Learn"}
            onClick={() => setActiveScreen("learn")}
            isLast
          />
        </div>

        {/* Danger Zone */}
        <div className="card-elevated overflow-hidden border border-destructive/20">
          <MenuItem 
            icon={<Trash2 className="w-5 h-5 text-destructive" />}
            label={t.resetLocal}
            textColor="text-destructive"
            onClick={() => setResetOpen(true)}
            isLast
          />
        </div>
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

      {/* Reset Confirmation - Centered Modal */}
      {resetOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setResetOpen(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-background rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-foreground mb-2 text-center">
              {lang === "ru" ? "Сбросить все данные?" : lang === "uz" ? "Barcha ma'lumotlarni o'chirish?" : "Reset all data?"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 text-center">
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
      
      {/* Customize Preferences Confirmation - Centered Modal */}
      {customizeOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setCustomizeOpen(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-background rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-foreground mb-2 text-center">
              {lang === "ru" ? "Перезапустить настройку?" : lang === "uz" ? "Qayta sozlashni boshlash?" : "Restart setup wizard?"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 text-center">
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

      {/* Telegram Linking Modal */}
      {showTelegramLink && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setShowTelegramLink(false); setLinkingCode(null); }}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-background rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-2xl bg-[#0088cc] flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
            
            <h3 className="text-xl font-bold text-foreground mb-2 text-center">
              {lang === "ru" ? "Связать Telegram" : lang === "uz" ? "Telegramni ulash" : "Link Telegram"}
            </h3>
            
            <p className="text-sm text-muted-foreground mb-6 text-center">
              {lang === "ru" 
                ? "Синхронизируйте транзакции через Telegram бота" 
                : lang === "uz" 
                  ? "Telegram bot orqali tranzaksiyalarni sinxronlang" 
                  : "Sync transactions via Telegram bot"}
            </p>

            {!linkingCode ? (
              <div className="space-y-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={generateLinkingCode}
                  disabled={isGeneratingCode}
                  className="w-full py-4 rounded-xl bg-[#0088cc] text-white font-semibold flex items-center justify-center gap-2"
                >
                  {isGeneratingCode ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Link2 className="w-5 h-5" />
                      {lang === "ru" ? "Получить код" : lang === "uz" ? "Kodni olish" : "Get Linking Code"}
                    </>
                  )}
                </motion.button>
                
                <p className="text-xs text-center text-muted-foreground">
                  {lang === "ru" 
                    ? "Или откройте бота напрямую:" 
                    : lang === "uz" 
                      ? "Yoki botni to'g'ridan-to'g'ri oching:" 
                      : "Or open the bot directly:"}
                </p>
                
                <button
                  onClick={openBot}
                  className="w-full py-3 rounded-xl bg-secondary text-foreground font-medium flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  @{BOT_USERNAME}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-secondary text-center">
                  <p className="text-xs text-muted-foreground mb-2">
                    {lang === "ru" ? "Ваш код связывания:" : lang === "uz" ? "Sizning ulash kodingiz:" : "Your linking code:"}
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-3xl font-mono font-bold tracking-widest text-foreground">{linkingCode}</span>
                    <button onClick={copyCode} className="p-2 rounded-lg hover:bg-muted transition-colors">
                      {copiedCode ? <Check className="w-5 h-5 text-income" /> : <Copy className="w-5 h-5 text-muted-foreground" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {lang === "ru" ? "Истекает через 10 минут" : lang === "uz" ? "10 daqiqada tugaydi" : "Expires in 10 minutes"}
                  </p>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-2">
                    {lang === "ru" ? "Шаги:" : lang === "uz" ? "Qadamlar:" : "Steps:"}
                  </p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>{lang === "ru" ? "Откройте" : lang === "uz" ? "Oching" : "Open"} @{BOT_USERNAME}</li>
                    <li>{lang === "ru" ? "Отправьте" : lang === "uz" ? "Yuboring" : "Send"} <code className="px-1 py-0.5 rounded bg-muted font-mono">/link {linkingCode}</code></li>
                    <li>{lang === "ru" ? "Готово!" : lang === "uz" ? "Tayyor!" : "Done!"}</li>
                  </ol>
                </div>
                
                <button
                  onClick={openBot}
                  className="w-full py-4 rounded-xl bg-[#0088cc] text-white font-semibold flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-5 h-5" />
                  {lang === "ru" ? "Открыть бот" : lang === "uz" ? "Botni ochish" : "Open Bot"}
                </button>
              </div>
            )}
            
            <button 
              onClick={() => { setShowTelegramLink(false); setLinkingCode(null); }}
              className="w-full py-3 mt-3 text-muted-foreground text-sm"
            >
              {t.cancel}
            </button>
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

// Reusable Picker Modal - Centered for all devices with improved scrolling
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
  <div 
    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" 
    onClick={onClose}
    style={{ touchAction: 'none' }}
  >
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="bg-background rounded-3xl p-6 w-full max-w-sm max-h-[70vh] flex flex-col shadow-2xl border border-border/50"
      onClick={(e) => e.stopPropagation()}
    >
      <h3 className="text-xl font-bold text-foreground mb-4 flex-shrink-0 text-center">{title}</h3>
      <div 
        className="space-y-2 overflow-y-auto flex-1 pb-2 -mx-2 px-2 overscroll-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {options.map((opt) => {
          const IconComp = opt.icon;
          const isSelected = selected === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => onSelect(opt.key)}
              className={`w-full p-4 rounded-2xl flex items-center gap-3 transition-all duration-200 ${
                isSelected 
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                  : 'bg-secondary/80 text-foreground hover:bg-secondary active:scale-[0.98]'
              }`}
            >
              {IconComp && <IconComp className={`w-5 h-5 ${isSelected ? '' : 'text-muted-foreground'}`} />}
              <span className="font-medium">{opt.label}</span>
              {isSelected && (
                <Check className="w-5 h-5 ml-auto" />
              )}
            </button>
          );
        })}
      </div>
    </motion.div>
  </div>
);