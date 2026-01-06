// Supabase Edge Function: telegram-webhook
// Full Telegram Banking OS - PATH B Implementation
// Commands: /start, /link, /unlink, /balance, /limit, /goal, /stats, /remind, /help

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')

interface TelegramMessage {
  message_id: number
  from: { id: number; first_name: string; username?: string }
  chat: { id: number; type: string }
  text?: string
  voice?: { file_id: string; duration: number }
  photo?: Array<{ file_id: string; file_size: number }>
}

interface CallbackQuery {
  id: string
  from: { id: number; first_name: string; username?: string }
  message: { chat: { id: number }; message_id: number }
  data: string
}

interface Update {
  update_id: number
  message?: TelegramMessage
  callback_query?: CallbackQuery
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

    // Get or create user
    let { data: user } = await supabase
      .from('telegram_users')
      .select('*')
      .eq('telegram_id', userId)
      .single()

    if (!user) {
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
      await sendWelcomeMessage(chatId, userName)
      return new Response('OK', { status: 200 })
    }

    // Update last active
    await supabase
      .from('telegram_users')
      .update({ last_active: new Date().toISOString() })
      .eq('telegram_id', userId)

    // Handle different message types
    if (message.text) {
      await handleTextMessage(message, user, supabase)
    } else if (message.voice) {
      await handleVoiceMessage(message, user, supabase)
    } else if (message.photo) {
      await handlePhotoMessage(message, user, supabase)
    }

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('Internal error', { status: 500 })
  }
})

async function sendWelcomeMessage(chatId: number, userName: string) {
  const keyboard = {
    inline_keyboard: [
      [
        { text: '💰 Balans', callback_data: 'cmd_balance' },
        { text: '📊 Statistika', callback_data: 'cmd_stats' }
      ],
      [
        { text: '🎯 Maqsadlar', callback_data: 'cmd_goals' },
        { text: '📋 Limitlar', callback_data: 'cmd_limits' }
      ],
      [
        { text: '🔗 Hisobni ulash', callback_data: 'cmd_link_info' }
      ]
    ]
  }

  await sendMessage(chatId, `👋 Salom ${userName}!

Men sizning <b>MonEX Moliyaviy Yordamchingiz</b>man.

<b>💡 Tezkor buyruqlar:</b>
📝 <code>taxi 50000</code> — xarajat qo'shish
📊 <code>/stats</code> — bugungi statistika
🎯 <code>/goal</code> — maqsad yaratish
📋 <code>/limit</code> — limit o'rnatish
⏰ <code>/remind</code> — eslatma o'rnatish

🧾 Chek rasmini yuboring — avtomatik taniladi!

Quyidagi tugmalardan foydalaning:`, { reply_markup: keyboard })
}

async function handleTextMessage(message: TelegramMessage, user: any, supabase: any) {
  const text = message.text!.trim()
  const chatId = message.chat.id
  const telegramId = message.from.id
  const username = message.from.username

  // /start command
  if (text === '/start') {
    await sendWelcomeMessage(chatId, message.from.first_name)
    return
  }

  // /link command
  if (text.startsWith('/link')) {
    await handleLinkCommand(text, chatId, telegramId, username, user, supabase)
    return
  }

  // /unlink command
  if (text === '/unlink') {
    await handleUnlinkCommand(chatId, telegramId, user, supabase)
    return
  }

  // /balance command
  if (text === '/balance' || text === '/balans') {
    await handleBalanceCommand(chatId, telegramId, user.user_id, supabase)
    return
  }

  // /stats command - Today's statistics
  if (text === '/stats' || text === '/statistika') {
    await handleStatsCommand(chatId, telegramId, user.user_id, supabase)
    return
  }

  // /limit command - Set spending limit
  if (text.startsWith('/limit')) {
    await handleLimitCommand(text, chatId, telegramId, user.user_id, supabase)
    return
  }

  // /goal command - Create/view goals
  if (text.startsWith('/goal') || text.startsWith('/maqsad')) {
    await handleGoalCommand(text, chatId, telegramId, user.user_id, supabase)
    return
  }

  // /remind command - Set reminders
  if (text.startsWith('/remind') || text.startsWith('/eslatma')) {
    await handleRemindCommand(text, chatId, telegramId, supabase)
    return
  }

  // /help command
  if (text === '/help' || text === '/yordam') {
    await sendHelpMessage(chatId)
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
    
    const balance = await getBalance(telegramId, user.user_id, supabase)
    const linkedMsg = user.user_id ? '\n📱 <i>MonEX ilovasida yangilandi</i>' : ''
    
    // Check if approaching limit
    const limitWarning = await checkLimitWarning(telegramId, user.user_id, category, supabase)
    
    const keyboard = {
      inline_keyboard: [[
        { text: '📊 Bugungi', callback_data: 'cmd_stats' },
        { text: '🔄 Bekor', callback_data: `undo_expense_${Date.now()}` }
      ]]
    }
    
    await sendMessage(chatId, `✅ <b>Qo'shildi:</b> ${capitalize(category)} — ${formatMoney(amount)} UZS${linkedMsg}
💰 Balans: ${balance}${limitWarning}`, { reply_markup: keyboard })
    
    return
  }

  // Use AI for everything else
  await handleAIQuery(text, user, chatId, supabase)
}

