import {
  PrismaClient,
  PropertyStatus,
  PropertyType,
  UserRole,
  AccountStatus,
} from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

export const INITIAL_AMENITIES = [
  // General
  { name: 'Fast Wi-Fi', slug: 'wifi', category: 'General', icon: 'Wifi' },
  { name: 'Air conditioning', slug: 'air-conditioning', category: 'General', icon: 'Wind' },
  { name: 'Heating', slug: 'heating', category: 'General', icon: 'Flame' },
  { name: 'Dedicated workspace', slug: 'workspace', category: 'General', icon: 'Laptop' },
  { name: 'High-definition TV', slug: 'tv', category: 'General', icon: 'Tv' },

  // Kitchen & Laundry
  { name: 'Full kitchen', slug: 'kitchen', category: 'Kitchen', icon: 'UtensilsCrossed' },
  { name: 'Refrigerator', slug: 'refrigerator', category: 'Kitchen', icon: 'Refrigerator' },
  { name: 'Microwave oven', slug: 'microwave', category: 'Kitchen', icon: 'Microwave' },
  { name: 'Washing machine', slug: 'washing-machine', category: 'Kitchen', icon: 'Shirt' },

  // Outdoor & Views
  { name: 'Private swimming pool', slug: 'pool', category: 'Outdoor', icon: 'Waves' },
  { name: 'Panoramic balcony', slug: 'balcony', category: 'Outdoor', icon: 'DoorOpen' },
  { name: 'Private garden', slug: 'garden', category: 'Outdoor', icon: 'Trees' },
  { name: 'Scenic mountain view', slug: 'mountain-view', category: 'Outdoor', icon: 'Mountain' },
  { name: 'Direct beach access', slug: 'beach-access', category: 'Outdoor', icon: 'Umbrella' },

  // Parking & Facilities
  { name: 'Free on-premises parking', slug: 'free-parking', category: 'Parking', icon: 'Car' },
  {
    name: 'Paid parking available',
    slug: 'paid-parking',
    category: 'Parking',
    icon: 'CircleParking',
  },

  // Safety
  { name: 'Security CCTV', slug: 'cctv', category: 'Safety', icon: 'ShieldCheck' },
  { name: 'Fire extinguisher', slug: 'fire-extinguisher', category: 'Safety', icon: 'Flame' },
  { name: 'First aid kit', slug: 'first-aid-kit', category: 'Safety', icon: 'BriefcaseMedical' },

  // Family & Pets
  { name: 'Family friendly', slug: 'family-friendly', category: 'Family', icon: 'Users' },
  { name: 'Pet friendly', slug: 'pet-friendly', category: 'Family', icon: 'Dog' },
  { name: "Children's play area", slug: 'play-area', category: 'Family', icon: 'Gamepad2' },
];

