# Quick Start Guide

## Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] Neon PostgreSQL database created
- [ ] LINE Messaging API channel created
- [ ] Slip verification API credentials
- [ ] Cloudflare R2 bucket (optional, for slip images)

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```env
# Database - Get from Neon Dashboard
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# NextAuth - Generate secret with: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=abc123xyz456...

# LINE Bot - Get from LINE Developers Console
LINE_CHANNEL_SECRET=your-line-channel-secret
LINE_CHANNEL_ACCESS_TOKEN=your-line-channel-access-token

# Slip Verification API (Slip2Go)
SLIP_APIKEY=your-slip2go-secret-key-here

# Credit Mode - Set to "false" for simple slip verification without database
CREDITMODE=true

# Expected Bank Receiver (for automatic approval via Slip2Go API)
EXPECTED_RECEIVER_NAME_TH=บุญญฤทธิ์ ส
EXPECTED_RECEIVER_NAME_EN=BOONYARIT S
EXPECTED_ACCOUNT_NUMBER=6639546442
EXPECTED_BANK_ID=006

# Cloudflare R2 (Optional - can skip for now)
# R2_ACCOUNT_ID=your-r2-account-id
# R2_ACCESS_KEY_ID=your-r2-access-key-id
# R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
# R2_BUCKET_NAME=line-bot-slips
# R2_PUBLIC_URL=https://your-bucket.r2.dev
```

### 3. Setup Database

Generate and run migrations:

```bash
# Generate migration files
npm run db:generate

# Apply migrations to database
npm run db:migrate
```

### 4. Create First Admin User

```bash
npm run create-admin
```

Follow the prompts to enter:
- Admin name
- Admin email
- Admin password (min 6 characters)

### 5. Start Development Server

```bash
npm run dev
```

The app will run at: **http://localhost:3000**

### 6. Login to Dashboard

1. Open http://localhost:3000
2. You'll be redirected to `/login`
3. Login with the admin credentials you created
4. You should see the dashboard!

## 📱 Setting Up LINE Webhook

### For Local Development (Using ngrok)

1. **Keep your dev server running** (`npm run dev`)

2. **In a new terminal, start ngrok:**

```bash
# Install ngrok globally
npm install -g ngrok

# Create tunnel to port 3000
ngrok http 3000
```

3. **Copy the ngrok URL** (e.g., `https://abc123.ngrok.io`)

4. **Configure in LINE Developers Console:**
   - Go to https://developers.line.biz/console/
   - Select your Messaging API channel
   - Go to **Messaging API** tab
   - Set **Webhook URL**: `https://abc123.ngrok.io/api/webhook`
   - Click **Verify**
   - Enable **Use webhook**
   - Disable **Auto-reply messages** (optional)

5. **Test the bot:**
   - Scan the QR code to add your bot as a friend
   - Send a message like `/help`
   - Bot should respond!

### Webhook Endpoint Details

Your webhook is located at:
```
File: /app/api/webhook/route.ts
URL: https://your-domain.com/api/webhook
```

**What it does:**
- Receives events from LINE (messages, images, etc.)
- Validates LINE signature for security
- Routes to appropriate handlers (text messages, images)
- Processes user commands (/balance, /buy, etc.)
- Handles slip verification when users send images

**Supported Events:**
- Text messages → Processes bot commands
- Image messages → Extracts QR code and verifies slip
- Follow/Unfollow → (can be added if needed)

## 🧪 Testing

### Test Bot Commands

Send these messages to your LINE bot:

```
/help          - Show all commands
/balance       - Check credit balance
/products      - View product catalog
/history       - View transaction history
```

### Test Slip Verification

1. Send a slip image with QR code to the bot
2. Bot will extract QR code and verify with slip API
3. If valid, credit will be added automatically
4. Check the dashboard to see the transaction

### Test Dashboard

1. Go to http://localhost:3000
2. Navigate through:
   - Users page - See all LINE users
   - Transactions - View all transactions
   - Slips - Pending slip approvals
   - Products - Add/edit products
   - Admins - Manage admin users

## 🚀 Deploying to Production

### Deploy to Vercel (Recommended)

1. **Push code to GitHub:**
```bash
git add .
git commit -m "Initial commit"
git push
```

2. **Deploy on Vercel:**
   - Go to https://vercel.com
   - Import your GitHub repository
   - Add all environment variables from `.env`
   - Deploy!

3. **Update LINE Webhook:**
   - Get your Vercel URL (e.g., `https://line-bot.vercel.app`)
   - Update webhook in LINE Console: `https://line-bot.vercel.app/api/webhook`
   - Verify webhook

## 📋 Common Issues

### Database Connection Error
```
Error: DATABASE_URL is required
```
**Solution:** Make sure `.env` file exists and has correct `DATABASE_URL`

### LINE Webhook Verification Failed
```
401 Unauthorized or Invalid signature
```
**Solution:**
- Check `LINE_CHANNEL_SECRET` is correct
- Make sure webhook URL is correct
- Use HTTPS (ngrok provides this)

### Slip Verification Not Working
```
Error: SLIP credentials not configured
```
**Solution:** Check `.env` has `SLIP_APIKEY` set correctly

### Admin Login Not Working
```
Invalid credentials
```
**Solution:** Run `npm run create-admin` again to create a new admin

## 🎯 Next Steps

After setup:

1. ✅ Create some products in dashboard
2. ✅ Generate credit tokens: `npm run generate-token`
3. ✅ Test slip verification
4. ✅ Invite real users to test
5. ✅ Deploy to production

## 📚 Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server

# Database
npm run db:generate      # Generate migrations
npm run db:migrate       # Run migrations
npm run db:studio        # Open Drizzle Studio

# Admin
npm run create-admin     # Create admin user
npm run generate-token   # Generate credit token
```

## 🆘 Need Help?

- Check [README.md](README.md) for detailed documentation
- Review code in `/lib/line/handlers.ts` for bot logic
- Check `/app/api/webhook/route.ts` for webhook implementation

---

**You're all set! 🎉** Start building your LINE bot!
