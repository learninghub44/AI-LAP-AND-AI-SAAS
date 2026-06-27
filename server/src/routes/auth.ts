import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  userCount,
  createUser,
  verifyCredentials,
  createSession,
  validateSession,
  deleteSession,
} from '../services/auth.js';

export const authRouter = Router();

const credentialsSchema = z.object({
  email: z.string().email('A valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; lockedUntil: number }>();

function isLockedOut(email: string): boolean {
  const a = attempts.get(email.toLowerCase());
  return !!a && a.lockedUntil > Date.now();
}
function recordFailure(email: string): void {
  const key = email.toLowerCase();
  const a = attempts.get(key) ?? { count: 0, lockedUntil: 0 };
  a.count++;
  if (a.count >= MAX_ATTEMPTS) {
    a.lockedUntil = Date.now() + LOCKOUT_MS;
    a.count = 0;
  }
  attempts.set(key, a);
}
function clearFailures(email: string): void {
  attempts.delete(email.toLowerCase());
}

function bearer(req: Request): string | undefined {
  return req.headers.authorization?.replace(/^Bearer\s+/i, '')
    ?? (req.headers['x-dashboard-token'] as string | undefined);
}

/**
 * Setup is locked behind ADMIN_EMAIL + ADMIN_PASSWORD env vars.
 * If those aren't set, setup is permanently disabled (closed system).
 * This prevents anyone from creating an admin account on a public deployment.
 */
function getAdminCredentials(): { email: string; password: string } | null {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (!email || !password || password.length < 8) return null;
  return { email, password };
}

authRouter.get('/status', (req: Request, res: Response) => {
  const session = validateSession(bearer(req));
  const adminCreds = getAdminCredentials();
  res.json({
    // Only show setup screen if admin creds are configured AND no users exist yet
    needsSetup: !!adminCreds && userCount() === 0,
    authenticated: !!session,
    email: session?.email ?? null,
  });
});

/**
 * POST /api/auth/setup
 * Only works when:
 *   1. ADMIN_EMAIL + ADMIN_PASSWORD env vars are set
 *   2. No users exist yet (first run)
 *   3. The submitted credentials match the env vars exactly
 */
authRouter.post('/setup', (req: Request, res: Response) => {
  const adminCreds = getAdminCredentials();

  // No env vars set = setup permanently disabled
  if (!adminCreds) {
    res.status(403).json({
      error: {
        message: 'Admin setup is disabled. Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables to enable it.',
        type: 'setup_disabled',
      },
    });
    return;
  }

  // Already set up
  if (userCount() > 0) {
    res.status(409).json({ error: { message: 'Setup already completed. Use login instead.', type: 'setup_complete' } });
    return;
  }

  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { message: parsed.error.errors.map(e => e.message).join(', ') } });
    return;
  }

  // Credentials must match env vars exactly
  const submittedEmail = parsed.data.email.trim().toLowerCase();
  if (submittedEmail !== adminCreds.email || parsed.data.password !== adminCreds.password) {
    recordFailure(submittedEmail);
    res.status(401).json({
      error: {
        message: 'Invalid credentials. Admin email and password must match the server configuration.',
        type: 'authentication_error',
      },
    });
    return;
  }

  try {
    const user = createUser(parsed.data.email, parsed.data.password);
    const token = createSession(user.userId);
    res.status(201).json({ token, email: user.email });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e?.code === 'email_taken') {
      res.status(409).json({ error: { message: 'Setup already completed.', type: 'setup_complete' } });
    } else {
      res.status(500).json({ error: { message: e?.message ?? 'Setup failed' } });
    }
  }
});

authRouter.post('/login', (req: Request, res: Response) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { message: parsed.error.errors.map(e => e.message).join(', ') } });
    return;
  }
  const { email, password } = parsed.data;

  if (isLockedOut(email)) {
    res.status(429).json({ error: { message: 'Too many failed attempts. Try again later.', type: 'rate_limit_error' } });
    return;
  }

  const user = verifyCredentials(email, password);
  if (!user) {
    recordFailure(email);
    res.status(401).json({ error: { message: 'Invalid email or password', type: 'authentication_error' } });
    return;
  }

  clearFailures(email);
  const token = createSession(user.userId);
  res.json({ token, email: user.email });
});

authRouter.post('/logout', (req: Request, res: Response) => {
  deleteSession(bearer(req));
  res.json({ success: true });
});

authRouter.get('/me', (req: Request, res: Response) => {
  const session = validateSession(bearer(req));
  if (!session) {
    res.status(401).json({ error: { message: 'Authentication required', type: 'authentication_error' } });
    return;
  }
  res.json({ email: session.email });
});
