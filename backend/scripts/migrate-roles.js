const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Migrating legacy roles in database...');
  try {
    // 1. Temporarily alter the column to VARCHAR to bypass strict enum checks during updates
    console.log('Temporarily converting role column to VARCHAR...');
    await prisma.$executeRawUnsafe(
      `ALTER TABLE User MODIFY COLUMN role VARCHAR(191)`
    );

    // 2. Perform the update from legacy to new role
    console.log('Updating legacy user roles...');
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
