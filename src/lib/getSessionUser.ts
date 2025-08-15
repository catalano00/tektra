// filepath: /Users/johncatalano/tektra-app/src/lib/getSessionUser.ts
import { getServerSession } from 'next-auth';
import { authOptions } from './authOptions';

export interface SessionUser {
  id?: string;
  email?: string;
  role?: string;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const session = await getServerSession(authOptions as any) as any;
    if (!session?.user) return null;
    return {
      id: (session.user as any).id,
      email: (session.user as any).email,
      role: (session.user as any).role,
    };
  } catch (e) {
    return null;
  }
}
