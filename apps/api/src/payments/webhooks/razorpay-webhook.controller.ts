import { Controller, Post, Req, Headers, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import type { Request } from 'express';
import { RazorpayWebhookService, WebhookProcessingResult } from './razorpay-webhook.service';

interface RequestWithRawBody extends Request {
  rawBody?: Buffer;
}

@ApiTags('Webhooks')
@Controller('webhooks')
export class RazorpayWebhookController {
  constructor(private readonly webhookService: RazorpayWebhookService) {}

  @Post('razorpay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Public Razorpay webhook endpoint for asynchronous payment lifecycle notifications',
  })
  @ApiHeader({
    name: 'X-Razorpay-Signature',
    description: 'HMAC-SHA256 signature calculated over the unparsed request body',
    required: true,
  })
  @ApiHeader({
    name: 'X-Razorpay-Event-Id',
    description: 'Unique Razorpay event identifier for inbox deduplication',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook received and enqueued for background processing',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid signature or missing payload',
  })
  async handleRazorpayWebhook(
    @Req() req: RequestWithRawBody,
    @Headers('x-razorpay-signature') signature: string | undefined,
    @Headers('x-razorpay-event-id') eventId: string | undefined,
    @Body() body: Record<string, unknown>,
  ): Promise<WebhookProcessingResult> {
    // Signature verification must use the exact original bytes. Re-serializing
    // parsed JSON changes the signed representation and is not a safe fallback.
    return this.webhookService.handleWebhook(req.rawBody, signature, eventId, body);
  }
}
