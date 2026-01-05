// Supabase Edge Function: telegram-webhook
// PATH B - Telegram Banking OS
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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Get or create user
    const { data: user } = await supabase
      .from('telegram_users')
      .select('*')
      .eq('telegram_id', userId)
      .single()

    if (!user) {
      // New user - send welcome
      await sendMessage(chatId, `👋 Welcome ${userName}!

I'm your MonEX Financial Assistant. I can help you:

💰 Track expenses: "Taxi 50000" or "Coffee 15000"
📊 Check balance: "How much left?" or "Show balance"
📈 View stats: "How much spent today?"
🎯 Set goals: "Save 10M for car"
💸 Send money: "Send 50K to Mom"
🧾 Process receipts: Send photo of receipt

Let's start! Try: "Taxi 50000"`)

      // Create user record
      await supabase.from('telegram_users').insert({
        telegram_id: userId,
        telegram_username: message.from.username,
        first_name: userName,
        created_at: new Date().toISOString()
      })

      return new Response('OK', { status: 200 })
    }

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

  // Quick expense patterns: "taxi 50000" or "coffee 15k"
  const expensePattern = /^(\w+)\s+([\d,]+)k?$/i
  const expenseMatch = text.match(expensePattern)
  
  if (expenseMatch) {
    const [_, category, amountStr] = expenseMatch
    let amount = parseFloat(amountStr.replace(/,/g, ''))
    if (text.toLowerCase().includes('k')) amount *= 1000

    await addExpense(user.telegram_id, category, amount, supabase)
    
    const balance = await getBalance(user.telegram_id, supabase)
    await sendMessage(chatId, `✅ Added: ${capitalize(category)} - ${formatMoney(amount)} UZS

📊 Updated in MonEX app
💰 New balance: ${balance}`)
    
    return
  }

  // Use AI for everything else
  await handleAIQuery(text, user, chatId, supabase)
}

async function handleAIQuery(text: string, user: any, chatId: number, supabase: any) {
  // Get user's recent transactions
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('telegram_id', user.telegram_id)
    .order('date', { ascending: false })
    .limit(20)

  const { data: balance } = await supabase
    .from('transactions')
    .select('amount')
    .eq('telegram_id', user.telegram_id)

  const totalBalance = balance?.reduce((sum, t) => sum + t.amount, 0) || 0

  // Calculate today's spending
  const today = new Date().toISOString().slice(0, 10)
  const todaySpent = transactions
    ?.filter(t => t.date === today && t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0

  // Use Gemini AI
  const aiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + GEMINI_API_KEY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `You are MonEX, a financial assistant Telegram bot. User asks: "${text}"

Context:
- Balance: ${formatMoney(totalBalance)} UZS
- Spent today: ${formatMoney(todaySpent)} UZS
- Recent transactions: ${JSON.stringify(transactions?.slice(0, 5)?.map(t => ({
  category: t.category_id,
  amount: t.amount,
  date: t.date
})), null, 2)}

Instructions:
1. Be concise (2-4 lines max)
2. Use emojis appropriately
3. Give actionable advice
4. Format money nicely with commas
5. If they ask about tracking: tell them "category amount" format
6. If they ask about balance/spending: use the data above
7. If they ask prediction: be realistic based on patterns
8. If they want to send money: explain (coming soon)

Respond in a friendly, helpful way:`
        }]
      }]
    })
  })

  const aiData = await aiResponse.json()
  const reply = aiData.candidates?.[0]?.content?.parts?.[0]?.text || 
                "I didn't understand. Try: 'Taxi 50000' or 'How much spent today?'"

  await sendMessage(chatId, reply)
}

async function handleVoiceMessage(message: TelegramMessage, user: any, supabase: any) {
  const chatId = message.chat.id
  
  // For now, tell user to use text (voice transcription needs additional API)
  await sendMessage(chatId, `🎤 Voice message received!

Voice transcription coming soon. For now, please type:
"Taxi 50000" or "Coffee 15000"`)
}

async function handlePhotoMessage(message: TelegramMessage, user: any, supabase: any) {
  const chatId = message.chat.id
  
  await sendMessage(chatId, `🧾 Receipt detected! Analyzing...`)

  // Get highest resolution photo
  const photo = message.photo![message.photo!.length - 1]
  
  // Get file
  const fileInfo = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${photo.file_id}`)
  const fileData = await fileInfo.json()
  
  if (!fileData.ok) {
    await sendMessage(chatId, '❌ Could not process image')
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
    await addExpense(user.telegram_id, 'Shopping', receiptData.total, supabase, {
      store: receiptData.store,
      items: receiptData.items
    })
    
    let itemsList = ''
    if (receiptData.items && receiptData.items.length > 0) {
      itemsList = '\n\n📋 Items:\n' + receiptData.items.slice(0, 5).map((item: any) => 
        `  • ${item.name}: ${formatMoney(item.price)}`
      ).join('\n')
      if (receiptData.items.length > 5) {
        itemsList += `\n  ... and ${receiptData.items.length - 5} more`
      }
    }
    
    await sendMessage(chatId, `✅ Receipt processed!

🏪 Store: ${receiptData.store}
💰 Total: ${formatMoney(receiptData.total)} ${receiptData.currency}
📅 Date: ${receiptData.date}${itemsList}

Added to your expenses!`)
    
  } catch (error) {
    console.error('Receipt parsing error:', error)
    await sendMessage(chatId, `🧾 Receipt detected but couldn't extract data automatically.

Please enter manually: "Shopping 50000"`)
  }
}

// Helper functions
async function addExpense(telegramId: number, category: string, amount: number, supabase: any, metadata?: any) {
  const now = new Date()
  
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      telegram_id: telegramId,
      category_id: category.toLowerCase(),
      amount: -Math.abs(amount),
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 5),
      description: metadata?.store || capitalize(category),
      metadata: metadata || {},
      source: 'telegram_bot',
      created_at: now.toISOString()
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding expense:', error)
    throw error
  }

  return data
}

async function getBalance(telegramId: number, supabase: any): Promise<string> {
  const { data: transactions } = await supabase
    .from('transactions')
    .select('amount')
    .eq('telegram_id', telegramId)

  const balance = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0
  return formatMoney(balance) + ' UZS'
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(amount))
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