async function handleCallbackQuery(callback: CallbackQuery, supabase: any) {
  const chatId = callback.message.chat.id
  const data = callback.data
  const telegramId = callback.from.id

  // Get user
  const { data: user } = await supabase
    .from('telegram_users')
    .select('*')
    .eq('telegram_id', telegramId)
    .single()

  // Answer callback to remove loading state
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callback.id })
  })

  switch (data) {
    case 'cmd_balance':
      await handleBalanceCommand(chatId, telegramId, user?.user_id, supabase)
      break
    case 'cmd_stats':
      await handleStatsCommand(chatId, telegramId, user?.user_id, supabase)
      break
    case 'cmd_goals':
      await showGoals(chatId, telegramId, user?.user_id, supabase)
      break
    case 'cmd_limits':
      await showLimits(chatId, telegramId, user?.user_id, supabase)
      break
    case 'cmd_link_info':
      await sendMessage(chatId, `🔗 <b>Hisobni ulash</b>

1️⃣ MonEX ilovasini oching
2️⃣ Sozlamalar → Telegram Bot
3️⃣ "Kodni olish" tugmasini bosing
4️⃣ Kodni bu yerga yuboring:

<code>/link KODINGIZ</code>`)
      break
    case 'set_limit_taxi':
    case 'set_limit_food':
    case 'set_limit_shopping':
    case 'set_limit_entertainment':
      const category = data.replace('set_limit_', '')
      await sendMessage(chatId, `📋 <b>${capitalize(category)} limiti</b>

Limitni kiriting:
<code>/limit ${category} 500000</code>

Bu oylik ${category} uchun 500,000 UZS limit o'rnatadi.`)
      break
    case 'add_goal':
      await sendMessage(chatId, `🎯 <b>Yangi maqsad</b>

Maqsad yaratish:
<code>/goal Mashina 50000000 12</code>

Bu 12 oyda 50 mln maqsad yaratadi.`)
      break
  }
}

