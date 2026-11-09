import { Test, TestingModule } from '@nestjs/testing';
import { AvailabilityService } from './availability.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { BookingStatus, PropertyStatus, HostStatus, PropertyModerationStatus } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';
import { formatIsoDate, getTodayIsoDate, parseIsoDate } from '../common/utils/date.utils';

describe('AvailabilityService', () => {
  let service: AvailabilityService;

  const mockProperty = {
    id: 'prop-123',
    slug: 'the-alpine-hideaway',
    title: 'The Alpine Hideaway',
    status: PropertyStatus.PUBLISHED,
    moderationStatus: PropertyModerationStatus.APPROVED,
    maxGuests: 4,
    pricePerNightPaise: 250000,
    cleaningFeePaise: 50000,
    currency: 'INR',
    hostProfile: {
      status: HostStatus.ACTIVE,
    },
  };

  const mockPrisma = {
    property: {
      findUnique: jest.fn(),
    },
    booking: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    getClient: jest.fn().mockReturnValue({
      incr: jest.fn().mockResolvedValue(2),
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<AvailabilityService>(AvailabilityService);
  });

  describe('getUnavailableRanges', () => {
    it('should return unavailable date ranges for published property', async () => {
      mockPrisma.property.findUnique.mockResolvedValue(mockProperty);

      const checkInDate = parseIsoDate('2026-12-10');
      const checkOutDate = parseIsoDate('2026-12-15');

      mockPrisma.booking.findMany.mockResolvedValue([
        {
          id: 'booking-1',
          status: BookingStatus.CONFIRMED,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          holdExpiresAt: null,
        },
      ]);

      const result = await service.getUnavailableRanges('the-alpine-hideaway', {
        startDate: '2026-12-01',
        endDate: '2026-12-31',
      });

      expect(result.propertySlug).toBe('the-alpine-hideaway');
      expect(result.unavailableRanges).toHaveLength(1);
      expect(result.unavailableRanges[0]).toEqual({
        checkIn: '2026-12-10',
        checkOut: '2026-12-15',
      });
    });

    it('should exclude expired holds from unavailable ranges', async () => {
      mockPrisma.property.findUnique.mockResolvedValue(mockProperty);

      const pastHoldExpiresAt = new Date(Date.now() - 60000); // 1 minute ago

      mockPrisma.booking.findMany.mockResolvedValue([
        {
          id: 'booking-hold-expired',
          status: BookingStatus.HOLD,
          checkIn: parseIsoDate('2026-12-10'),
          checkOut: parseIsoDate('2026-12-15'),
          holdExpiresAt: pastHoldExpiresAt,
        },
      ]);

      const result = await service.getUnavailableRanges('the-alpine-hideaway', {
        startDate: '2026-12-01',
        endDate: '2026-12-31',
      });

      expect(result.unavailableRanges).toHaveLength(0);
    });

    it('should throw NotFoundException if property is not found or not published', async () => {
      mockPrisma.property.findUnique.mockResolvedValue({
        id: 'prop-draft',
        slug: 'draft-stay',
        status: PropertyStatus.DRAFT,
      });

      await expect(
        service.getUnavailableRanges('draft-stay', {
          startDate: '2026-12-01',
          endDate: '2026-12-31',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('checkAvailabilityAndQuote', () => {
    it('should return available quote with exact integer paise pricing', async () => {
      mockPrisma.property.findUnique.mockResolvedValue(mockProperty);
      mockPrisma.booking.findFirst.mockResolvedValue(null);

      const today = getTodayIsoDate();
      const startObj = parseIsoDate(today);
      startObj.setUTCDate(startObj.getUTCDate() + 5);
      const checkInStr = formatIsoDate(startObj);

      const endObj = new Date(startObj);
      endObj.setUTCDate(endObj.getUTCDate() + 3);
      const checkOutStr = formatIsoDate(endObj);

      const res = await service.checkAvailabilityAndQuote('the-alpine-hideaway', {
        checkIn: checkInStr,
        checkOut: checkOutStr,
        guestCount: 2,
      });

      expect(res.available).toBe(true);
      expect(res.stay?.nights).toBe(3);
      expect(res.priceBreakdown).toEqual({
        pricePerNightPaise: 250000,
        nightlySubtotalPaise: 750000, // 250000 * 3
        cleaningFeePaise: 50000,
        totalAmountPaise: 800000, // 750000 + 50000
        currency: 'INR',
      });
    });

    it('should return DATES_UNAVAILABLE if dates overlap with active reservation', async () => {
      mockPrisma.property.findUnique.mockResolvedValue(mockProperty);
      mockPrisma.booking.findFirst.mockResolvedValue({ id: 'existing-booking' });

      const today = getTodayIsoDate();
      const startObj = parseIsoDate(today);
      startObj.setUTCDate(startObj.getUTCDate() + 10);
      const checkInStr = formatIsoDate(startObj);

      const endObj = new Date(startObj);
      endObj.setUTCDate(endObj.getUTCDate() + 5);
      const checkOutStr = formatIsoDate(endObj);

      const res = await service.checkAvailabilityAndQuote('the-alpine-hideaway', {
        checkIn: checkInStr,
        checkOut: checkOutStr,
        guestCount: 2,
      });

      expect(res.available).toBe(false);
      expect(res.reason).toBe('DATES_UNAVAILABLE');
    });

    it('should return GUEST_CAPACITY_EXCEEDED if guestCount exceeds maxGuests', async () => {
      mockPrisma.property.findUnique.mockResolvedValue(mockProperty);

      const today = getTodayIsoDate();
      const startObj = parseIsoDate(today);
      startObj.setUTCDate(startObj.getUTCDate() + 10);
      const checkInStr = formatIsoDate(startObj);

      const endObj = new Date(startObj);
      endObj.setUTCDate(endObj.getUTCDate() + 5);
      const checkOutStr = formatIsoDate(endObj);

      const res = await service.checkAvailabilityAndQuote('the-alpine-hideaway', {
        checkIn: checkInStr,
        checkOut: checkOutStr,
        guestCount: 10, // maxGuests is 4
      });

      expect(res.available).toBe(false);
      expect(res.reason).toBe('GUEST_CAPACITY_EXCEEDED');
    });
  });
});
