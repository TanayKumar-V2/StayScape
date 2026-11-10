import { PrismaClient } from '@prisma/client';
import { INITIAL_AMENITIES } from './seed';

const prisma = new PrismaClient();

/**
 * Production Database Seeding Script.
 *
 * Rules:
 * - Only seeds the fixed, standard catalogue of amenities.
 * - 100% idempotent via `upsert`.
 * - Does NOT create demo users, fake hosts, mock listings, bookings, or payments.
 */
async function seedProductionAmenities(): Promise<void> {
  console.log('Seeding standard amenities catalogue for production...');

  for (const amenity of INITIAL_AMENITIES) {
    await prisma.amenity.upsert({
      where: { slug: amenity.slug },
      update: {
        name: amenity.name,
        category: amenity.category,
        icon: amenity.icon,
      },
      create: {
        name: amenity.name,
        slug: amenity.slug,
        category: amenity.category,
        icon: amenity.icon,
      },
    });
  }

  const count = await prisma.amenity.count();
  console.log(`Amenities catalog verified. Total amenities: ${count}`);
}

async function main(): Promise<void> {
  try {
    await seedProductionAmenities();
    console.log('Production database seed completed successfully.');
  } catch (error) {
    console.error('Error running production seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  void main();
}

