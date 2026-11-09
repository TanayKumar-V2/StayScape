import { Test, TestingModule } from '@nestjs/testing';
import { BookingCompletionProcessor } from './booking-completion.processor';
import { BookingsService } from './bookings.service';
import { Job } from 'bullmq';

describe('BookingCompletionProcessor', () => {
  let processor: BookingCompletionProcessor;
  let bookingsService: BookingsService;

  const mockBookingsService = {
    completePastConfirmedBookings: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingCompletionProcessor,
        { provide: BookingsService, useValue: mockBookingsService },
      ],
    }).compile();

    processor = module.get<BookingCompletionProcessor>(BookingCompletionProcessor);
    bookingsService = module.get<BookingsService>(BookingsService);
  });

  it('calls completePastConfirmedBookings and returns transitioned count', async () => {
    mockBookingsService.completePastConfirmedBookings.mockResolvedValue(4);

    const mockJob = {
      id: 'job-123',
      data: { triggeredAt: new Date().toISOString() },
    } as unknown as Job;

    const result = await processor.process(mockJob);

    expect(bookingsService.completePastConfirmedBookings).toHaveBeenCalled();
    expect(result.transitionedCount).toBe(4);
  });

  it('propagates error when bookingsService fails', async () => {
    mockBookingsService.completePastConfirmedBookings.mockRejectedValue(
      new Error('Database transaction lock error'),
    );

    const mockJob = {
      id: 'job-err',
      data: {},
    } as unknown as Job;

    await expect(processor.process(mockJob)).rejects.toThrow('Database transaction lock error');
  });
});
