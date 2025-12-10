#!/bin/bash

# LINE Order Bot - Quick Deploy Script
# Usage: ./deploy.sh

set -e

echo "🚀 LINE Order Bot - Docker Deployment"
echo "======================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed or not available."
    echo "Please install Docker Compose v2."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANT: Please edit .env file with your credentials before continuing!"
    echo ""
    read -p "Press Enter after you've edited the .env file, or Ctrl+C to cancel..."
fi

echo "📦 Building Docker image..."
echo "   (This may take 5-10 minutes on first build)"
echo ""

# Try building with the regular Dockerfile first
if docker compose build; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed with Alpine-based image"
    echo "🔄 Trying Debian-based image instead..."
    echo ""

    if docker compose -f docker-compose.debian.yml build; then
        echo "✅ Build successful with Debian image!"
        echo "   Using docker-compose.debian.yml"
        COMPOSE_FILE="docker-compose.debian.yml"
    else
        echo "❌ Build failed with both images"
        echo ""
        echo "📖 Please check BUILD_TROUBLESHOOTING.md for solutions"
        echo "   Common fixes:"
        echo "   1. docker system prune -af"
        echo "   2. docker compose build --no-cache"
        echo "   3. Check .env file exists and is valid"
        exit 1
    fi
fi

echo ""
echo "🚀 Starting application..."
if [ -n "$COMPOSE_FILE" ]; then
    docker compose -f "$COMPOSE_FILE" up -d
else
    docker compose up -d
fi

echo ""
echo "⏳ Waiting for application to start..."
sleep 5

echo ""
echo "📊 Container Status:"
docker compose ps

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📱 Your application should be running at:"
echo "   http://localhost:3000"
echo ""
echo "📋 Useful commands:"
echo "   View logs:        docker compose logs -f"
echo "   Stop:            docker compose down"
echo "   Restart:         docker compose restart"
echo "   Rebuild:         docker compose up -d --build"
echo ""
echo "🔧 Next steps:"
echo "   1. Configure your LINE webhook URL to: https://yourdomain.com/api/webhook"
echo "   2. Set up admin group: Send '/admin YOUR_TOKEN' in LINE group"
echo "   3. Create admin user: docker compose exec app npm run create-admin"
echo ""
