export interface PaymentOrderUser {
  name: string;
  email: string;
  contact?: string;
}

export interface CreatePaymentOrderResponse {
  orderId: string;
  amount: number; // In paise
  currency: string;
  keyId: string;
  bookingReference: string;
  propertyTitle: string;
  user: PaymentOrderUser;
}

export interface RazorpayCheckoutSuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayCheckoutErrorResponse {
  code: string;
  description: string;
  source: string;
  step: string;
  reason: string;
  metadata?: {
    order_id?: string;
    payment_id?: string;
  };
}

export interface VerifyPaymentPayload {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface ReconcilePaymentResponse {
  success: boolean;
  bookingReference: string;
  status: string;
  message?: string;
  error?: string;
}

export interface PaymentStatusSummary {
  bookingReference: string;
  bookingStatus: string;
  isPaid: boolean;
  order?: {
    orderId: string;
    amountPaise: number;
    currency: string;
    status: string;
  } | null;
  transaction?: {
    razorpayPaymentId: string;
    status: string;
    method?: string | null;
    bank?: string | null;
    wallet?: string | null;
    vpa?: string | null;
    cardLast4?: string | null;
    cardNetwork?: string | null;
    capturedAt?: string | null;
    errorCode?: string | null;
    errorDescription?: string | null;
  } | null;
  refund?: {
    id?: string | null;
    razorpayRefundId?: string | null;
    amountPaise: number;
    status: string;
    reason?: string | null;
    processedAt?: string | null;
  } | null;
}
