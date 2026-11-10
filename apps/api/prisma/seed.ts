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

type SeedPropertyData = Omit<(typeof INITIAL_PROPERTIES)[number], 'propertyType'> & {
  propertyType: PropertyType;
};

const MOCK_DESTINATIONS = [
  { city: 'Shimla', state: 'Himachal Pradesh', postalCode: '171001', latitude: 31.1048, longitude: 77.1734 },
  { city: 'Dharamshala', state: 'Himachal Pradesh', postalCode: '176215', latitude: 32.219, longitude: 76.3234 },
  { city: 'Kasol', state: 'Himachal Pradesh', postalCode: '175105', latitude: 32.0104, longitude: 77.3152 },
  { city: 'Bir', state: 'Himachal Pradesh', postalCode: '176077', latitude: 32.0472, longitude: 76.7179 },
  { city: 'Srinagar', state: 'Jammu and Kashmir', postalCode: '190001', latitude: 34.0837, longitude: 74.7973 },
  { city: 'Mussoorie', state: 'Uttarakhand', postalCode: '248179', latitude: 30.4599, longitude: 78.0664 },
  { city: 'Nainital', state: 'Uttarakhand', postalCode: '263001', latitude: 29.3919, longitude: 79.4542 },
  { city: 'Jaipur', state: 'Rajasthan', postalCode: '302001', latitude: 26.9124, longitude: 75.7873 },
  { city: 'Jodhpur', state: 'Rajasthan', postalCode: '342001', latitude: 26.2389, longitude: 73.0243 },
  { city: 'Pushkar', state: 'Rajasthan', postalCode: '305022', latitude: 26.4899, longitude: 74.5511 },
  { city: 'Jaisalmer', state: 'Rajasthan', postalCode: '345001', latitude: 26.9157, longitude: 70.9083 },
  { city: 'Agra', state: 'Uttar Pradesh', postalCode: '282001', latitude: 27.1767, longitude: 78.0081 },
  { city: 'Varanasi', state: 'Uttar Pradesh', postalCode: '221001', latitude: 25.3176, longitude: 82.9739 },
  { city: 'Kolkata', state: 'West Bengal', postalCode: '700001', latitude: 22.5726, longitude: 88.3639 },
  { city: 'Gangtok', state: 'Sikkim', postalCode: '737101', latitude: 27.3389, longitude: 88.6065 },
  { city: 'Shillong', state: 'Meghalaya', postalCode: '793001', latitude: 25.5788, longitude: 91.8933 },
  { city: 'Pune', state: 'Maharashtra', postalCode: '411001', latitude: 18.5204, longitude: 73.8567 },
  { city: 'Alibaug', state: 'Maharashtra', postalCode: '402201', latitude: 18.6414, longitude: 72.8722 },
  { city: 'Gokarna', state: 'Karnataka', postalCode: '581326', latitude: 14.5479, longitude: 74.3188 },
  { city: 'Coorg', state: 'Karnataka', postalCode: '571201', latitude: 12.3375, longitude: 75.8069 },
  { city: 'Kochi', state: 'Kerala', postalCode: '682001', latitude: 9.9312, longitude: 76.2673 },
  { city: 'Varkala', state: 'Kerala', postalCode: '695141', latitude: 8.7379, longitude: 76.7163 },
  { city: 'Pondicherry', state: 'Puducherry', postalCode: '605001', latitude: 11.9416, longitude: 79.8083 },
  { city: 'Hampi', state: 'Karnataka', postalCode: '583239', latitude: 15.335, longitude: 76.46 },
];

const MOCK_STAY_STYLES = [
  {
    slug: 'slow-house',
    title: 'The Slow House',
    type: PropertyType.VILLA,
    description: 'A quietly considered private home with tactile natural materials, generous windows, and a calm place to reset between days out.',
  },
  {
    slug: 'canopy-retreat',
    title: 'Canopy Retreat',
    type: PropertyType.CABIN,
    description: 'A warm, independent hideaway tucked into its landscape, with a private outdoor sitting area and thoughtful essentials for a longer stay.',
  },
  {
    slug: 'courtyard-stay',
    title: 'The Courtyard Stay',
    type: PropertyType.HOMESTAY,
    description: 'A welcoming locally hosted stay with a shared sense of place, restful rooms, and easy access to neighborhood cafés and landmarks.',
  },
  {
    slug: 'light-house',
    title: 'The Light House',
    type: PropertyType.APARTMENT,
    description: 'A bright, well-planned apartment with a practical kitchen, comfortable lounge, and a neighborhood feel from the moment you arrive.',
  },
  {
    slug: 'sunday-house',
    title: 'Sunday House',
    type: PropertyType.GUESTHOUSE,
    description: 'An intimate guesthouse made for unhurried mornings, with considered furnishings, a peaceful atmosphere, and a friendly local host.',
  },
];

