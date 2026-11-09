import { Test, TestingModule } from '@nestjs/testing';
import { RazorpayWebhookService } from './razorpay-webhook.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RazorpayService } from '../razorpay.service';
import { getQueueToken } from '@nestjs/bullmq';
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { WebhookProcessingStatus } from '@prisma/client';

describe('RazorpayWebhookService', () => {
  let service: RazorpayWebhookService;
  let mockPrisma: any;
  let mockRazorpayService: any;
  let mockWebhookQueue: any;

  beforeEach(async () => {
    mockWebhookQueue = {
      add: jest.fn().mockResolvedValue({ id: 'wh_job_1' }),
    };

    mockRazorpayService = {
      verifyWebhookSignature: jest.fn(),
    };

    mockPrisma = {
      razorpayWebhookEvent: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RazorpayWebhookService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RazorpayService, useValue: mockRazorpayService },
        { provide: getQueueToken('payment-webhooks'), useValue: mockWebhookQueue },
      ],
    }).compile();

    service = module.get<RazorpayWebhookService>(RazorpayWebhookService);
  });

  it('should reject webhook if X-Razorpay-Signature is missing', async () => {
    await expect(service.handleWebhook(Buffer.from('{}'), undefined, 'evt_1', {})).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should reject webhook if cryptographic signature verification fails', async () => {
    mockRazorpayService.verifyWebhookSignature.mockReturnValue(false);

    await expect(
      service.handleWebhook(Buffer.from('{}'), 'invalid_signature', 'evt_1', {}),
    ).rejects.toThrow(BadRequestException);
  });

  it('should return already_processed if event was previously processed', async () => {
    mockRazorpayService.verifyWebhookSignature.mockReturnValue(true);
    mockPrisma.razorpayWebhookEvent.findUnique.mockResolvedValue({
      eventId: 'evt_dup',
      status: WebhookProcessingStatus.PROCESSED,
    });

    const result = await service.handleWebhook(Buffer.from('{}'), 'valid_sig', 'evt_dup', {
      event: 'payment.captured',
    });

    expect(result.received).toBe(true);
    expect(result.status).toBe('already_processed');
    expect(mockWebhookQueue.add).not.toHaveBeenCalled();
  });

  it('should save new webhook event and enqueue BullMQ job', async () => {
    mockRazorpayService.verifyWebhookSignature.mockReturnValue(true);
    mockPrisma.razorpayWebhookEvent.findUnique.mockResolvedValue(null);
    mockPrisma.razorpayWebhookEvent.create.mockResolvedValue({
      id: 'id_1',
      eventId: 'evt_new',
      status: WebhookProcessingStatus.RECEIVED,
    });

    const body = {
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_123', order_id: 'order_123' } } },
    };

    const result = await service.handleWebhook(
      Buffer.from(JSON.stringify(body)),
      'valid_sig',
      'evt_new',
      body,
    );

    expect(result.received).toBe(true);
    expect(result.status).toBe('enqueued');
    expect(mockPrisma.razorpayWebhookEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventId: 'evt_new',
          event: 'payment.captured',
          status: WebhookProcessingStatus.RECEIVED,
        }),
      }),
    );
    expect(mockWebhookQueue.add).toHaveBeenCalledWith(
      'process-webhook',
      expect.objectContaining({
        eventId: 'evt_new',
        event: 'payment.captured',
      }),
      expect.any(Object),
    );
  });

  it('must not acknowledge success when durable event enqueue fails', async () => {
    mockRazorpayService.verifyWebhookSignature.mockReturnValue(true);
    mockPrisma.razorpayWebhookEvent.findUnique.mockResolvedValue(null);
    mockPrisma.razorpayWebhookEvent.create.mockResolvedValue({
      id: 'id_2',
      eventId: 'evt_retry',
      status: WebhookProcessingStatus.RECEIVED,
    });
    mockWebhookQueue.add.mockRejectedValue(new Error('queue unavailable'));

    await expect(
      service.handleWebhook(Buffer.from('{}'), 'valid_sig', 'evt_retry', {
        event: 'payment.captured',
      }),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(mockPrisma.razorpayWebhookEvent.create).toHaveBeenCalled();
  });
});
