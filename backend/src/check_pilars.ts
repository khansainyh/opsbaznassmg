import prisma from './utils/prisma';

async function main() {
  try {
    const pilars = await prisma.pilar.findMany({
      include: { programs: true }
    });
    console.log("=== PILARS ===");
    console.log(JSON.stringify(pilars, null, 2));

    const proposals = await prisma.proposal.findMany();
    console.log("=== PROPOSALS ===");
    console.log(JSON.stringify(proposals, null, 2));
  } catch (error) {
    console.error("Database query failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