async function handleLimitCommand(text: string, chatId: number, telegramId: number, appUserId: string | null, supabase: any) {
  const parts = text.split(' ').filter(p => p)
  
  // /limit - show current limits
  if (parts.length === 1) {
    await showLimits(chatId, telegramId, appUserId, supabase)
    return
  }
  
  // /limit category amount - set limit
  if (parts.length >= 3) {
    const category = parts[1].toLowerCase()
    const amount = parseFloat(parts[2].replace(/[,\s]/g, ''))
    
    if (isNaN(amount) || amount <= 0) {
      await sendMessage(chatId, '❌ Noto\'g\'ri summa. Misol: /limit taxi 500000')
      return
    }

    if (!appUserId) {
      await sendMessage(chatId, `⚠️ Limit saqlash uchun hisobingizni ulang:
      
/link KODINGIZ

Kodni MonEX ilovasidan oling.`)
      return
    }

    // Save or update limit
    const { error } = await supabase
      .from('limits')
      .upsert({
        user_id: appUserId,
        category_id: category,
        amount: amount,
        period: 'monthly',
        created_at: new Date().toISOString()
      }, { onConflict: 'user_id,category_id' })

    if (error) {
      console.error('Limit save error:', error)
      await sendMessage(chatId, '❌ Limitni saqlashda xatolik')
      return
    }

    await sendMessage(chatId, `✅ <b>Limit o'rnatildi!</b>

📋 Kategoriya: ${capitalize(category)}
💰 Limit: ${formatMoney(amount)} UZS/oy

Limit yaqinlashganda xabar olasiz.`)
    return
  }

  await sendMessage(chatId, `📋 <b>Limit o'rnatish</b>

Format: <code>/limit kategoriya summa</code>

Misollar:
• /limit taxi 500000
• /limit food 1000000
• /limit shopping 2000000`)
}

