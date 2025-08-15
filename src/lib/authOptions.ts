// src/lib/authOptions.ts
import { type NextAuthOptions } from 'next-auth';
import AzureADProvider from 'next-auth/providers/azure-ad';
import { prisma } from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
    }),
  ],
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ profile, user }) {
      try {
        const email = (profile as any)?.email || (user as any)?.email;
        if (!email) return false;
        await (prisma as any).user.upsert({
          where: { email },
          update: { lastLoginAt: new Date(), name: (profile as any)?.name || (user as any)?.name || undefined },
          create: { email, name: (profile as any)?.name || undefined },
        });
        return true;
      } catch (e) {
        console.error('signIn upsert error', e);
        return false;
      }
    },
    async jwt({ token }) {
      if (token.email) {
        const u = await (prisma as any).user.findUnique({ where: { email: token.email as string }, select: { id: true, role: true, name: true } });
        if (u) {
          (token as any).uid = u.id;
          (token as any).role = u.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token as any).uid;
        (session.user as any).role = (token as any).role;
      }
      return session;
    },
  },
};
