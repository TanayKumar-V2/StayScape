import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { getQueueToken } from '@nestjs/bullmq';
import { BookingStatus, HostStatus, PropertyStatus, PropertyModerationStatus, Prisma } from '@prisma/client';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { formatIsoDate, getTodayIsoDate, parseIsoDate } from '../common/utils/date.utils';

describe('BookingsService', () => {
  let service: BookingsService;

  const mockProperty = {
    id: 'prop-123',
    host_profile_id: 'host-profile-1',
    slug: 'the-alpine-hideaway',
    title: 'The Alpine Hideaway',
    city: 'Manali',
    status: PropertyStatus.PUBLISHED,
    moderation_status: PropertyModerationStatus.APPROVED,
    max_guests: 4,
    price_per_night_paise: 250000,
    cleaning_fee_paise: 50000,
    currency: 'INR',
  };

  const mockPrisma = {
    $transaction: jest.fn(),
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
    booking: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockAvailabilityService = {
    invalidateAvailabilityCache: jest.fn().mockResolvedValue(undefined),
  };

  const mockQueue = {
    add: jest.fn().mockResolvedValue({ id: 'job-1' }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AvailabilityService, useValue: mockAvailabilityService },
        { provide: getQueueToken('booking-expiration'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  describe('createHold', () => {
    it('should successfully create a temporary hold and schedule delayed expiration', async () => {
      const today = getTodayIsoDate();
      const checkInObj = parseIsoDate(today);
      checkInObj.setUTCDate(checkInObj.getUTCDate() + 5);
      const checkInStr = formatIsoDate(checkInObj);

      const checkOutObj = new Date(checkInObj);
      checkOutObj.setUTCDate(checkOutObj.getUTCDate() + 3);
      const checkOutStr = formatIsoDate(checkOutObj);

      const createdBooking = {
        id: 'booking-uuid',
        bookingReference: 'STY-TEST1234',
        userId: 'guest-user-1',
        propertyId: 'prop-123',
        checkIn: checkInObj,
        checkOut: checkOutObj,
        nights: 3,
        guestCount: 2,
        propertyTitleSnapshot: 'The Alpine Hideaway',
        propertySlugSnapshot: 'the-alpine-hideaway',
        propertyCitySnapshot: 'Manali',
        propertyCoverImageSnapshot: 'https://example.com/cover.jpg',
        pricePerNightPaise: 250000,
        cleaningFeePaise: 50000,
        nightlySubtotalPaise: 750000,
        totalAmountPaise: 800000,
        currency: 'INR',
        status: BookingStatus.HOLD,
        holdExpiresAt: new Date(Date.now() + 600000),
        confirmedAt: null,
        cancelledAt: null,
        expiredAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock transaction execution
      mockPrisma.$transaction.mockImplementation((callback: any) => {
        const tx = {
          $queryRaw: jest
            .fn()
            .mockResolvedValueOnce([mockProperty]) // Select property FOR UPDATE
            .mockResolvedValueOnce([{ user_id: 'host-user-999', status: HostStatus.ACTIVE }]) // Host profile
            .mockResolvedValueOnce([]) // Overlaps: none
            .mockResolvedValueOnce([{ secure_url: 'https://example.com/cover.jpg' }]), // Cover image
          $executeRaw: jest.fn().mockResolvedValue(0), // Stale hold cleanup
          booking: {
            create: jest.fn().mockResolvedValue(createdBooking),
          },
        };
        return callback(tx);
      });

      const result = await service.createHold('guest-user-1', {
        propertySlug: 'the-alpine-hideaway',
        checkIn: checkInStr,
        checkOut: checkOutStr,
        guestCount: 2,
      });

      expect(result.bookingReference).toBe('STY-TEST1234');
      expect(result.status).toBe(BookingStatus.HOLD);
      expect(result.stay.nights).toBe(3);
      expect(result.priceBreakdown.totalAmountPaise).toBe(800000);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'expire-booking-hold',
        expect.objectContaining({
          bookingId: 'booking-uuid',
          bookingReference: 'STY-TEST1234',
        }),
        expect.objectContaining({ delay: 600000 }),
      );
      expect(mockAvailabilityService.invalidateAvailabilityCache).toHaveBeenCalledWith(
        'the-alpine-hideaway',
      );
    });

    it('should throw ForbiddenException if host attempts to book their own property', async () => {
      const start = formatIsoDate(new Date(Date.now() + 86400000));
      const end = formatIsoDate(new Date(Date.now() + 3 * 86400000));

      mockPrisma.$transaction.mockImplementation((callback: any) => {
        const tx = {
          $queryRaw: jest
            .fn()
            .mockResolvedValueOnce([mockProperty])
            .mockResolvedValueOnce([{ user_id: 'host-user-1', status: HostStatus.ACTIVE }]), // Same as caller
        };
        return callback(tx);
      });

      await expect(
        service.createHold('host-user-1', {
          propertySlug: 'the-alpine-hideaway',
          checkIn: start,
          checkOut: end,
          guestCount: 2,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if requested dates overlap an active booking', async () => {
      const start = formatIsoDate(new Date(Date.now() + 86400000));
      const end = formatIsoDate(new Date(Date.now() + 3 * 86400000));

      mockPrisma.$transaction.mockImplementation((callback: any) => {
        const tx = {
          $queryRaw: jest
            .fn()
            .mockResolvedValueOnce([mockProperty])
            .mockResolvedValueOnce([{ user_id: 'host-user-999', status: HostStatus.ACTIVE }])
            .mockResolvedValueOnce([{ id: 'conflicting-booking-id' }]), // Overlap found!
          $executeRaw: jest.fn().mockResolvedValue(0),
        };
        return callback(tx);
      });

      await expect(
        service.createHold('guest-user-1', {
          propertySlug: 'the-alpine-hideaway',
          checkIn: start,
          checkOut: end,
          guestCount: 2,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should catch PostgreSQL exclusion constraint violation (23P01) and throw ConflictException', async () => {
      const start = formatIsoDate(new Date(Date.now() + 86400000));
      const end = formatIsoDate(new Date(Date.now() + 3 * 86400000));

      const exclusionError = new Prisma.PrismaClientUnknownRequestError(
        'conflicting key value violates exclusion constraint "no_overlapping_active_bookings" (code: 23P01)',
        { clientVersion: '6.19.3' },
      );

      mockPrisma.$transaction.mockRejectedValueOnce(exclusionError);

      await expect(
        service.createHold('guest-user-1', {
          propertySlug: 'the-alpine-hideaway',
          checkIn: start,
          checkOut: end,
          guestCount: 2,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('cancelHold', () => {
    it('should cancel an active temporary hold', async () => {
      const activeHold = {
        id: 'booking-1',
        bookingReference: 'STY-CANCEL12',
        userId: 'guest-1',
        propertyId: 'prop-123',
        status: BookingStatus.HOLD,
        holdExpiresAt: new Date(Date.now() + 300000),
        checkIn: new Date(),
        checkOut: new Date(),
        nights: 2,
        guestCount: 2,
        propertyTitleSnapshot: 'The Alpine Hideaway',
        propertySlugSnapshot: 'the-alpine-hideaway',
        propertyCitySnapshot: 'Manali',
        propertyCoverImageSnapshot: null,
        pricePerNightPaise: 250000,
        cleaningFeePaise: 50000,
        nightlySubtotalPaise: 500000,
        totalAmountPaise: 550000,
        currency: 'INR',
        confirmedAt: null,
        cancelledAt: null,
        expiredAt: null,
        createdAt: new Date(),
      };

      const cancelledBooking = {
        ...activeHold,
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
      };

      mockPrisma.$transaction.mockImplementation((callback: any) => {
        const tx = {
          booking: {
            findUnique: jest.fn().mockResolvedValue(activeHold),
            update: jest.fn().mockResolvedValue(cancelledBooking),
          },
          $queryRaw: jest.fn().mockResolvedValue([]),
        };
        return callback(tx);
      });

      const result = await service.cancelHold('guest-1', 'STY-CANCEL12');
      expect(result.status).toBe(BookingStatus.CANCELLED);
      expect(mockAvailabilityService.invalidateAvailabilityCache).toHaveBeenCalledWith(
        'the-alpine-hideaway',
      );
    });

    it('should throw NotFoundException if booking does not exist or user is not owner', async () => {
      mockPrisma.$transaction.mockImplementation((callback: any) => {
        const tx = {
          booking: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        };
        return callback(tx);
      });

      await expect(service.cancelHold('guest-1', 'STY-NOTFOUND')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if hold has already expired', async () => {
      const expiredHold = {
        id: 'booking-expired',
        bookingReference: 'STY-EXPIRED1',
        userId: 'guest-1',
        propertyId: 'prop-123',
        status: BookingStatus.HOLD,
        holdExpiresAt: new Date(Date.now() - 60000), // Expired 1 min ago
        checkIn: new Date(),
        checkOut: new Date(),
        nights: 2,
        guestCount: 2,
      };

      mockPrisma.$transaction.mockImplementation((callback: any) => {
        const tx = {
          booking: {
            findUnique: jest.fn().mockResolvedValue(expiredHold),
            update: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      await expect(service.cancelHold('guest-1', 'STY-EXPIRED1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getUserBookings', () => {
    it('should return paginated user bookings', async () => {
      mockPrisma.booking.count.mockResolvedValue(1);
      mockPrisma.booking.findMany.mockResolvedValue([
        {
          id: 'booking-1',
          bookingReference: 'STY-USER1234',
          userId: 'user-1',
          propertyId: 'prop-123',
          checkIn: new Date(),
          checkOut: new Date(),
          nights: 2,
          guestCount: 2,
          propertyTitleSnapshot: 'The Alpine Hideaway',
          propertySlugSnapshot: 'the-alpine-hideaway',
          propertyCitySnapshot: 'Manali',
          propertyCoverImageSnapshot: null,
          pricePerNightPaise: 250000,
          cleaningFeePaise: 50000,
          nightlySubtotalPaise: 500000,
          totalAmountPaise: 550000,
          currency: 'INR',
          status: BookingStatus.HOLD,
          holdExpiresAt: new Date(Date.now() + 500000),
          confirmedAt: null,
          cancelledAt: null,
          expiredAt: null,
          createdAt: new Date(),
        },
      ]);

      const result = await service.getUserBookings('user-1', { page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.bookingReference).toBe('STY-USER1234');
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });
  });
});