// Curated, high-resolution Unsplash accommodation photography. Images are served
// through Unsplash's image CDN at consistent dimensions and quality.
const MOCK_STAY_IMAGE_IDS = [
  'photo-1600585154340-be6161a56a0c',
  'photo-1600607687939-ce8a6c25118c',
  'photo-1600566753086-00f18fb6b3ea',
  'photo-1600607687920-4e2a09cf159d',
  'photo-1600566753190-17f0baa2a6c3',
  'photo-1600210492486-724fe5c67fb0',
  'photo-1613490493576-7fde63acd811',
  'photo-1600047509807-ba8f99d2cdde',
  'photo-1600566752355-35792bedcfea',
  'photo-1600607687644-c7171b42498f',
  'photo-1600566753190-17f0baa2a6c3',
  'photo-1600607687939-ce8a6c25118c',
  'photo-1600585154526-990dced4db0d',
  'photo-1613977257363-707ba9348227',
  'photo-1618221195710-dd6b41faaea6',
  'photo-1616486338812-3dadae4b4ace',
  'photo-1615529182904-14819c35db37',
  'photo-1600210492493-0946911123ea',
  'photo-1600607688969-a5bfcd646154',
  'photo-1600566753190-17f0baa2a6c3',
  'photo-1600607687920-4e2a09cf159d',
  'photo-1600607687939-ce8a6c25118c',
  'photo-1600585154340-be6161a56a0c',
  'photo-1600566753086-00f18fb6b3ea',
];

const MOCK_AMENITY_SETS = [
  ['wifi', 'air-conditioning', 'kitchen', 'balcony', 'free-parking'],
  ['wifi', 'heating', 'workspace', 'mountain-view', 'free-parking'],
  ['wifi', 'air-conditioning', 'garden', 'family-friendly', 'cctv'],
  ['wifi', 'kitchen', 'refrigerator', 'washing-machine', 'workspace'],
  ['wifi', 'air-conditioning', 'pool', 'garden', 'pet-friendly'],
];

function buildMockProperties(): SeedPropertyData[] {
  return MOCK_DESTINATIONS.flatMap((destination, destinationIndex) =>
    MOCK_STAY_STYLES.map((style, styleIndex) => {
      const listingNumber = destinationIndex * MOCK_STAY_STYLES.length + styleIndex + 1;
      const slug = `${destination.city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${style.slug}-${String(listingNumber).padStart(3, '0')}`;
      const imageOffset = (listingNumber * 3) % MOCK_STAY_IMAGE_IDS.length;
      const images = Array.from({ length: 4 }, (_, imageIndex) => {
        const imageId = MOCK_STAY_IMAGE_IDS[(imageOffset + imageIndex) % MOCK_STAY_IMAGE_IDS.length]!;
        return {
          url: `https://images.unsplash.com/${imageId}?auto=format&fit=crop&w=1400&q=85`,
          alt: `${style.title} in ${destination.city} — ${['exterior and grounds', 'living space', 'bedroom', 'interior detail'][imageIndex]}`,
          isCover: imageIndex === 0,
        };
      });

      return {
        slug,
        title: `${style.title} · ${destination.city}`,
        description: `${style.description} Set in ${destination.city}, ${destination.state}, this StayScape mock listing is furnished with reliable comforts and an easy base for exploring the area.`,
        propertyType: style.type,
        addressLine1: `${12 + styleIndex * 7} ${['Garden Lane', 'Hill View Road', 'Old Town Street', 'River Walk', 'Cedar Grove'][styleIndex]}`,
        addressLine2: `StayScape sample home ${listingNumber}`,
        city: destination.city,
        state: destination.state,
        country: 'India',
        postalCode: destination.postalCode,
        latitude: destination.latitude + (styleIndex - 2) * 0.003,
        longitude: destination.longitude + (styleIndex - 2) * 0.003,
        maxGuests: 2 + ((listingNumber + styleIndex) % 7),
        bedrooms: 1 + (listingNumber % 4),
        beds: 1 + (listingNumber % 5),
        bathrooms: 1 + (listingNumber % 3),
        pricePerNightPaise: 280000 + ((listingNumber * 13700) % 1420000),
        cleaningFeePaise: 35000 + ((listingNumber * 2300) % 90000),
        houseRules: ['No indoor smoking', 'Quiet hours after 10 PM', 'Treat the home with care'],
        checkInFrom: '14:00',
        checkOutUntil: '11:00',
        amenitySlugs: MOCK_AMENITY_SETS[styleIndex]!,
        images,
      };
    }),
  );
}

