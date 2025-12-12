# Vercel Deployment Guide

## Quick Deploy to Vercel

### Step 1: Push to GitHub (if not already done)

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### Step 2: Import Project to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "Add New" → "Project"
4. Import your `line-order-bot` repository
5. **IMPORTANT**: Don't click "Deploy" yet!

### Step 3: Configure Environment Variables

Before deploying, add these environment variables in Vercel:

**In the "Configure Project" page, scroll to "Environment Variables":**

Add each of these (use Production, Preview, and Development for all):

```bash
# Database
DATABASE_URL=postgresql://neondb_owner:npg_9ZwUnv3HyWzR@ep-still-water-a196j4lk-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# NextAuth
NEXTAUTH_URL=https://YOUR-VERCEL-PROJECT.vercel.app
NEXTAUTH_SECRET=your-secret-key-here-generate-with-openssl-rand-base64-32

# LINE Bot
LINE_CHANNEL_SECRET=6c3b42469237751d8b6883caf6790058
LINE_CHANNEL_ACCESS_TOKEN=XxB8VpH0C1qZWuHqB9JQqapLtneNZgHWM7BgjnQjChZCEDLosxRZSslT3MJO+X8/z1DuOVv2+j2M1rYZBxsDxLchE2tzqG5al9PrWJfiu4r8jkPFq27XX3uS2YdkwxxshquArIXbOQNdXi0YjmcUYgdB04t89/1O/w1cDnyilFU=

# Slip Verification
SLIP_APIKEY=8B4rv6ZhYXEquhFlscC1EFDWcn_e3jwj5sFf2BNFJpM=
CREDITMODE=true
SLIP_CHECK_DUPLICATE=true
SLIP_RECEIVER_ACCOUNT_TYPE=01006
SLIP_RECEIVER_NAME_TH=บุญยฤทธิ์ สังข์อ่อง
SLIP_RECEIVER_NAME_EN=BOONYARIT S
SLIP_ACCOUNT_NUMBER=6639546442

# Cloudflare R2
R2_ACCOUNT_ID=e4ef7e0bf34a529c9ff5c7a4745ad2ff
R2_ACCESS_KEY_ID=52fd30dd9e0804658d1eb9a9aafe8864
R2_SECRET_ACCESS_KEY=b3a86c98b1306a8ca522f0d5af35ac3cb143d414abfc649de783fba779b77913
R2_BUCKET_NAME=pub-pranakorn
R2_PUBLIC_URL=https://cdn.pranakorn.dev

# Admin
SET_ADMIN_GROUP_TOKEN=HelloADMINMeeKraiYuuMai
```

**IMPORTANT**:
- For `NEXTAUTH_URL`, you'll need to update it after deployment with your actual Vercel URL
- Select all three environments (Production, Preview, Development) for each variable

### Step 4: Deploy

1. After adding all environment variables, click "Deploy"
2. Wait for the build to complete (3-5 minutes)
3. Vercel will give you a URL like `https://line-order-bot-xyz.vercel.app`

### Step 5: Update NEXTAUTH_URL

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Find `NEXTAUTH_URL`
4. Update it to your actual Vercel URL: `https://YOUR-PROJECT-NAME.vercel.app`
5. Redeploy the project (Deployments tab → click "..." → Redeploy)

### Step 6: Configure Custom Domain (Optional)

To use `koko.coaco.space`:

1. In Vercel project → Settings → Domains
2. Add domain: `koko.coaco.space`
3. Vercel will give you DNS records to add:
   ```
   Type: A
   Name: koko (or @)
   Value: 76.76.21.21
   ```
   Or use CNAME:
   ```
   Type: CNAME
   Name: koko
   Value: cname.vercel-dns.com
   ```
4. Add these records to your DNS provider (coaco.space)
5. Wait for DNS propagation (5-30 minutes)
6. Update `NEXTAUTH_URL` to `https://koko.coaco.space`

### Step 7: Configure LINE Webhook

