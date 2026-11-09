-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('HOLD', 'PAYMENT_PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'PAYMENT_FAILED');

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "booking_reference" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "check_in" DATE NOT NULL,
    "check_out" DATE NOT NULL,
    "nights" INTEGER NOT NULL,
    "guest_count" INTEGER NOT NULL,
    "property_title_snapshot" TEXT NOT NULL,
    "property_slug_snapshot" TEXT NOT NULL,
    "property_city_snapshot" TEXT NOT NULL,
    "property_cover_image_snapshot" TEXT,
    "price_per_night_paise" INTEGER NOT NULL,
    "cleaning_fee_paise" INTEGER NOT NULL,
    "nightly_subtotal_paise" INTEGER NOT NULL,
    "total_amount_paise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "BookingStatus" NOT NULL DEFAULT 'HOLD',
    "hold_expires_at" TIMESTAMP(3),
    "confirmed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "expired_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bookings_booking_reference_key" ON "bookings"("booking_reference");

-- CreateIndex
CREATE INDEX "bookings_user_id_idx" ON "bookings"("user_id");

-- CreateIndex
CREATE INDEX "bookings_property_id_idx" ON "bookings"("property_id");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_check_in_idx" ON "bookings"("check_in");

-- CreateIndex
CREATE INDEX "bookings_check_out_idx" ON "bookings"("check_out");

-- CreateIndex
CREATE INDEX "bookings_hold_expires_at_idx" ON "bookings"("hold_expires_at");

-- CreateIndex
CREATE INDEX "bookings_created_at_idx" ON "bookings"("created_at");

-- CreateIndex
CREATE INDEX "bookings_property_id_status_check_in_check_out_idx" ON "bookings"("property_id", "status", "check_in", "check_out");

-- CreateIndex
CREATE INDEX "bookings_user_id_status_created_at_idx" ON "bookings"("user_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "bookings_property_id_hold_expires_at_idx" ON "bookings"("property_id", "hold_expires_at");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Enable btree_gist extension for GiST index with scalar and range types
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Exclusion constraint to guarantee no overlapping reservations for the same property
ALTER TABLE "bookings"
ADD CONSTRAINT "no_overlapping_active_bookings"
EXCLUDE USING gist (
  "property_id" WITH =,
  daterange("check_in", "check_out", '[)') WITH &&
)
WHERE (status IN ('HOLD', 'PAYMENT_PENDING', 'CONFIRMED'));

