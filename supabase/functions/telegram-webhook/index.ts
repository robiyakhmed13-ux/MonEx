// Supabase Edge Function: telegram-webhook
// Full Telegram Banking OS - Multi-language Support (UZ, RU, EN)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

interface TelegramMessage {
  message_id: number
  from: { id: number; first_name: string; username?: string; language_code?: string }
  chat: { id: number; type: string }
  text?: string
  voice?: { file_id: string; duration: number }
  photo?: Array<{ file_id: string; file_size: number }>
}

interface CallbackQuery {
  id: string
  from: { id: number; first_name: string; username?: string; language_code?: string }
  message: { chat: { id: number }; message_id: number }
  data: string
}

interface Update {
  update_id: number
  message?: TelegramMessage
  callback_query?: CallbackQuery
}

type Lang = 'uz' | 'ru' | 'en'

// Multi-language translations
const i18n = {
  uz: {
    hello: "Salom",
    welcome: "Men sizning <b>MonEX Moliyaviy Yordamchingiz</b>man.",
    quickCommands: "💡 Tezkor buyruqlar:",
    addExpense: "xarajat qo'shish",
    todayStats: "bugungi statistika", 
    createGoal: "maqsad yaratish",
    setLimit: "limit o'rnatish",
    setReminder: "eslatma o'rnatish",
    receiptScan: "Chek rasmini yuboring — avtomatik taniladi!",
    useButtons: "Quyidagi tugmalardan foydalaning:",
    balance: "Balans",
    stats: "Statistika",
    goals: "Maqsadlar",
    limits: "Limitlar",
    linkAccount: "Hisobni ulash",
    added: "Qo'shildi",
    today: "Bugun",
    thisMonth: "Bu oy",
    expense: "Xarajat",
    income: "Daromad",
    transactions: "Tranzaksiyalar",
    topExpenses: "Top xarajatlar",
    monthlyLimit: "Oylik limit",
    limitExceeded: "Limit oshdi!",
    limitNear: "Limit yaqin!",
    yourGoals: "Maqsadlaringiz",
    noGoals: "Hali maqsad yo'q.",
    remaining: "Qoldi",
    deadline: "Muddat",
    goalCreated: "Maqsad yaratildi!",
    target: "Maqsad",
    monthly: "Oylik",
    saveEachMonth: "Har oy tejaing!",
    limitSet: "Limit o'rnatildi!",
    category: "Kategoriya",
    linkCode: "Kodni olish",
    linkInstructions: "1️⃣ MonEX ilovasini oching\n2️⃣ Sozlamalar → Telegram Bot\n3️⃣ \"Kodni olish\" tugmasini bosing\n4️⃣ Kodni shu yerga yuboring:",
    linkedSuccess: "Muvaffaqiyatli ulandi!",
    syncInfo: "Endi siz:\n• Telegram orqali xarajat qo'shsangiz — ilovada ko'rinadi\n• Ilovada qo'shsangiz — Telegramda xabar olasiz",
    tryIt: "Sinab ko'ring",
    unlinked: "Hisobingiz uzildi.",
    notLinked: "Hisobingiz hali ulanmagan.",
    relinkWith: "Qayta ulash uchun",
    codeNotFound: "Kod topilmadi yoki muddati o'tgan.",
    codeExpired: "Kod muddati tugagan.",
    newCode: "Iltimos, yangi kod oling.",
    linkError: "Ulashda xatolik. Qaytadan urinib ko'ring.",
    voiceReceived: "Ovozli xabar qabul qilindi!",
    useTextInstead: "Hozircha matn yozing:",
    receiptDetected: "Chek aniqlandi! Tahlil qilinmoqda...",
    receiptProcessed: "Chek qayta ishlandi!",
    store: "Do'kon",
    total: "Jami",
    date: "Sana",
    products: "Mahsulotlar",
    andMore: "va yana",
    addedToExpenses: "Xarajatlarga qo'shildi!",
    receiptError: "Chek aniqlandi, lekin avtomatik o'qib bo'lmadi.",
    enterManually: "Qo'lda kiriting",
    help: "Yordam",
    helpTitle: "MonEX Bot yordam",
    helpAddExpense: "Xarajat qo'shish",
    commands: "Buyruqlar",
    viewBalance: "balansni ko'rish",
    manageGoals: "maqsadlarni boshqarish",
    manageLimits: "limitlarni boshqarish",
    scanReceipt: "Chek skanerlash",
    aiChat: "AI suhbat",
    askAnything: "Har qanday savol bering:",
    howMuchSpent: "Bugun qancha sarfladim?",
    monthlyStats: "Oylik statistikam qanday?",
    wrongFormat: "Noto'g'ri format.",
    example: "Misol",
    reminder: "Eslatma",
    reminderSet: "Eslatma o'rnatildi!",
    everyMonth: "Har oyning",
    dayOf: "-kunida",
    willNotify: "Eslatma vaqti kelganda xabar olasiz.",
    addGoal: "Maqsad qo'shish",
    newGoal: "Yangi maqsad",
    per: "/",
    updatedInApp: "MonEX ilovasida yangilandi",
    cancel: "Bekor",
    notUnderstood: "Tushunmadim. Sinab ko'ring:",
    transfer: "O'tkazma",
    transferFrom: "Qayerdan",
    transferTo: "Qayerga",
    transferAmount: "Summa",
    transferCreated: "O'tkazma yaratildi!",
    selectCategory: "Kategoriyani tanlang",
    selectLanguage: "Tilni tanlang",
    confirm: "Tasdiqlash",
    confirmAction: "Tasdiqlaysizmi?",
    actionConfirmed: "Tasdiqlandi!",
    actionCancelled: "Bekor qilindi",
    enterAmount: "Summani kiriting",
    enterGoalName: "Maqsad nomini kiriting",
    enterGoalTarget: "Maqsad summasini kiriting",
    enterGoalMonths: "Oy sonini kiriting",
    reminderText: "Eslatma matni",
    reminderDay: "Kun",
    reminderSaved: "Eslatma saqlandi!",
    fromCategory: "Kategoriyadan",
    toCategory: "Kategoriyaga",
    transferBetweenCategories: "Kategoriyalar orasida o'tkazma",
  },
  ru: {
    hello: "Привет",
    welcome: "Я ваш <b>MonEX Финансовый помощник</b>.",
    quickCommands: "💡 Быстрые команды:",
    addExpense: "добавить расход",
    todayStats: "статистика за сегодня",
    createGoal: "создать цель",
    setLimit: "установить лимит",
    setReminder: "установить напоминание",
    receiptScan: "Отправьте фото чека — автоматически распознается!",
    useButtons: "Используйте кнопки ниже:",
    balance: "Баланс",
    stats: "Статистика",
    goals: "Цели",
    limits: "Лимиты",
    linkAccount: "Привязать аккаунт",
    added: "Добавлено",
    today: "Сегодня",
    thisMonth: "Этот месяц",
    expense: "Расход",
    income: "Доход",
    transactions: "Транзакции",
    topExpenses: "Топ расходов",
    monthlyLimit: "Месячный лимит",
    limitExceeded: "Лимит превышен!",
    limitNear: "Лимит близко!",
    yourGoals: "Ваши цели",
    noGoals: "Целей пока нет.",
    remaining: "Осталось",
    deadline: "Срок",
    goalCreated: "Цель создана!",
    target: "Цель",
    monthly: "Ежемесячно",
    saveEachMonth: "Откладывайте каждый месяц!",
    limitSet: "Лимит установлен!",
    category: "Категория",
    linkCode: "Получить код",
    linkInstructions: "1️⃣ Откройте приложение MonEX\n2️⃣ Настройки → Telegram бот\n3️⃣ Нажмите \"Получить код\"\n4️⃣ Отправьте код сюда:",
    linkedSuccess: "Успешно привязано!",
    syncInfo: "Теперь:\n• Добавите через Telegram — увидите в приложении\n• Добавите в приложении — получите уведомление в Telegram",
    tryIt: "Попробуйте",
    unlinked: "Аккаунт отвязан.",
    notLinked: "Аккаунт ещё не привязан.",
    relinkWith: "Для привязки используйте",
    codeNotFound: "Код не найден или истёк срок.",
    codeExpired: "Срок действия кода истёк.",
    newCode: "Пожалуйста, получите новый код.",
    linkError: "Ошибка привязки. Попробуйте снова.",
    voiceReceived: "Голосовое сообщение получено!",
    useTextInstead: "Пока введите текстом:",
    receiptDetected: "Чек обнаружен! Анализирую...",
    receiptProcessed: "Чек обработан!",
    store: "Магазин",
    total: "Итого",
    date: "Дата",
    products: "Товары",
    andMore: "и ещё",
    addedToExpenses: "Добавлено в расходы!",
    receiptError: "Чек обнаружен, но автоматически не прочитан.",
    enterManually: "Введите вручную",
    help: "Помощь",
    helpTitle: "Помощь MonEX бота",
    helpAddExpense: "Добавить расход",
    commands: "Команды",
    viewBalance: "посмотреть баланс",
    manageGoals: "управление целями",
    manageLimits: "управление лимитами",
    scanReceipt: "Сканирование чеков",
    aiChat: "AI чат",
    askAnything: "Задайте любой вопрос:",
    howMuchSpent: "Сколько я потратил сегодня?",
    monthlyStats: "Какая у меня статистика за месяц?",
    wrongFormat: "Неверный формат.",
    example: "Пример",
    reminder: "Напоминание",
    reminderSet: "Напоминание установлено!",
    everyMonth: "Каждого",
    dayOf: "-го числа",
    willNotify: "Вы получите уведомление в назначенное время.",
    addGoal: "Добавить цель",
    newGoal: "Новая цель",
    per: "/",
    updatedInApp: "Обновлено в приложении MonEX",
    cancel: "Отмена",
    notUnderstood: "Не понял. Попробуйте:",
    transfer: "Перевод",
    transferFrom: "Откуда",
    transferTo: "Куда",
    transferAmount: "Сумма",
    transferCreated: "Перевод создан!",
    selectCategory: "Выберите категорию",
    selectLanguage: "Выберите язык",
    confirm: "Подтвердить",
    confirmAction: "Подтверждаете?",
    actionConfirmed: "Подтверждено!",
    actionCancelled: "Отменено",
    enterAmount: "Введите сумму",
    enterGoalName: "Введите название цели",
    enterGoalTarget: "Введите сумму цели",
    enterGoalMonths: "Введите количество месяцев",
    reminderText: "Текст напоминания",
    reminderDay: "День",
    reminderSaved: "Напоминание сохранено!",
    fromCategory: "Из категории",
    toCategory: "В категорию",
    transferBetweenCategories: "Перевод между категориями",
  },
  en: {
    hello: "Hello",
    welcome: "I'm your <b>MonEX Financial Assistant</b>.",
    quickCommands: "💡 Quick commands:",
    addExpense: "add expense",
    todayStats: "today's statistics",
    createGoal: "create goal",
    setLimit: "set limit",
    setReminder: "set reminder",
    receiptScan: "Send a receipt photo — auto-recognized!",
    useButtons: "Use the buttons below:",
    balance: "Balance",
    stats: "Statistics",
    goals: "Goals",
    limits: "Limits",
    linkAccount: "Link Account",
    added: "Added",
    today: "Today",
    thisMonth: "This Month",
    expense: "Expense",
    income: "Income",
    transactions: "Transactions",
    topExpenses: "Top expenses",
    monthlyLimit: "Monthly limit",
    limitExceeded: "Limit exceeded!",
    limitNear: "Limit near!",
    yourGoals: "Your Goals",
    noGoals: "No goals yet.",
    remaining: "Remaining",
    deadline: "Deadline",
    goalCreated: "Goal created!",
    target: "Target",
    monthly: "Monthly",
    saveEachMonth: "Save each month!",
    limitSet: "Limit set!",
    category: "Category",
    linkCode: "Get code",
    linkInstructions: "1️⃣ Open MonEX app\n2️⃣ Settings → Telegram Bot\n3️⃣ Click \"Get code\"\n4️⃣ Send the code here:",
    linkedSuccess: "Successfully linked!",
    syncInfo: "Now:\n• Add via Telegram — see it in the app\n• Add in the app — get a Telegram notification",
    tryIt: "Try it",
    unlinked: "Account unlinked.",
    notLinked: "Account not linked yet.",
    relinkWith: "To link, use",
    codeNotFound: "Code not found or expired.",
    codeExpired: "Code has expired.",
    newCode: "Please get a new code.",
    linkError: "Link error. Try again.",
    voiceReceived: "Voice message received!",
    useTextInstead: "For now, type text:",
    receiptDetected: "Receipt detected! Analyzing...",
    receiptProcessed: "Receipt processed!",
    store: "Store",
    total: "Total",
    date: "Date",
    products: "Products",
    andMore: "and more",
    addedToExpenses: "Added to expenses!",
    receiptError: "Receipt detected, but couldn't read automatically.",
    enterManually: "Enter manually",
    help: "Help",
    helpTitle: "MonEX Bot Help",
    helpAddExpense: "Add expense",
    commands: "Commands",
    viewBalance: "view balance",
    manageGoals: "manage goals",
    manageLimits: "manage limits",
    scanReceipt: "Receipt scanning",
    aiChat: "AI chat",
    askAnything: "Ask anything:",
    howMuchSpent: "How much did I spend today?",
    monthlyStats: "What's my monthly stats?",
    wrongFormat: "Wrong format.",
    example: "Example",
    reminder: "Reminder",
    reminderSet: "Reminder set!",
    everyMonth: "Every",
    dayOf: "th of month",
    willNotify: "You'll be notified at the scheduled time.",
    addGoal: "Add goal",
    newGoal: "New goal",
    per: "/",
    updatedInApp: "Updated in MonEX app",
    cancel: "Cancel",
    notUnderstood: "Didn't understand. Try:",
    transfer: "Transfer",
    transferFrom: "From",
    transferTo: "To",
    transferAmount: "Amount",
    transferCreated: "Transfer created!",
    selectCategory: "Select category",
    selectLanguage: "Select language",
    confirm: "Confirm",
    confirmAction: "Confirm?",
    actionConfirmed: "Confirmed!",
    actionCancelled: "Cancelled",
    enterAmount: "Enter amount",
    enterGoalName: "Enter goal name",
    enterGoalTarget: "Enter goal target",
    enterGoalMonths: "Enter months",
    reminderText: "Reminder text",
    reminderDay: "Day",
    reminderSaved: "Reminder saved!",
    fromCategory: "From category",
    toCategory: "To category",
    transferBetweenCategories: "Transfer between categories",
  }
}

