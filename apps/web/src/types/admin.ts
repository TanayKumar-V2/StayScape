export interface AdminDashboardOverview {
  summary: {
    totalUsers: number;
    activeUsers: number;
    totalHosts: number;
    activeHosts: number;
    totalProperties: number;
    publishedProperties: number;
    totalBookings: number;
    confirmedBookings: number;
    completedBookings: number;
    openReports: number;
  };
  payments: {
    grossCapturedPaise: number;
    processedRefundsPaise: number;
    netCapturedPaise: number;
    currency: string;
  };
}

export interface AdminTimeseriesData {
  metric: string;
  period: string;
  points: Array<{
    date: string;
    count: number;
    value?: number;
  }>;
}

export interface AdminPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface AdminUserItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  avatarUrl: string | null;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  isHost: boolean;
  hostProfile: {
    id: string;
    displayName: string;
    status: string;
  } | null;
  bookingsCount: number;
  reviewsCount: number;
}

export interface AdminUserDetails extends AdminUserItem {
  updatedAt: string;
  hostProfile: {
    id: string;
    displayName: string;
    bio: string | null;
    status: string;
    createdAt: string;
    propertiesCount: number;
  } | null;
  stats: {
    bookingsCount: number;
    reviewsCount: number;
    wishlistCount: number;
    reportsCount: number;
  };
  recentBookings: Array<{
    id: string;
    bookingReference: string;
    propertyTitle: string;
    checkIn: string;
    checkOut: string;
    totalAmountPaise: number;
    status: string;
    createdAt: string;
  }>;
}

export interface AdminHostItem {
  id: string;
  userId: string;
  displayName: string;
  bio: string | null;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
  createdAt: string;
  userEmail: string;
  userName: string;
  userStatus: string;
  totalProperties: number;
  publishedProperties: number;
}

export interface AdminHostDetails {
  id: string;
  displayName: string;
  bio: string | null;
  contactPhone: string | null;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
  termsAcceptedAt: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    status: string;
    createdAt: string;
    lastLoginAt: string | null;
  };
  stats: {
    totalProperties: number;
    publishedProperties: number;
    draftProperties: number;
    pausedProperties: number;
  };
  properties: Array<{
    id: string;
    title: string;
    slug: string;
    location: string;
    propertyType: string;
    status: string;
    moderationStatus: string;
    pricePerNightPaise: number;
    coverImage: string | null;
    bookingsCount: number;
    reviewsCount: number;
    createdAt: string;
  }>;
}

export interface AdminPropertyItem {
  id: string;
  title: string;
  slug: string;
  city: string;
  state: string;
  country: string;
  propertyType: string;
  basePricePaise: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'PAUSED';
  moderationStatus: 'APPROVED' | 'FLAGGED' | 'REJECTED';
  moderatedAt: string | null;
  moderationReason: string | null;
  moderatedByEmail: string | null;
  createdAt: string;
  coverImage: string | null;
  host: {
    id: string;
    displayName: string;
    email: string;
  };
  counts: {
    bookings: number;
    reviews: number;
    reports: number;
  };
}

export interface AdminPropertyDetails extends AdminPropertyItem {
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  cleaningFeePaise: number;
  images: Array<{
    id: string;
    secureUrl: string;
    caption: string | null;
    isCover: boolean;
  }>;
  amenities: Array<{
    id: string;
    name: string;
    slug: string;
    category: string;
  }>;
}

export interface AdminReviewItem {
  id: string;
  overallRating: number;
  cleanlinessRating: number;
  accuracyRating: number;
  checkInRating: number;
  communicationRating: number;
  locationRating: number;
  valueRating: number;
  comment: string;
  status: 'PUBLISHED' | 'HIDDEN';
  createdAt: string;
  hiddenReason: string | null;
  hiddenAt: string | null;
  property: {
    id: string;
    title: string;
    slug: string;
    city: string;
  };
  author: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
  bookingReference: string;
  reportsCount: number;
}

