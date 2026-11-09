import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RazorpayService } from './razorpay.service';
import * as crypto from 'crypto';

describe('RazorpayService', () => {
  let service: RazorpayService;
  const mockKeySecret = 'test_secret_key_mock_12345';
  const mockWebhookSecret = 'test_webhook_secret_mock_67890';
  const mockWebhookSecretPrevious = 'test_previous_webhook_secret';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RazorpayService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'app.razorpay.keyId') return 'rzp_test_mockId';
              if (key === 'app.razorpay.keySecret') return mockKeySecret;
              if (key === 'app.razorpay.webhookSecret') return mockWebhookSecret;
              if (key === 'app.razorpay.webhookSecretPrevious') return mockWebhookSecretPrevious;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RazorpayService>(RazorpayService);
  });

  describe('verifyPaymentSignature', () => {
    it('should return true for a valid cryptographic payment signature', () => {
      const orderId = 'order_test_123456';
      const paymentId = 'pay_test_987654';
      const payload = `${orderId}|${paymentId}`;
      const validSignature = crypto
        .createHmac('sha256', mockKeySecret)
        .update(payload)
        .digest('hex');

      const result = service.verifyPaymentSignature(orderId, paymentId, validSignature);
      expect(result).toBe(true);
    });

    it('should return false for a tampered payment signature', () => {
      const orderId = 'order_test_123456';
      const paymentId = 'pay_test_987654';
      const invalidSignature = 'tampered_signature_hex_value_1234567890abcdef1234567890abcdef';

      const result = service.verifyPaymentSignature(orderId, paymentId, invalidSignature);
      expect(result).toBe(false);
    });

    it('should return false for a signature signed with the wrong secret', () => {
      const orderId = 'order_test_123456';
      const paymentId = 'pay_test_987654';
      const wrongSecretSignature = crypto
        .createHmac('sha256', 'wrong_secret_key')
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const result = service.verifyPaymentSignature(orderId, paymentId, wrongSecretSignature);
      expect(result).toBe(false);
    });

    it('should return false for empty or missing parameters', () => {
      expect(service.verifyPaymentSignature('', 'pay_123', 'sig')).toBe(false);
      expect(service.verifyPaymentSignature('order_123', '', 'sig')).toBe(false);
      expect(service.verifyPaymentSignature('order_123', 'pay_123', '')).toBe(false);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should return true for a valid webhook signature matching the primary secret', () => {
      const rawBody = JSON.stringify({ event: 'payment.captured', test: true });
      const validSignature = crypto
        .createHmac('sha256', mockWebhookSecret)
        .update(Buffer.from(rawBody, 'utf8'))
        .digest('hex');

      const result = service.verifyWebhookSignature(rawBody, validSignature);
      expect(result).toBe(true);
    });

    it('should return true for a valid signature matching the previous secret (secret rotation)', () => {
      const rawBody = JSON.stringify({ event: 'order.paid' });
      const rotationSignature = crypto
        .createHmac('sha256', mockWebhookSecretPrevious)
        .update(Buffer.from(rawBody, 'utf8'))
        .digest('hex');

      const result = service.verifyWebhookSignature(rawBody, rotationSignature);
      expect(result).toBe(true);
    });

    it('should return false for a tampered webhook payload', () => {
      const rawBody = JSON.stringify({ event: 'payment.captured', test: true });
      const tamperedBody = JSON.stringify({ event: 'payment.captured', test: false });
      const signature = crypto
        .createHmac('sha256', mockWebhookSecret)
        .update(Buffer.from(rawBody, 'utf8'))
        .digest('hex');

      const result = service.verifyWebhookSignature(tamperedBody, signature);
      expect(result).toBe(false);
    });

    it('should return false for empty body or signature', () => {
      expect(service.verifyWebhookSignature('', 'sig')).toBe(false);
      expect(service.verifyWebhookSignature('body', '')).toBe(false);
    });
  });

  describe('getKeyId', () => {
    it('should return the configured Razorpay Key ID', () => {
      expect(service.getKeyId()).toBe('rzp_test_mockId');
    });
  });
});