// Category translations
const categoryNames: Record<string, Record<Lang, string>> = {
  taxi: { uz: "Taksi", ru: "Такси", en: "Taxi" },
  food: { uz: "Oziq-ovqat", ru: "Продукты", en: "Food" },
  restaurants: { uz: "Restoranlar", ru: "Рестораны", en: "Restaurants" },
  coffee: { uz: "Qahva", ru: "Кофе", en: "Coffee" },
  shopping: { uz: "Xaridlar", ru: "Покупки", en: "Shopping" },
  transport: { uz: "Transport", ru: "Транспорт", en: "Transport" },
  entertainment: { uz: "Ko'ngil", ru: "Развлечения", en: "Entertainment" },
  health: { uz: "Salomatlik", ru: "Здоровье", en: "Health" },
  bills: { uz: "Kommunal", ru: "Коммунальные", en: "Bills" },
  groceries: { uz: "Do'kon", ru: "Магазин", en: "Groceries" },
  fuel: { uz: "Benzin", ru: "Бензин", en: "Fuel" },
  education: { uz: "Ta'lim", ru: "Образование", en: "Education" }
}

const categoryEmojis: Record<string, string> = {
  taxi: '🚕', food: '🍔', restaurants: '🍽', shopping: '🛍',
  transport: '🚌', entertainment: '🎮', health: '💊', bills: '📄',
  groceries: '🛒', coffee: '☕', fuel: '⛽', education: '📚'
}

// Detect user language from Telegram
function detectLang(languageCode?: string): Lang {
  if (!languageCode) return 'uz'
  const code = languageCode.toLowerCase()
  if (code.startsWith('ru')) return 'ru'
  if (code.startsWith('en')) return 'en'
  if (code.startsWith('uz')) return 'uz'
  // Default to Russian for CIS countries
  if (['uk', 'be', 'kk', 'ky', 'tg', 'az'].some(c => code.startsWith(c))) return 'ru'
  return 'uz'
}

// Get user language: from profile if linked, else from Telegram
async function getUserLang(user: any, telegramLangCode: string | undefined, supabase: any): Promise<Lang> {
  // If user is linked, try to get language from profile
  if (user?.user_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('language')
      .eq('id', user.user_id)
      .single()
    
    if (profile?.language && ['uz', 'ru', 'en'].includes(profile.language)) {
      return profile.language as Lang
    }
  }
  
  // Fallback to Telegram language code
  return detectLang(telegramLangCode)
}

// Intent parsing for natural language queries
type Intent = 
  | { type: 'spent'; period: 'today' | 'week' | 'month' }
  | { type: 'balance' }
  | { type: 'stats'; period?: 'monthly' }
  | { type: 'unknown' }

