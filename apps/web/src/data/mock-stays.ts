import { Property } from '@/types/property';

export const MOCK_PROPERTIES: Property[] = [
  {
    id: 'stay-01',
    slug: 'the-alpine-hideaway-manali',
    title: 'The Alpine Hideaway',
    tagline: 'Secluded cedar wood cabin nestled in the cedar forests of Old Manali',
    location: 'Old Manali, Himachal Pradesh',
    destination: 'Manali',
    country: 'India',
    description:
      'Perched high above the Beas river basin, The Alpine Hideaway offers sweeping 180-degree panoramas of snow-dusted Himalayan peaks. Handcrafted using seasoned deodar pine and local river stone, the cabin blends rustic alpine warmth with understated contemporary luxury. Enjoy slow mornings by the fireplace, private apple orchard trails, and stargazing evenings from the cedar hot tub.',
    pricePerNight: 12500,
    rating: 4.96,
    reviewCount: 48,
    propertyType: 'Cabin',
    category: 'Cabins',
    images: [
      'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=800&q=80',
    ],
    amenities: [
      'Mountain view',
      'Indoor fireplace',
      'High-speed Wi-Fi',
      'Dedicated workspace',
      'Heated floors',
      'Private kitchen',
      'Free parking',
      'Pet friendly',
    ],
    maxGuests: 4,
    bedrooms: 2,
    beds: 2,
    bathrooms: 2,
    featured: true,
    host: {
      name: 'Aditi Thakur',
      avatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      status: 'Superhost',
      joinedDate: 'Joined March 2021',
      responseTime: 'Responds within an hour',
      bio: 'Architect and lifelong Himalayan native. I love sharing peaceful corners of Himachal with mindful travelers.',
    },
    reviews: [
      {
        id: 'rev-01',
        author: 'Arjun Mehta',
        avatar:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
        rating: 5,
        date: 'October 2025',
        comment:
          'One of the most extraordinary stays we have experienced in northern India. The wood stove, mountain views, and Aditi’s warm hospitality made our anniversary unforgettable.',
      },
      {
        id: 'rev-02',
        author: 'Sarah Jenkins',
        avatar:
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
        rating: 5,
        date: 'December 2025',
        comment:
          'Total silence, crisp winter air, and pristine snow views right from bed. The fast Wi-Fi also made remote working seamless.',
      },
    ],
  },
  {
    id: 'stay-02',
    slug: 'casa-verde-goa',
    title: 'Casa Verde',
    tagline: 'Portuguese-era botanical villa with private pool and tranquil verandahs',
    location: 'Assagao, Goa',
    destination: 'Goa',
    country: 'India',
    description:
      'Tucked under a dense canopy of tropical palms and banyan trees in trendy Assagao, Casa Verde is a restored 19th-century Indo-Portuguese manor. Featuring high red-tile ceilings, oyster-shell windows, polished terracotta floors, and an emerald swimming pool framed by bougainvillea, this is an oasis of calm minutes from Goa’s best bistros and North Goa beaches.',
    pricePerNight: 24000,
    rating: 4.98,
    reviewCount: 64,
    propertyType: 'Villa',
    category: 'Design stays',
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1512915922686-57c11dde9b6b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=800&q=80',
    ],
    amenities: [
      'Private swimming pool',
      'Air conditioning',
      'High-speed Wi-Fi',
      'Chef on request',
      'Tropical garden',
      'Daily housekeeping',
      'Free parking',
      'Outdoor dining pavilion',
    ],
    maxGuests: 6,
    bedrooms: 3,
    beds: 3,
    bathrooms: 3,
    featured: true,
    host: {
      name: 'Rohan & Maya Braganza',
      avatar:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      status: 'Superhost',
      joinedDate: 'Joined January 2020',
      responseTime: 'Responds within 30 minutes',
      bio: 'Interior designer and hospitality curator passionate about preserving Goan architectural heritage.',
    },
    reviews: [
      {
        id: 'rev-03',
        author: 'Priya Nambiar',
        avatar:
          'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
        rating: 5,
        date: 'January 2026',
        comment:
          'Casa Verde is sheer poetry. The pool is immaculate, the bird songs in the morning are serene, and the concierge tips for local eateries were spot on.',
      },
    ],
  },
  {
    id: 'stay-03',
    slug: 'the-quiet-courtyard-udaipur',
    title: 'The Quiet Courtyard',
    tagline: 'Regal Haveli sanctuary overlooking Lake Pichola with traditional jharokhas',
    location: 'Old City, Udaipur, Rajasthan',
    destination: 'Udaipur',
    country: 'India',
    description:
      'Immerse yourself in timeless Mewari elegance. The Quiet Courtyard is a restored heritage residence featuring intricately hand-carved stone arches, peaceful marble courtyards with trickling fountains, and a rooftop terrace with front-row sunset views across Lake Pichola and the City Palace.',
    pricePerNight: 18500,
    rating: 4.92,
    reviewCount: 39,
    propertyType: 'Heritage House',
    category: 'Luxury stays',
    images: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80',
    ],
    amenities: [
      'Lake view terrace',
      'Air conditioning',
      'Breakfast included',
      'Courtyard fountain',
      'High-speed Wi-Fi',
      'Heritage library',
      'Airport transfer',
    ],
    maxGuests: 4,
    bedrooms: 2,
    beds: 2,
    bathrooms: 2,
    featured: true,
    host: {
      name: 'Mahipendra Singh',
      avatar:
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
      status: 'Heritage Host',
      joinedDate: 'Joined June 2022',
      responseTime: 'Responds within 2 hours',
      bio: 'Custodian of family heritage homes in Mewar, keen historian and folk arts supporter.',
    },
    reviews: [
      {
        id: 'rev-04',
        author: 'Vikram Sethi',
        avatar:
          'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80',
        rating: 5,
        date: 'November 2025',
        comment:
          'Drinking morning chai while watching sunrise reflections over Lake Pichola from the jharokha was pure magic.',
      },
    ],
  },
  {
    id: 'stay-04',
    slug: 'oceans-edge-villa-goa',
    title: "Ocean's Edge Villa",
    tagline: 'Cliffside coastal sanctuary with infinity pool and panoramic Arabian Sea vistas',
    location: 'Vagator, Goa',
    destination: 'Goa',
    country: 'India',
    description:
      "Perched high on the red laterite cliffs of North Goa, Ocean's Edge Villa is an architecturally celebrated minimalist villa designed to blur indoor and outdoor living. Floor-to-ceiling glass pavilions open directly onto a 20-meter infinity pool that seems to spill straight into the Arabian Sea horizon.",
    pricePerNight: 32000,
    rating: 4.99,
    reviewCount: 71,
    propertyType: 'Villa',
    category: 'Beachfront',
    images: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=800&q=80',
    ],
    amenities: [
      'Infinity pool',
      'Sea view',
      'Private beach path',
      'Air conditioning',
      'In-house chef',
      'Cocktail bar',
      'EV charger',
      'Sound system',
    ],
    maxGuests: 8,
    bedrooms: 4,
    beds: 4,
    bathrooms: 4,
    featured: true,
    host: {
      name: 'Natasha D’Souza',
      avatar:
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
      status: 'Superhost',
      joinedDate: 'Joined September 2019',
      responseTime: 'Responds within an hour',
      bio: 'Hospitality entrepreneur dedicated to curating luxury coastal escapes across the Konkan coastline.',
    },
    reviews: [
      {
        id: 'rev-05',
        author: 'Kunal Kapoor',
        avatar:
          'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80',
        rating: 5,
        date: 'January 2026',
        comment:
          'Unrivaled views. Watching the sunset while floating in the infinity pool is something everyone needs to experience once.',
      },
    ],
  },
  {
    id: 'stay-05',
    slug: 'pinewood-retreat-shimla',
    title: 'Pinewood Retreat',
    tagline: 'Colonial stone cottage surrounded by deodar forests with cedarwood interiors',
    location: 'Mashobra, Shimla, Himachal Pradesh',
    destination: 'Shimla',
    country: 'India',
    description:
      'Settled in the pine groves of Mashobra, just outside Shimla, Pinewood Retreat is a restored 1920s stone cottage. Hand-hewn cedar paneling, antique brass lighting, a well-stocked reading nook with bay windows, and private forest walks offer the quintessential hill-station refuge away from crowds.',
    pricePerNight: 9500,
    rating: 4.89,
    reviewCount: 31,
    propertyType: 'Cottage',
    category: 'Countryside',
    images: [
      'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80',
    ],
    amenities: [
      'Forest view',
      'Wood fireplace',
      'Kitchenette',
      'High-speed Wi-Fi',
      'Hiking trail access',
      'Board games',
      'Free parking on premises',
    ],
    maxGuests: 4,
    bedrooms: 2,
    beds: 2,
    bathrooms: 2,
    featured: true,
    host: {
      name: 'Col. Ranjit Verma',
      avatar:
        'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80',
      status: 'Superhost',
      joinedDate: 'Joined April 2021',
      responseTime: 'Responds within 3 hours',
      bio: 'Retired army officer passionate about nature trails, Himalayan ornithology, and organic gardening.',
    },
    reviews: [
      {
        id: 'rev-06',
        author: 'Ananya Roy',
        avatar:
          'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80',
        rating: 5,
        date: 'September 2025',
        comment:
          'The scent of fresh pine, the crackling fireplace, and absolute peace. We extended our stay by two days because we simply couldn’t leave.',
      },
    ],
  },
  {
    id: 'stay-06',
    slug: 'the-jaipur-heritage-house',
    title: 'The Jaipur Heritage House',
    tagline: 'Artisanal courtyard home celebrating Rajasthani block print craft & pink sandstone',
    location: 'C-Scheme, Jaipur, Rajasthan',
    destination: 'Jaipur',
    country: 'India',
    description:
      'A quiet oasis in Jaipur’s cultural core, this restored townhouse fuses historic Rajasthani craft traditions with sleek modern comfort. Decorated with hand-block-printed textiles, custom teak furniture, and brass accents, it features an open sunlit courtyard, breezy terrace bar, and a curated library of Indian design.',
    pricePerNight: 8500,
    rating: 4.94,
    reviewCount: 52,
    propertyType: 'Heritage House',
    category: 'City escapes',
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80',
    ],
    amenities: [
      'City central location',
      'Rooftop lounge',
      'Air conditioning',
      'Artisanal breakfast',
      'High-speed Wi-Fi',
      'Dedicated workspace',
      'Self check-in',
    ],
    maxGuests: 4,
    bedrooms: 2,
    beds: 2,
    bathrooms: 2,
    featured: true,
    host: {
      name: 'Sunita Rathore',
      avatar:
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
      status: 'Superhost',
      joinedDate: 'Joined May 2021',
      responseTime: 'Responds within an hour',
      bio: 'Textile curator and culinary enthusiast sharing insider tips for the Pink City’s art bazaars.',
    },
    reviews: [
      {
        id: 'rev-07',
        author: 'Ravi Teja',
        avatar:
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
        rating: 5,
        date: 'January 2026',
        comment:
          'Located in a peaceful lane in C-Scheme, yet minutes away from Jaipur’s best cafes. The courtyard breakfast was delicious.',
      },
    ],
  },
  {
    id: 'stay-07',
    slug: 'the-glasshouse-rishikesh',
    title: 'The Glasshouse',
    tagline: 'Modern cantilevered pavilion above the emerald Ganges with Himalayan vistas',
    location: 'Tapovan, Rishikesh, Uttarakhand',
    destination: 'Rishikesh',
    country: 'India',
    description:
      'Suspended dramatically over the forested Ganges valley, The Glasshouse offers a clean, meditative architectural sanctuary. Floor-to-ceiling glass walls capture the turquoise river rushing through the gorge below, while natural limestone floors and warm teak woodwork bring organic warmth to the minimalist spaces.',
    pricePerNight: 16000,
    rating: 4.97,
    reviewCount: 43,
    propertyType: 'Glasshouse',
    category: 'Amazing views',
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600607687644-c7171b42498f?auto=format&fit=crop&w=800&q=80',
    ],
    amenities: [
      'Panoramic river view',
      'Yoga deck',
      'Meditation patio',
      'Air conditioning',
      'Herbal tea bar',
      'High-speed Wi-Fi',
      'Private parking',
    ],
    maxGuests: 4,
    bedrooms: 2,
    beds: 2,
    bathrooms: 2,
    featured: true,
    host: {
      name: 'Kabir & Tara Joshi',
      avatar:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      status: 'Superhost',
      joinedDate: 'Joined August 2022',
      responseTime: 'Responds within 30 minutes',
      bio: 'Yoga instructors and eco-architects living by the sacred river.',
    },
    reviews: [
      {
        id: 'rev-08',
        author: 'Elena Rostova',
        avatar:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        rating: 5,
        date: 'November 2025',
        comment:
          'Waking up to the morning mist over the Ganges right from bed was a deeply spiritual and grounding experience.',
      },
    ],
  },
  {
    id: 'stay-08',
    slug: 'the-hillside-escape-kasauli',
    title: 'The Hillside Escape',
    tagline: 'Terraced stone villa perched among oak orchards with valley sunset views',
    location: 'Kasauli Hills, Himachal Pradesh',
    destination: 'Shimla',
    country: 'India',
    description:
      'Perched on a quiet hill spur surrounded by pine and oak woods, The Hillside Escape is built on cascading stone terraces. Wide glass balconies look down over rolling Shiwalik ridges, while inside, double-height stone walls and Scandinavian-inspired minimalist furniture provide an intimate, uncluttered retreat.',
    pricePerNight: 14500,
    rating: 4.91,
    reviewCount: 35,
    propertyType: 'Villa',
    category: 'Mountains',
    images: [
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
    ],
    amenities: [
      'Valley view',
      'Terraced lawn',
      'Outdoor BBQ fire pit',
      'High-speed Wi-Fi',
      'Dedicated workspace',
      'Full kitchen',
      'Pet friendly',
    ],
    maxGuests: 6,
    bedrooms: 3,
    beds: 3,
    bathrooms: 3,
    featured: true,
    host: {
      name: 'Devika Singhania',
      avatar:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
      status: 'Superhost',
      joinedDate: 'Joined February 2023',
      responseTime: 'Responds within an hour',
      bio: 'Photographer and weekend horticulturist based between Delhi and Kasauli.',
    },
    reviews: [
      {
        id: 'rev-09',
        author: 'Siddharth Rao',
        avatar:
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
        rating: 5,
        date: 'December 2025',
        comment:
          'The sunsets from the deck are unbelievable. Clean, modern, peaceful, and super easy drive from Chandigarh/Delhi.',
      },
    ],
  },
];

