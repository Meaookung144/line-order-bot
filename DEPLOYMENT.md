# Docker Deployment Guide

Complete guide to deploy LINE Order Bot on a server using Docker.

## Prerequisites

- Docker installed (version 20.10+)
- Docker Compose installed (version 2.0+)
- Git installed
- Domain name (optional, for production)
- SSL certificate (optional, for HTTPS)

## Quick Start (Complete Commands)

### 1. Clone the Repository

```bash
git clone <your-repo-url> line-order-bot
cd line-order-bot
```

### 2. Set Up Environment Variables

```bash
# Copy example env file
cp .env.example .env

# Edit the .env file with your credentials
nano .env
# or
vim .env
```

**Required Environment Variables:**

```env
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://username:password@host.region.neon.tech/database?sslmode=require

# LINE Bot Configuration
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret

# NextAuth Configuration
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32

# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=line-bot-slips
R2_PUBLIC_URL=https://your-r2-public-url.com

# Slip Verification API (Slip2Go)
SLIP_APIKEY=your_slip2go_secret_key

# Credit Mode
CREDITMODE=true

# Expected Bank Receiver (for automatic approval)
EXPECTED_RECEIVER_NAME_TH=บุญญฤทธิ์ ส
EXPECTED_RECEIVER_NAME_EN=BOONYARIT S
EXPECTED_ACCOUNT_NUMBER=6639546442
EXPECTED_BANK_ID=006

# Admin Group Token
SET_ADMIN_GROUP_TOKEN=your_secure_random_token
```

### 3. Build and Run with Docker Compose

```bash
# Build and start the container
docker-compose up -d --build

# Check logs
docker-compose logs -f

# Stop the container
docker-compose down
```

## Alternative: Docker Commands (Without Docker Compose)

```bash
# Build the image
docker build -t line-order-bot:latest .

# Run the container
docker run -d \
  --name line-order-bot \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  line-order-bot:latest

# Check logs
docker logs -f line-order-bot

# Stop and remove
docker stop line-order-bot
docker rm line-order-bot
```

## Complete Server Setup (From Scratch)

### 1. Install Docker on Ubuntu/Debian

```bash
# Update package index
sudo apt-get update

# Install prerequisites
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Verify installation
docker --version
docker compose version

# Add current user to docker group (optional, to run without sudo)
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Clone and Deploy

```bash
# Navigate to your preferred directory
cd /opt

# Clone repository
git clone <your-repo-url> line-order-bot
cd line-order-bot

# Set up environment
cp .env.example .env
nano .env  # Edit with your credentials

# Build and run
docker compose up -d --build

# Check status
docker compose ps
docker compose logs -f app
```

## Production Deployment with Nginx (Recommended)

### 1. Install Nginx

```bash
sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

### 2. Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/line-order-bot
```

Add this configuration:

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
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/line-order-bot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. Install SSL Certificate

```bash
sudo certbot --nginx -d yourdomain.com
```

## Useful Commands

### Managing the Application

```bash
# Start
docker compose up -d

# Stop
docker compose down

# Restart
docker compose restart

# View logs
docker compose logs -f app

# View last 100 lines
docker compose logs --tail=100 app

# Rebuild after code changes
docker compose up -d --build

# Execute commands inside container
docker compose exec app sh
```

### Database Migrations

```bash
# Run migrations inside container
docker compose exec app npm run db:migrate
```

### Monitoring

```bash
# Check container status
docker compose ps

# Check resource usage
docker stats

# Check container health
docker inspect --format='{{.State.Health.Status}}' line-order-bot-app-1
```

## Updating the Application

```bash
# Pull latest code
cd /opt/line-order-bot
git pull origin main

# Rebuild and restart
docker compose up -d --build

# Check logs for any errors
docker compose logs -f app
```

## Backup and Restore

### Backup

```bash
# Backup environment file
cp .env .env.backup

# Export Docker image
docker save line-order-bot:latest | gzip > line-order-bot-backup.tar.gz
```

### Restore

```bash
# Restore environment
cp .env.backup .env

# Load Docker image
docker load < line-order-bot-backup.tar.gz
```

## Troubleshooting

### Container won't start

```bash
# Check logs
docker compose logs app

# Check if port 3000 is already in use
sudo netstat -tlnp | grep 3000

# Rebuild from scratch
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Database connection issues

```bash
# Test database connection
docker compose exec app node -e "const { neon } = require('@neondatabase/serverless'); const sql = neon(process.env.DATABASE_URL); sql\`SELECT 1\`.then(() => console.log('Connected!')).catch(e => console.error(e));"
```

### LINE Webhook not working

1. Ensure your domain is accessible from the internet
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify SSL certificate is valid
4. Check LINE webhook URL in LINE Developers Console

## Security Recommendations

1. **Use strong passwords** for all credentials
2. **Keep .env file secure** - never commit to git
3. **Update regularly**:
   ```bash
   docker compose pull
   docker compose up -d
   ```
4. **Enable firewall**:
   ```bash
   sudo ufw allow 22/tcp  # SSH
   sudo ufw allow 80/tcp  # HTTP
   sudo ufw allow 443/tcp # HTTPS
   sudo ufw enable
   ```
5. **Monitor logs regularly**
6. **Set up automatic backups**

## Auto-start on System Boot

```bash
# Docker containers with restart policy will auto-start
# Ensure Docker service starts on boot
sudo systemctl enable docker
```

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | `postgresql://user:pass@host/db` |
| LINE_CHANNEL_ACCESS_TOKEN | LINE bot access token | From LINE Developers |
| LINE_CHANNEL_SECRET | LINE bot secret | From LINE Developers |
| NEXTAUTH_URL | Your domain URL | `https://yourdomain.com` |
| NEXTAUTH_SECRET | Random secret key | Generate with `openssl rand -base64 32` |
| R2_ACCOUNT_ID | Cloudflare account ID | From Cloudflare dashboard |
| R2_ACCESS_KEY_ID | R2 access key | From Cloudflare R2 |
| R2_SECRET_ACCESS_KEY | R2 secret key | From Cloudflare R2 |
| R2_BUCKET_NAME | R2 bucket name | `line-bot-slips` |
| R2_PUBLIC_URL | R2 public URL | Your R2 public domain |
| SLIP_APIKEY | Slip2Go API key | From Slip2Go/SlipVerify |
| CREDITMODE | Enable credit mode | `true` or `false` |
| EXPECTED_RECEIVER_NAME_TH | Thai receiver name | For auto-approval validation |
| EXPECTED_RECEIVER_NAME_EN | English receiver name | For auto-approval validation |
| EXPECTED_ACCOUNT_NUMBER | Bank account number | For auto-approval validation |
| EXPECTED_BANK_ID | Bank ID code | For auto-approval validation |
| SET_ADMIN_GROUP_TOKEN | Admin setup token | Random secure string |

## Support

For issues or questions, check:
- Application logs: `docker compose logs -f`
- Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Container status: `docker compose ps`
