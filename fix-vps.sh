#!/bin/bash
set -e

echo "=== GroupTrust VPS Diagnostics & Auto-Repair ==="

# 1. Pull latest code
echo "--> Pulling latest updates from GitHub..."
git pull origin main

# 2. Build backend
echo "--> Building Backend..."
cd backend
npm install
npx prisma generate
npx prisma migrate deploy || npx prisma db push || true
# Seed database if no users exist
npm run prisma:seed || true
npm run build
cd ..

# 3. Build frontend
echo "--> Building Frontend..."
cd frontend
npm install
npm run build
cd ..

# 4. Restart PM2 processes
echo "--> Restarting PM2 processes..."
pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js

sleep 3

# 5. Verify local endpoints
echo "--> Verifying Backend (Port 5001)..."
if curl -s -f http://127.0.0.1:5001/health > /dev/null; then
  echo "✓ Backend API is HEALTHY on port 5001"
else
  echo "✗ Backend API failed to respond. Checking backend logs:"
  pm2 logs grouptrust-backend --lines 20 --nostream
fi

echo "--> Verifying Frontend Proxy (Port 3000 -> 5001)..."
if curl -s -f http://127.0.0.1:3000/api/health > /dev/null; then
  echo "✓ Frontend API proxy is WORKING on port 3000"
else
  echo "! Proxy test did not return 200. Checking PM2 status:"
  pm2 status
fi

echo "=== Diagnosis Complete ==="
