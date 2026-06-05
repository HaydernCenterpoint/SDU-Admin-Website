#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# Helper script: setup + run NestJS backend in one go.
# Usage:  bash start.sh   (or  ./start.sh  after chmod +x)
# ──────────────────────────────────────────────────────────────────────────────
set -e

echo "🔧 Installing dependencies…"
npm install

if [ ! -f .env ]; then
  echo "📋 Creating .env from .env.example…"
  cp .env.example .env
  echo "⚠️  Please edit .env with your DB credentials, then re-run this script."
  exit 1
fi

echo "🗄️  Generating Prisma client…"
npx prisma generate

echo "🗃️  Running migrations…"
npx prisma migrate deploy || npx prisma db push

echo "🌱 Seeding demo data (admin@saodo.edu.vn / admin123)…"
npx prisma db seed || true

echo ""
echo "✅ Done! Starting dev server…"
echo ""
npm run dev
