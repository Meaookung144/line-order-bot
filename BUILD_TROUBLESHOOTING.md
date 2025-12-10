# Docker Build Troubleshooting Guide

## Issue: npm ci fails during build

### Symptoms
```
npm error A complete log of this run can be found in: /root/.npm/_logs/...
failed to solve: process "/bin/sh -c npm ci" did not complete successfully: exit code: 1
```

### Solutions

#### Option 1: Use the fixed Dockerfile (Recommended)
The Dockerfile has been updated to:
- Install build dependencies for native modules (sharp, etc.)
- Use `npm install --legacy-peer-deps` instead of `npm ci`
- Add runtime dependencies in production stage

```bash
# Clear Docker cache and rebuild
docker compose down
docker system prune -f
docker compose up -d --build
```

#### Option 2: Use Debian-based image (More compatible)
If Alpine Linux still has issues, use the Debian version:

```bash
# Build with Debian Dockerfile
docker compose -f docker-compose.debian.yml up -d --build
```

Or manually:
```bash
docker build -f Dockerfile.debian -t line-order-bot .
docker run -d -p 3000:3000 --env-file .env line-order-bot
```

#### Option 3: Clean rebuild
```bash
# Stop all containers
docker compose down

# Remove all Docker build cache
docker builder prune -af

# Remove old images
docker rmi $(docker images -q line-order-bot)

# Rebuild from scratch
docker compose build --no-cache
docker compose up -d
```

## Issue: Sharp module not found

### Symptoms
```
Error: Cannot find module 'sharp'
Error: Something went wrong installing the "sharp" module
```

### Solution
The Dockerfile now installs all necessary dependencies. If you still see this error:

```bash
# Use Debian version which has better support
docker compose -f docker-compose.debian.yml up -d --build
```

## Issue: Build is very slow

### Solution
```bash
# Use BuildKit for faster builds
DOCKER_BUILDKIT=1 docker compose build

# Or set it permanently
export DOCKER_BUILDKIT=1
docker compose build
```

## Issue: Cannot connect to database

### Symptoms
```
Error: Connection refused
Error: connect ETIMEDOUT
```

### Solution
1. Check your DATABASE_URL in .env file
2. Ensure database allows connections from Docker container
3. For Neon, make sure connection string has `?sslmode=require`

```bash
# Test database connection
docker compose exec app node -e "
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
sql\`SELECT 1\`.then(() => console.log('✅ Connected')).catch(e => console.error('❌', e.message));
"
```

## Issue: Port 3000 already in use

### Symptoms
```
Error: bind: address already in use
```

### Solution
```bash
# Find what's using port 3000
sudo lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change the port in docker-compose.yml
# Change "3000:3000" to "8080:3000"
```

## Issue: Environment variables not working

### Symptoms
- Bot doesn't respond
- LINE webhook errors
- Database errors

### Solution
```bash
# Check if .env file exists
ls -la .env

# Verify environment variables are loaded
docker compose exec app env | grep DATABASE_URL

# If missing, ensure .env file is in the same directory as docker-compose.yml
# Restart containers after editing .env
docker compose down
docker compose up -d
```

## Issue: Drizzle migrations fail

### Symptoms
```
Error running migrations
Table does not exist
```

### Solution
```bash
# Run migrations manually inside container
docker compose exec app npm run db:migrate

# Or generate migrations first
docker compose exec app npm run db:generate
docker compose exec app npm run db:migrate
```

## Issue: Next.js build fails

### Symptoms
```
Error: Build failed
Module not found
```

### Solution
```bash
# Check if all files are copied correctly
docker compose exec app ls -la

# Rebuild without cache
docker compose build --no-cache
docker compose up -d
```

## Complete Clean Rebuild Process

If all else fails, start fresh:

```bash
# 1. Stop everything
docker compose down

# 2. Clean Docker system
docker system prune -af
docker volume prune -f

# 3. Remove project images
docker rmi $(docker images -q line-order-bot) 2>/dev/null || true

# 4. Clean local build artifacts
rm -rf node_modules .next

# 5. Verify .env file
cat .env | grep -v "^#" | grep "="

# 6. Build with Debian (most compatible)
docker compose -f docker-compose.debian.yml build --no-cache

# 7. Start
docker compose -f docker-compose.debian.yml up -d

# 8. Check logs
docker compose -f docker-compose.debian.yml logs -f
```

## Quick Reference: Docker Commands

### View logs
```bash
docker compose logs -f app
docker compose logs --tail=100 app
```

### Restart container
```bash
docker compose restart app
```

### Execute commands inside container
```bash
docker compose exec app sh
docker compose exec app npm run db:migrate
docker compose exec app node -v
```

### Check container status
```bash
docker compose ps
docker stats
```

### Clean up
```bash
docker compose down              # Stop containers
docker compose down -v           # Stop and remove volumes
docker system prune -af          # Remove all unused data
docker builder prune -af         # Remove build cache
```

## Still Having Issues?

1. **Check Docker version**
   ```bash
   docker --version
   docker compose version
   ```
   Required: Docker 20.10+, Compose 2.0+

2. **Check system resources**
   ```bash
   docker system df
   docker stats
   ```
   Make sure you have enough disk space and memory

3. **Try building locally first**
   ```bash
   npm install
   npm run build
   ```
   If this fails, fix the code issues first before Docker

4. **Use verbose logging**
   ```bash
   docker compose --verbose up --build
   ```

5. **Check for conflicting containers**
   ```bash
   docker ps -a
   docker stop $(docker ps -aq)
   docker rm $(docker ps -aq)
   ```

## Platform-Specific Issues

### macOS
- Increase Docker Desktop memory: Preferences → Resources → Memory (4GB+)
- Enable BuildKit: Preferences → Docker Engine

### Linux
- Add user to docker group: `sudo usermod -aG docker $USER`
- Restart Docker: `sudo systemctl restart docker`

### Windows (WSL2)
- Ensure WSL2 backend is enabled in Docker Desktop
- Run from WSL2 terminal, not PowerShell
- Update .wslconfig for more resources

## Recommended: Use Debian Version

The Debian version is more stable and compatible:

```bash
# Copy the Debian compose file as default
cp docker-compose.debian.yml docker-compose.yml

# Build and run
docker compose up -d --build
```

## Success Checklist

- [ ] Docker & Docker Compose installed
- [ ] .env file exists and has all required variables
- [ ] Port 3000 is available
- [ ] Database is accessible
- [ ] Build completes without errors
- [ ] Container starts successfully
- [ ] Health check passes
- [ ] Can access http://localhost:3000
- [ ] LINE webhook responds (if configured)

## Get Help

If you're still stuck:
1. Check logs: `docker compose logs -f app`
2. Check container: `docker compose exec app sh`
3. Test locally: `npm install && npm run dev`
4. Verify .env: `docker compose config`