export const INITIAL_PROPERTIES = [
  {
    slug: 'the-alpine-hideaway-manali',
    title: 'The Alpine Hideaway — Cedar Wood Cabin',
    description:
      'Perched on a quiet deodar hillside overlooking Old Manali, this hand-crafted cedar retreat blends traditional Kath-Kuni stone craftsmanship with radiant heated floors, a fireplace, and endless mountain panoramas. Ideal for contemplative escapes and high-altitude remote work.',
    propertyType: PropertyType.CABIN,
    addressLine1: '14 Apple Blossom Valley Road',
    addressLine2: 'Near Vashisht Temple',
    city: 'Manali',
    state: 'Himachal Pradesh',
    country: 'India',
    postalCode: '175103',
    latitude: 32.2432,
    longitude: 77.1892,
    maxGuests: 4,
    bedrooms: 2,
    beds: 2,
    bathrooms: 2,
    pricePerNightPaise: 580000, // ₹5,800
    cleaningFeePaise: 80000,
    houseRules: [
      'Quiet hours after 10 PM',
      'No indoor smoking',
      'Pets permitted with advance notice',
    ],
    checkInFrom: '14:00',
    checkOutUntil: '11:00',
    amenitySlugs: ['wifi', 'heating', 'workspace', 'kitchen', 'mountain-view', 'free-parking'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
        alt: 'Alpine wooden cabin exterior overlooking snow-capped peaks',
        isCover: true,
      },
      {
        url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
        alt: 'Warm living room with fireplace and pine interior',
        isCover: false,
      },
      {
        url: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80',
        alt: 'Master bedroom with mountain views',
        isCover: false,
      },
      {
        url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80',
        alt: 'Modern stone bathroom with forest outlook',
        isCover: false,
      },
      {
        url: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1200&q=80',
        alt: 'Panoramic cedar sundeck',
        isCover: false,
      },
    ],
  },
  {
    slug: 'casa-verde-goa',
    title: 'Casa Verde — Portuguese Heritage Villa',
    description:
      'A restored 180-year-old Indo-Portuguese estate enclosed by lush tropical gardens, a private plunge pool, and shaded verandas. Located minutes away from the peaceful sands of Anjuna and Vagator, offering total privacy and authentic coastal charm.',
    propertyType: PropertyType.VILLA,
    addressLine1: '72 Soranto Waddo',
    addressLine2: 'Behind St. Michael Church',
    city: 'Anjuna',
    state: 'Goa',
    country: 'India',
    postalCode: '403509',
    latitude: 15.5843,
    longitude: 73.7431,
    maxGuests: 8,
    bedrooms: 4,
    beds: 5,
    bathrooms: 4,
    pricePerNightPaise: 1250000, // ₹12,500
    cleaningFeePaise: 150000,
    houseRules: [
      'No glassware near swimming pool',
      'Quiet hours after 11 PM',
      'Smoking outdoors only',
    ],
    checkInFrom: '15:00',
    checkOutUntil: '12:00',
    amenitySlugs: [
      'wifi',
      'air-conditioning',
      'pool',
      'garden',
      'kitchen',
      'beach-access',
      'free-parking',
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
        alt: 'Casa Verde private pool and whitewashed villa architecture',
        isCover: true,
      },
      {
        url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
        alt: 'Spacious high-ceiling living pavilion',
        isCover: false,
      },
      {
        url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
        alt: 'Poolside cabana and loungers',
        isCover: false,
      },
      {
        url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
        alt: 'Air-conditioned suite with private balcony',
        isCover: false,
      },
      {
        url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
        alt: 'Open-air dining garden',
        isCover: false,
      },
    ],
  },
  {
    slug: 'the-quiet-courtyard-udaipur',
    title: 'The Quiet Courtyard — Lake Pichola Haveli',
    description:
      'Immerse yourself in Rajasthan heritage at this intimate restored haveli nestled within the old city of Udaipur. Steps from Lake Pichola, featuring arched jharokhas, marble courtyards, and rooftop sunset views over the City Palace.',
    propertyType: PropertyType.HOMESTAY,
    addressLine1: '23 Gangaur Ghat Marg',
    addressLine2: 'Old City',
    city: 'Udaipur',
    state: 'Rajasthan',
    country: 'India',
    postalCode: '313001',
    latitude: 24.5854,
    longitude: 73.6806,
    maxGuests: 4,
    bedrooms: 2,
    beds: 2,
    bathrooms: 2,
    pricePerNightPaise: 420000, // ₹4,200
    cleaningFeePaise: 50000,
    houseRules: [
      'No footwear on rooftop carpets',
      'Quiet hours after 10 PM',
      'Vegetarian kitchen preference',
    ],
    checkInFrom: '13:00',
    checkOutUntil: '11:00',
    amenitySlugs: ['wifi', 'air-conditioning', 'balcony', 'kitchen', 'cctv'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
        alt: 'Traditional carved courtyard and sandstone arches in Udaipur',
        isCover: true,
      },
      {
        url: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80',
        alt: 'Heritage suite bedroom with regal Rajput detailing',
        isCover: false,
      },
      {
        url: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80',
        alt: 'Rooftop terrace overlooking Lake Pichola',
        isCover: false,
      },
      {
        url: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80',
        alt: 'Inner marble courtyard and water fountain',
        isCover: false,
      },
      {
        url: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80',
        alt: 'Cozy seating alcove with embroidered cushions',
        isCover: false,
      },
    ],
  },
  {
    slug: 'misty-heights-munnar',
    title: 'Misty Heights — Tea Plantation Chalet',
    description:
      'Surrounded by rolling emerald tea estates and morning mist in the Western Ghats, this modern eco-chalet offers floor-to-ceiling glass walls, birdwatching verandas, and guided morning plantation walks. Pure tranquility.',
    propertyType: PropertyType.CABIN,
    addressLine1: 'Chithirapuram Estate Rd',
    addressLine2: 'Near Pallivasal Falls',
    city: 'Munnar',
    state: 'Kerala',
    country: 'India',
    postalCode: '685565',
    latitude: 10.0889,
    longitude: 77.0595,
    maxGuests: 5,
    bedrooms: 2,
    beds: 3,
    bathrooms: 2,
    pricePerNightPaise: 640000, // ₹6,400
    cleaningFeePaise: 75000,
    houseRules: [
      'Preserve quiet plantation ambiance',
      'No plastic disposal in tea fields',
      'Check-in before sunset recommended',
    ],
    checkInFrom: '14:00',
    checkOutUntil: '11:00',
    amenitySlugs: ['wifi', 'mountain-view', 'balcony', 'garden', 'free-parking', 'family-friendly'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80',
        alt: 'Misty green tea hills surrounding modern wooden chalet',
        isCover: true,
      },
      {
        url: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=1200&q=80',
        alt: 'Chalet deck overlooking morning mist and waterfalls',
        isCover: false,
      },
      {
        url: 'https://images.unsplash.com/photo-1617859047452-8510bcf207fd?auto=format&fit=crop&w=1200&q=80',
        alt: 'Bright open-plan bedroom with panoramic tea view',
        isCover: false,
      },
      {
        url: 'https://images.unsplash.com/photo-1540518614846-7ede433c4550?auto=format&fit=crop&w=1200&q=80',
        alt: 'Dining veranda and morning tea setup',
        isCover: false,
      },
      {
        url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80',
        alt: 'Reading lounge with forest outlook',
        isCover: false,
      },
    ],
  },
  {
    slug: 'the-ganga-sanctuary-rishikesh',
    title: 'The Ganga Sanctuary — Riverfront Apartment',
    description:
      'Perched right along the holy Ganges in Tapovan, this serene minimalist apartment offers sound-of-river meditation balconies, high-speed fiber internet, yoga props, and sweeping views of the Himalayan foothills.',
    propertyType: PropertyType.APARTMENT,
    addressLine1: 'Badrinath Road',
    addressLine2: 'Upper Tapovan',
    city: 'Rishikesh',
    state: 'Uttarakhand',
    country: 'India',
    postalCode: '249192',
    latitude: 30.0869,
    longitude: 78.2676,
    maxGuests: 3,
    bedrooms: 1,
    beds: 2,
    bathrooms: 1,
    pricePerNightPaise: 380000, // ₹3,800
    cleaningFeePaise: 40000,
    houseRules: ['Mindful quiet environment', 'No loud parties', 'Eco-conscious energy use'],
    checkInFrom: '14:00',
    checkOutUntil: '11:00',
    amenitySlugs: ['wifi', 'air-conditioning', 'workspace', 'kitchen', 'balcony', 'mountain-view'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
        alt: 'Minimalist living space with sunrise over the Ganges river',
        isCover: true,
      },
      {
        url: 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?auto=format&fit=crop&w=1200&q=80',
        alt: 'Cozy bedroom with yoga mats and floor cushions',
        isCover: false,
      },
      {
        url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80',
        alt: 'Modern kitchenette with organic spices',
        isCover: false,
      },
      {
        url: 'https://images.unsplash.com/photo-1584622781564-1d987f7333c1?auto=format&fit=crop&w=1200&q=80',
        alt: 'Clean bathroom with brass fittings',
        isCover: false,
      },
      {
        url: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1200&q=80',
        alt: 'Riverfront balcony facing the green hills',
        isCover: false,
      },
    ],
  },
  {
    slug: 'haveli-heritage-jaipur',
    title: 'Haveli Heritage — Royal Suite in the Pink City',
    description:
      'Live like royalty in a historic courtyard mansion in central Jaipur. Handcrafted teak furniture, fresco ceilings, tranquil fountains, and traditional hospitality located close to Hawa Mahal and Johari Bazaar.',
    propertyType: PropertyType.HOUSE,
    addressLine1: '45 Subhash Chowk',
    addressLine2: 'Near Amer Road',
    city: 'Jaipur',
    state: 'Rajasthan',
    country: 'India',
    postalCode: '302002',
    latitude: 26.9124,
    longitude: 75.7873,
    maxGuests: 6,
    bedrooms: 3,
    beds: 3,
    bathrooms: 3,
    pricePerNightPaise: 890000, // ₹8,900
    cleaningFeePaise: 100000,
    houseRules: [
      'No footwear on antique carpets',
      'Respect heritage decor and artifacts',
      'Quiet hours after 10 PM',
    ],
    checkInFrom: '14:00',
    checkOutUntil: '11:00',
    amenitySlugs: [
      'wifi',
      'air-conditioning',
      'kitchen',
      'garden',
      'free-parking',
      'family-friendly',
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80',
        alt: 'Sandstone archways and royal courtyards in Jaipur',
        isCover: true,
      },
      {
        url: 'https://images.unsplash.com/photo-1615529182904-14819c35db37?auto=format&fit=crop&w=1200&q=80',
        alt: 'Heritage bedroom with gold leaf filigree',
        isCover: false,
      },
      {
        url: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=1200&q=80',
        alt: 'Palatial bathroom with marble tub',
        isCover: false,
      },
      {
        url: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1200&q=80',
        alt: 'Lush central garden with peacock fountain',
        isCover: false,
      },
      {
        url: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=1200&q=80',
        alt: 'Rooftop gazebo with evening lanterns',
        isCover: false,
      },
    ],
  },
];