export const POPULAR_DESTINATIONS = [
  {
    name: 'Manali',
    state: 'Himachal Pradesh',
    tagline: 'Snowy peaks, cedar forests & serene mountain cabins',
    stayCount: 38,
    image:
      'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Goa',
    state: 'Western Coast',
    tagline: 'Portuguese heritage villas & golden oceanfronts',
    stayCount: 72,
    image:
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Jaipur',
    state: 'Rajasthan',
    tagline: 'Royal courtyards, pink sandstone & artisanal charm',
    stayCount: 45,
    image:
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Udaipur',
    state: 'Rajasthan',
    tagline: 'Lakeside palaces & romantic heritage havelis',
    stayCount: 29,
    image:
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Rishikesh',
    state: 'Uttarakhand',
    tagline: 'Glasshouse retreats along the sacred Ganges gorge',
    stayCount: 31,
    image:
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Shimla',
    state: 'Himachal Pradesh',
    tagline: 'Colonial stone cottages & pine valley trails',
    stayCount: 41,
    image:
      'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=800&q=80',
  },
];

export const CATEGORIES = [
  { id: 'Beachfront', label: 'Beachfront', icon: 'Umbrella' },
  { id: 'Mountains', label: 'Mountains', icon: 'Mountain' },
  { id: 'Cabins', label: 'Cabins', icon: 'Home' },
  { id: 'Amazing views', label: 'Amazing views', icon: 'Eye' },
  { id: 'Luxury stays', label: 'Luxury stays', icon: 'Sparkles' },
  { id: 'Countryside', label: 'Countryside', icon: 'Trees' },
  { id: 'Design stays', label: 'Design stays', icon: 'Palette' },
  { id: 'City escapes', label: 'City escapes', icon: 'Building2' },
] as const;

