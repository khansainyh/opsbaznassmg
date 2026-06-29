const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const newHash = await bcrypt.hash('admin123', 10);
  await prisma.user.updateMany({
    where: { email: 'admin@baznas.org' },
    data: { password_hash: newHash }
  });
  console.log("Password reset successful to: admin123");
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