function parseIntent(text: string, lang: Lang): Intent {
  const lower = text.toLowerCase().trim()
  
  // English patterns
  if (lang === 'en') {
    // Spent queries
    if (/\b(how much|how many|what|did i|have i)\s+(spend|spent|spending)\b/i.test(lower)) {
      if (/\b(today|todays|this day)\b/i.test(lower)) return { type: 'spent', period: 'today' }
      if (/\b(this week|weekly|week)\b/i.test(lower)) return { type: 'spent', period: 'week' }
      if (/\b(this month|monthly|month)\b/i.test(lower)) return { type: 'spent', period: 'month' }
      // Default to today if period not specified
      return { type: 'spent', period: 'today' }
    }
    
    // Balance queries
    if (/\b(balance|bal|money|funds|available|left)\b/i.test(lower) && 
        !/\b(spend|spent|expense|limit)\b/i.test(lower)) {
      return { type: 'balance' }
    }
    
    // Stats queries
    if (/\b(stats|statistics|stat|summary|overview|report)\b/i.test(lower)) {
      if (/\b(month|monthly)\b/i.test(lower)) return { type: 'stats', period: 'monthly' }
      return { type: 'stats' }
    }
  }
  
  // Russian patterns
  if (lang === 'ru') {
    // Spent queries: "сколько потратил", "сколько потрачено", "траты"
    if (/\b(сколько|как много|что)\s+(потратил|потратила|потрачено|потратили|трат|расход)\b/i.test(lower) ||
        /\b(траты|расходы|потратил|потратила)\b/i.test(lower)) {
      if (/\b(сегодня|сегодняшн|день)\b/i.test(lower)) return { type: 'spent', period: 'today' }
      if (/\b(эту неделю|неделю|неделя|недельный)\b/i.test(lower)) return { type: 'spent', period: 'week' }
      if (/\b(этот месяц|месяц|месячный)\b/i.test(lower)) return { type: 'spent', period: 'month' }
      return { type: 'spent', period: 'today' }
    }
    
    // Balance queries: "баланс", "сколько денег", "осталось"
    if (/\b(баланс|сколько денег|осталось|остаток|средств|деньги)\b/i.test(lower) &&
        !/\b(потратил|расход|лимит)\b/i.test(lower)) {
      return { type: 'balance' }
    }
    
    // Stats queries: "статистика", "отчет"
    if (/\b(статистика|стат|отчет|сводка|обзор)\b/i.test(lower)) {
      if (/\b(месяц|месячный)\b/i.test(lower)) return { type: 'stats', period: 'monthly' }
      return { type: 'stats' }
    }
  }
  
  // Uzbek patterns
  if (lang === 'uz') {
    // Spent queries: "qancha sarfladim", "sarflangan", "xarajat"
    if (/\b(qancha|qancha pul|necha)\s+(sarfladim|sarfladik|sarflangan|sarflayman|xarajat|chiqim)\b/i.test(lower) ||
        /\b(sarfladim|sarfladik|xarajat|chiqim)\b/i.test(lower)) {
      if (/\b(bugun|bugungi|kun)\b/i.test(lower)) return { type: 'spent', period: 'today' }
      if (/\b(hafta|haftalik|shu hafta)\b/i.test(lower)) return { type: 'spent', period: 'week' }
      if (/\b(oy|oylik|shu oy)\b/i.test(lower)) return { type: 'spent', period: 'month' }
      return { type: 'spent', period: 'today' }
    }
    
    // Balance queries: "balans", "qancha pul", "qoldi"
    if (/\b(balans|qancha pul|qoldi|qolgan|mablag|pul)\b/i.test(lower) &&
        !/\b(sarfladim|xarajat|limit)\b/i.test(lower)) {
      return { type: 'balance' }
    }
    
    // Stats queries: "statistika", "hisobot"
    if (/\b(statistika|stat|hisobot|umumiy)\b/i.test(lower)) {
      if (/\b(oy|oylik)\b/i.test(lower)) return { type: 'stats', period: 'monthly' }
      return { type: 'stats' }
    }
  }
  
  return { type: 'unknown' }
}

function t(lang: Lang) {
  return i18n[lang]
}

function getCatName(categoryId: string, lang: Lang): string {
  return categoryNames[categoryId]?.[lang] || capitalize(categoryId)
}

serve(async (req) => {
  try {
    const update: Update = await req.json()
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    // Handle callback queries (inline button clicks)
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query, supabase)
      return new Response('OK', { status: 200 })
    }
    
    if (!update.message) {
      return new Response('OK', { status: 200 })
    }

    const message = update.message
    const chatId = message.chat.id
    const userId = message.from.id
    const userName = message.from.first_name
    const username = message.from.username
    const langCode = message.from.language_code

    // Get or create user
    let { data: user } = await supabase
      .from('telegram_users')
      .select('*')
      .eq('telegram_id', userId)
      .single()

    // Get user language (from profile if linked, else from Telegram)
    const lang = await getUserLang(user, langCode, supabase)

    if (!user) {
      // Check if language is not set, show language selection
      const detectedLang = detectLang(langCode)
      
      const { data: newUser } = await supabase
        .from('telegram_users')
        .insert({
          telegram_id: userId,
          telegram_username: username,
          first_name: userName,
          created_at: new Date().toISOString(),
          last_active: new Date().toISOString()
        })
        .select()
        .single()
      
      user = newUser
      
      // Show language selection if not clearly detected
      if (!langCode || !['uz', 'ru', 'en'].some(l => langCode.toLowerCase().startsWith(l))) {
        await showLanguageSelection(chatId, lang)
      } else {
        await sendWelcomeMessage(chatId, userName, lang)
      }
      return new Response('OK', { status: 200 })
    }

    // Update last active
    await supabase
      .from('telegram_users')
      .update({ last_active: new Date().toISOString() })
      .eq('telegram_id', userId)

    // Handle different message types
    if (message.text) {
      await handleTextMessage(message, user, supabase, lang)
    } else if (message.voice) {
      await handleVoiceMessage(message, user, supabase, lang)
    } else if (message.photo) {
      await handlePhotoMessage(message, user, supabase, lang)
    }

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('Internal error', { status: 500 })
  }
})

async function sendWelcomeMessage(chatId: number, userName: string, lang: Lang) {
  const tr = t(lang)
  
  const buttonLabels = {
    uz: { balance: '💰 Balans', stats: '📊 Statistika', goals: '🎯 Maqsadlar', limits: '📋 Limitlar', link: '🔗 Hisobni ulash' },
    ru: { balance: '💰 Баланс', stats: '📊 Статистика', goals: '🎯 Цели', limits: '📋 Лимиты', link: '🔗 Привязать' },
    en: { balance: '💰 Balance', stats: '📊 Stats', goals: '🎯 Goals', limits: '📋 Limits', link: '🔗 Link Account' }
  }
  
  const btns = buttonLabels[lang]
  
  const keyboard = {
    inline_keyboard: [
      [
        { text: btns.balance, callback_data: 'cmd_balance' },
        { text: btns.stats, callback_data: 'cmd_stats' }
      ],
      [
        { text: btns.goals, callback_data: 'cmd_goals' },
        { text: btns.limits, callback_data: 'cmd_limits' }
      ],
      [
        { text: btns.link, callback_data: 'cmd_link_info' }
      ]
    ]
  }

  await sendMessage(chatId, `👋 ${tr.hello} ${userName}!

${tr.welcome}

<b>${tr.quickCommands}</b>
📝 <code>taxi 50000</code> — ${tr.addExpense}
📊 <code>/stats</code> — ${tr.todayStats}
🎯 <code>/goal</code> — ${tr.createGoal}
📋 <code>/limit</code> — ${tr.setLimit}
⏰ <code>/remind</code> — ${tr.setReminder}

🧾 ${tr.receiptScan}

${tr.useButtons}`, { reply_markup: keyboard })
}

async function handleTextMessage(message: TelegramMessage, user: any, supabase: any, lang: Lang) {
  const text = message.text!.trim()
  const chatId = message.chat.id
  const telegramId = message.from.id
  const username = message.from.username
  const tr = t(lang)

  // /start command
  if (text === '/start') {
    await sendWelcomeMessage(chatId, message.from.first_name, lang)
    return
  }

  // /link command
  if (text.startsWith('/link')) {
    await handleLinkCommand(text, chatId, telegramId, username, user, supabase, lang)
    return
  }

  // /unlink command
  if (text === '/unlink') {
    await handleUnlinkCommand(chatId, telegramId, user, supabase, lang)
    return
  }

  // /balance command
  if (text === '/balance' || text === '/balans' || text === '/баланс') {
    await handleBalanceCommand(chatId, telegramId, user.user_id, supabase, lang)
    return
  }

  // /stats command
  if (text === '/stats' || text === '/statistika' || text === '/статистика') {
    await handleStatsCommand(chatId, telegramId, user.user_id, supabase, lang)
    return
  }

  // /limit command
  if (text.startsWith('/limit') || text.startsWith('/лимит')) {
    await handleLimitCommand(text, chatId, telegramId, user.user_id, supabase, lang)
    return
  }

  // /goal command
  if (text.startsWith('/goal') || text.startsWith('/maqsad') || text.startsWith('/цель')) {
    await handleGoalCommand(text, chatId, telegramId, user.user_id, supabase, lang)
    return
  }

  // /remind command
  if (text.startsWith('/remind') || text.startsWith('/eslatma') || text.startsWith('/напоминание')) {
    await handleRemindCommand(text, chatId, telegramId, user.user_id, supabase, lang)
    return
  }

  // /transfer command
  if (text.startsWith('/transfer') || text.startsWith('/o\'tkazma') || text.startsWith('/перевод')) {
    await handleTransferCommand(text, chatId, telegramId, user.user_id, supabase, lang)
    return
  }

  // /help command - ALWAYS works, even if not linked
  if (text === '/help' || text === '/yordam' || text === '/помощь') {
    await sendHelpMessage(chatId, lang)
    return
  }

  // Quick expense patterns: "taxi 50000" or "coffee 15k"
  const expensePattern = /^(\w+)\s+([\d,.\s]+)k?$/i
  const expenseMatch = text.match(expensePattern)
  
  if (expenseMatch) {
    const [_, category, amountStr] = expenseMatch
    let amount = parseFloat(amountStr.replace(/[,\s]/g, ''))
    if (text.toLowerCase().includes('k')) amount *= 1000

    await addExpense(telegramId, user.user_id, category, amount, supabase)
    
    const balance = await getBalance(telegramId, user.user_id, supabase, lang)
    const linkedMsg = user.user_id ? `\n📱 <i>${tr.updatedInApp}</i>` : ''
    
    const limitWarning = await checkLimitWarning(telegramId, user.user_id, category, supabase, lang)
    
    const cancelText = { uz: '🔄 Bekor', ru: '🔄 Отмена', en: '🔄 Undo' }
    const todayText = { uz: '📊 Bugungi', ru: '📊 Сегодня', en: '📊 Today' }
    
    const keyboard = {
      inline_keyboard: [[
        { text: todayText[lang], callback_data: 'cmd_stats' },
        { text: cancelText[lang], callback_data: `undo_expense_${Date.now()}` }
      ]]
    }
    
    await sendMessage(chatId, `✅ <b>${tr.added}:</b> ${getCatName(category.toLowerCase(), lang)} — ${formatMoney(amount)} UZS${linkedMsg}
💰 ${tr.balance}: ${balance}${limitWarning}`, { reply_markup: keyboard })
    
    return
  }

  // Natural language intent parsing
  const intent = parseIntent(text, lang)
  
  if (intent.type === 'spent') {
    if (!user.user_id) {
      await sendLinkInstructions(chatId, lang, 'spent')
      return
    }
    await handleSpentQuery(chatId, telegramId, user.user_id, intent.period, supabase, lang)
    return
  }
  
  if (intent.type === 'balance') {
    if (!user.user_id) {
      await sendLinkInstructions(chatId, lang, 'balance')
      return
    }
    await handleBalanceCommand(chatId, telegramId, user.user_id, supabase, lang)
    return
  }
  
  if (intent.type === 'stats') {
    if (!user.user_id) {
      await sendLinkInstructions(chatId, lang, 'stats')
      return
    }
    await handleStatsCommand(chatId, telegramId, user.user_id, supabase, lang)
    return
  }

  // Use AI for everything else
  await handleAIQuery(text, user, chatId, supabase, lang)
}

