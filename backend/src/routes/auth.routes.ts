import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { z } from 'zod';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth';
import { logSystemActivity } from '../utils/audit';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-production';

const RegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  password: z.string().min(6),
  role: z.enum(['NGO_ADMIN', 'SECRETARY', 'MEMBER']),
});

router.post('/register', async (req: Request, res: Response) => {
  try {
    const validated = RegisterSchema.parse(req.body);
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: validated.email }, { phone: validated.phone }],
      },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email or phone already exists' });
    }

    const passwordHash = await bcrypt.hash(validated.password, 10);
    const user = await prisma.user.create({
      data: {
        name: validated.name,
        email: validated.email,
        phone: validated.phone,
        passwordHash,
        role: validated.role,
        isVerified: false,
        kycStatus: validated.role === 'MEMBER' ? 'PENDING' : 'APPROVED',
      },
    });

    await logSystemActivity(user.id, 'USER_REGISTER', `User registered with role ${user.role}`);

    const token = jwt.sign(
      { id: user.id, email: user.email, phone: user.phone, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, kycStatus: user.kycStatus } });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Registration failed' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    let { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // Look up user (matching email case-insensitively or exact)
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: cleanEmail,
        },
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials. No user found with this email.' });
    }

    const isValid = await bcrypt.compare(String(password).trim(), user.passwordHash);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid credentials. Incorrect password.' });
    }

    await logSystemActivity(user.id, 'USER_LOGIN', `User logged in`);

    const token = jwt.sign(
      { id: user.id, email: user.email, phone: user.phone, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, kycStatus: user.kycStatus } });
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/send-otp', async (req: Request, res: Response) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number is required' });
  return res.json({ success: true, message: 'OTP sent successfully (Simulated: use 123456 to verify)' });
});

router.post('/verify-otp', async (req: Request, res: Response) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP are required' });
  if (otp === '123456') {
    const user = await prisma.user.findUnique({ where: { phone } });
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });
      await logSystemActivity(user.id, 'OTP_VERIFICATION', 'User phone verified via OTP');
    }
    return res.json({ success: true, message: 'OTP verified successfully' });
  } else {
    return res.status(400).json({ error: 'Invalid OTP code' });
  }
});

router.get('/me', authenticateJWT, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user) return res.status(401).json({ error: 'Unauthorized' });

  const user = await prisma.user.findUnique({
    where: { id: authReq.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isVerified: true,
      kycStatus: true,
      kycDocumentUrl: true,
      createdAt: true,
    },
  });

  return res.json(user);
});

export default router;
