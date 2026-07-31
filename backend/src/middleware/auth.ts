import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-production';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    phone: string;
    role: string;
    name: string;
  };
}

export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as AuthenticatedRequest).user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Forbidden: Invalid token' });
  }
}

export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
    }
    if (!roles.includes(authReq.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
}
