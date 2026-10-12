#!/usr/bin/env bash
set -e

echo "=========================================="
echo "🚀 Starting ADHDo Deployment"
echo "=========================================="

APP_DIR="${APP_DIR:-/root/adhdo}"
cd "$APP_DIR"

# 1. Pull latest code if .git exists
if [ -d ".git" ]; then
    echo "📥 Pulling latest code from git..."
    git fetch origin main || true
    git reset --hard origin/main || true
fi

# 2. Build and run containers
echo "🐳 Building and starting ADHDo Docker containers..."
docker compose -f docker-compose.prod.yml up -d --build

# 3. Wait for database to be healthy
echo "⏳ Waiting for PostgreSQL to be healthy..."
docker compose -f docker-compose.prod.yml exec -T db sh -c 'until pg_isready -U adhdo -d adhdo_db; do sleep 1; done'

# 4. Run Alembic migrations
echo "🔄 Running database migrations..."
docker compose -f docker-compose.prod.yml exec -T backend sh -c 'alembic upgrade head'

# 5. Seed initial demo challenges
echo "🌱 Seeding demo ADHD cleaning challenges..."
docker compose -f docker-compose.prod.yml exec -T backend sh -c 'python scripts/seed_demo_data.py' || true

# 6. Verify health
echo "🩺 Verifying backend health..."
sleep 2
curl -f http://127.0.0.1:8010/health || echo "Backend starting up..."

echo "=========================================="
echo "✅ ADHDo Deployment Complete!"
echo "🌐 URL: https://adhdo.167-86-68-161.sslip.io"
echo "=========================================="