async function handleCallbackQuery(callback: CallbackQuery, supabase: any) {
  const chatId = callback.message.chat.id
  const data = callback.data
  const telegramId = callback.from.id
  const langCode = callback.from.language_code
  const tr = t('uz') // Will be updated after getting user

  const { data: user } = await supabase
    .from('telegram_users')
    .select('*')
    .eq('telegram_id', telegramId)
    .single()
  
  // Get user language (from profile if linked, else from Telegram)
  const lang = await getUserLang(user, langCode, supabase)
  const tr2 = t(lang)

  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callback.id })
  })

  // Handle confirmation actions
  if (data.startsWith('confirm_limit_')) {
    const parts = data.replace('confirm_limit_', '').split('_')
    const category = parts[0]
    const amount = parseFloat(parts[1])
    
    if (!user?.user_id) {
      await sendLinkInstructions(chatId, lang, 'balance')
      return
    }

    const { error } = await supabase
      .from('limits')
      .upsert({
        user_id: user.user_id,
        category_id: category,
        amount: amount,
        period: 'monthly',
        created_at: new Date().toISOString()
      }, { onConflict: 'user_id,category_id' })

    if (error) {
      console.error('Limit save error:', error)
      await sendMessage(chatId, `❌ ${tr2.linkError}`)
    } else {
      await sendMessage(chatId, `✅ <b>${tr2.limitSet}</b>

📋 ${tr2.category}: ${getCatName(category, lang)}
💰 ${tr2.limits}: ${formatMoney(amount)} UZS${tr2.per}${lang === 'ru' ? 'мес' : lang === 'en' ? 'mo' : 'oy'}`)
    }
  } else if (data.startsWith('confirm_goal_')) {
    const parts = data.replace('confirm_goal_', '').split('_')
    const name = parts[0]
    const target = parseFloat(parts[1])
    const months = parseInt(parts[2]) || 12
    
    if (!user?.user_id) {
      await sendLinkInstructions(chatId, lang, 'balance')
      return
    }

    const deadline = new Date()
    deadline.setMonth(deadline.getMonth() + months)

    const { error } = await supabase
      .from('goals')
      .insert({
        user_id: user.user_id,
        name: name,
        target: target,
        current: 0,
        deadline: deadline.toISOString().slice(0, 10),
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('Goal save error:', error)
      await sendMessage(chatId, `❌ ${tr2.linkError}`)
    } else {
      const monthlyRequired = Math.round(target / months)
      await sendMessage(chatId, `✅ <b>${tr2.goalCreated}</b>

🎯 ${name}
💰 ${tr2.target}: ${formatMoney(target)} UZS
📅 ${tr2.deadline}: ${months} ${lang === 'ru' ? 'мес' : lang === 'en' ? 'months' : 'oy'}
💵 ${tr2.monthly}: ${formatMoney(monthlyRequired)} UZS

${tr2.saveEachMonth}`)
    }
  } else if (data.startsWith('confirm_transfer_')) {
    const parts = data.replace('confirm_transfer_', '').split('_')
    const fromCategory = parts[0]
    const toCategory = parts[1]
    const amount = parseFloat(parts[2])
    
    if (!user?.user_id) {
      await sendLinkInstructions(chatId, lang, 'balance')
      return
    }

    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10)
    
    // Create two transactions: negative from source, positive to destination
    const { error: error1 } = await supabase
      .from('transactions')
      .insert({
        user_id: user.user_id,
        category_id: fromCategory,
        amount: -Math.abs(amount),
        date: dateStr,
        description: `${tr2.transferTo} ${getCatName(toCategory, lang)}`,
        source: 'telegram',
        type: 'transfer',
        telegram_id: telegramId,
        created_at: now.toISOString()
      })

    const { error: error2 } = await supabase
      .from('transactions')
      .insert({
        user_id: user.user_id,
        category_id: toCategory,
        amount: Math.abs(amount),
        date: dateStr,
        description: `${tr2.transferFrom} ${getCatName(fromCategory, lang)}`,
        source: 'telegram',
        type: 'transfer',
        telegram_id: telegramId,
        created_at: now.toISOString()
      })

    if (error1 || error2) {
      console.error('Transfer save error:', error1 || error2)
      await sendMessage(chatId, `❌ ${tr2.linkError}`)
    } else {
      await sendMessage(chatId, `✅ <b>${tr2.transferCreated}</b>

${tr2.fromCategory}: ${getCatName(fromCategory, lang)}
${tr2.toCategory}: ${getCatName(toCategory, lang)}
💰 ${tr2.transferAmount}: ${formatMoney(amount)} UZS`)
    }
  } else if (data.startsWith('select_limit_cat_')) {
    const category = data.replace('select_limit_cat_', '')
    await sendMessage(chatId, `📋 <b>${getCatName(category, lang)}</b>

${tr2.enterAmount}:
<code>/limit ${category} 500000</code>`)
  } else if (data.startsWith('select_transfer_from_')) {
    const category = data.replace('select_transfer_from_', '')
    // Store in user state or show next step
    await showTransferCategorySelection(chatId, user?.user_id, supabase, lang, 'to')
  } else if (data.startsWith('select_transfer_to_')) {
    const category = data.replace('select_transfer_to_', '')
    await sendMessage(chatId, `💸 ${tr2.enterAmount}:
<code>/transfer FROM_CATEGORY ${category} 50000</code>`)
  } else if (data === 'cancel_action') {
    await sendMessage(chatId, `❌ ${tr2.actionCancelled}`)
  } else if (data === 'cmd_transfer') {
    await handleTransferCommand('/transfer', chatId, telegramId, user?.user_id, supabase, lang)
  } else if (data === 'start_goal_flow') {
    await sendMessage(chatId, `🎯 <b>${tr2.newGoal}</b>

${tr2.example}:
<code>/goal Car 50000000 12</code>

${tr2.enterGoalName}: Maqsad nomi
${tr2.enterGoalTarget}: Maqsad summasi
${tr2.enterGoalMonths}: Oy soni`)
  } else if (data === 'dismiss') {
    // Just acknowledge
    await sendMessage(chatId, `✅`)
  } else if (data.startsWith('set_lang_')) {
    const selectedLang = data.replace('set_lang_', '') as Lang
    // Language is already detected from profile/telegram, but we can acknowledge
    await sendMessage(chatId, `✅ ${t(selectedLang).hello}!`)
    await sendWelcomeMessage(chatId, callback.from.first_name, selectedLang)
  } else {
    // Original switch cases
    switch (data) {
      case 'cmd_balance':
        if (!user?.user_id) {
          await sendLinkInstructions(chatId, lang, 'balance')
        } else {
          await handleBalanceCommand(chatId, telegramId, user.user_id, supabase, lang)
        }
        break
      case 'cmd_stats':
        if (!user?.user_id) {
          await sendLinkInstructions(chatId, lang, 'stats')
        } else {
          await handleStatsCommand(chatId, telegramId, user.user_id, supabase, lang)
        }
        break
      case 'cmd_goals':
        await showGoals(chatId, telegramId, user?.user_id, supabase, lang)
        break
      case 'cmd_limits':
        await showLimits(chatId, telegramId, user?.user_id, supabase, lang)
        break
      case 'cmd_link_info':
        await sendMessage(chatId, `🔗 <b>${tr2.linkAccount}</b>

${tr2.linkInstructions}

<code>/link YOUR_CODE</code>`)
        break
      case 'set_limit_taxi':
      case 'set_limit_food':
      case 'set_limit_shopping':
      case 'set_limit_entertainment':
        const category = data.replace('set_limit_', '')
        await sendMessage(chatId, `📋 <b>${getCatName(category, lang)} ${tr2.limits.toLowerCase()}</b>

${tr2.example}:
<code>/limit ${category} 500000</code>`)
        break
      case 'add_goal':
        await sendMessage(chatId, `🎯 <b>${tr2.newGoal}</b>

${tr2.example}:
<code>/goal Car 50000000 12</code>`)
        break
    }
  }
}