export const MOCK_PROPERTIES = buildMockProperties();

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

  // Batch writes to keep remote seed runs fast and safe to repeat. Slugs are
  // stable, so an interrupted seed can be resumed without duplicating rows.
  const properties = [...INITIAL_PROPERTIES, ...MOCK_PROPERTIES];
  const propertySlugs = properties.map((property) => property.slug);
  const now = new Date();
  const existingProperties = await prisma.property.findMany({
    where: { slug: { in: propertySlugs } },
    select: { id: true, slug: true, status: true, publishedAt: true },
  });
  const existingSlugs = new Set(existingProperties.map((property) => property.slug));

  await prisma.property.createMany({
    data: properties
      .filter((property) => !existingSlugs.has(property.slug))
      .map((property) => ({
        hostProfileId: hostProfile.id,
        slug: property.slug,
        title: property.title,
        description: property.description,
        propertyType: property.propertyType,
        status: PropertyStatus.PUBLISHED,
        addressLine1: property.addressLine1,
        addressLine2: property.addressLine2,
        city: property.city,
        state: property.state,
        country: property.country,
        postalCode: property.postalCode,
        latitude: property.latitude,
        longitude: property.longitude,
        maxGuests: property.maxGuests,
        bedrooms: property.bedrooms,
        beds: property.beds,
        bathrooms: property.bathrooms,
        pricePerNightPaise: property.pricePerNightPaise,
        cleaningFeePaise: property.cleaningFeePaise,
        currency: 'INR',
        houseRules: property.houseRules,
        checkInFrom: property.checkInFrom,
        checkOutUntil: property.checkOutUntil,
        publishedAt: now,
      })),
    skipDuplicates: true,
  });

  const propertyRecords = await prisma.property.findMany({
    where: { slug: { in: propertySlugs } },
    select: { id: true, slug: true },
  });
  const propertyIdBySlug = new Map(propertyRecords.map((property) => [property.slug, property.id]));
  const existingIds = existingProperties.map((property) => property.id);

  if (existingIds.length > 0) {
    await prisma.property.updateMany({
      where: { id: { in: existingIds }, status: { not: PropertyStatus.PUBLISHED } },
      data: { status: PropertyStatus.PUBLISHED },
    });
    await prisma.property.updateMany({
      where: { id: { in: existingIds }, publishedAt: null },
      data: { publishedAt: now },
    });
  }

  const amenityRows = properties.flatMap((property) => {
    const propertyId = propertyIdBySlug.get(property.slug);
    if (!propertyId) return [];
    return property.amenitySlugs.flatMap((slug) => {
      const amenityId = amenityMap.get(slug);
      return amenityId ? [{ propertyId, amenityId }] : [];
    });
  });
  await prisma.propertyAmenity.createMany({ data: amenityRows, skipDuplicates: true });

  const existingImageRows = await prisma.propertyImage.findMany({
    where: { propertyId: { in: propertyRecords.map((property) => property.id) } },
    select: { publicId: true },
  });
  const existingImageIds = new Set(existingImageRows.map((image) => image.publicId));
  const imageRows = properties.flatMap((property) => {
    const propertyId = propertyIdBySlug.get(property.slug);
    if (!propertyId) return [];
    return property.images.flatMap((image, index) => {
      const publicId = `seed_${property.slug}_${index + 1}`;
      return existingImageIds.has(publicId)
        ? []
        : [
            {
              propertyId,
              publicId,
              secureUrl: image.url,
              altText: image.alt,
              width: 1400,
              height: 933,
              format: 'jpg',
              bytes: 250000,
              sortOrder: index,
              isCover: image.isCover,
            },
          ];
    });
  });
  await prisma.propertyImage.createMany({ data: imageRows, skipDuplicates: true });

  const mockPropertyIds = MOCK_PROPERTIES.flatMap((property) => {
    const id = propertyIdBySlug.get(property.slug);
    return id ? [id] : [];
  });
  const [mockPropertyCount, mockImageCount] = await Promise.all([
    prisma.property.count({ where: { id: { in: mockPropertyIds } } }),
    prisma.propertyImage.count({ where: { propertyId: { in: mockPropertyIds } } }),
  ]);
  const expectedMockImageCount = MOCK_PROPERTIES.reduce(
    (total, property) => total + property.images.length,
    0,
  );
  if (mockPropertyCount !== MOCK_PROPERTIES.length || mockImageCount < expectedMockImageCount) {
    throw new Error(
      `Mock stay seed verification failed: ${mockPropertyCount}/${MOCK_PROPERTIES.length} stays, ${mockImageCount}/${expectedMockImageCount} images.`,
    );
  }
  console.log(
    `Verified ${mockPropertyCount} mock stays with ${mockImageCount} gallery images.`,
  );

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
