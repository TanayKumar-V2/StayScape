import { Injectable } from '@nestjs/common';
import { Amenity } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface GroupedAmenities {
  amenities: Amenity[];
  grouped: Record<string, Amenity[]>;
  categories: string[];
}

@Injectable()
export class AmenitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<GroupedAmenities> {
    const amenities = await this.prisma.amenity.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    const grouped: Record<string, Amenity[]> = {};
    const categoriesSet = new Set<string>();

    for (const item of amenities) {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
      categoriesSet.add(item.category);
    }

    return {
      amenities,
      grouped,
      categories: Array.from(categoriesSet),
    };
  }
}