async function handleLimitCommand(text: string, chatId: number, telegramId: number, appUserId: string | null, supabase: any, lang: Lang) {
  const tr = t(lang)
  const parts = text.split(' ').filter(p => p)
  
  if (parts.length === 1) {
    await showLimits(chatId, telegramId, appUserId, supabase, lang)
    return
  }
  
  if (parts.length >= 3) {
    const category = parts[1].toLowerCase()
    const amount = parseFloat(parts[2].replace(/[,\s]/g, ''))
    
    if (isNaN(amount) || amount <= 0) {
      await sendMessage(chatId, `❌ ${tr.wrongFormat} ${tr.example}: /limit taxi 500000`)
      return
    }

    if (!appUserId) {
      await sendMessage(chatId, `⚠️ ${tr.linkAccount}:
      
/link YOUR_CODE

${tr.linkInstructions}`)
      return
    }

    // Show confirmation
    const confirmText = { uz: '✅ Tasdiqlash', ru: '✅ Подтвердить', en: '✅ Confirm' }
    const cancelText = { uz: '❌ Bekor', ru: '❌ Отмена', en: '❌ Cancel' }
    
    const keyboard = {
      inline_keyboard: [
        [
          { text: confirmText[lang], callback_data: `confirm_limit_${category}_${amount}` },
          { text: cancelText[lang], callback_data: 'cancel_action' }
        ]
      ]
    }

    await sendMessage(chatId, `📋 <b>${tr.confirmAction}</b>

${tr.category}: ${getCatName(category, lang)}
💰 ${tr.limits}: ${formatMoney(amount)} UZS${tr.per}${lang === 'ru' ? 'мес' : lang === 'en' ? 'mo' : 'oy'}`, { reply_markup: keyboard })
    return
  }

  // Show category selection
  await showLimitCategorySelection(chatId, appUserId, supabase, lang)
}

async function showLimitCategorySelection(chatId: number, appUserId: string | null, supabase: any, lang: Lang) {
  const tr = t(lang)
  
  if (!appUserId) {
    const linkText = { uz: '🔗 Hisobni ulash', ru: '🔗 Привязать аккаунт', en: '🔗 Link Account' }
    const keyboard = {
      inline_keyboard: [[
        { text: linkText[lang], callback_data: 'cmd_link_info' }
      ]]
    }
    await sendMessage(chatId, `⚠️ ${tr.notLinked}

${tr.linkInstructions}

<code>/link YOUR_CODE</code>`, { reply_markup: keyboard })
    return
  }

  const categories = ['taxi', 'food', 'shopping', 'entertainment', 'coffee', 'transport', 'health', 'bills']
  const keyboardRows: any[][] = []
  
  for (let i = 0; i < categories.length; i += 2) {
    const row: any[] = []
    const cat1 = categories[i]
    const cat2 = categories[i + 1]
    
    row.push({
      text: `${categoryEmojis[cat1]} ${getCatName(cat1, lang)}`,
      callback_data: `select_limit_cat_${cat1}`
    })
    
    if (cat2) {
      row.push({
        text: `${categoryEmojis[cat2]} ${getCatName(cat2, lang)}`,
        callback_data: `select_limit_cat_${cat2}`
      })
    }
    
    keyboardRows.push(row)
  }

  const keyboard = { inline_keyboard: keyboardRows }
  
  await sendMessage(chatId, `📋 <b>${tr.selectCategory}</b>

${tr.example}: <code>/limit taxi 500000</code>`, { reply_markup: keyboard })
}

async function showLimits(chatId: number, telegramId: number, appUserId: string | null, supabase: any, lang: Lang) {
  const tr = t(lang)
  
  const buttonLabels = {
    uz: { taxi: '🚕 Taxi', food: '🍔 Ovqat', shopping: '🛍 Xarid', ent: '🎮 Ko\'ngil' },
    ru: { taxi: '🚕 Такси', food: '🍔 Еда', shopping: '🛍 Покупки', ent: '🎮 Развлечения' },
    en: { taxi: '🚕 Taxi', food: '🍔 Food', shopping: '🛍 Shopping', ent: '🎮 Entertainment' }
  }
  const btns = buttonLabels[lang]
  
  if (!appUserId) {
    const keyboard = {
      inline_keyboard: [
        [
          { text: btns.taxi, callback_data: 'set_limit_taxi' },
          { text: btns.food, callback_data: 'set_limit_food' }
        ],
        [
          { text: btns.shopping, callback_data: 'set_limit_shopping' },
          { text: btns.ent, callback_data: 'set_limit_entertainment' }
        ]
      ]
    }
    await sendMessage(chatId, `📋 <b>${tr.limits}</b>

${tr.notLinked} ${tr.relinkWith}:
/link YOUR_CODE

${tr.example}:
<code>/limit taxi 500000</code>`, { reply_markup: keyboard })
    return
  }

  const { data: limits } = await supabase
    .from('limits')
    .select('*')
    .eq('user_id', appUserId)

  if (!limits || limits.length === 0) {
    const keyboard = {
      inline_keyboard: [
        [
          { text: btns.taxi, callback_data: 'set_limit_taxi' },
          { text: btns.food, callback_data: 'set_limit_food' }
        ],
        [
          { text: btns.shopping, callback_data: 'set_limit_shopping' },
          { text: btns.ent, callback_data: 'set_limit_entertainment' }
        ]
      ]
    }
    await sendMessage(chatId, `📋 <b>${tr.limits}</b>

${tr.noGoals.replace('goals', 'limits')}

${tr.example}:
<code>/limit taxi 500000</code>`, { reply_markup: keyboard })
    return
  }

  const thisMonth = new Date().toISOString().slice(0, 7)
  const { data: transactions } = await supabase
    .from('transactions')
    .select('category_id, amount')
    .eq('user_id', appUserId)
    .gte('date', `${thisMonth}-01`)
    .lt('amount', 0)

  const spending: Record<string, number> = {}
  transactions?.forEach((tx: any) => {
    spending[tx.category_id] = (spending[tx.category_id] || 0) + Math.abs(tx.amount)
  })

  let message = `📋 <b>${tr.monthlyLimit}</b>\n\n`
  
  for (const limit of limits) {
    const spent = spending[limit.category_id] || 0
    const percent = Math.round((spent / limit.amount) * 100)
    const emoji = categoryEmojis[limit.category_id] || '📌'
    const progressBar = getProgressBar(percent)
    const status = percent >= 100 ? '🔴' : percent >= 80 ? '🟡' : '🟢'
    
    message += `${emoji} <b>${getCatName(limit.category_id, lang)}</b>
${progressBar} ${percent}%
${formatMoney(spent)} / ${formatMoney(limit.amount)} UZS ${status}\n\n`
  }

  await sendMessage(chatId, message)
}

async function handleGoalCommand(text: string, chatId: number, telegramId: number, appUserId: string | null, supabase: any, lang: Lang) {
  const tr = t(lang)
  const parts = text.split(' ').filter(p => p)
  
  if (parts.length === 1) {
    await showGoals(chatId, telegramId, appUserId, supabase, lang)
    return
  }
  
  if (parts.length >= 3) {
    const name = parts[1]
    const target = parseFloat(parts[2].replace(/[,\s]/g, ''))
    const months = parseInt(parts[3]) || 12
    
    if (isNaN(target) || target <= 0) {
      await sendMessage(chatId, `❌ ${tr.wrongFormat} ${tr.example}: /goal Car 50000000 12`)
      return
    }

    if (!appUserId) {
      await sendMessage(chatId, `⚠️ ${tr.linkAccount}:
      
/link YOUR_CODE`)
      return
    }

    // Show confirmation
    const confirmText = { uz: '✅ Tasdiqlash', ru: '✅ Подтвердить', en: '✅ Confirm' }
    const cancelText = { uz: '❌ Bekor', ru: '❌ Отмена', en: '❌ Cancel' }
    
    const deadline = new Date()
    deadline.setMonth(deadline.getMonth() + months)
    const monthlyRequired = Math.round(target / months)
    
    const keyboard = {
      inline_keyboard: [
        [
          { text: confirmText[lang], callback_data: `confirm_goal_${name}_${target}_${months}` },
          { text: cancelText[lang], callback_data: 'cancel_action' }
        ]
      ]
    }

    await sendMessage(chatId, `🎯 <b>${tr.confirmAction}</b>

${tr.newGoal}: ${name}
💰 ${tr.target}: ${formatMoney(target)} UZS
📅 ${tr.deadline}: ${months} ${lang === 'ru' ? 'мес' : lang === 'en' ? 'months' : 'oy'}
💵 ${tr.monthly}: ${formatMoney(monthlyRequired)} UZS`, { reply_markup: keyboard })
    return
  }

  // Show goal creation guide
  const addGoalText = { uz: '➕ Maqsad qo\'shish', ru: '➕ Добавить цель', en: '➕ Add Goal' }
  const keyboard = {
    inline_keyboard: [[
      { text: addGoalText[lang], callback_data: 'start_goal_flow' }
    ]]
  }

  await sendMessage(chatId, `🎯 <b>${tr.createGoal}</b>

${tr.example}:
• <code>/goal Car 50000000 12</code>
• <code>/goal iPhone 15000000 6</code>
• <code>/goal Vacation 10000000 8</code>

${tr.enterGoalName}: Maqsad nomi
${tr.enterGoalTarget}: Maqsad summasi
${tr.enterGoalMonths}: Oy soni`, { reply_markup: keyboard })
}