export function getPropertyBySlug(slug: string): Property | undefined {
  return MOCK_PROPERTIES.find((p) => p.slug === slug);
}

export function filterProperties(filters: {
  destination?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  propertyType?: string;
  guests?: number;
  bedrooms?: number;
  amenities?: string[];
  minRating?: number;
  sortBy?: string;
}): Property[] {
  let results = [...MOCK_PROPERTIES];

  if (filters.destination && filters.destination.trim() !== '') {
    const query = filters.destination.toLowerCase().trim();
    results = results.filter(
      (p) =>
        p.destination.toLowerCase().includes(query) ||
        p.location.toLowerCase().includes(query) ||
        p.title.toLowerCase().includes(query),
    );
  }

  if (filters.category && filters.category !== 'All') {
    results = results.filter((p) => p.category === filters.category);
  }

  if (filters.minPrice !== undefined) {
    results = results.filter((p) => p.pricePerNight >= (filters.minPrice ?? 0));
  }

  if (filters.maxPrice !== undefined) {
    results = results.filter((p) => p.pricePerNight <= (filters.maxPrice ?? 100000));
  }

  if (filters.propertyType && filters.propertyType !== 'All') {
    results = results.filter((p) => p.propertyType === filters.propertyType);
  }

  if (filters.guests && filters.guests > 0) {
    results = results.filter((p) => p.maxGuests >= (filters.guests ?? 1));
  }

  if (filters.bedrooms && filters.bedrooms > 0) {
    results = results.filter((p) => p.bedrooms >= (filters.bedrooms ?? 1));
  }

  if (filters.minRating !== undefined && filters.minRating > 0) {
    results = results.filter((p) => p.rating >= (filters.minRating ?? 0));
  }

  if (filters.amenities && filters.amenities.length > 0) {
    results = results.filter((p) => filters.amenities!.every((a) => p.amenities.includes(a)));
  }

  if (filters.sortBy) {
    switch (filters.sortBy) {
      case 'price-asc':
        results.sort((a, b) => a.pricePerNight - b.pricePerNight);
        break;
      case 'price-desc':
        results.sort((a, b) => b.pricePerNight - a.pricePerNight);
        break;
      case 'rating-desc':
        results.sort((a, b) => b.rating - a.rating);
        break;
      default:
        // recommended
        break;
    }
  }

  return results;
}
