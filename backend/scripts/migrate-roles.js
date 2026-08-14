const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Running pre-migration fixes in database...');
  try {
    // 1. Fix Proposal.agenda_no AUTO_INCREMENT removal so Prisma db push can drop unique index safely
    try {
      console.log('Fixing Proposal.agenda_no AUTO_INCREMENT...');
      await prisma.$executeRawUnsafe(
        `ALTER TABLE Proposal MODIFY COLUMN agenda_no INT NOT NULL DEFAULT 0`
      );
      console.log('Successfully removed AUTO_INCREMENT from Proposal.agenda_no');
    } catch (e) {
      console.warn('Note on Proposal.agenda_no modify:', e.message);
    }

    // 2. Temporarily alter the column to VARCHAR to bypass strict enum checks during updates
    console.log('Temporarily converting role column to VARCHAR...');
    await prisma.$executeRawUnsafe(
      `ALTER TABLE User MODIFY COLUMN role VARCHAR(191)`
    );

    // 3. Perform the update from legacy to new role
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
