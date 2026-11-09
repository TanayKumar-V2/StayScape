import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';

export interface RazorpayOrderResult {
  id: string;
  amount: number | string;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes?: Record<string, string | number>;
  created_at: number;
}

export interface RazorpayPaymentResult {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  method: string;
  bank?: string | null;
  wallet?: string | null;
  vpa?: string | null;
  email?: string | null;
  contact?: string | null;
  fee?: number | null;
  tax?: number | null;
  error_code?: string | null;
  error_description?: string | null;
  error_source?: string | null;
  error_step?: string | null;
  error_reason?: string | null;
  card?: {
    id: string;
    network: string;
    last4: string;
    type: string;
  } | null;
  captured?: boolean;
  created_at: number;
}

export interface RazorpayRefundResult {
  id: string;
  payment_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processed' | 'failed';
  receipt?: string | null;
  notes?: Record<string, string | number>;
  created_at: number;
}

@Injectable()
export class RazorpayService {
  private readonly client: Razorpay;
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;
  private readonly webhookSecretPrevious: string;
  private readonly logger = new Logger(RazorpayService.name);

  constructor(private readonly config: ConfigService) {
    this.keyId =
      this.config.get<string>('app.razorpay.keyId') ??
      process.env['RAZORPAY_KEY_ID'] ??
      'rzp_test_placeholder';

    this.keySecret =
      this.config.get<string>('app.razorpay.keySecret') ??
      process.env['RAZORPAY_KEY_SECRET'] ??
      'rzp_test_secret_placeholder';

    this.webhookSecret =
      this.config.get<string>('app.razorpay.webhookSecret') ??
      process.env['RAZORPAY_WEBHOOK_SECRET'] ??
      'rzp_whsec_placeholder';

    this.webhookSecretPrevious =
      this.config.get<string>('app.razorpay.webhookSecretPrevious') ??
      process.env['RAZORPAY_WEBHOOK_SECRET_PREVIOUS'] ??
      '';

    this.client = new Razorpay({
      key_id: this.keyId,
      key_secret: this.keySecret,
    });
  }

  getKeyId(): string {
    return this.keyId;
  }