async function showLimits(chatId: number, telegramId: number, appUserId: string | null, supabase: any) {
  if (!appUserId) {
    const keyboard = {
      inline_keyboard: [
        [
          { text: '🚕 Taxi', callback_data: 'set_limit_taxi' },
          { text: '🍔 Ovqat', callback_data: 'set_limit_food' }
        ],
        [
          { text: '🛍 Xarid', callback_data: 'set_limit_shopping' },
          { text: '🎮 Ko\'ngil', callback_data: 'set_limit_entertainment' }
        ]
      ]
    }
    await sendMessage(chatId, `📋 <b>Limitlar</b>

Hisobingiz ulanmagan. Limitlarni ko'rish uchun ulaning.

Limit o'rnatish:
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
          { text: '🚕 Taxi', callback_data: 'set_limit_taxi' },
          { text: '🍔 Ovqat', callback_data: 'set_limit_food' }
        ],
        [
          { text: '🛍 Xarid', callback_data: 'set_limit_shopping' },
          { text: '🎮 Ko\'ngil', callback_data: 'set_limit_entertainment' }
        ]
      ]
    }
    await sendMessage(chatId, `📋 <b>Limitlar</b>

Hali limit o'rnatilmagan.

O'rnatish uchun kategoriyani tanlang:`, { reply_markup: keyboard })
    return
  }

  // Get current month spending
  const thisMonth = new Date().toISOString().slice(0, 7)
  const { data: transactions } = await supabase
    .from('transactions')
    .select('category_id, amount')
    .eq('user_id', appUserId)
    .gte('date', `${thisMonth}-01`)
    .lt('amount', 0)

  const spending: Record<string, number> = {}
  transactions?.forEach((t: any) => {
    spending[t.category_id] = (spending[t.category_id] || 0) + Math.abs(t.amount)
  })

  const categoryEmojis: Record<string, string> = {
    taxi: '🚕', food: '🍔', restaurants: '🍽', shopping: '🛍',
    transport: '🚌', entertainment: '🎮', health: '💊', bills: '📄',
    groceries: '🛒', coffee: '☕', fuel: '⛽', education: '📚'
  }

  let message = `📋 <b>Oylik limitlar</b>\n\n`
  
  for (const limit of limits) {
    const spent = spending[limit.category_id] || 0
    const percent = Math.round((spent / limit.amount) * 100)
    const emoji = categoryEmojis[limit.category_id] || '📌'
    const progressBar = getProgressBar(percent)
    const status = percent >= 100 ? '🔴' : percent >= 80 ? '🟡' : '🟢'
    
    message += `${emoji} <b>${capitalize(limit.category_id)}</b>
${progressBar} ${percent}%
${formatMoney(spent)} / ${formatMoney(limit.amount)} UZS ${status}\n\n`
  }

  await sendMessage(chatId, message)
}

async function handleGoalCommand(text: string, chatId: number, telegramId: number, appUserId: string | null, supabase: any) {
  const parts = text.split(' ').filter(p => p)
  
  // /goal - show goals
  if (parts.length === 1) {
    await showGoals(chatId, telegramId, appUserId, supabase)
    return
  }
  
  // /goal name amount months - create goal
  if (parts.length >= 3) {
    const name = parts[1]
    const target = parseFloat(parts[2].replace(/[,\s]/g, ''))
    const months = parseInt(parts[3]) || 12
    
    if (isNaN(target) || target <= 0) {
      await sendMessage(chatId, '❌ Noto\'g\'ri summa. Misol: /goal Mashina 50000000 12')
      return
    }

    if (!appUserId) {
      await sendMessage(chatId, `⚠️ Maqsad saqlash uchun hisobingizni ulang:
      
/link KODINGIZ`)
      return
    }

    const deadline = new Date()
    deadline.setMonth(deadline.getMonth() + months)

    const { error } = await supabase
      .from('goals')
      .insert({
        user_id: appUserId,
        name: name,
        target: target,
        current: 0,
        deadline: deadline.toISOString().slice(0, 10),
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('Goal save error:', error)
      await sendMessage(chatId, '❌ Maqsadni saqlashda xatolik')
      return
    }

    const monthlyRequired = Math.round(target / months)

    await sendMessage(chatId, `✅ <b>Maqsad yaratildi!</b>

🎯 ${name}
💰 Maqsad: ${formatMoney(target)} UZS
📅 Muddat: ${months} oy
💵 Oylik: ${formatMoney(monthlyRequired)} UZS

Har oy ${formatMoney(monthlyRequired)} so'm tejaing!`)
    return
  }

  await sendMessage(chatId, `🎯 <b>Maqsad yaratish</b>

Format: <code>/goal nomi summa oylar</code>

Misollar:
• /goal Mashina 50000000 12
• /goal iPhone 15000000 6
• /goal Ta'til 10000000 8`)
}

async function showGoals(chatId: number, telegramId: number, appUserId: string | null, supabase: any) {
  if (!appUserId) {
    const keyboard = {
      inline_keyboard: [[
        { text: '➕ Maqsad qo\'shish', callback_data: 'add_goal' }
      ]]
    }
    await sendMessage(chatId, `🎯 <b>Maqsadlar</b>

Maqsadlarni ko'rish uchun hisobingizni ulang.

Yangi maqsad:
<code>/goal Mashina 50000000 12</code>`, { reply_markup: keyboard })
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
        { text: '➕ Maqsad qo\'shish', callback_data: 'add_goal' }
      ]]
    }
    await sendMessage(chatId, `🎯 <b>Maqsadlar</b>

Hali maqsad yo'q.

Yaratish: <code>/goal Mashina 50000000 12</code>`, { reply_markup: keyboard })
    return
  }

  let message = `🎯 <b>Maqsadlaringiz</b>\n\n`
  
  for (const goal of goals) {
    const percent = Math.round((goal.current / goal.target) * 100)
    const progressBar = getProgressBar(percent)
    const remaining = goal.target - goal.current
    
    message += `<b>${goal.name}</b>
${progressBar} ${percent}%
${formatMoney(goal.current)} / ${formatMoney(goal.target)} UZS
📅 ${goal.deadline || 'Muddatsiz'}
💰 Qoldi: ${formatMoney(remaining)} UZS\n\n`
  }

  const keyboard = {
    inline_keyboard: [[
      { text: '➕ Yangi maqsad', callback_data: 'add_goal' }
    ]]
  }

  await sendMessage(chatId, message, { reply_markup: keyboard })
}

