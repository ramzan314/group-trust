#!/bin/bash
set -e

echo "=================================================="
echo "   GroupTrust VPS Diagnostics & Auto-Repair"
echo "=================================================="

# 1. Pull latest code
echo "--> 1. Pulling latest updates from GitHub..."
git reset --hard origin/main || true
git pull origin main

# 2. Setup backend environment and database
echo "--> 2. Setting up Backend..."
cd backend

if [ ! -f .env ]; then
  echo "    Creating backend/.env..."
  cat <<EOF > .env
DATABASE_URL="file:./dev.db"
JWT_SECRET="grouptrust-vps-secret-key-123456789"
PORT=5001
EOF
fi

npm install
npx prisma generate
npx prisma db push --accept-data-loss
npm run prisma:seed || true
npm run build
cd ..

# 3. Setup frontend
echo "--> 3. Building Frontend..."
cd frontend
# Ensure frontend uses the internal /api rewrite proxy
rm -f .env.local
npm install
npm run build
cd ..

# 4. Clean and restart PM2
echo "--> 4. Restarting PM2 processes..."
pm2 delete all || true
pm2 start ecosystem.config.js
pm2 save

echo "--> 5. Waiting 4 seconds for services to initialize..."
sleep 4

# 5. Check processes
echo "--------------------------------------------------"
echo "PM2 Process Status:"
pm2 status
echo "--------------------------------------------------"

# 6. Test endpoints
echo "--> 6. Verifying Backend (Port 5001)..."
if curl -s -f http://127.0.0.1:5001/health > /dev/null; then
  echo ">>> SUCCESS: Backend API is running on port 5001! <<<"
else
  echo ">>> ERROR: Backend failed to respond. Printing backend logs: <<<"
  pm2 logs grouptrust-backend --lines 25 --nostream
fi

echo "--> 7. Verifying Frontend Proxy (Port 3000 -> 5001)..."
if curl -s -f http://127.0.0.1:3000/api/health > /dev/null; then
  echo ">>> SUCCESS: Frontend API proxy is working on port 3000! <<<"
else
  echo ">>> NOTICE: Frontend proxy check did not return 200. <<<"
fi

echo "=================================================="
echo "Auto-repair complete! Try logging in again now."
echo "=================================================="
