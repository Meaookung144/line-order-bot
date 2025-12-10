# Docker Quick Start Guide

Deploy LINE Order Bot with Docker in 5 minutes.

## Prerequisites

- Docker & Docker Compose installed
- Git installed
- Domain name (for production)

## Complete Command Sequence

```bash
# 1. Clone repository
git clone <your-repo-url> line-order-bot
cd line-order-bot

# 2. Set up environment variables
cp .env.example .env
nano .env  # Edit with your credentials

# 3. Deploy with one command
./deploy.sh

# OR manually:
docker compose up -d --build
```

## That's it! 🎉

Your bot is now running at `http://localhost:3000`

## Quick Commands

```bash
# View logs (live)
docker compose logs -f app

# Stop
docker compose down

# Restart
docker compose restart

# Update and rebuild
git pull && docker compose up -d --build

# Run database migrations
docker compose exec app npm run db:migrate

# Create admin user
docker compose exec app npm run create-admin

# Access container shell
docker compose exec app sh
```

## Production Setup (Nginx + SSL)

### 1. Install Nginx
```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 2. Create Nginx config
```bash
sudo nano /etc/nginx/sites-available/line-bot
```

Paste this:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. Enable and get SSL
```bash
sudo ln -s /etc/nginx/sites-available/line-bot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo certbot --nginx -d yourdomain.com
```

## LINE Configuration

1. Go to [LINE Developers Console](https://developers.line.biz/)
2. Set Webhook URL: `https://yourdomain.com/api/webhook`
3. Enable webhook
4. Test webhook

## First Time Setup

```bash
# 1. Create admin user for web dashboard
docker compose exec app npm run create-admin

# 2. In LINE, add bot to a group and send:
/admin YOUR_TOKEN

# 3. Done! Bot is now active
```

## Environment Variables Quick Reference

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `LINE_CHANNEL_ACCESS_TOKEN` - From LINE Developers
- `LINE_CHANNEL_SECRET` - From LINE Developers
- `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
- `R2_*` - Cloudflare R2 credentials (for slip images)
- `SLIP_APIKEY` - Slip2Go/SlipVerify API key

**Optional:**
- `EXPECTED_RECEIVER_NAME_TH` - For auto-approval
- `EXPECTED_RECEIVER_NAME_EN` - For auto-approval
- `EXPECTED_ACCOUNT_NUMBER` - For auto-approval
- `EXPECTED_BANK_ID` - For auto-approval

## Troubleshooting

### Container won't start
```bash
docker compose logs app
docker compose down && docker compose up -d --build
```

### Port 3000 already in use
```bash
# Find process
sudo lsof -i :3000
# Kill it or change port in docker-compose.yml
```

### Database connection failed
```bash
# Test connection
docker compose exec app node -e "console.log(process.env.DATABASE_URL)"
```

### Can't access from domain
- Check firewall: `sudo ufw allow 80` and `sudo ufw allow 443`
- Check Nginx: `sudo systemctl status nginx`
- Check DNS: `dig yourdomain.com`

## Auto-start on Boot

The containers will auto-start on system reboot thanks to `restart: unless-stopped`.

Ensure Docker starts on boot:
```bash
sudo systemctl enable docker
```

## Update Application

```bash
cd /path/to/line-order-bot
git pull origin main
docker compose up -d --build
docker compose logs -f app  # Check for errors
```

## Backup

```bash
# Backup environment
cp .env .env.backup.$(date +%Y%m%d)

# Export image
docker save line-order-bot:latest | gzip > backup-$(date +%Y%m%d).tar.gz
```

## Complete Production Deployment (Ubuntu/Debian)

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Clone and deploy
cd /opt
git clone <repo-url> line-order-bot
cd line-order-bot
cp .env.example .env
nano .env  # Fill in your credentials

# Deploy
./deploy.sh

# Install Nginx + SSL
sudo apt install -y nginx certbot python3-certbot-nginx

# Configure Nginx (see above)
# Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# Done!
```

## Monitoring

```bash
# Container stats
docker stats

# Logs last 100 lines
docker compose logs --tail=100 app

# Follow logs in real-time
docker compose logs -f app

# Check health
docker inspect --format='{{.State.Health.Status}}' line-order-bot-app-1
```

## Support

For detailed documentation, see [DEPLOYMENT.md](./DEPLOYMENT.md)

For issues:
1. Check logs: `docker compose logs app`
2. Check container status: `docker compose ps`
3. Verify environment: `docker compose exec app env | grep -E "(DATABASE|LINE|R2)"`
