import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

const prisma = new PrismaClient();

export default prisma;