export interface AdminReportItem {
  id: string;
  targetType: 'PROPERTY' | 'REVIEW' | 'USER' | 'MESSAGE';
  targetId: string;
  targetPreview: string;
  reason: string;
  description: string | null;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
  resolutionNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  reporter: {
    id: string;
    name: string;
    email: string;
  };
  assignedAdmin: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface AdminBookingItem {
  id: string;
  bookingReference: string;
  status: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guestCount: number;
  totalAmountPaise: number;
  currency: string;
  createdAt: string;
  confirmedAt: string | null;
  property: {
    id: string;
    slug: string;
    title: string;
    city: string;
    host: {
      id: string;
      name: string;
      email: string;
    } | null;
  };
  guest: {
    id: string;
    name: string;
    email: string;
  };
  paymentSummary: {
    hasCapturedPayment: boolean;
    paymentMethod: string | null;
    transactionCount: number;
  };
}

export interface AdminBookingDetails extends Omit<AdminBookingItem, 'property'> {
  pricing: {
    pricePerNightPaise: number;
    cleaningFeePaise: number;
    nightlySubtotalPaise: number;
    totalAmountPaise: number;
    currency: string;
  };
  timestamps: {
    createdAt: string;
    holdExpiresAt: string | null;
    confirmedAt: string | null;
    cancelledAt: string | null;
    expiredAt: string | null;
    completedAt: string | null;
  };
  property: {
    id: string;
    slug: string;
    title: string;
    city: string;
    coverImage: string | null;
    host: {
      id: string;
      displayName: string;
      user: {
        id: string;
        name: string;
        email: string;
      };
    } | null;
  };
  guest: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    status: string;
  };
  paymentOrder: {
    id: string;
    providerOrderId: string;
    status: string;
    amountPaise: number;
    currency: string;
    createdAt: string;
  } | null;
  transactions: Array<{
    id: string;
    providerPaymentId: string;
    status: string;
    amountPaise: number;
    currency: string;
    method: string | null;
    bank: string | null;
    wallet: string | null;
    vpa: string | null;
    capturedAt: string | null;
    createdAt: string;
  }>;
  refunds: Array<{
    id: string;
    refundReference: string;
    amountPaise: number;
    status: string;
    reason: string | null;
    createdAt: string;
    processedAt: string | null;
  }>;
  review: {
    id: string;
    overallRating: number;
    comment: string;
    status: string;
    createdAt: string;
  } | null;
}

export interface AdminPaymentItem {
  id: string;
  providerPaymentId: string;
  providerOrderId: string;
  bookingReference: string;
  propertyTitle: string;
  customerName: string;
  customerEmail: string;
  amountPaise: number;
  currency: string;
  status: string;
  method: string | null;
  bank: string | null;
  wallet: string | null;
  vpa: string | null;
  capturedAt: string | null;
  createdAt: string;
  refundsCount: number;
}

export interface AdminRefundItem {
  id: string;
  refundReference: string;
  razorpayRefundId: string | null;
  paymentTransactionId: string;
  providerPaymentId: string;
  bookingReference: string;
  propertyTitle: string;
  customerEmail: string;
  amountPaise: number;
  currency: string;
  status: string;
  reason: string | null;
  failureReason: string | null;
  createdAt: string;
  processedAt: string | null;
}

export interface AdminAiUsageStats {
  summary: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    successRatePercentage: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
    averageDurationMs: number;
  };
  requestsByFeature: Array<{
    feature: string;
    count: number;
    averageDurationMs: number;
  }>;
  requestsByModel: Array<{
    model: string;
    count: number;
  }>;
  dailyTrends: Array<{
    date: string;
    total: number;
    success: number;
    failed: number;
    tokens: number;
    avgDurationMs: number;
  }>;
}

export interface AdminAuditLogItem {
  id: string;
  adminUserId: string;
  adminUserEmail: string;
  adminUserName: string;
  action: string;
  entityType: string;
  entityId: string;
  reason: string | null;
  beforeData: Record<string, unknown> | null;
  afterData: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}
