# Hamyon Backend API for Railway

This is the backend server for the Hamyon Telegram bot and Mini App.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set environment variables:
```
BOT_TOKEN=your_telegram_bot_token
WEBHOOK_URL=https://your-railway-domain.up.railway.app
PORT=3000
```

3. Start the server:
```bash
npm start
```

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Telegram Bot
- `POST /webhook` - Telegram webhook handler
- `GET /setWebhook` - Set up Telegram webhook

### Transactions
- `POST /api/transaction` - Add transaction
- `GET /api/transactions/:userId` - Get user transactions
- `DELETE /api/transaction/:id` - Delete transaction

### User
- `GET /api/user/:telegramId` - Get user data
- `POST /api/user` - Create/update user

## Deployment to Railway

1. Push this code to a GitHub repository
2. Connect Railway to your repository
3. Add environment variables in Railway dashboard
4. Deploy!