  private formatError(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === 'object' && err !== null) {
      try {
        return JSON.stringify(err);
      } catch {
        return 'Unknown object error';
      }
    }
    return typeof err === 'string' ? err : 'Unknown error';
  }

  /**
   * Creates a Razorpay Order.
   * Amounts must strictly be integer paise.
   */
  async createOrder(params: {
    amountPaise: number;
    currency?: string;
    receipt: string;
    notes?: Record<string, string>;
  }): Promise<RazorpayOrderResult> {
    try {
      const order = await this.client.orders.create({
        amount: Math.round(params.amountPaise),
        currency: params.currency || 'INR',
        receipt: params.receipt,
        notes: params.notes,
      });

      return order as unknown as RazorpayOrderResult;
    } catch (err: unknown) {
      const errorMsg = this.formatError(err);
      this.logger.error(
        `Failed to create Razorpay order for receipt "${params.receipt}": ${errorMsg}`,
      );

      // In local development or testing without live Razorpay API keys (placeholder key), provide simulated order
      if (this.keyId === 'rzp_test_placeholder') {
        this.logger.warn(
          'Returning simulated Razorpay order because RAZORPAY_KEY_ID is set to placeholder.',
        );
        return {
          id: `order_${crypto.randomBytes(8).toString('hex')}`,
          amount: Math.round(params.amountPaise),
          currency: params.currency || 'INR',
          receipt: params.receipt,
          status: 'created',
          attempts: 0,
          notes: params.notes,
          created_at: Math.floor(Date.now() / 1000),
        };
      }

      throw new InternalServerErrorException('Razorpay order creation failed.');
    }
  }

  /**
   * Fetches payment details from the Razorpay API.
   */
  async fetchPayment(paymentId: string): Promise<RazorpayPaymentResult> {
    try {
      const payment = await this.client.payments.fetch(paymentId);
      return payment as unknown as RazorpayPaymentResult;
    } catch (err: unknown) {
      const errorMsg = this.formatError(err);
      this.logger.error(`Failed to fetch Razorpay payment "${paymentId}": ${errorMsg}`);

      // In local development or testing with placeholder key, provide simulated payment
      if (this.keyId === 'rzp_test_placeholder') {
        this.logger.warn(`Returning simulated captured payment details for "${paymentId}".`);
        return {
          id: paymentId,
          order_id: `simulated_order_${paymentId}`,
          amount: 0,
          currency: 'INR',
          status: 'captured',
          method: 'upi',
          vpa: 'success@razorpay',
          captured: true,
          created_at: Math.floor(Date.now() / 1000),
        };
      }

      throw new InternalServerErrorException('Failed to retrieve payment details from Razorpay.');
    }
  }

  /**
   * Fetches payments associated with a Razorpay order (used by the
   * reconciliation sweep to recover captured payments missed by the client
   * callback and webhook delivery failures alike).
   */
  async fetchOrderPayments(orderId: string): Promise<RazorpayPaymentResult[]> {
    try {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const response = await (
        this.client.orders as unknown as {
          fetchPayments: (id: string) => Promise<{ items?: unknown[] }>;
        }
      ).fetchPayments(orderId);
      const items = Array.isArray(response?.items) ? response.items : [];
      return items as unknown as RazorpayPaymentResult[];
    } catch (err: unknown) {
      const errorMsg = this.formatError(err);
      this.logger.error(`Failed to fetch Razorpay payments for order "${orderId}": ${errorMsg}`);

      // Placeholder key environment or provider outage — no API truth available.
      // The sweep must NOT fabricate payment records.
      if (this.keyId === 'rzp_test_placeholder') {
        this.logger.warn('Skipping Razorpay order payments fetch: placeholder key in use.');
        return [];
      }

      throw new InternalServerErrorException(
        `Failed to retrieve payments for order from Razorpay: ${errorMsg}`,
      );
    }
  }

  /**
   * Initiates a refund through the Razorpay API.
   */
  async createRefund(
    paymentId: string,
    params: {
      amountPaise?: number;
      receipt?: string;
      notes?: Record<string, string>;
    },
  ): Promise<RazorpayRefundResult> {
    try {
      const refundParams: {
        amount?: number;
        receipt?: string;
        notes?: Record<string, string>;
      } = {};

      if (params.amountPaise !== undefined) {
        refundParams.amount = Math.round(params.amountPaise);
      }
      if (params.receipt) {
        refundParams.receipt = params.receipt;
      }
      if (params.notes) {
        refundParams.notes = params.notes;
      }

      const refund = await this.client.payments.refund(paymentId, refundParams);
      return refund as unknown as RazorpayRefundResult;
    } catch (err: unknown) {
      const errorMsg = this.formatError(err);
      this.logger.error(
        `Failed to execute Razorpay refund for payment "${paymentId}": ${errorMsg}`,
      );

      // In local development or testing with placeholder key
      if (this.keyId === 'rzp_test_placeholder') {
        this.logger.warn(`Simulating processed refund for payment "${paymentId}".`);
        return {
          id: `rfnd_${crypto.randomBytes(8).toString('hex')}`,
          payment_id: paymentId,
          amount: params.amountPaise ?? 0,
          currency: 'INR',
          status: 'processed',
          receipt: params.receipt,
          notes: params.notes,
          created_at: Math.floor(Date.now() / 1000),
        };
      }

      throw new InternalServerErrorException('Razorpay refund initiation failed.');
    }
  }

  /**
   * Fetches refunds associated with a payment — authoritative refund state
   * used to recover lost refunds in the reconciliation sweep.
   */
  async fetchRefundsFromPayment(paymentId: string): Promise<RazorpayRefundResult[]> {
    try {
      const response = await (
        this.client.payments as unknown as {
          fetchRefunds: (id: string) => Promise<{ items?: unknown[] }>;
        }
      ).fetchRefunds(paymentId);
      const items = Array.isArray(response?.items) ? response.items : [];
      return items as unknown as RazorpayRefundResult[];
    } catch (err: unknown) {
      const errorMsg = this.formatError(err);
      this.logger.error(`Failed to fetch Razorpay refunds for payment "${paymentId}": ${errorMsg}`);

      if (this.keyId === 'rzp_test_placeholder') {
        return [];
      }

      throw new InternalServerErrorException('Failed to retrieve refunds from Razorpay.');
    }
  }

  /**
   * Verifies the cryptographic signature returned to the browser callback by Razorpay Standard Checkout.
   * Expected payload: `${orderId}|${paymentId}`
   * Timing-safe verification using crypto.timingSafeEqual.
   */
  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
    if (!orderId || !paymentId || !signature) {
      return false;
    }

    try {
      const payload = `${orderId}|${paymentId}`;
      const expected = crypto.createHmac('sha256', this.keySecret).update(payload).digest('hex');

      const expectedBuffer = Buffer.from(expected, 'utf8');
      const signatureBuffer = Buffer.from(signature, 'utf8');

      if (expectedBuffer.length !== signatureBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
    } catch (err: unknown) {
      this.logger.error(
        `Error during payment signature verification: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return false;
    }
  }

  /**
   * Verifies the cryptographic signature sent with Razorpay webhook deliveries.
   * Checks against current webhook secret and optionally the previous secret (during rotation).
   * Timing-safe verification using crypto.timingSafeEqual.
   */
  verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean {
    if (!rawBody || !signature) {
      return false;
    }

    try {
      const rawBodyBuffer = typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf8') : rawBody;

      const checkSecret = (secret: string): boolean => {
        if (!secret) return false;
        const expected = crypto.createHmac('sha256', secret).update(rawBodyBuffer).digest('hex');

        const expectedBuffer = Buffer.from(expected, 'utf8');
        const signatureBuffer = Buffer.from(signature, 'utf8');

        if (expectedBuffer.length !== signatureBuffer.length) {
          return false;
        }

        return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
      };

      if (checkSecret(this.webhookSecret)) {
        return true;
      }

      if (this.webhookSecretPrevious && checkSecret(this.webhookSecretPrevious)) {
        this.logger.warn('Webhook signature matched previous secret during rotation.');
        return true;
      }

      return false;
    } catch (err: unknown) {
      this.logger.error(
        `Error during webhook signature verification: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return false;
    }
  }

  /**
   * Helper method to generate an authentic payment signature for testing or automated integration tests.
   */
  generateTestPaymentSignature(orderId: string, paymentId: string): string {
    return crypto
      .createHmac('sha256', this.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
  }

  /**
   * Helper method to generate an authentic webhook signature for testing.
   */
  generateTestWebhookSignature(rawBody: string | Buffer): string {
    const rawBodyBuffer = typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf8') : rawBody;
    return crypto.createHmac('sha256', this.webhookSecret).update(rawBodyBuffer).digest('hex');
  }
}
