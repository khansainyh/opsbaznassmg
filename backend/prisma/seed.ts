import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database wipe & minimal seeding...');

  // 1. Clean up ALL existing transaction and master data
  console.log('Wiping all data from database...');
  await prisma.journalEntry.deleteMany({});
  await prisma.realisasi.deleteMany({});
  await prisma.cashMutationDetail.deleteMany({});
  await prisma.cashMutation.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.proposal.deleteMany({});
  await prisma.surat.deleteMany({});
  await prisma.mustahik.deleteMany({});
  await prisma.coaMappingRule.deleteMany({});
  await prisma.bankAccount.deleteMany({});
  await prisma.chartOfAccounts.deleteMany({});
  await prisma.program.deleteMany({});
  await prisma.pilar.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Database wipe complete.');

  // 2. Seed ONLY Users so you can still log in
  console.log('Seeding minimal admin users for access...');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  const usersData = [
    { name: 'Super Admin', email: 'admin@baznas.org', role: Role.Super_Admin },
    { name: 'Dr. H. Ahmad Darodji, M.Si', email: 'ketua@baznas.org', role: Role.Ketua },
    { name: 'H. Mohammad Asyhar, M.Si', email: 'kepel@baznas.org', role: Role.Kepala_Pelaksana },
    { name: 'Dra. Hj. Aminah, M.Si', email: 'kabag.admin@baznas.org', role: Role.Kabag_Administrasi },
    { name: 'Indra Wijaya, A.Md', email: 'staf.admin@baznas.org', role: Role.Staf_Administrasi },
    { name: 'Reza Pratama, S.Sos', email: 'staf.dist@baznas.org', role: Role.Staf_Distribusi },
    { name: 'Hadi Wibowo', email: 'surveyor@baznas.org', role: Role.Relawan }
  ];

  let seededCount = 0;
  for (const u of usersData) {
    await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        password_hash: passwordHash,
        role: u.role
      }
    });
    seededCount++;
  }
  
  console.log(`Successfully seeded ${seededCount} users. Database is otherwise completely empty!`);
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