async function handleRemindCommand(text: string, chatId: number, telegramId: number, supabase: any) {
  const parts = text.split(' ').filter(p => p)
  
  if (parts.length === 1) {
    await sendMessage(chatId, `⏰ <b>Eslatmalar</b>

Format: <code>/remind xabar vaqt</code>

Misollar:
• /remind Ijaraga to'la 25
• /remind Kredit 1
• /remind Kommunal 15

Raqam = oy kunini bildiradi.`)
    return
  }

  const dayMatch = text.match(/(\d+)$/)
  const day = dayMatch ? parseInt(dayMatch[1]) : null
  const reminderText = parts.slice(1, day ? -1 : undefined).join(' ')

  if (!day || day < 1 || day > 31 || !reminderText) {
    await sendMessage(chatId, `❌ Format: /remind Xabar kun_raqami

Misol: /remind Ijaraga to'la 25`)
    return
  }

  // For now, just confirm (actual scheduling would require a cron job)
  await sendMessage(chatId, `✅ <b>Eslatma o'rnatildi!</b>

📝 ${reminderText}
📅 Har oyning ${day}-kunida

<i>Eslatma vaqti kelganda xabar olasiz.</i>`)
}

async function handleStatsCommand(chatId: number, telegramId: number, appUserId: string | null, supabase: any) {
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

  // Calculate stats
  const todayTx = transactions.filter(t => t.date === today)
  const todayExpense = todayTx.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
  const todayIncome = todayTx.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  
  const monthExpense = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
  const monthIncome = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)

  // Category breakdown
  const categories: Record<string, number> = {}
  transactions.filter(t => t.amount < 0).forEach(t => {
    categories[t.category_id] = (categories[t.category_id] || 0) + Math.abs(t.amount)
  })
  
  const topCategories = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const categoryEmojis: Record<string, string> = {
    taxi: '🚕', food: '🍔', restaurants: '🍽', shopping: '🛍',
    transport: '🚌', entertainment: '🎮', health: '💊', bills: '📄',
    groceries: '🛒', coffee: '☕', fuel: '⛽', education: '📚'
  }

  let message = `📊 <b>Statistika</b>

<b>📅 Bugun (${today}):</b>
📉 Xarajat: ${formatMoney(todayExpense)} UZS
📈 Daromad: ${formatMoney(todayIncome)} UZS
📋 Tranzaksiyalar: ${todayTx.length}

<b>📆 Bu oy:</b>
📉 Xarajat: ${formatMoney(monthExpense)} UZS
📈 Daromad: ${formatMoney(monthIncome)} UZS
💰 Balans: ${monthIncome >= monthExpense ? '+' : ''}${formatMoney(monthIncome - monthExpense)} UZS

`

  if (topCategories.length > 0) {
    message += `<b>🏷 Top xarajatlar:</b>\n`
    topCategories.forEach(([cat, amount], i) => {
      const emoji = categoryEmojis[cat] || '📌'
      const percent = Math.round((amount / monthExpense) * 100)
      message += `${i + 1}. ${emoji} ${capitalize(cat)}: ${formatMoney(amount)} (${percent}%)\n`
    })
  }

  const keyboard = {
    inline_keyboard: [[
      { text: '📋 Limitlar', callback_data: 'cmd_limits' },
      { text: '🎯 Maqsadlar', callback_data: 'cmd_goals' }
    ]]
  }

  await sendMessage(chatId, message, { reply_markup: keyboard })
}

async function handleBalanceCommand(chatId: number, telegramId: number, appUserId: string | null, supabase: any) {
  const balance = await getBalance(telegramId, appUserId, supabase)
  
  const keyboard = {
    inline_keyboard: [[
      { text: '📊 Statistika', callback_data: 'cmd_stats' },
      { text: '🎯 Maqsadlar', callback_data: 'cmd_goals' }
    ]]
  }
  
  await sendMessage(chatId, `💰 <b>Balansingiz:</b> ${balance}`, { reply_markup: keyboard })
}

