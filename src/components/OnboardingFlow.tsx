import React, { useMemo, useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { auth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { QuickAddPreset } from "@/types";
import { formatUZS } from "@/lib/storage";
import { CURRENCIES } from "@/lib/exportData";
import { DEFAULT_CATEGORIES, Category, LangKey } from "@/lib/constants";
import { CategoryIcon } from "@/components/CategoryIcon";
import { 
  Globe, Palette, Sun, Moon, Monitor, Check, Sparkles, 
  ArrowRight, ArrowLeft, Wallet, TrendingUp, Bell, Shield,
  Eye, EyeOff, Mail, Lock, User, Fingerprint, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface OnboardingFlowProps {
  onComplete: () => void;
}

type AuthStep = 'features' | 'auth-choice' | 'login' | 'register' | 'verify-code' | 'create-pin' | 'biometric' | 'complete';
type OnboardingStep = 'welcome' | 'lang' | 'currency' | 'theme' | 'quickadd' | 'auth' | 'done';

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const appContext = useApp();
  const { lang, setLang } = appContext;
  const setCurrencyFn = appContext.setCurrency;

  // Onboarding state
  const [currentFlow, setCurrentFlow] = useState<'onboarding' | 'auth'>('onboarding');
  const [step, setStep] = useState(0);
  const [featureIndex, setFeatureIndex] = useState(0);
  
  // Auth state
  const [authStep, setAuthStep] = useState<AuthStep>('features');
  const [authData, setAuthData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [pin, setPin] = useState<string[]>(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState<string[]>(['', '', '', '']);
  const [isConfirmingPin, setIsConfirmingPin] = useState(false);
  const [verificationCode, setVerificationCode] = useState<string[]>(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Onboarding preferences
  const [selectedTheme, setSelectedTheme] = useState<"light" | "dark" | "system">("light");
  const [selectedLang, setSelectedLang] = useState<LangKey>(() => {
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('uz')) return 'uz';
    if (browserLang.startsWith('ru')) return 'ru';
    return 'en';
  });
  const [selectedCurrency, setSelectedCurrency] = useState("UZS");
  const [quickAdds, setQuickAdds] = useState<QuickAddPreset[]>([]);
  const [editingPreset, setEditingPreset] = useState<{ categoryId: string; amount: string } | null>(null);
  const [customCategories] = useState(() => JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)));

  const onboardingLang = selectedLang;

  // Feature slides for auth flow
  const features = [
    {
      icon: <Wallet className="w-14 h-14 text-primary" />,
      gradient: "from-primary/20 to-primary/5",
      title: { en: "Smart Money", ru: "Умное управление", uz: "Aqlli boshqaruv" },
      subtitle: { en: "Management", ru: "финансами", uz: "moliya" },
      description: { 
        en: "Track income & expenses with AI that understands your habits",
        ru: "Отслеживайте доходы и расходы с AI, который понимает ваши привычки",
        uz: "Odatlaringizni tushunadigan AI bilan daromad va xarajatlarni kuzating"
      }
    },
    {
      icon: <TrendingUp className="w-14 h-14 text-green-500" />,
      gradient: "from-green-500/20 to-green-500/5",
      title: { en: "Achieve Goals", ru: "Достигайте целей", uz: "Maqsadlarga erishing" },
      subtitle: { en: "Faster", ru: "быстрее", uz: "tezroq" },
      description: { 
        en: "Personalized savings and investment plans based on your capabilities",
        ru: "Персональные планы накоплений на основе ваших возможностей",
        uz: "Imkoniyatlaringiz asosida shaxsiy jamg'arma rejalari"
      }
    },
    {
      icon: <Bell className="w-14 h-14 text-amber-500" />,
      gradient: "from-amber-500/20 to-amber-500/5",
      title: { en: "Smart Alerts", ru: "Умные уведомления", uz: "Aqlli bildirishnomalar" },
      subtitle: { en: "& Reminders", ru: "и напоминания", uz: "va eslatmalar" },
      description: { 
        en: "Overspending warnings and timely payment reminders",
        ru: "Предупреждения о перерасходе и напоминания о платежах",
        uz: "Ortiqcha xarajat ogohlantirishlari va o'z vaqtida eslatmalar"
      }
    },
  ];

  const t = useMemo(() => {
    const copy = {
      uz: {
        welcomeTitle: "MonEx",
        welcomeSubtitle: "Sizning moliyaviy yordamchingiz",
        chooseLang: "Tilni tanlang",
        chooseCurrency: "Valyutani tanlang",
        currencySubtitle: "Hisobotlar uchun asosiy valyuta",
        chooseTheme: "Mavzuni tanlang",
        themeSubtitle: "Keyinroq o'zgartirishingiz mumkin",
        quickAddTitle: "Tez qo'shish",
        quickAddSubtitle: "Bir bosishda qo'shish uchun kategoriyalarni tanlang",
        next: "Keyingi",
        skip: "O'tkazib yuborish",
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
        getStarted: "Boshlash",
        login: "Kirish",
        register: "Ro'yxatdan o'tish",
        or: "yoki",
        googleLogin: "Google orqali kirish",
        welcomeBack: "Xush kelibsiz!",
        loginSubtitle: "Hisobingizga kiring",
        email: "Email",
        password: "Parol",
        forgotPassword: "Parolni unutdingizmi?",
        noAccount: "Hisobingiz yo'qmi?",
        hasAccount: "Hisobingiz bormi?",
        fullName: "To'liq ism",
        confirmPassword: "Parolni tasdiqlang",
        verifyEmail: "Emailni tasdiqlang",
        verifySubtitle: "Kod yuborildi",
        resendCode: "Kodni qayta yuborish",
        createPin: "PIN-kod yarating",
        confirmPinTitle: "PIN-kodni tasdiqlang",
        pinSubtitle: "Tez kirish uchun 4 raqam",
        pinConfirmSubtitle: "PIN-kodni qayta kiriting",
        biometricTitle: "Biometriya",
        biometricSubtitle: "Barmoq izi yoki Face ID bilan tez va xavfsiz kirish",
        enableBiometric: "Biometriyani yoqish",
        congrats: "Tabriklaymiz!",
        accountCreated: "Hisobingiz muvaffaqiyatli yaratildi",
        startUsing: "Foydalanishni boshlash",
        pinMismatch: "PIN-kodlar mos kelmadi",
        selectedHint: (n: number) => `Tanlandi: ${n}. Summani o'zgartirish uchun bosing`,
      },
      ru: {
        welcomeTitle: "MonEx",
        welcomeSubtitle: "Ваш финансовый помощник",
        chooseLang: "Выберите язык",
        chooseCurrency: "Выберите валюту",
        currencySubtitle: "Основная валюта для учёта",
        chooseTheme: "Выберите тему",
        themeSubtitle: "Вы сможете изменить это позже",
        quickAddTitle: "Быстро добавить",
        quickAddSubtitle: "Выберите категории для быстрого добавления",
        next: "Далее",
        skip: "Пропустить",
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
        getStarted: "Начать",
        login: "Войти",
        register: "Регистрация",
        or: "или",
        googleLogin: "Войти через Google",
        welcomeBack: "С возвращением!",
        loginSubtitle: "Войдите в свой аккаунт",
        email: "Email",
        password: "Пароль",
        forgotPassword: "Забыли пароль?",
        noAccount: "Нет аккаунта?",
        hasAccount: "Уже есть аккаунт?",
        fullName: "Полное имя",
        confirmPassword: "Подтвердите пароль",
        verifyEmail: "Проверьте почту",
        verifySubtitle: "Код отправлен на",
        resendCode: "Отправить код повторно",
        createPin: "Создайте PIN-код",
        confirmPinTitle: "Подтвердите PIN",
        pinSubtitle: "Введите 4 цифры для быстрого входа",
        pinConfirmSubtitle: "Введите PIN-код повторно",
        biometricTitle: "Биометрия",
        biometricSubtitle: "Используйте отпечаток пальца или Face ID для быстрого и безопасного входа",
        enableBiometric: "Включить биометрию",
        congrats: "Поздравляем!",
        accountCreated: "Ваш аккаунт успешно создан",
        startUsing: "Начать использовать",
        pinMismatch: "PIN-коды не совпадают",
        selectedHint: (n: number) => `Выбрано: ${n}. Нажмите выбранный, чтобы изменить сумму`,
      },
      en: {
        welcomeTitle: "MonEx",
        welcomeSubtitle: "Your smart financial assistant",
        chooseLang: "Choose language",
        chooseCurrency: "Choose your currency",
        currencySubtitle: "Primary currency for tracking",
        chooseTheme: "Choose your theme",
        themeSubtitle: "You can change this later",
        quickAddTitle: "Quick add",
        quickAddSubtitle: "Select categories for one-tap transactions",
        next: "Next",
        skip: "Skip",
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
        getStarted: "Get Started",
        login: "Log in",
        register: "Sign up",
        or: "or",
        googleLogin: "Continue with Google",
        welcomeBack: "Welcome back!",
        loginSubtitle: "Sign in to your account",
        email: "Email",
        password: "Password",
        forgotPassword: "Forgot password?",
        noAccount: "Don't have an account?",
        hasAccount: "Already have an account?",
        fullName: "Full name",
        confirmPassword: "Confirm password",
        verifyEmail: "Check your email",
        verifySubtitle: "Code sent to",
        resendCode: "Resend code",
        createPin: "Create a PIN",
        confirmPinTitle: "Confirm PIN",
        pinSubtitle: "Enter 4 digits for quick access",
        pinConfirmSubtitle: "Enter your PIN again",
        biometricTitle: "Biometrics",
        biometricSubtitle: "Use fingerprint or Face ID for quick and secure access",
        enableBiometric: "Enable biometrics",
        congrats: "Congratulations!",
        accountCreated: "Your account was successfully created",
        startUsing: "Start using MonEx",
        pinMismatch: "PINs do not match",
        selectedHint: (n: number) => `Selected: ${n}. Tap a selected one to edit amount`,
      },
    } as const;

    return copy[onboardingLang];
  }, [onboardingLang]);

  // Auth handlers
  const handleNumpadInput = (num: string, isPinConfirm: boolean = false) => {
    const targetPin = isPinConfirm ? confirmPin : pin;
    const setTargetPin = isPinConfirm ? setConfirmPin : setPin;
    
    if (num === 'delete') {
      let lastFilledIndex = -1;
      for (let i = targetPin.length - 1; i >= 0; i--) {
        if (targetPin[i] !== '') { lastFilledIndex = i; break; }
      }
      if (lastFilledIndex >= 0) {
        const newPin = [...targetPin];
        newPin[lastFilledIndex] = '';
        setTargetPin(newPin);
      }
      return;
    }

    if (num === 'next') return;

    const firstEmptyIndex = targetPin.findIndex(d => d === '');
    if (firstEmptyIndex >= 0 && firstEmptyIndex < 4) {
      const newPin = [...targetPin];
      newPin[firstEmptyIndex] = num;
      setTargetPin(newPin);

      if (firstEmptyIndex === 3) {
        setTimeout(async () => {
          await handleSavePinReal();
        }, 300);
      }
    }
  };

  const handleVerificationInput = (num: string) => {
    if (num === 'delete') {
      let lastFilledIndex = -1;
      for (let i = verificationCode.length - 1; i >= 0; i--) {
        if (verificationCode[i] !== '') { lastFilledIndex = i; break; }
      }
      if (lastFilledIndex >= 0) {
        const newCode = [...verificationCode];
        newCode[lastFilledIndex] = '';
        setVerificationCode(newCode);
      }
      return;
    }

    if (num === 'next') return;

    const firstEmptyIndex = verificationCode.findIndex(d => d === '');
    if (firstEmptyIndex >= 0 && firstEmptyIndex < 6) {
      const newCode = [...verificationCode];
      newCode[firstEmptyIndex] = num;
      setVerificationCode(newCode);

      if (firstEmptyIndex === 5) {
        setTimeout(async () => {
          await handleVerifyEmail();
        }, 300);
      }
    }
  };

  // Real Authentication Handlers
  const handleRegister = async () => {
    setError('');
    setIsLoading(true);

    if (!authData.email || !authData.password || !authData.fullName) {
      setError(onboardingLang === 'ru' ? 'Заполните все поля' : onboardingLang === 'uz' ? 'Barcha maydonlarni to\'ldiring' : 'Fill all fields');
      setIsLoading(false);
      return;
    }

    if (authData.password.length < 6) {
      setError(onboardingLang === 'ru' ? 'Пароль минимум 6 символов' : onboardingLang === 'uz' ? 'Parol kamida 6 ta belgi' : 'Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    if (authData.password !== authData.confirmPassword) {
      setError(onboardingLang === 'ru' ? 'Пароли не совпадают' : onboardingLang === 'uz' ? 'Parollar mos emas' : 'Passwords do not match');
      setIsLoading(false);
      return;
    }

    const result = await auth.register(authData.email, authData.password, authData.fullName);
    setIsLoading(false);

    if (!result.success) {
      setError(result.error || (onboardingLang === 'ru' ? 'Ошибка регистрации' : onboardingLang === 'uz' ? 'Ro\'yxatdan o\'tish xatosi' : 'Registration error'));
      return;
    }

    setAuthStep('verify-code');
  };

  const handleLogin = async () => {
    setError('');
    setIsLoading(true);

    if (!authData.email || !authData.password) {
      setError(onboardingLang === 'ru' ? 'Введите email и пароль' : onboardingLang === 'uz' ? 'Email va parolni kiriting' : 'Enter email and password');
      setIsLoading(false);
      return;
    }

    const result = await auth.login(authData.email, authData.password);
    setIsLoading(false);

    if (!result.success) {
      setError(result.error || (onboardingLang === 'ru' ? 'Неверный email или пароль' : onboardingLang === 'uz' ? 'Email yoki parol noto\'g\'ri' : 'Invalid email or password'));
      return;
    }

    if (result.session) {
      localStorage.setItem('supabase_session', JSON.stringify(result.session));
    }

    setAuthStep('create-pin');
  };

  const handleVerifyEmail = async () => {
    setError('');
    setIsLoading(true);

    const code = verificationCode.join('');
    
    if (code.length !== 6) {
      setError(onboardingLang === 'ru' ? 'Введите 6-значный код' : onboardingLang === 'uz' ? '6 xonali kodni kiriting' : 'Enter 6-digit code');
      setIsLoading(false);
      return;
    }

    const result = await auth.verifyEmail(authData.email, code);
    setIsLoading(false);

    if (!result.success) {
      setError(result.error || (onboardingLang === 'ru' ? 'Неверный код' : onboardingLang === 'uz' ? 'Noto\'g\'ri kod' : 'Invalid code'));
      return;
    }

    setAuthStep('create-pin');
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    const result = await auth.resendVerification(authData.email);
    setIsLoading(false);

    if (!result.success) {
      setError(result.error || (onboardingLang === 'ru' ? 'Ошибка отправки' : onboardingLang === 'uz' ? 'Yuborish xatosi' : 'Send error'));
    }
  };

  const handleSavePinReal = async () => {
    if (isConfirmingPin) {
      const pinValue = pin.join('');
      const confirmPinValue = confirmPin.join('');
      
      if (pinValue !== confirmPinValue) {
        setError(onboardingLang === 'ru' ? 'PIN-коды не совпадают' : onboardingLang === 'uz' ? 'PIN kodlar mos emas' : 'PINs do not match');
        setConfirmPin(['', '', '', '']);
        setIsConfirmingPin(false);
        return;
      }

      const user = await auth.getCurrentUser();
      if (user) {
        const pinHash = btoa(pinValue);
        
        await supabase
          .from('profiles')
          .update({ pin_hash: pinHash })
          .eq('id', user.id);

        localStorage.setItem('user_pin_hash', pinHash);
      }

      setAuthStep('biometric');
    } else {
      setIsConfirmingPin(true);
    }
  };

  const handleEnableBiometric = async () => {
    const user = await auth.getCurrentUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ biometric_enabled: true })
        .eq('id', user.id);

      localStorage.setItem('biometric_enabled', 'true');
    }

    setAuthStep('complete');
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    const result = await auth.signInWithGoogle();
    setIsLoading(false);

    if (!result.success) {
      setError(result.error || (onboardingLang === 'ru' ? 'Ошибка входа' : onboardingLang === 'uz' ? 'Kirish xatosi' : 'Sign in error'));
    }
  };

  const handleAuth = async (type: 'login' | 'register') => {
    if (type === 'register') {
      await handleRegister();
    } else {
      await handleLogin();
    }
  };

  // Onboarding handlers
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
        { id: categoryId, categoryId, emoji: "", amount: 0 },
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
    localStorage.setItem("monex_onboarded", "true");
    setLang(selectedLang);
    setCurrencyFn(selectedCurrency);
    onComplete();
  };

  const handleLangSelect = (newLang: LangKey) => {
    setSelectedLang(newLang);
    setLang(newLang);
  };

  // NumPad component
  const NumPad = ({ onInput }: { onInput: (num: string) => void }) => (
    <div className="grid grid-cols-3 gap-3 max-w-[260px] mx-auto mt-6">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
        <motion.button
          key={num}
          whileTap={{ scale: 0.9 }}
          onClick={() => onInput(num.toString())}
          className="w-16 h-16 rounded-full bg-secondary/80 backdrop-blur-sm flex items-center justify-center text-xl font-semibold text-foreground hover:bg-secondary transition-colors"
        >
          {num}
        </motion.button>
      ))}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => onInput('delete')}
        className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center"
      >
        <X className="w-5 h-5 text-destructive" />
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => onInput('0')}
        className="w-16 h-16 rounded-full bg-secondary/80 backdrop-blur-sm flex items-center justify-center text-xl font-semibold text-foreground hover:bg-secondary transition-colors"
      >
        0
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => onInput('next')}
        className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground"
      >
        <ArrowRight className="w-5 h-5" />
      </motion.button>
    </div>
  );

  const PinDots = ({ values, hasError }: { values: string[]; hasError?: boolean }) => (
    <div className="flex gap-4 justify-center mb-4">
      {values.map((val, i) => (
        <motion.div
          key={i}
          animate={{ 
            scale: val ? 1.1 : 1,
            backgroundColor: hasError ? 'hsl(var(--destructive))' : val ? 'hsl(var(--primary))' : 'hsl(var(--muted))'
          }}
          className="w-3.5 h-3.5 rounded-full"
        />
      ))}
    </div>
  );

  // Auth Flow Screens
  const renderAuthFlow = () => (
    <AnimatePresence mode="wait">
      {/* Features Carousel */}
      {authStep === 'features' && (
        <motion.div
          key="features"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          className="h-full flex flex-col"
        >
          <div className="flex-1 flex flex-col items-center justify-center px-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={featureIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center"
              >
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className={`w-28 h-28 rounded-3xl bg-gradient-to-br ${features[featureIndex].gradient} flex items-center justify-center mx-auto mb-8`}
                >
                  {features[featureIndex].icon}
                </motion.div>
                
                <h2 className="text-3xl font-bold text-foreground">
                  {features[featureIndex].title[onboardingLang]}
                </h2>
                <h2 className="text-3xl font-bold text-primary mb-4">
                  {features[featureIndex].subtitle[onboardingLang]}
                </h2>
                <p className="text-muted-foreground text-lg max-w-xs mx-auto">
                  {features[featureIndex].description[onboardingLang]}
                </p>
              </motion.div>
            </AnimatePresence>

            <div className="flex gap-2 mt-10">
              {features.map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    width: i === featureIndex ? 24 : 8,
                    backgroundColor: i === featureIndex ? 'hsl(var(--primary))' : 'hsl(var(--muted))'
                  }}
                  className="h-2 rounded-full"
                />
              ))}
            </div>
          </div>

          <div className="p-6 pb-10">
            <div className="flex gap-3">
              {featureIndex > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setFeatureIndex(featureIndex - 1)}
                  className="h-14 px-5 rounded-2xl"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              )}
              <Button
                onClick={() => {
                  if (featureIndex < features.length - 1) {
                    setFeatureIndex(featureIndex + 1);
                  } else {
                    setAuthStep('auth-choice');
                  }
                }}
                className="flex-1 h-14 rounded-2xl text-lg font-semibold"
              >
                {featureIndex < features.length - 1 ? t.next : t.getStarted}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Auth Choice */}
      {authStep === 'auth-choice' && (
        <motion.div
          key="auth-choice"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          className="h-full flex flex-col px-6 pt-14"
        >
          <motion.button
            onClick={() => setAuthStep('features')}
            className="absolute top-6 left-6 p-2 text-muted-foreground"
          >
            <ArrowLeft className="w-6 h-6" />
          </motion.button>

          <div className="flex-1 flex flex-col items-center justify-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mb-6"
            >
              <Shield className="w-10 h-10 text-primary-foreground" />
            </motion.div>

            <h2 className="text-2xl font-bold text-foreground text-center mb-2">
              {t.welcomeBack}
            </h2>
            <p className="text-muted-foreground text-center mb-10">
              {t.loginSubtitle}
            </p>

            <div className="w-full max-w-sm space-y-3">
              <Button
                onClick={() => setAuthStep('login')}
                className="w-full h-14 rounded-2xl text-lg font-semibold"
              >
                {t.login}
              </Button>
              <Button
                onClick={() => setAuthStep('register')}
                variant="outline"
                className="w-full h-14 rounded-2xl text-lg font-semibold"
              >
                {t.register}
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-background text-muted-foreground">{t.or}</span>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => setAuthStep('create-pin')}
                className="w-full h-14 rounded-2xl text-base font-medium gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {t.googleLogin}
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Login */}
      {authStep === 'login' && (
        <motion.div
          key="login"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          className="h-full flex flex-col px-6 pt-14"
        >
          <motion.button
            onClick={() => setAuthStep('auth-choice')}
            className="absolute top-6 left-6 p-2 text-muted-foreground"
          >
            <ArrowLeft className="w-6 h-6" />
          </motion.button>

          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground mb-1">
              {t.welcomeBack}
            </h2>
            <p className="text-muted-foreground mb-6">
              {t.loginSubtitle}
            </p>

            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder={t.email}
                  value={authData.email}
                  onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                  className="h-14 pl-12 rounded-2xl bg-secondary/50 border-0 text-base"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t.password}
                  value={authData.password}
                  onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                  className="h-14 pl-12 pr-12 rounded-2xl bg-secondary/50 border-0 text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <button className="text-primary text-sm font-medium">
                {t.forgotPassword}
              </button>

              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-destructive text-sm">
                  {error}
                </motion.p>
              )}

              <Button
                onClick={() => handleAuth('login')}
                disabled={isLoading || !authData.email || !authData.password}
                className="w-full h-14 rounded-2xl text-lg font-semibold mt-4"
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-6 h-6 border-2 border-primary-foreground border-t-transparent rounded-full"
                  />
                ) : t.login}
              </Button>

              <p className="text-center text-muted-foreground mt-6">
                {t.noAccount}{' '}
                <button onClick={() => setAuthStep('register')} className="text-primary font-medium">
                  {t.register}
                </button>
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Register */}
      {authStep === 'register' && (
        <motion.div
          key="register"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          className="h-full flex flex-col px-6 pt-14"
        >
          <motion.button
            onClick={() => setAuthStep('auth-choice')}
            className="absolute top-6 left-6 p-2 text-muted-foreground"
          >
            <ArrowLeft className="w-6 h-6" />
          </motion.button>

          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground mb-1">
              {t.register}
            </h2>
            <p className="text-muted-foreground mb-6">
              {t.welcomeSubtitle}
            </p>

            <div className="space-y-3">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t.fullName}
                  value={authData.fullName}
                  onChange={(e) => setAuthData({ ...authData, fullName: e.target.value })}
                  className="h-14 pl-12 rounded-2xl bg-secondary/50 border-0 text-base"
                />
              </div>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder={t.email}
                  value={authData.email}
                  onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                  className="h-14 pl-12 rounded-2xl bg-secondary/50 border-0 text-base"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t.password}
                  value={authData.password}
                  onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                  className="h-14 pl-12 pr-12 rounded-2xl bg-secondary/50 border-0 text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t.confirmPassword}
                  value={authData.confirmPassword}
                  onChange={(e) => setAuthData({ ...authData, confirmPassword: e.target.value })}
                  className="h-14 pl-12 rounded-2xl bg-secondary/50 border-0 text-base"
                />
              </div>

              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-destructive text-sm">
                  {error}
                </motion.p>
              )}

              <Button
                onClick={() => handleAuth('register')}
                disabled={isLoading || !authData.email || !authData.password || !authData.fullName || authData.password !== authData.confirmPassword}
                className="w-full h-14 rounded-2xl text-lg font-semibold mt-4"
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-6 h-6 border-2 border-primary-foreground border-t-transparent rounded-full"
                  />
                ) : t.register}
              </Button>

              <p className="text-center text-muted-foreground mt-6">
                {t.hasAccount}{' '}
                <button onClick={() => setAuthStep('login')} className="text-primary font-medium">
                  {t.login}
                </button>
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Verify Code */}
      {authStep === 'verify-code' && (
        <motion.div
          key="verify-code"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          className="h-full flex flex-col px-6 pt-14"
        >
          <motion.button
            onClick={() => setAuthStep('register')}
            className="absolute top-6 left-6 p-2 text-muted-foreground"
          >
            <ArrowLeft className="w-6 h-6" />
          </motion.button>

          <div className="flex-1 flex flex-col items-center pt-8">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5"
            >
              <Mail className="w-8 h-8 text-primary" />
            </motion.div>

            <h2 className="text-2xl font-bold text-foreground text-center mb-2">
              {t.verifyEmail}
            </h2>
            <p className="text-muted-foreground text-center mb-6">
              {t.verifySubtitle}<br />
              <span className="text-foreground font-medium">{authData.email}</span>
            </p>

            <div className="flex gap-2 mb-4">
              {verificationCode.map((digit, i) => (
                <div
                  key={i}
                  className={`w-11 h-13 rounded-xl border-2 flex items-center justify-center text-xl font-bold ${
                    digit ? 'border-primary bg-primary/10 text-foreground' : 'border-muted bg-muted/50 text-muted-foreground'
                  }`}
                >
                  {digit || '•'}
                </div>
              ))}
            </div>

            <button className="text-primary text-sm font-medium mb-4">
              {t.resendCode}
            </button>

            <NumPad onInput={handleVerificationInput} />
          </div>
        </motion.div>
      )}

      {/* Create PIN */}
      {authStep === 'create-pin' && (
        <motion.div
          key="create-pin"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          className="h-full flex flex-col px-6 pt-14"
        >
          <motion.button
            onClick={() => {
              if (isConfirmingPin) {
                setIsConfirmingPin(false);
                setConfirmPin(['', '', '', '']);
              } else {
                setAuthStep('auth-choice');
              }
            }}
            className="absolute top-6 left-6 p-2 text-muted-foreground"
          >
            <ArrowLeft className="w-6 h-6" />
          </motion.button>

          <div className="flex-1 flex flex-col items-center pt-8">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5"
            >
              <Lock className="w-8 h-8 text-primary" />
            </motion.div>

            <AnimatePresence mode="wait">
              <motion.div
                key={isConfirmingPin ? 'confirm' : 'create'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center"
              >
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  {isConfirmingPin ? t.confirmPinTitle : t.createPin}
                </h2>
                <p className="text-muted-foreground mb-6">
                  {isConfirmingPin ? t.pinConfirmSubtitle : t.pinSubtitle}
                </p>
              </motion.div>
            </AnimatePresence>

            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-destructive text-sm mb-3">
                {error}
              </motion.p>
            )}

            <PinDots values={isConfirmingPin ? confirmPin : pin} hasError={!!error} />

            <NumPad onInput={(num) => {
              setError('');
              handleNumpadInput(num, isConfirmingPin);
            }} />
          </div>
        </motion.div>
      )}

      {/* Biometric */}
      {authStep === 'biometric' && (
        <motion.div
          key="biometric"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          className="h-full flex flex-col items-center justify-center px-6"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-28 h-28 rounded-full bg-primary/10 flex items-center justify-center mb-6"
          >
            <Fingerprint className="w-14 h-14 text-primary" />
          </motion.div>

          <h2 className="text-2xl font-bold text-foreground text-center mb-2">
            {t.biometricTitle}
          </h2>
          <p className="text-muted-foreground text-center mb-10 max-w-xs">
            {t.biometricSubtitle}
          </p>

          <div className="w-full max-w-sm space-y-3">
            <Button
              onClick={() => setAuthStep('complete')}
              className="w-full h-14 rounded-2xl text-lg font-semibold"
            >
              {t.enableBiometric}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setAuthStep('complete')}
              className="w-full h-14 rounded-2xl text-base"
            >
              {t.skip}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Complete */}
      {authStep === 'complete' && (
        <motion.div
          key="complete"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="h-full flex flex-col items-center justify-center px-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="w-28 h-28 rounded-full bg-green-500/10 flex items-center justify-center mb-6"
          >
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4 }}>
              <Check className="w-14 h-14 text-green-500" />
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <h2 className="text-3xl font-bold text-foreground text-center mb-2">
              {t.congrats}
            </h2>
            <p className="text-muted-foreground text-center mb-10">
              {t.accountCreated}
            </p>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="w-full max-w-sm"
          >
            <Button
              onClick={handleComplete}
              className="w-full h-14 rounded-2xl text-lg font-semibold"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              {t.startUsing}
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Onboarding steps
  const renderOnboardingSteps = () => {
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
      // Step 0: Welcome
      <motion.div key="welcome" className="h-full flex flex-col items-center justify-center px-8">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary via-primary/80 to-primary/60 flex items-center justify-center shadow-2xl shadow-primary/30 mb-6"
        >
          <Wallet className="w-12 h-12 text-primary-foreground" />
        </motion.div>
        
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-4xl font-bold text-foreground mb-2"
        >
          {t.welcomeTitle}
        </motion.h1>
        
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-muted-foreground text-center text-lg mb-10"
        >
          {t.welcomeSubtitle}
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="w-full max-w-sm"
        >
          <Button
            onClick={() => setStep(1)}
            className="w-full h-14 rounded-2xl text-lg font-semibold"
          >
            {t.getStarted}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>
      </motion.div>,

      // Step 1: Language
      <motion.div key="lang" className="w-full px-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setStep(0)} className="p-2 text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <p className="font-semibold text-foreground">MonEx</p>
          <div className="w-9" />
        </div>
        {renderProgress()}

        <div className="card-elevated-lg p-6 text-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center"
          >
            <Globe className="w-7 h-7 text-primary" />
          </motion.div>
          <h1 className="text-xl font-bold text-foreground mb-1">{t.chooseLang}</h1>
          <p className="text-body-sm text-muted-foreground mb-5">{t.welcomeSubtitle}</p>

          <div className="space-y-2">
            {([
              { key: "uz" as const, label: "O'zbekcha", native: "UZ" },
              { key: "ru" as const, label: "Русский", native: "RU" },
              { key: "en" as const, label: "English", native: "EN" },
            ]).map((l) => (
              <motion.button
                key={l.key}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleLangSelect(l.key)}
                className={`w-full py-3.5 px-4 rounded-2xl flex items-center gap-3 transition-all ${
                  selectedLang === l.key ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                  selectedLang === l.key ? "bg-primary-foreground/20" : "bg-card"
                }`}>
                  {l.native}
                </div>
                <span className="flex-1 text-left font-semibold">{l.label}</span>
                {selectedLang === l.key && <Check className="w-5 h-5" />}
              </motion.button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <Button onClick={() => setStep(2)} className="w-full h-13 rounded-2xl text-base font-semibold">
            {t.next}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </motion.div>,

      // Step 2: Currency
      <motion.div key="currency" className="w-full px-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setStep(1)} className="p-2 text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <p className="font-semibold text-foreground">MonEx</p>
          <div className="w-9" />
        </div>
        {renderProgress()}

        <div className="card-elevated-lg p-6">
          <div className="text-center mb-5">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-500/5 flex items-center justify-center"
            >
              <CategoryIcon categoryId="salary" className="w-7 h-7 text-green-500" />
            </motion.div>
            <h2 className="text-xl font-bold text-foreground mb-1">{t.chooseCurrency}</h2>
            <p className="text-body-sm text-muted-foreground">{t.currencySubtitle}</p>
          </div>

          <div className="space-y-2 max-h-[35vh] overflow-y-auto">
            {CURRENCIES.map((c, i) => (
              <motion.button
                key={c.code}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedCurrency(c.code)}
                className={`w-full py-3.5 px-4 rounded-2xl flex items-center gap-3 transition-all ${
                  selectedCurrency === c.code ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                  selectedCurrency === c.code ? "bg-primary-foreground/20" : "bg-card"
                }`}>
                  {c.symbol}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold">{c.code}</p>
                  <p className={`text-xs ${selectedCurrency === c.code ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{c.name}</p>
                </div>
                {selectedCurrency === c.code && <Check className="w-5 h-5" />}
              </motion.button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <Button onClick={() => setStep(3)} className="w-full h-13 rounded-2xl text-base font-semibold">
            {t.next}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </motion.div>,

      // Step 3: Theme
      <motion.div key="theme" className="w-full px-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setStep(2)} className="p-2 text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <p className="font-semibold text-foreground">MonEx</p>
          <div className="w-9" />
        </div>
        {renderProgress()}

        <div className="card-elevated-lg p-6">
          <div className="text-center mb-5">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 flex items-center justify-center"
            >
              <Palette className="w-7 h-7 text-purple-500" />
            </motion.div>
            <h2 className="text-xl font-bold text-foreground mb-1">{t.chooseTheme}</h2>
            <p className="text-body-sm text-muted-foreground">{t.themeSubtitle}</p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
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

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-card border border-border shadow-sm"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                M
              </div>
              <div className="text-left">
                <p className="text-xs text-muted-foreground">Balance</p>
                <p className="font-bold text-foreground">1,250,000 {selectedCurrency}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/30">
                <p className="text-[10px] text-muted-foreground">Expenses</p>
                <p className="font-semibold text-expense text-sm">-125,000</p>
              </div>
              <div className="flex-1 p-2.5 rounded-xl bg-green-50 dark:bg-green-950/30">
                <p className="text-[10px] text-muted-foreground">Income</p>
                <p className="font-semibold text-income text-sm">+500,000</p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="mt-6">
          <Button onClick={() => setStep(4)} className="w-full h-13 rounded-2xl text-base font-semibold">
            {t.next}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </motion.div>,

      // Step 4: Quick Add
      <motion.div key="quickadd" className="w-full px-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setStep(3)} className="p-2 text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <p className="font-semibold text-foreground">MonEx</p>
          <button onClick={() => { setCurrentFlow('auth'); setAuthStep('features'); }} className="text-sm text-primary font-medium">
            {t.skip}
          </button>
        </div>
        {renderProgress()}

        <div className="card-elevated-lg p-6">
          <div className="text-center mb-5">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center"
            >
              <Sparkles className="w-7 h-7 text-amber-500" />
            </motion.div>
            <h2 className="text-xl font-bold text-foreground mb-1">{t.quickAddTitle}</h2>
            <p className="text-body-sm text-muted-foreground">{t.quickAddSubtitle}</p>
          </div>

          <div className="grid grid-cols-4 gap-2 max-h-[35vh] overflow-y-auto pb-2">
            {customCategories.expense.slice(0, 12).map((cat: Category, i: number) => {
              const isSelected = quickAdds.some((q) => q.categoryId === cat.id);
              const preset = quickAdds.find((q) => q.categoryId === cat.id);

              return (
                <motion.button
                  key={cat.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => toggleQuickAdd(cat.id)}
                  className={`p-3 rounded-xl flex flex-col items-center gap-1.5 transition-all relative ${
                    isSelected ? "bg-primary/10 border-2 border-primary" : "bg-secondary border-2 border-transparent"
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center"
                    >
                      <Check className="w-2.5 h-2.5 text-primary-foreground" />
                    </motion.div>
                  )}
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: cat.color + "20" }}>
                    <CategoryIcon categoryId={cat.id} className="w-4 h-4" style={{ color: cat.color }} />
                  </div>
                  <span className="text-[10px] font-medium text-foreground text-center leading-tight">
                    {onboardingLang === "uz" ? cat.uz : onboardingLang === "ru" ? cat.ru : cat.en}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {editingPreset && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-secondary rounded-2xl"
            >
              <p className="text-sm font-medium text-foreground mb-2">{t.amount}</p>
              <div className="flex gap-2">
                {[10000, 25000, 50000, 100000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => updatePresetAmount(editingPreset.categoryId, amt)}
                    className="flex-1 py-2 px-2 rounded-xl bg-card text-foreground text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    {(amt / 1000)}k
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        <div className="mt-6">
          <Button 
            onClick={() => { setCurrentFlow('auth'); setAuthStep('features'); }} 
            className="w-full h-13 rounded-2xl text-base font-semibold"
          >
            {t.next}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </motion.div>,
    ];

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="h-full flex flex-col pt-6"
        >
          {steps[step]}
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-hidden">
      {currentFlow === 'onboarding' ? renderOnboardingSteps() : renderAuthFlow()}
    </div>
  );
};

export default OnboardingFlow;