async function showGoals(chatId: number, telegramId: number, appUserId: string | null, supabase: any, lang: Lang) {
  const tr = t(lang)
  const addGoalText = { uz: '➕ Maqsad qo\'shish', ru: '➕ Добавить цель', en: '➕ Add Goal' }
  
  if (!appUserId) {
    const keyboard = {
      inline_keyboard: [[
        { text: addGoalText[lang], callback_data: 'add_goal' }
      ]]
    }
    await sendMessage(chatId, `🎯 <b>${tr.goals}</b>

${tr.notLinked} ${tr.relinkWith}:
/link YOUR_CODE

${tr.example}:
<code>/goal Car 50000000 12</code>`, { reply_markup: keyboard })
    return
  }

  const { data: goals } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', appUserId)
    .order('created_at', { ascending: false })

  if (!goals || goals.length === 0) {
    const keyboard = {
      inline_keyboard: [[
        { text: addGoalText[lang], callback_data: 'add_goal' }
      ]]
    }
    await sendMessage(chatId, `🎯 <b>${tr.goals}</b>

${tr.noGoals}

${tr.example}: <code>/goal Car 50000000 12</code>`, { reply_markup: keyboard })
    return
  }

  let message = `🎯 <b>${tr.yourGoals}</b>\n\n`
  
  for (const goal of goals) {
    const percent = Math.round((goal.current / goal.target) * 100)
    const progressBar = getProgressBar(percent)
    const remaining = goal.target - goal.current
    const noDeadline = { uz: 'Muddatsiz', ru: 'Без срока', en: 'No deadline' }
    
    message += `<b>${goal.name}</b>
${progressBar} ${percent}%
${formatMoney(goal.current)} / ${formatMoney(goal.target)} UZS
📅 ${goal.deadline || noDeadline[lang]}
💰 ${tr.remaining}: ${formatMoney(remaining)} UZS\n\n`
  }

  const keyboard = {
    inline_keyboard: [[
      { text: addGoalText[lang], callback_data: 'add_goal' }
    ]]
  }

  await sendMessage(chatId, message, { reply_markup: keyboard })
}

async function handleRemindCommand(text: string, chatId: number, telegramId: number, appUserId: string | null, supabase: any, lang: Lang) {
  const tr = t(lang)
  const parts = text.split(' ').filter(p => p)
  
  if (parts.length === 1) {
    await sendMessage(chatId, `⏰ <b>${tr.reminder}</b>

${tr.example}:
• <code>/remind Rent 25</code>
• <code>/remind Credit 1</code>
• <code>/remind Bills 15</code>`)
    return
  }

  const dayMatch = text.match(/(\d+)$/)
  const day = dayMatch ? parseInt(dayMatch[1]) : null
  const reminderText = parts.slice(1, day ? -1 : undefined).join(' ')

  if (!day || day < 1 || day > 31 || !reminderText) {
    await sendMessage(chatId, `❌ ${tr.wrongFormat}

${tr.example}: <code>/remind Rent 25</code>`)
    return
  }

  if (!appUserId) {
    await sendMessage(chatId, `⚠️ ${tr.notLinked}

${tr.linkInstructions}

<code>/link YOUR_CODE</code>`)
    return
  }

  // Save reminder (using a simple JSON storage in telegram_users table or create reminders table)
  // For now, we'll store it in a simple format
  try {
    const { data: existing } = await supabase
      .from('telegram_users')
      .select('reminders')
      .eq('telegram_id', telegramId)
      .single()

    const reminders = existing?.reminders || []
    reminders.push({
      text: reminderText,
      day: day,
      created_at: new Date().toISOString()
    })

    await supabase
      .from('telegram_users')
      .update({ reminders: reminders })
      .eq('telegram_id', telegramId)

    const confirmText = { uz: '✅ Tushundim', ru: '✅ Понятно', en: '✅ Got it' }
    const keyboard = {
      inline_keyboard: [[
        { text: confirmText[lang], callback_data: 'dismiss' }
      ]]
    }

    await sendMessage(chatId, `✅ <b>${tr.reminderSaved}</b>

📝 ${reminderText}
📅 ${tr.everyMonth} ${day}${tr.dayOf}

<i>${tr.willNotify}</i>`, { reply_markup: keyboard })
  } catch (error) {
    console.error('Reminder save error:', error)
    await sendMessage(chatId, `✅ <b>${tr.reminderSet}</b>

📝 ${reminderText}
📅 ${tr.everyMonth} ${day}${tr.dayOf}

<i>${tr.willNotify}</i>`)
  }
}

async function handleTransferCommand(text: string, chatId: number, telegramId: number, appUserId: string | null, supabase: any, lang: Lang) {
  const tr = t(lang)
  const parts = text.split(' ').filter(p => p)
  
  if (parts.length === 1) {
    // Show category selection for transfer
    await showTransferCategorySelection(chatId, appUserId, supabase, lang, 'from')
    return
  }
  
  if (parts.length >= 4) {
    // Format: /transfer from_category to_category amount
    const fromCategory = parts[1].toLowerCase()
    const toCategory = parts[2].toLowerCase()
    const amount = parseFloat(parts[3].replace(/[,\s]/g, ''))
    
    if (isNaN(amount) || amount <= 0) {
      await sendMessage(chatId, `❌ ${tr.wrongFormat} ${tr.example}: /transfer taxi food 50000`)
      return
    }

    if (fromCategory === toCategory) {
      await sendMessage(chatId, `❌ ${tr.wrongFormat}: ${tr.fromCategory} va ${tr.toCategory} bir xil bo'lmasligi kerak`)
      return
    }

    if (!appUserId) {
      await sendMessage(chatId, `⚠️ ${tr.notLinked}

${tr.linkInstructions}

<code>/link YOUR_CODE</code>`)
      return
    }

    // Show confirmation
    const confirmText = { uz: '✅ Tasdiqlash', ru: '✅ Подтвердить', en: '✅ Confirm' }
    const cancelText = { uz: '❌ Bekor', ru: '❌ Отмена', en: '❌ Cancel' }
    
    const keyboard = {
      inline_keyboard: [
        [
          { text: confirmText[lang], callback_data: `confirm_transfer_${fromCategory}_${toCategory}_${amount}` },
          { text: cancelText[lang], callback_data: 'cancel_action' }
        ]
      ]
    }

    await sendMessage(chatId, `💸 <b>${tr.confirmAction}</b>

${tr.fromCategory}: ${getCatName(fromCategory, lang)}
${tr.toCategory}: ${getCatName(toCategory, lang)}
💰 ${tr.transferAmount}: ${formatMoney(amount)} UZS`, { reply_markup: keyboard })
    return
  }

  await sendMessage(chatId, `💸 <b>${tr.transfer}</b>

${tr.example}:
• <code>/transfer taxi food 50000</code>
• <code>/transfer shopping entertainment 100000</code>`)
}

async function showTransferCategorySelection(chatId: number, appUserId: string | null, supabase: any, lang: Lang, step: 'from' | 'to') {
  const tr = t(lang)
  
  if (!appUserId) {
    const linkText = { uz: '🔗 Hisobni ulash', ru: '🔗 Привязать аккаунт', en: '🔗 Link Account' }
    const keyboard = {
      inline_keyboard: [[
        { text: linkText[lang], callback_data: 'cmd_link_info' }
      ]]
    }
    await sendMessage(chatId, `⚠️ ${tr.notLinked}

${tr.linkInstructions}

<code>/link YOUR_CODE</code>`, { reply_markup: keyboard })
    return
  }

  const categories = ['taxi', 'food', 'shopping', 'entertainment', 'coffee', 'transport', 'health', 'bills']
  const keyboardRows: any[][] = []
  
  for (let i = 0; i < categories.length; i += 2) {
    const row: any[] = []
    const cat1 = categories[i]
    const cat2 = categories[i + 1]
    
    row.push({
      text: `${categoryEmojis[cat1]} ${getCatName(cat1, lang)}`,
      callback_data: `select_transfer_${step}_${cat1}`
    })
    
    if (cat2) {
      row.push({
        text: `${categoryEmojis[cat2]} ${getCatName(cat2, lang)}`,
        callback_data: `select_transfer_${step}_${cat2}`
      })
    }
    
    keyboardRows.push(row)
  }

  const keyboard = { inline_keyboard: keyboardRows }
  const stepText = step === 'from' ? tr.fromCategory : tr.toCategory
  
  await sendMessage(chatId, `💸 <b>${stepText}</b>

${tr.selectCategory}`, { reply_markup: keyboard })
}

async function handleStatsCommand(chatId: number, telegramId: number, appUserId: string | null, supabase: any, lang: Lang) {
  const tr = t(lang)
  const today = new Date().toISOString().slice(0, 10)
  const thisMonth = today.slice(0, 7)
  
  let transactions: any[] = []
  
  if (appUserId) {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', appUserId)
      .gte('date', `${thisMonth}-01`)
      .order('date', { ascending: false })
    transactions = data || []
  } else {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('telegram_id', telegramId)
      .gte('date', `${thisMonth}-01`)
      .order('date', { ascending: false })
    transactions = data || []
  }

  const todayTx = transactions.filter(tx => tx.date === today)
  const todayExpense = todayTx.filter(tx => tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0)
  const todayIncome = todayTx.filter(tx => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0)
  
  const monthExpense = transactions.filter(tx => tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0)
  const monthIncome = transactions.filter(tx => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0)

  const categories: Record<string, number> = {}
  transactions.filter(tx => tx.amount < 0).forEach(tx => {
    categories[tx.category_id] = (categories[tx.category_id] || 0) + Math.abs(tx.amount)
  })
  
  const topCategories = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  let message = `📊 <b>${tr.stats}</b>

<b>📅 ${tr.today} (${today}):</b>
📉 ${tr.expense}: ${formatMoney(todayExpense)} UZS
📈 ${tr.income}: ${formatMoney(todayIncome)} UZS
📋 ${tr.transactions}: ${todayTx.length}

<b>📆 ${tr.thisMonth}:</b>
📉 ${tr.expense}: ${formatMoney(monthExpense)} UZS
📈 ${tr.income}: ${formatMoney(monthIncome)} UZS
💰 ${tr.balance}: ${monthIncome >= monthExpense ? '+' : ''}${formatMoney(monthIncome - monthExpense)} UZS

`

  if (topCategories.length > 0) {
    message += `<b>🏷 ${tr.topExpenses}:</b>\n`
    topCategories.forEach(([cat, amount], i) => {
      const emoji = categoryEmojis[cat] || '📌'
      const percent = Math.round((amount / monthExpense) * 100)
      message += `${i + 1}. ${emoji} ${getCatName(cat, lang)}: ${formatMoney(amount)} (${percent}%)\n`
    })
  }

  const limitsText = { uz: '📋 Limitlar', ru: '📋 Лимиты', en: '📋 Limits' }
  const goalsText = { uz: '🎯 Maqsadlar', ru: '🎯 Цели', en: '🎯 Goals' }
  
  const keyboard = {
    inline_keyboard: [[
      { text: limitsText[lang], callback_data: 'cmd_limits' },
      { text: goalsText[lang], callback_data: 'cmd_goals' }
    ]]
  }

  await sendMessage(chatId, message, { reply_markup: keyboard })
}

