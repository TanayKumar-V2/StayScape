import { PrismaClient, UserRole } from '@prisma/client';
import * as readline from 'readline';

async function main() {
  const emailArg = process.argv[2]?.trim();
  if (!emailArg) {
    console.error('Error: Please provide target user email.');
    console.error('Usage: pnpm admin:promote <email> [--force]');
    process.exit(1);
  }

  const email = emailArg.toLowerCase();
  const force = process.argv.includes('--force') || process.argv.includes('-y');
  const prisma = new PrismaClient();

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true },
    });

    if (!user) {
      console.error(`Error: User with email "${email}" not found.`);
      process.exit(1);
    }

    if (user.role === UserRole.ADMIN) {
      console.log(`User "${email}" is already an ADMIN.`);
      process.exit(0);
    }

    if (!force) {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const answer = await new Promise<string>((resolve) => {
        rl.question(
          `Are you sure you want to promote ${user.firstName} ${user.lastName} (${email}) to ADMIN? (yes/no): `,
          resolve,
        );
      });
      rl.close();

      if (answer.trim().toLowerCase() !== 'yes') {
        console.log('Admin promotion cancelled.');
        process.exit(0);
      }
    }

    // Update user role to ADMIN and write to AdminAuditLog
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { role: UserRole.ADMIN },
      });

      await tx.adminAuditLog.create({
        data: {
          adminUserId: user.id,
          action: 'CLI_ADMIN_PROMOTION',
          entityType: 'User',
          entityId: user.id,
          reason: 'CLI promotion script execution',
          beforeData: { role: user.role },
          afterData: { role: UserRole.ADMIN },
          metadata: { executedBy: 'SYSTEM_CLI', targetEmail: email },
        },
      });
    });

    console.log(`Success: User ${user.firstName} ${user.lastName} (${email}) has been promoted to ADMIN.`);
  } catch (error) {
    console.error('Failed to promote user to admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