1. Go to [LINE Developers Console](https://developers.line.biz/)
2. Select your bot
3. Update webhook URL to:
   ```
   https://YOUR-VERCEL-URL.vercel.app/api/webhook
   ```
   or
   ```
   https://koko.coaco.space/api/webhook
   ```
4. Enable "Use webhook"
5. Click "Verify" to test

### Step 8: Run Database Migrations

Since Vercel is serverless, you need to run migrations locally:

```bash
# Make sure DATABASE_URL points to your Neon database
npm run db:migrate
```

Or use Vercel CLI:

```bash
# Install Vercel CLI
npm i -g vercel

# Link to your project
vercel link

# Run migration
vercel env pull .env.local
npm run db:migrate
```

### Step 9: Create Admin User

You can't run interactive commands on Vercel, so use one of these methods:

**Method 1: Via local development with production database**
```bash
# Use production DATABASE_URL
npm run create-admin
```

**Method 2: Via API endpoint**
Create a temporary admin creation endpoint or use Vercel's environment variables.

---

## Troubleshooting

### Build fails with "DATABASE_URL environment variable is required"

**Solution**: Make sure you added all environment variables in Vercel dashboard BEFORE clicking Deploy.

1. Go to Project Settings → Environment Variables
2. Add all variables listed in Step 3
3. Redeploy: Deployments → Latest deployment → "..." → Redeploy

### "Error: Invalid NEXTAUTH_URL"

**Solution**: Update NEXTAUTH_URL to match your Vercel URL

1. Settings → Environment Variables → Edit NEXTAUTH_URL
2. Change to `https://your-project.vercel.app`
3. Redeploy

### LINE webhook returns 401 or 500

**Solution**: Verify all LINE credentials are correct

1. Check `LINE_CHANNEL_SECRET` matches LINE console
2. Check `LINE_CHANNEL_ACCESS_TOKEN` is current (they expire)
3. View logs: Vercel project → Logs → Filter by `/api/webhook`

### Database connection timeout

**Solution**: Neon database sleeps after inactivity

1. Access your site to wake it up
2. Or upgrade Neon plan for always-on database
3. Check DATABASE_URL has `?sslmode=require`

### Images not uploading to R2

**Solution**: Verify R2 credentials and bucket permissions

1. Check R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
2. Verify R2_BUCKET_NAME exists
3. Check bucket CORS settings allow your domain

---

## Vercel CLI Deployment (Alternative)

If you prefer CLI:

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Follow prompts, it will ask for environment variables
# Or import from .env file:
vercel env add DATABASE_URL production < .env.koko
# ... repeat for each variable

# Deploy to production
vercel --prod
```

---

## Continuous Deployment

Vercel automatically deploys when you push to GitHub:

- `main` branch → Production deployment
- Other branches → Preview deployments
- Pull requests → Preview deployments with unique URLs

To disable auto-deployment:
1. Project Settings → Git
2. Disable "Production Branch" or "Preview Branches"

---

## Monitoring and Logs

### View real-time logs
1. Vercel dashboard → Your project → Logs
2. Filter by function (e.g., `/api/webhook`)
3. Real-time tail available

### Analytics
1. Vercel dashboard → Analytics
2. View page views, edge requests, serverless function invocations

### Alerts
1. Project Settings → Notifications
2. Configure alerts for errors, downtime, etc.

---

## Cost Considerations

**Vercel Free Tier includes:**
- 100GB bandwidth
- 100 hours serverless function execution
- Unlimited deployments
- Custom domains

**Watch out for:**
- Serverless function execution time (each request to your API)
- Database connections (Neon has connection limits)
- R2 storage and bandwidth (billed separately by Cloudflare)

**Recommendations:**
- Start with free tier
- Monitor usage in Vercel dashboard
- Upgrade to Pro ($20/month) if you exceed limits

---

## Success Checklist

- [ ] Repository pushed to GitHub
- [ ] All environment variables added to Vercel
- [ ] Initial deployment successful
- [ ] NEXTAUTH_URL updated with actual Vercel URL
- [ ] Custom domain configured (optional)
- [ ] LINE webhook URL updated
- [ ] LINE webhook verified and enabled
- [ ] Database migrations run
- [ ] Admin user created
- [ ] Test: Send message to LINE bot
- [ ] Test: Upload slip image
- [ ] Test: Admin approval workflow

---

## Next Steps After Deployment

1. **Test the bot**: Send `/start` to your LINE bot
2. **Set up admin group**: Send `/admin HelloADMINMeeKraiYuuMai` in LINE group
3. **Create admin user**: Use local script with production DATABASE_URL
4. **Test order flow**: Create products, test ordering, test slip verification
5. **Monitor logs**: Watch Vercel logs for any errors

---

## Getting Help

- **Vercel Build Errors**: Check build logs in deployment details
- **Runtime Errors**: Check function logs in Vercel dashboard
- **LINE Bot Issues**: Verify webhook URL and credentials
- **Database Issues**: Check Neon dashboard for connection stats