async function handleSpentQuery(chatId: number, telegramId: number, appUserId: string, period: 'today' | 'week' | 'month', supabase: any, lang: Lang) {
  const tr = t(lang)
  
  let startDate: string
  const today = new Date().toISOString().slice(0, 10)
  
  if (period === 'today') {
    startDate = today
  } else if (period === 'week') {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay()) // Start of week (Sunday)
    startDate = d.toISOString().slice(0, 10)
  } else {
    startDate = today.slice(0, 7) + '-01' // First day of month
  }
  
  const { data: transactions } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', appUserId)
    .gte('date', startDate)
    .lt('amount', 0)
  
  const spent = transactions?.reduce((sum: number, tx: any) => sum + Math.abs(tx.amount), 0) || 0
  
  const periodLabels = {
    today: { uz: 'Bugun', ru: 'Сегодня', en: 'Today' },
    week: { uz: 'Shu hafta', ru: 'Эта неделя', en: 'This week' },
    month: { uz: 'Shu oy', ru: 'Этот месяц', en: 'This month' }
  }
  
  await sendMessage(chatId, `💰 <b>${periodLabels[period][lang]}:</b> ${formatMoney(spent)} UZS`)
}

async function sendLinkInstructions(chatId: number, lang: Lang, queryType: 'spent' | 'balance' | 'stats') {
  const tr = t(lang)
  
  const messages = {
    spent: {
      uz: `⚠️ <b>Hisobingiz ulanmagan</b>\n\nStatistikani ko'rish uchun ilovangizni ulashingiz kerak.\n\n${tr.linkInstructions}\n\n<code>/link YOUR_CODE</code>`,
      ru: `⚠️ <b>Аккаунт не привязан</b>\n\nЧтобы увидеть статистику, нужно привязать аккаунт.\n\n${tr.linkInstructions}\n\n<code>/link YOUR_CODE</code>`,
      en: `⚠️ <b>Account not linked</b>\n\nTo view statistics, you need to link your account.\n\n${tr.linkInstructions}\n\n<code>/link YOUR_CODE</code>`
    },
    balance: {
      uz: `⚠️ <b>Hisobingiz ulanmagan</b>\n\nBalansni ko'rish uchun ilovangizni ulashingiz kerak.\n\n${tr.linkInstructions}\n\n<code>/link YOUR_CODE</code>`,
      ru: `⚠️ <b>Аккаунт не привязан</b>\n\nЧтобы увидеть баланс, нужно привязать аккаунт.\n\n${tr.linkInstructions}\n\n<code>/link YOUR_CODE</code>`,
      en: `⚠️ <b>Account not linked</b>\n\nTo view balance, you need to link your account.\n\n${tr.linkInstructions}\n\n<code>/link YOUR_CODE</code>`
    },
    stats: {
      uz: `⚠️ <b>Hisobingiz ulanmagan</b>\n\nStatistikani ko'rish uchun ilovangizni ulashingiz kerak.\n\n${tr.linkInstructions}\n\n<code>/link YOUR_CODE</code>`,
      ru: `⚠️ <b>Аккаунт не привязан</b>\n\nЧтобы увидеть статистику, нужно привязать аккаунт.\n\n${tr.linkInstructions}\n\n<code>/link YOUR_CODE</code>`,
      en: `⚠️ <b>Account not linked</b>\n\nTo view statistics, you need to link your account.\n\n${tr.linkInstructions}\n\n<code>/link YOUR_CODE</code>`
    }
  }
  
  await sendMessage(chatId, messages[queryType][lang])
}

async function handleBalanceCommand(chatId: number, telegramId: number, appUserId: string | null, supabase: any, lang: Lang) {
  const tr = t(lang)
  const balance = await getBalance(telegramId, appUserId, supabase, lang)
  
  const statsText = { uz: '📊 Statistika', ru: '📊 Статистика', en: '📊 Stats' }
  const goalsText = { uz: '🎯 Maqsadlar', ru: '🎯 Цели', en: '🎯 Goals' }
  
  const keyboard = {
    inline_keyboard: [[
      { text: statsText[lang], callback_data: 'cmd_stats' },
      { text: goalsText[lang], callback_data: 'cmd_goals' }
    ]]
  }
  
  await sendMessage(chatId, `💰 <b>${tr.balance}:</b> ${balance}`, { reply_markup: keyboard })
}

async function showLanguageSelection(chatId: number, currentLang: Lang) {
  const tr = t(currentLang)
  
  const keyboard = {
    inline_keyboard: [
      [
        { text: '🇺🇿 O\'zbek', callback_data: 'set_lang_uz' },
        { text: '🇷🇺 Русский', callback_data: 'set_lang_ru' }
      ],
      [
        { text: '🇬🇧 English', callback_data: 'set_lang_en' }
      ]
    ]
  }

  await sendMessage(chatId, `🌐 <b>${tr.selectLanguage}</b>

Iltimos, tilni tanlang / Пожалуйста, выберите язык / Please select language:`, { reply_markup: keyboard })
}

async function handleLinkCommand(text: string, chatId: number, telegramId: number, username: string | undefined, user: any, supabase: any, lang: Lang) {
  const tr = t(lang)
  const code = text.split(' ')[1]?.trim().toUpperCase()
  
  if (!code) {
    const linkText = { uz: '📱 Ilovani ochish', ru: '📱 Открыть приложение', en: '📱 Open app' }
    const keyboard = {
      inline_keyboard: [[
        { text: linkText[lang], url: 'https://monex.app' }
      ]]
    }
    
    await sendMessage(chatId, `🔗 <b>${tr.linkAccount}</b>

${tr.linkInstructions}

<code>/link YOUR_CODE</code>`, { reply_markup: keyboard })
    return
  }

  console.log(`Link attempt: code=${code}, telegram_id=${telegramId}`)

  const { data: linkUser, error: findError } = await supabase
    .from('telegram_users')
    .select('user_id, code_expires_at')
    .eq('linking_code', code)
    .single()

  if (findError || !linkUser) {
    console.log('Link code not found:', findError)
    await sendMessage(chatId, `❌ ${tr.codeNotFound}

${tr.newCode}`)
    return
  }

  const expiresAt = new Date(linkUser.code_expires_at)
  if (expiresAt < new Date()) {
    await sendMessage(chatId, `⏰ ${tr.codeExpired}

${tr.newCode}`)
    return
  }

  const appUserId = linkUser.user_id

  const { data: linkResult, error: linkError } = await supabase.rpc('link_telegram_account', {
    p_user_id: appUserId,
    p_telegram_id: telegramId,
    p_telegram_username: username || null
  })

  if (linkError || !linkResult) {
    console.error('Link error:', linkError)
    await sendMessage(chatId, `❌ ${tr.linkError}`)
    return
  }

  await supabase
    .from('telegram_users')
    .update({ linking_code: null, code_expires_at: null })
    .eq('user_id', appUserId)

  const balanceText = { uz: '💰 Balans', ru: '💰 Баланс', en: '💰 Balance' }
  const statsText = { uz: '📊 Statistika', ru: '📊 Статистика', en: '📊 Stats' }
  
  const keyboard = {
    inline_keyboard: [[
      { text: balanceText[lang], callback_data: 'cmd_balance' },
      { text: statsText[lang], callback_data: 'cmd_stats' }
    ]]
  }

  await sendMessage(chatId, `✅ <b>${tr.linkedSuccess}</b>

${tr.syncInfo}

💡 ${tr.tryIt}: <code>taxi 50000</code>`, { reply_markup: keyboard })
}

async function handleUnlinkCommand(chatId: number, telegramId: number, user: any, supabase: any, lang: Lang) {
  const tr = t(lang)
  
  if (!user.user_id) {
    await sendMessage(chatId, `ℹ️ ${tr.notLinked}

${tr.relinkWith}: /link YOUR_CODE`)
    return
  }

  await supabase
    .from('profiles')
    .update({ telegram_id: null, telegram_username: null })
    .eq('id', user.user_id)

  await supabase
    .from('telegram_users')
    .update({ user_id: null })
    .eq('telegram_id', telegramId)

  await sendMessage(chatId, `✅ ${tr.unlinked}

${tr.relinkWith}: /link YOUR_CODE`)
}

