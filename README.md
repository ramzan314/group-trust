# GroupTrust Community Finance Platform

GroupTrust is a digital platform designed to replace paper registers, passbooks, and manual cash records for community-based finance groups, including Rotating Savings & Credit Associations (ROSCA), Joint Liability Groups (JLG), and Self Help Groups (SHG). It improves transparency, trust, and accountability for members, group secretaries, and NGO admins.

## Architecture

- **`backend/`**: Node.js + Express API server with TypeScript, Prisma ORM, and JWT authentication. Uses SQLite for local dev.
- **`frontend/`**: Next.js (App Router) + TypeScript + Tailwind CSS client, using Recharts, Framer Motion, and jsPDF.

## Getting Started

### 1. Setup Backend
1. Go to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run database migrations:
   ```bash
   npm run prisma:migrate
   ```
4. Seed the database with mock records:
   ```bash
   npm run prisma:seed
   ```
5. Start development API server:
   ```bash
   npm run dev
   ```
   *The backend will run on `http://localhost:5001`.*

### 2. Setup Frontend
1. Open a new terminal window and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js development client:
   ```bash
   npm run dev
   ```
   *The client will open on `http://localhost:3000`.*

## Verification

To run the automated cryptographic ledger verification check:
```bash
cd backend
npx ts-node src/verify-audit.ts
```

## Demo Credentials

Click the quick login buttons on the homepage or use:
- **NGO Admin:** `admin@grouptrust.com` / `password123`
- **Group Secretary:** `secretary@grouptrust.com` / `password123`
- **Member:** `member1@grouptrust.com` / `password123`
