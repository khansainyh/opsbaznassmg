const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Migrating legacy roles in database...');
  try {
    // Update legacy role Staf_Distribusi to Staf_Pendistribusian using raw SQL
    // to bypass Prisma compile-time enum constraints.
    const result = await prisma.$executeRawUnsafe(
      `UPDATE User SET role = 'Staf_Pendistribusian' WHERE role = 'Staf_Distribusi'`
    );
    console.log(`Successfully migrated ${result} legacy users from 'Staf_Distribusi' to 'Staf_Pendistribusian'.`);
  } catch (err) {
    console.warn('Migration warning:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