export async function seedAmenities() {
  console.log('Seeding initial amenities...');
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
  console.log(`Amenities seeded successfully. Total in database: ${count}`);
}

export async function seedPublishedProperties() {
  console.log('Seeding verified host and published properties...');

  // 1. Create or ensure verified host account
  const hostPasswordHash = await argon2.hash('HostPassphrase2026!', {
    type: argon2.argon2id,
  });

  const hostUser = await prisma.user.upsert({
    where: { email: 'host@stayscape.com' },
    update: {},
    create: {
      email: 'host@stayscape.com',
      passwordHash: hostPasswordHash,
      firstName: 'Aarav',
      lastName: 'Sharma',
      role: UserRole.USER,
      status: AccountStatus.ACTIVE,
      emailVerified: true,
    },
  });

  const hostProfile = await prisma.hostProfile.upsert({
    where: { userId: hostUser.id },
    update: {},
    create: {
      userId: hostUser.id,
      displayName: 'StayScape Signature Stays',
      bio: 'Curator of exceptional mountain retreats, coastal havelis, and tranquil sanctuaries across India.',
      contactPhone: '+919876543210',
      termsAcceptedAt: new Date(),
    },
  });

  // 2. Fetch all amenities map
  const allAmenities = await prisma.amenity.findMany();
  const amenityMap = new Map(allAmenities.map((a) => [a.slug, a.id]));

  // 3. Seed properties
  for (const propData of INITIAL_PROPERTIES) {
    const existingProperty = await prisma.property.findUnique({
      where: { slug: propData.slug },
    });

    let propertyId: string;

    if (!existingProperty) {
      const created = await prisma.property.create({
        data: {
          hostProfileId: hostProfile.id,
          slug: propData.slug,
          title: propData.title,
          description: propData.description,
          propertyType: propData.propertyType,
          status: PropertyStatus.PUBLISHED,
          addressLine1: propData.addressLine1,
          addressLine2: propData.addressLine2,
          city: propData.city,
          state: propData.state,
          country: propData.country,
          postalCode: propData.postalCode,
          latitude: propData.latitude,
          longitude: propData.longitude,
          maxGuests: propData.maxGuests,
          bedrooms: propData.bedrooms,
          beds: propData.beds,
          bathrooms: propData.bathrooms,
          pricePerNightPaise: propData.pricePerNightPaise,
          cleaningFeePaise: propData.cleaningFeePaise,
          currency: 'INR',
          houseRules: propData.houseRules,
          checkInFrom: propData.checkInFrom,
          checkOutUntil: propData.checkOutUntil,
          publishedAt: new Date(),
        },
      });
      propertyId = created.id;
    } else {
      propertyId = existingProperty.id;
      await prisma.property.update({
        where: { id: propertyId },
        data: {
          status: PropertyStatus.PUBLISHED,
          publishedAt: existingProperty.publishedAt ?? new Date(),
        },
      });
    }

    // Connect amenities
    for (const slug of propData.amenitySlugs) {
      const amenityId = amenityMap.get(slug);
      if (amenityId) {
        await prisma.propertyAmenity.upsert({
          where: {
            propertyId_amenityId: {
              propertyId,
              amenityId,
            },
          },
          update: {},
          create: {
            propertyId,
            amenityId,
          },
        });
      }
    }

    // Create images if not present
    const existingImages = await prisma.propertyImage.count({
      where: { propertyId },
    });

    if (existingImages === 0) {
      for (let i = 0; i < propData.images.length; i++) {
        const img = propData.images[i]!;
        await prisma.propertyImage.create({
          data: {
            propertyId,
            publicId: `seed_${propData.slug}_${i + 1}`,
            secureUrl: img.url,
            altText: img.alt,
            width: 1200,
            height: 800,
            format: 'jpg',
            bytes: 250000,
            sortOrder: i,
            isCover: img.isCover,
          },
        });
      }
    }
  }

  const publishedCount = await prisma.property.count({
    where: { status: PropertyStatus.PUBLISHED },
  });
  console.log(`Published properties seeded successfully. Total in database: ${publishedCount}`);
}

async function main() {
  try {
    await seedAmenities();
    await seedPublishedProperties();
  } catch (e) {
    console.error('Error running database seed:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  void main();
}
