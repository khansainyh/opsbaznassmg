import prisma from './utils/prisma';

async function main() {
  try {
    const allPrograms = await prisma.program.findMany();
    const programsWithDetails = allPrograms.filter(p => p.rkat_details !== null && p.rkat_details !== undefined);
    console.log("=== PROGRAMS WITH RKAT DETAILS ===");
    console.log(JSON.stringify(programsWithDetails, null, 2));
  } catch (error) {
    console.error("Database query failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