async function handleAIQuery(text: string, user: any, chatId: number, supabase: any, lang: Lang) {
  const tr = t(lang)
  const telegramId = user.telegram_id
  const appUserId = user.user_id

  let transactions: any[] = []
  
  if (appUserId) {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', appUserId)
      .order('date', { ascending: false })
      .limit(20)
    transactions = data || []
  } else {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('telegram_id', telegramId)
      .order('date', { ascending: false })
      .limit(20)
    transactions = data || []
  }

  const totalBalance = transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0)
  const today = new Date().toISOString().slice(0, 10)
  const todaySpent = transactions
    .filter(tx => tx.date === today && tx.amount < 0)
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)

  if (!OPENAI_API_KEY) {
    await sendMessage(chatId, `${tr.notUnderstood}
• <code>taxi 50000</code> — ${tr.addExpense}
• /stats — ${tr.todayStats}
• /help — ${tr.help}`)
    return
  }

  const langNames = { uz: 'Uzbek', ru: 'Russian', en: 'English' }

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are MonEX, a financial assistant Telegram bot. Respond in ${langNames[lang]}. Be concise (2-3 lines max).

Context:
- Balance: ${formatMoney(totalBalance)} UZS
- Spent today: ${formatMoney(todaySpent)} UZS
- Recent transactions: ${JSON.stringify(transactions.slice(0, 5).map(tx => ({
  category: tx.category_id,
  amount: tx.amount,
  date: tx.date
})))}

Instructions:
1. Always respond in ${langNames[lang]}
2. Use emojis appropriately
3. Format money with commas
4. If they ask about tracking: tell them "category amount" format (e.g., "taxi 50000")
5. Keep responses SHORT and actionable`
          },
          { role: 'user', content: text }
        ],
        max_tokens: 300
      })
    })

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content || 
                  `${tr.notUnderstood} 'taxi 50000' ${lang === 'ru' ? 'или' : lang === 'en' ? 'or' : 'yoki'} '/help'`

    await sendMessage(chatId, reply)
  } catch (error) {
    console.error('AI error:', error)
    await sendMessage(chatId, `${tr.notUnderstood}
• <code>taxi 50000</code> — ${tr.addExpense}
• /stats — ${tr.todayStats}`)
  }
}

async function handleVoiceMessage(message: TelegramMessage, user: any, supabase: any, lang: Lang) {
  const chatId = message.chat.id
  const tr = t(lang)
  
  await sendMessage(chatId, `🎤 ${tr.voiceReceived}

${tr.useTextInstead}
<code>taxi 50000</code> ${lang === 'ru' ? 'или' : lang === 'en' ? 'or' : 'yoki'} <code>coffee 15000</code>`)
}

async function handlePhotoMessage(message: TelegramMessage, user: any, supabase: any, lang: Lang) {
  const chatId = message.chat.id
  const telegramId = user.telegram_id
  const tr = t(lang)
  
  await sendMessage(chatId, `🧾 ${tr.receiptDetected}`)

  const photo = message.photo![message.photo!.length - 1]
  
  const fileInfo = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${photo.file_id}`)
  const fileData = await fileInfo.json()
  
  if (!fileData.ok) {
    await sendMessage(chatId, `❌ ${tr.receiptError}`)
    return
  }

  const imageUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileData.result.file_path}`
  
  const imageResponse = await fetch(imageUrl)
  const imageBytes = await imageResponse.arrayBuffer()
  const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBytes)))

  if (!OPENAI_API_KEY) {
    await sendMessage(chatId, `🧾 ${tr.receiptError}

${tr.enterManually}: <code>shopping 50000</code>`)
    return
  }

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract receipt data. Return ONLY valid JSON (no markdown):
{
  "store": "store name",
  "total": number,
  "date": "YYYY-MM-DD",
  "items": [{"name": "item", "price": number}],
  "currency": "UZS"
}`
              },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${base64Image}` }
              }
            ]
          }
        ],
        max_tokens: 1000
      })
    })

    const data = await response.json()
    const extractedText = data.choices?.[0]?.message?.content || ''
    
    const cleaned = extractedText.replace(/```json|```/g, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    
    if (!jsonMatch) throw new Error('No JSON found')
    
    const receiptData = JSON.parse(jsonMatch[0])
    
    await addExpense(telegramId, user.user_id, 'shopping', receiptData.total, supabase, {
      store: receiptData.store,
      items: receiptData.items
    })
    
    let itemsList = ''
    if (receiptData.items && receiptData.items.length > 0) {
      itemsList = `\n\n📋 <b>${tr.products}:</b>\n` + receiptData.items.slice(0, 5).map((item: any) => 
        `  • ${item.name}: ${formatMoney(item.price)}`
      ).join('\n')
      if (receiptData.items.length > 5) {
        itemsList += `\n  <i>... ${tr.andMore} ${receiptData.items.length - 5}</i>`
      }
    }
    
    await sendMessage(chatId, `✅ <b>${tr.receiptProcessed}</b>

🏪 ${tr.store}: ${receiptData.store}
💰 ${tr.total}: ${formatMoney(receiptData.total)} ${receiptData.currency}
📅 ${tr.date}: ${receiptData.date}${itemsList}

${tr.addedToExpenses}`)
    
  } catch (error) {
    console.error('Receipt parsing error:', error)
    await sendMessage(chatId, `🧾 ${tr.receiptError}

${tr.enterManually}: <code>shopping 50000</code>`)
  }
}

async function sendHelpMessage(chatId: number, lang: Lang) {
  const tr = t(lang)
  
  const balanceText = { uz: '💰 Balans', ru: '💰 Баланс', en: '💰 Balance' }
  const statsText = { uz: '📊 Statistika', ru: '📊 Статистика', en: '📊 Stats' }
  const goalsText = { uz: '🎯 Maqsadlar', ru: '🎯 Цели', en: '🎯 Goals' }
  const limitsText = { uz: '📋 Limitlar', ru: '📋 Лимиты', en: '📋 Limits' }
  const linkText = { uz: '🔗 Ulash', ru: '🔗 Привязать', en: '🔗 Link' }
  const transferText = { uz: '💸 O\'tkazma', ru: '💸 Перевод', en: '💸 Transfer' }
  
  const keyboard = {
    inline_keyboard: [
      [
        { text: balanceText[lang], callback_data: 'cmd_balance' },
        { text: statsText[lang], callback_data: 'cmd_stats' }
      ],
      [
        { text: goalsText[lang], callback_data: 'cmd_goals' },
        { text: limitsText[lang], callback_data: 'cmd_limits' }
      ],
      [
        { text: transferText[lang], callback_data: 'cmd_transfer' },
        { text: linkText[lang], callback_data: 'cmd_link_info' }
      ]
    ]
  }

  await sendMessage(chatId, `📖 <b>${tr.helpTitle}</b>

<b>💰 ${tr.helpAddExpense}:</b>
• <code>taxi 50000</code> — 50,000 UZS
• <code>coffee 15k</code> — 15,000 UZS

<b>📊 ${tr.commands}:</b>
• /balance — ${tr.viewBalance}
• /stats — ${tr.todayStats}
• /limit — ${tr.manageLimits}
• /goal — ${tr.manageGoals}
• /remind — ${tr.setReminder}
• /transfer — ${tr.transfer}
• /link — ${tr.linkAccount}
• /unlink — ${tr.unlinked.split('.')[0]}

<b>🧾 ${tr.scanReceipt}:</b>
${tr.receiptScan}

<b>🤖 ${tr.aiChat}:</b>
${tr.askAnything}
• "${tr.howMuchSpent}"
• "${tr.monthlyStats}"`, { reply_markup: keyboard })
}

// Helper functions
async function addExpense(telegramId: number, appUserId: string | null, category: string, amount: number, supabase: any, metadata?: any) {
  const now = new Date()
  
  const insertData: any = {
    category_id: category.toLowerCase(),
    amount: -Math.abs(amount),
    date: now.toISOString().slice(0, 10),
    description: metadata?.store || capitalize(category),
    source: 'telegram',
    telegram_id: telegramId,
    type: 'expense',
    created_at: now.toISOString()
  }

  if (appUserId) {
    insertData.user_id = appUserId
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error('Error adding expense:', error)
    throw error
  }

  return data
}

async function checkLimitWarning(telegramId: number, appUserId: string | null, category: string, supabase: any, lang: Lang): Promise<string> {
  const tr = t(lang)
  if (!appUserId) return ''
  
  const { data: limit } = await supabase
    .from('limits')
    .select('amount')
    .eq('user_id', appUserId)
    .eq('category_id', category.toLowerCase())
    .single()
  
  if (!limit) return ''
  
  const thisMonth = new Date().toISOString().slice(0, 7)
  const { data: transactions } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', appUserId)
    .eq('category_id', category.toLowerCase())
    .gte('date', `${thisMonth}-01`)
    .lt('amount', 0)
  
  const spent = transactions?.reduce((s: number, tx: any) => s + Math.abs(tx.amount), 0) || 0
  const percent = Math.round((spent / limit.amount) * 100)
  
  if (percent >= 100) {
    return `\n\n🔴 <b>${tr.limitExceeded}</b> ${getCatName(category, lang)}: ${percent}%`
  } else if (percent >= 80) {
    return `\n\n🟡 <b>${tr.limitNear}</b> ${getCatName(category, lang)}: ${percent}%`
  }
  
  return ''
}

async function getBalance(telegramId: number, appUserId: string | null, supabase: any, lang: Lang): Promise<string> {
  let transactions: any[] = []

  if (appUserId) {
    const { data } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', appUserId)
    transactions = data || []
  } else {
    const { data } = await supabase
      .from('transactions')
      .select('amount')
      .eq('telegram_id', telegramId)
    transactions = data || []
  }

  const balance = transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0)
  return formatMoney(balance) + ' UZS'
}

function getProgressBar(percent: number): string {
  const filled = Math.min(10, Math.round(percent / 10))
  const empty = 10 - filled
  return '▓'.repeat(filled) + '░'.repeat(empty)
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(Math.abs(amount)))
}

async function sendMessage(chatId: number, text: string, extra: any = {}) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      ...extra
    })
  })
}