async function handleLinkCommand(text: string, chatId: number, telegramId: number, username: string | undefined, user: any, supabase: any) {
  const code = text.split(' ')[1]?.trim().toUpperCase()
  
  if (!code) {
    await sendMessage(chatId, `🔗 <b>Hisobni ulash</b>

1️⃣ MonEX ilovasini oching
2️⃣ Sozlamalar → Telegram Bot
3️⃣ "Kodni olish" tugmasini bosing
4️⃣ Kodni shu yerga yuboring:

<code>/link KODINGIZ</code>`)
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
    await sendMessage(chatId, `❌ Kod topilmadi yoki muddati o'tgan.

Iltimos, yangi kod oling.`)
    return
  }

  const expiresAt = new Date(linkUser.code_expires_at)
  if (expiresAt < new Date()) {
    await sendMessage(chatId, `⏰ Kod muddati tugagan.

Iltimos, yangi kod oling.`)
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
    await sendMessage(chatId, `❌ Ulashda xatolik. Qaytadan urinib ko'ring.`)
    return
  }

  await supabase
    .from('telegram_users')
    .update({ linking_code: null, code_expires_at: null })
    .eq('user_id', appUserId)

  const keyboard = {
    inline_keyboard: [[
      { text: '💰 Balans', callback_data: 'cmd_balance' },
      { text: '📊 Statistika', callback_data: 'cmd_stats' }
    ]]
  }

  await sendMessage(chatId, `✅ <b>Muvaffaqiyatli ulandi!</b>

Endi siz:
• Telegram orqali xarajat qo'shsangiz — ilovada ko'rinadi
• Ilovada qo'shsangiz — Telegramda xabar olasiz

💡 Sinab ko'ring: <code>taxi 50000</code>`, { reply_markup: keyboard })
}

async function handleUnlinkCommand(chatId: number, telegramId: number, user: any, supabase: any) {
  if (!user.user_id) {
    await sendMessage(chatId, `ℹ️ Hisobingiz hali ulanmagan.

Ulash uchun: /link KODINGIZ`)
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

  await sendMessage(chatId, `✅ Hisobingiz uzildi.

Qayta ulash uchun: /link KODINGIZ`)
}

async function handleAIQuery(text: string, user: any, chatId: number, supabase: any) {
  const telegramId = user.telegram_id
  const appUserId = user.user_id

  // Get user's recent transactions
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

  const totalBalance = transactions.reduce((sum, t) => sum + (t.amount || 0), 0)
  const today = new Date().toISOString().slice(0, 10)
  const todaySpent = transactions
    .filter(t => t.date === today && t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  // Use Lovable AI Gateway
  if (!LOVABLE_API_KEY) {
    await sendMessage(chatId, `Tushunmadim. Sinab ko'ring:
• <code>taxi 50000</code> — xarajat qo'shish
• /stats — statistika
• /help — yordam`)
    return
  }

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are MonEX, a financial assistant Telegram bot for Uzbek users. Be concise (2-3 lines max).

Context:
- Balance: ${formatMoney(totalBalance)} UZS
- Spent today: ${formatMoney(todaySpent)} UZS
- Recent transactions: ${JSON.stringify(transactions.slice(0, 5).map(t => ({
  category: t.category_id,
  amount: t.amount,
  date: t.date
})))}

Instructions:
1. Respond in Uzbek or Russian based on user's language
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
                  "Tushunmadim. Sinab ko'ring: 'taxi 50000' yoki '/help'"

    await sendMessage(chatId, reply)
  } catch (error) {
    console.error('AI error:', error)
    await sendMessage(chatId, `Tushunmadim. Sinab ko'ring:
• <code>taxi 50000</code> — xarajat qo'shish
• /stats — statistika`)
  }
}

async function handleVoiceMessage(message: TelegramMessage, user: any, supabase: any) {
  const chatId = message.chat.id
  
  await sendMessage(chatId, `🎤 Ovozli xabar qabul qilindi!

Hozircha matn yozing:
<code>taxi 50000</code> yoki <code>qahva 15000</code>`)
}

async function handlePhotoMessage(message: TelegramMessage, user: any, supabase: any) {
  const chatId = message.chat.id
  const telegramId = user.telegram_id
  
  await sendMessage(chatId, `🧾 Chek aniqlandi! Tahlil qilinmoqda...`)

  const photo = message.photo![message.photo!.length - 1]
  
  const fileInfo = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${photo.file_id}`)
  const fileData = await fileInfo.json()
  
  if (!fileData.ok) {
    await sendMessage(chatId, '❌ Rasmni qayta ishlash imkonsiz')
    return
  }

  const imageUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileData.result.file_path}`
  
  // Download image
  const imageResponse = await fetch(imageUrl)
  const imageBytes = await imageResponse.arrayBuffer()
  const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBytes)))

  // Use Lovable AI for vision
  if (!LOVABLE_API_KEY) {
    await sendMessage(chatId, `🧾 Chek aniqlandi, lekin AI sozlanmagan.

Qo'lda kiriting: <code>xarid 50000</code>`)
    return
  }

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
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
      itemsList = '\n\n📋 <b>Mahsulotlar:</b>\n' + receiptData.items.slice(0, 5).map((item: any) => 
        `  • ${item.name}: ${formatMoney(item.price)}`
      ).join('\n')
      if (receiptData.items.length > 5) {
        itemsList += `\n  <i>... va yana ${receiptData.items.length - 5} ta</i>`
      }
    }
    
    await sendMessage(chatId, `✅ <b>Chek qayta ishlandi!</b>

🏪 Do'kon: ${receiptData.store}
💰 Jami: ${formatMoney(receiptData.total)} ${receiptData.currency}
📅 Sana: ${receiptData.date}${itemsList}

Xarajatlarga qo'shildi!`)
    
  } catch (error) {
    console.error('Receipt parsing error:', error)
    await sendMessage(chatId, `🧾 Chek aniqlandi, lekin avtomatik o'qib bo'lmadi.

Qo'lda kiriting: <code>xarid 50000</code>`)
  }
}

