import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.error('ADMIN_EMAIL env var not set. Skipping admin seed.');
    return;
  }
  const existing = await (prisma as any).user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    if (existing.role !== 'ADMIN') {
      await (prisma as any).user.update({ where: { email: adminEmail }, data: { role: 'ADMIN' } });
      console.log('Promoted existing user to ADMIN:', adminEmail);
    } else {
      console.log('Admin user already present:', adminEmail);
    }
  } else {
    await (prisma as any).user.create({ data: { email: adminEmail, role: 'ADMIN' } });
    console.log('Created ADMIN user:', adminEmail);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => { await prisma.$disconnect(); });
