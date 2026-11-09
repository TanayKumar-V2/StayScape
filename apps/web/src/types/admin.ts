export interface AdminDashboardOverview {
  users: {
    total: number;
    active: number;
    suspended: number;
    newLast30Days: number;
  };
  hosts: {
    total: number;
    active: number;
    suspended: number;
  };
  properties: {
    total: number;
    published: number;
    approved: number;
    flagged: number;
    rejected: number;
    draft: number;
  };
  bookings: {
    total: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    expired: number;
    activeHolds: number;
    totalVolumePaise: number;
  };
  payments: {
    capturedCount: number;
    capturedVolumePaise: number;
    pendingRefundsCount: number;
  };
  reports: {
    open: number;
    underReview: number;
    resolved: number;
    dismissed: number;
  };
  ai: {
    totalRequests: number;
    last24HoursRequests: number;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    reason: string | null;
    createdAt: string;
    adminUser: {
      email: string;
      firstName: string;
      lastName: string;
    };
  }>;
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
  displayName: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    accountStatus: string;
  };
  counts: {
    properties: number;
    publishedProperties: number;
    totalBookings: number;
  };
  metrics: {
    completedStays: number;
    grossVolumePaise: number;
  };
}

export interface AdminHostDetails extends AdminHostItem {
  bio: string | null;
  properties: Array<{
    id: string;
    title: string;
    slug: string;
    status: string;
    moderationStatus: string;
    city: string;
    basePricePaise: number;
    bookingsCount: number;
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
  totals: {
    totalRequests: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
    avgLatencyMs: number;
    errorCount: number;
    errorRate: number;
  };
  byFeature: Record<
    string,
    {
      count: number;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      estimatedCostUsd: number;
      avgLatencyMs: number;
    }
  >;
  recentLogs: Array<{
    id: string;
    feature: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    latencyMs: number;
    statusCode: number;
    errorMessage: string | null;
    createdAt: string;
    userEmail: string | null;
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
