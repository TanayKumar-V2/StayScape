-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('RAZORPAY');

-- CreateEnum
CREATE TYPE "PaymentOrderStatus" AS ENUM ('CREATING', 'CREATED', 'CREATION_UNKNOWN', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentTransactionStatus" AS ENUM ('AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUND_PENDING', 'REFUNDED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('REQUESTED', 'PROCESSING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "WebhookProcessingStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED');

-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'REFUND_PENDING';
ALTER TYPE "BookingStatus" ADD VALUE 'REFUNDED';

-- CreateTable
CREATE TABLE "payment_orders" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'RAZORPAY',
    "razorpay_order_id" TEXT NOT NULL,
    "receipt" TEXT NOT NULL,
    "amount_paise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentOrderStatus" NOT NULL DEFAULT 'CREATED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "notes" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "payment_order_id" TEXT NOT NULL,
    "razorpay_payment_id" TEXT NOT NULL,
    "razorpay_order_id" TEXT NOT NULL,
    "razorpay_signature" TEXT,
    "amount_paise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentTransactionStatus" NOT NULL,
    "method" TEXT,
    "bank" TEXT,
    "wallet" TEXT,
    "vpa" TEXT,
    "card_id" TEXT,
    "card_network" TEXT,
    "card_last4" TEXT,
    "card_type" TEXT,
    "email" TEXT,
    "contact" TEXT,
    "fee_paise" INTEGER,
    "tax_paise" INTEGER,
    "error_code" TEXT,
    "error_description" TEXT,
    "error_source" TEXT,
    "error_step" TEXT,
    "error_reason" TEXT,
    "raw_payload" JSONB,
    "verified_at" TIMESTAMP(3),
    "captured_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_refunds" (
    "id" TEXT NOT NULL,
    "payment_transaction_id" TEXT NOT NULL,
    "razorpay_refund_id" TEXT,
    "razorpay_payment_id" TEXT NOT NULL,
    "amount_paise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "RefundStatus" NOT NULL DEFAULT 'REQUESTED',
    "reason" TEXT,
    "idempotency_key" TEXT,
    "raw_payload" JSONB,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "razorpay_webhook_events" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "status" "WebhookProcessingStatus" NOT NULL DEFAULT 'RECEIVED',
    "payload" JSONB NOT NULL,
    "signature" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "razorpay_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_orders_booking_id_key" ON "payment_orders"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_orders_razorpay_order_id_key" ON "payment_orders"("razorpay_order_id");

-- CreateIndex
CREATE INDEX "payment_orders_booking_id_idx" ON "payment_orders"("booking_id");

-- CreateIndex
CREATE INDEX "payment_orders_razorpay_order_id_idx" ON "payment_orders"("razorpay_order_id");

-- CreateIndex
CREATE INDEX "payment_orders_status_idx" ON "payment_orders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_razorpay_payment_id_key" ON "payment_transactions"("razorpay_payment_id");

-- CreateIndex
CREATE INDEX "payment_transactions_payment_order_id_idx" ON "payment_transactions"("payment_order_id");

-- CreateIndex
CREATE INDEX "payment_transactions_razorpay_payment_id_idx" ON "payment_transactions"("razorpay_payment_id");

-- CreateIndex
CREATE INDEX "payment_transactions_razorpay_order_id_idx" ON "payment_transactions"("razorpay_order_id");

-- CreateIndex
CREATE INDEX "payment_transactions_status_idx" ON "payment_transactions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_refunds_razorpay_refund_id_key" ON "payment_refunds"("razorpay_refund_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_refunds_idempotency_key_key" ON "payment_refunds"("idempotency_key");

-- CreateIndex
CREATE INDEX "payment_refunds_payment_transaction_id_idx" ON "payment_refunds"("payment_transaction_id");

-- CreateIndex
CREATE INDEX "payment_refunds_razorpay_refund_id_idx" ON "payment_refunds"("razorpay_refund_id");

-- CreateIndex
CREATE INDEX "payment_refunds_razorpay_payment_id_idx" ON "payment_refunds"("razorpay_payment_id");

-- CreateIndex
CREATE INDEX "payment_refunds_status_idx" ON "payment_refunds"("status");

-- CreateIndex
CREATE UNIQUE INDEX "razorpay_webhook_events_event_id_key" ON "razorpay_webhook_events"("event_id");

-- CreateIndex
CREATE INDEX "razorpay_webhook_events_event_id_idx" ON "razorpay_webhook_events"("event_id");

-- CreateIndex
CREATE INDEX "razorpay_webhook_events_event_idx" ON "razorpay_webhook_events"("event");

-- CreateIndex
CREATE INDEX "razorpay_webhook_events_status_idx" ON "razorpay_webhook_events"("status");

-- CreateIndex
CREATE INDEX "razorpay_webhook_events_received_at_idx" ON "razorpay_webhook_events"("received_at");

-- AddForeignKey
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_payment_order_id_fkey" FOREIGN KEY ("payment_order_id") REFERENCES "payment_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_refunds" ADD CONSTRAINT "payment_refunds_payment_transaction_id_fkey" FOREIGN KEY ("payment_transaction_id") REFERENCES "payment_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

