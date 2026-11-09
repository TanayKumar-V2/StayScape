import { Prisma, PropertyModerationStatus, PropertyStatus, HostStatus } from '@prisma/client';

/**
 * Enforces the canonical platform visibility rule:
 * A property is only publicly visible when:
 * 1. Property.status = PUBLISHED
 * 2. Property.moderationStatus = APPROVED
 * 3. HostProfile.status = ACTIVE
 */
export const PUBLIC_PROPERTY_WHERE: Prisma.PropertyWhereInput = {
  status: PropertyStatus.PUBLISHED,
  moderationStatus: PropertyModerationStatus.APPROVED,
  hostProfile: {
    status: HostStatus.ACTIVE,
  },
};
