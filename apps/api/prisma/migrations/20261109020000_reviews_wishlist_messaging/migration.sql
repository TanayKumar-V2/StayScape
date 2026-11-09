-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PUBLISHED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'COMPLETED';

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "completed_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "guest_user_id" TEXT NOT NULL,
    "overall_rating" INTEGER NOT NULL,
    "cleanliness_rating" INTEGER,
    "accuracy_rating" INTEGER,
    "check_in_rating" INTEGER,
    "communication_rating" INTEGER,
    "location_rating" INTEGER,
    "value_rating" INTEGER,
    "title" TEXT,
    "comment" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PUBLISHED',
    "host_response" TEXT,
    "host_responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlist_items" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "guest_user_id" TEXT NOT NULL,
    "host_profile_id" TEXT NOT NULL,
    "booking_id" TEXT,
    "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_message_at" TIMESTAMP(3),
    "last_message_preview" TEXT,
    "guest_last_read_at" TIMESTAMP(3),
    "host_last_read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_user_id" TEXT NOT NULL,
    "client_message_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reviews_booking_id_key" ON "reviews"("booking_id");
CREATE INDEX "reviews_property_id_idx" ON "reviews"("property_id");
CREATE INDEX "reviews_guest_user_id_idx" ON "reviews"("guest_user_id");
CREATE INDEX "reviews_booking_id_idx" ON "reviews"("booking_id");
CREATE INDEX "reviews_status_idx" ON "reviews"("status");
CREATE INDEX "reviews_created_at_idx" ON "reviews"("created_at");
CREATE INDEX "reviews_overall_rating_idx" ON "reviews"("overall_rating");

-- CreateIndex
CREATE INDEX "wishlist_items_user_id_idx" ON "wishlist_items"("user_id");
CREATE INDEX "wishlist_items_property_id_idx" ON "wishlist_items"("property_id");
CREATE UNIQUE INDEX "wishlist_items_user_id_property_id_key" ON "wishlist_items"("user_id", "property_id");

-- CreateIndex
CREATE INDEX "conversations_guest_user_id_idx" ON "conversations"("guest_user_id");
CREATE INDEX "conversations_host_profile_id_idx" ON "conversations"("host_profile_id");
CREATE INDEX "conversations_property_id_idx" ON "conversations"("property_id");
CREATE INDEX "conversations_status_idx" ON "conversations"("status");
CREATE INDEX "conversations_last_message_at_idx" ON "conversations"("last_message_at");
CREATE UNIQUE INDEX "conversations_property_id_guest_user_id_key" ON "conversations"("property_id", "guest_user_id");

-- CreateIndex
CREATE INDEX "messages_conversation_id_idx" ON "messages"("conversation_id");
CREATE INDEX "messages_sender_user_id_idx" ON "messages"("sender_user_id");
CREATE INDEX "messages_created_at_idx" ON "messages"("created_at");
CREATE INDEX "messages_read_at_idx" ON "messages"("read_at");
CREATE UNIQUE INDEX "messages_conversation_id_sender_user_id_client_message_id_key" ON "messages"("conversation_id", "sender_user_id", "client_message_id");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_guest_user_id_fkey" FOREIGN KEY ("guest_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_guest_user_id_fkey" FOREIGN KEY ("guest_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_host_profile_id_fkey" FOREIGN KEY ("host_profile_id") REFERENCES "host_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