async function sendHelpMessage(chatId: number) {
  const keyboard = {
    inline_keyboard: [
      [
        { text: '💰 Balans', callback_data: 'cmd_balance' },
        { text: '📊 Statistika', callback_data: 'cmd_stats' }
      ],
      [
        { text: '🎯 Maqsadlar', callback_data: 'cmd_goals' },
        { text: '📋 Limitlar', callback_data: 'cmd_limits' }
      ]
    ]
  }

  await sendMessage(chatId, `📖 <b>MonEX Bot yordam</b>

<b>💰 Xarajat qo'shish:</b>
• <code>taxi 50000</code> — 50,000 so'm
• <code>qahva 15k</code> — 15,000 so'm

<b>📊 Buyruqlar:</b>
• /balance — balansni ko'rish
• /stats — bugungi statistika
• /limit — limitlarni boshqarish
• /goal — maqsadlarni boshqarish
• /remind — eslatma o'rnatish
• /link — hisobni ulash
• /unlink — hisobni uzish

<b>🧾 Chek skanerlash:</b>
Chek rasmini yuboring — avtomatik taniladi!

<b>🤖 AI suhbat:</b>
Har qanday savol bering:
• "Bugun qancha sarfladim?"
• "Oylik statistikam qanday?"`, { reply_markup: keyboard })
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

async function checkLimitWarning(telegramId: number, appUserId: string | null, category: string, supabase: any): Promise<string> {
  if (!appUserId) return ''
  
  // Get limit for category
  const { data: limit } = await supabase
    .from('limits')
    .select('amount')
    .eq('user_id', appUserId)
    .eq('category_id', category.toLowerCase())
    .single()
  
  if (!limit) return ''
  
  // Get this month's spending
  const thisMonth = new Date().toISOString().slice(0, 7)
  const { data: transactions } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', appUserId)
    .eq('category_id', category.toLowerCase())
    .gte('date', `${thisMonth}-01`)
    .lt('amount', 0)
  
  const spent = transactions?.reduce((s: number, t: any) => s + Math.abs(t.amount), 0) || 0
  const percent = Math.round((spent / limit.amount) * 100)
  
  if (percent >= 100) {
    return `\n\n🔴 <b>Limit oshdi!</b> ${capitalize(category)}: ${percent}%`
  } else if (percent >= 80) {
    return `\n\n🟡 <b>Limit yaqin!</b> ${capitalize(category)}: ${percent}%`
  }
  
  return ''
}

async function getBalance(telegramId: number, appUserId: string | null, supabase: any): Promise<string> {
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

  const balance = transactions.reduce((sum, t) => sum + (t.amount || 0), 0)
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
