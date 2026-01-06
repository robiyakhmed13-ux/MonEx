// Supabase Edge Function: telegram-webhook
// Handles Telegram bot messages and /link command for account linking
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!

interface TelegramMessage {
  message_id: number
  from: {
    id: number
    first_name: string
    username?: string
  }
  chat: {
    id: number
    type: string
  }
  text?: string
  voice?: {
    file_id: string
    duration: number
  }
  photo?: Array<{
    file_id: string
    file_size: number
  }>
}

interface Update {
  update_id: number
  message?: TelegramMessage
  callback_query?: any
}

serve(async (req) => {
  try {
    const update: Update = await req.json()
    
    if (!update.message) {
      return new Response('OK', { status: 200 })
    }

    const message = update.message
    const chatId = message.chat.id
    const userId = message.from.id
    const userName = message.from.first_name
    const username = message.from.username

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Get or create user
    let { data: user } = await supabase
      .from('telegram_users')
      .select('*')
      .eq('telegram_id', userId)
      .single()

    if (!user) {
      // New user - create record and send welcome
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

      await sendMessage(chatId, `👋 Salom ${userName}!

Men sizning MonEX Moliyaviy Yordamchingizman. Men sizga yordam bera olaman:

💰 Xarajatlarni kuzatish: "Taxi 50000" yoki "Qahva 15000"
📊 Balansni tekshirish: "Qancha qoldi?" yoki "Balansni ko'rsat"
📈 Statistika: "Bugun qancha sarfladim?"
🎯 Maqsadlar: "Mashina uchun 10M tejash"
🧾 Cheklar: Chek rasmini yuboring

🔗 Hisobni ulash: /link KODINGIZ

Boshlaylik! Yozing: "Taxi 50000"`)

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

async function handleTextMessage(message: TelegramMessage, user: any, supabase: any) {
  const text = message.text!.trim()
  const chatId = message.chat.id
  const telegramId = message.from.id
  const username = message.from.username

  // Handle /start command
  if (text === '/start') {
    await sendMessage(chatId, `👋 Xush kelibsiz, ${message.from.first_name}!

🔗 Hisobingizni MonEX ilovasiga ulash uchun:
1. Ilovada Sozlamalar → Telegram Bot → Kodni olish
2. Bu yerga: /link KODINGIZ

Yoki shunchaki xarajatlarni yozing:
💰 "Taxi 50000" yoki "Qahva 15k"`)
    return
  }

  // Handle /link command - Link Telegram to MonEX account
  if (text.startsWith('/link')) {
    const code = text.split(' ')[1]?.trim().toUpperCase()
    
    if (!code) {
      await sendMessage(chatId, `🔗 Hisobni ulash uchun:

1. MonEX ilovasini oching
2. Sozlamalar → Telegram Bot → "Kodni olish"
3. Kodni oling va yuboring: /link KODINGIZ

Misol: /link ABC123`)
      return
    }

    console.log(`Link attempt: code=${code}, telegram_id=${telegramId}`)

    // Find user with this linking code
    const { data: linkUser, error: findError } = await supabase
      .from('telegram_users')
      .select('user_id, code_expires_at')
      .eq('linking_code', code)
      .single()

    if (findError || !linkUser) {
      console.log('Link code not found:', findError)
      await sendMessage(chatId, `❌ Kod topilmadi yoki muddati o'tgan.

Iltimos, yangi kod oling:
Sozlamalar → Telegram Bot → "Kodni olish"`)
      return
    }

    // Check if code expired
    const expiresAt = new Date(linkUser.code_expires_at)
    if (expiresAt < new Date()) {
      await sendMessage(chatId, `⏰ Kod muddati tugagan.

Iltimos, yangi kod oling:
Sozlamalar → Telegram Bot → "Kodni olish"`)
      return
    }

    const appUserId = linkUser.user_id

    // Call the link function
    const { data: linkResult, error: linkError } = await supabase.rpc('link_telegram_account', {
      p_user_id: appUserId,
      p_telegram_id: telegramId,
      p_telegram_username: username || null
    })

    if (linkError || !linkResult) {
      console.error('Link error:', linkError)
      await sendMessage(chatId, `❌ Ulashda xatolik yuz berdi. Qaytadan urinib ko'ring.`)
      return
    }

    // Clear the linking code
    await supabase
      .from('telegram_users')
      .update({ linking_code: null, code_expires_at: null })
      .eq('user_id', appUserId)

    await sendMessage(chatId, `✅ Muvaffaqiyatli ulandi!

Endi siz:
• Telegram orqali xarajat qo'shsangiz - ilovada ko'rinadi
• Ilovada qo'shsangiz - Telegramda xabar olasiz

💡 Sinab ko'ring: "Taxi 50000"`)
    return
  }

  // Handle /unlink command
  if (text === '/unlink') {
    if (!user.user_id) {
      await sendMessage(chatId, `ℹ️ Sizning hisobingiz hali ulanmagan.

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
    return
  }

  // Handle /balance command
  if (text === '/balance' || text === '/balans') {
    const balance = await getBalance(telegramId, user.user_id, supabase)
    await sendMessage(chatId, `💰 Sizning balansingiz: ${balance}`)
    return
  }

  // Handle /help command
  if (text === '/help' || text === '/yordam') {
    await sendMessage(chatId, `📖 MonEX Bot yordam

💰 Xarajat qo'shish:
• "Taxi 50000" - Taxi uchun 50,000 so'm
• "Qahva 15k" - Qahva uchun 15,000 so'm

📊 Buyruqlar:
• /balance - Balansni ko'rish
• /link KODINGIZ - Hisobni ulash
• /unlink - Hisobni uzish
• /help - Yordam

🧾 Chek yuborish:
• Chek rasmini yuboring - avtomatik taniladi

🎯 AI bilan suhbat:
• "Bugun qancha sarfladim?"
• "Oylik statistika"`)
    return
  }

  // Quick expense patterns: "taxi 50000" or "coffee 15k"
  const expensePattern = /^(\w+)\s+([\d,]+)k?$/i
  const expenseMatch = text.match(expensePattern)
  
  if (expenseMatch) {
    const [_, category, amountStr] = expenseMatch
    let amount = parseFloat(amountStr.replace(/,/g, ''))
    if (text.toLowerCase().includes('k')) amount *= 1000

    await addExpense(telegramId, user.user_id, category, amount, supabase)
    
    const balance = await getBalance(telegramId, user.user_id, supabase)
    
    const linkedMsg = user.user_id ? '\n📱 MonEX ilovasida yangilandi' : ''
    await sendMessage(chatId, `✅ Qo'shildi: ${capitalize(category)} - ${formatMoney(amount)} UZS${linkedMsg}
💰 Balans: ${balance}`)
    
    return
  }

  // Use AI for everything else
  await handleAIQuery(text, user, chatId, supabase)
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

  // Calculate today's spending
  const today = new Date().toISOString().slice(0, 10)
  const todaySpent = transactions
    .filter(t => t.date === today && t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  // Use Gemini AI
  const aiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + GEMINI_API_KEY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `You are MonEX, a financial assistant Telegram bot for Uzbek users. User asks: "${text}"

Context:
- Balance: ${formatMoney(totalBalance)} UZS
- Spent today: ${formatMoney(todaySpent)} UZS
- Recent transactions: ${JSON.stringify(transactions.slice(0, 5).map(t => ({
  category: t.category_id,
  amount: t.amount,
  date: t.date
})), null, 2)}

Instructions:
1. Be concise (2-4 lines max)
2. Use emojis appropriately
3. Respond in Uzbek or Russian based on user's language
4. Format money nicely with commas
5. If they ask about tracking: tell them "category amount" format
6. If they ask about balance/spending: use the data above
7. If about linking: explain /link KODINGIZ

Respond helpfully:`
        }]
      }]
    })
  })

  const aiData = await aiResponse.json()
  const reply = aiData.candidates?.[0]?.content?.parts?.[0]?.text || 
                "Tushunmadim. Sinab ko'ring: 'Taxi 50000' yoki 'Bugun qancha sarfladim?'"

  await sendMessage(chatId, reply)
}

async function handleVoiceMessage(message: TelegramMessage, user: any, supabase: any) {
  const chatId = message.chat.id
  
  await sendMessage(chatId, `🎤 Ovozli xabar qabul qilindi!

Hozircha matn yozing:
"Taxi 50000" yoki "Qahva 15000"`)
}

async function handlePhotoMessage(message: TelegramMessage, user: any, supabase: any) {
  const chatId = message.chat.id
  const telegramId = user.telegram_id
  
  await sendMessage(chatId, `🧾 Chek aniqlandi! Tahlil qilinmoqda...`)

  // Get highest resolution photo
  const photo = message.photo![message.photo!.length - 1]
  
  // Get file
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

  // Use Gemini Vision
  const visionResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=' + GEMINI_API_KEY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          {
            text: `Extract receipt data. Return ONLY valid JSON (no markdown, no backticks):
{
  "store": "store name",
  "total": number,
  "date": "YYYY-MM-DD",
  "items": [{"name": "item", "price": number}],
  "currency": "UZS"
}`
          },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: base64Image
            }
          }
        ]
      }]
    })
  })

  const visionData = await visionResponse.json()
  const extractedText = visionData.candidates?.[0]?.content?.parts?.[0]?.text || ''
  
  try {
    // Clean and parse JSON
    const cleaned = extractedText.replace(/```json|```/g, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    
    if (!jsonMatch) throw new Error('No JSON found')
    
    const receiptData = JSON.parse(jsonMatch[0])
    
    // Add as transaction
    await addExpense(telegramId, user.user_id, 'Shopping', receiptData.total, supabase, {
      store: receiptData.store,
      items: receiptData.items
    })
    
    let itemsList = ''
    if (receiptData.items && receiptData.items.length > 0) {
      itemsList = '\n\n📋 Mahsulotlar:\n' + receiptData.items.slice(0, 5).map((item: any) => 
        `  • ${item.name}: ${formatMoney(item.price)}`
      ).join('\n')
      if (receiptData.items.length > 5) {
        itemsList += `\n  ... va yana ${receiptData.items.length - 5} ta`
      }
    }
    
    await sendMessage(chatId, `✅ Chek qayta ishlandi!

🏪 Do'kon: ${receiptData.store}
💰 Jami: ${formatMoney(receiptData.total)} ${receiptData.currency}
📅 Sana: ${receiptData.date}${itemsList}

Xarajatlarga qo'shildi!`)
    
  } catch (error) {
    console.error('Receipt parsing error:', error)
    await sendMessage(chatId, `🧾 Chek aniqlandi, lekin avtomatik o'qib bo'lmadi.

Qo'lda kiriting: "Xarid 50000"`)
  }
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

  // If user is linked, add to their account
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