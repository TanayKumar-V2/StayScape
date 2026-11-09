-- CreateEnum
CREATE TYPE "PropertyModerationStatus" AS ENUM ('APPROVED', 'FLAGGED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'FRAUD', 'MISLEADING_LISTING', 'INAPPROPRIATE_CONTENT', 'HARASSMENT', 'SAFETY_CONCERN', 'SUSPICIOUS_ACTIVITY', 'OTHER');

-- AlterTable
ALTER TABLE "properties" ADD COLUMN "moderation_status" "PropertyModerationStatus" NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "properties" ADD COLUMN "moderation_reason" TEXT;
ALTER TABLE "properties" ADD COLUMN "moderated_at" TIMESTAMP(3);
ALTER TABLE "properties" ADD COLUMN "moderated_by_id" TEXT;

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "admin_user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "reason" TEXT,
    "before_data" JSONB,
    "after_data" JSONB,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_reports" (
    "id" TEXT NOT NULL,
    "reporter_user_id" TEXT NOT NULL,
    "property_id" TEXT,
    "review_id" TEXT,
    "reported_user_id" TEXT,
    "message_id" TEXT,
    "reason" "ReportReason" NOT NULL,
    "description" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolution_note" TEXT,
    "assigned_admin_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "content_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "endpoint" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "duration_ms" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "error_category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CHECK Constraint: Content reports must target exactly one entity
ALTER TABLE "content_reports"
ADD CONSTRAINT "content_reports_single_target_check"
CHECK (
  (CASE WHEN "property_id" IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN "review_id" IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN "reported_user_id" IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN "message_id" IS NOT NULL THEN 1 ELSE 0 END) = 1
);

-- CreateIndex
CREATE INDEX "properties_moderation_status_idx" ON "properties"("moderation_status");
CREATE INDEX "properties_status_moderation_status_idx" ON "properties"("status", "moderation_status");

-- CreateIndex
CREATE INDEX "admin_audit_logs_admin_user_id_idx" ON "admin_audit_logs"("admin_user_id");
CREATE INDEX "admin_audit_logs_action_idx" ON "admin_audit_logs"("action");
CREATE INDEX "admin_audit_logs_entity_type_idx" ON "admin_audit_logs"("entity_type");
CREATE INDEX "admin_audit_logs_entity_id_idx" ON "admin_audit_logs"("entity_id");
CREATE INDEX "admin_audit_logs_created_at_idx" ON "admin_audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "content_reports_reporter_user_id_idx" ON "content_reports"("reporter_user_id");
CREATE INDEX "content_reports_property_id_idx" ON "content_reports"("property_id");
CREATE INDEX "content_reports_review_id_idx" ON "content_reports"("review_id");
CREATE INDEX "content_reports_reported_user_id_idx" ON "content_reports"("reported_user_id");
CREATE INDEX "content_reports_message_id_idx" ON "content_reports"("message_id");
CREATE INDEX "content_reports_status_idx" ON "content_reports"("status");
CREATE INDEX "content_reports_assigned_admin_id_idx" ON "content_reports"("assigned_admin_id");
CREATE INDEX "content_reports_created_at_idx" ON "content_reports"("created_at");

-- CreateIndex
CREATE INDEX "ai_usage_logs_endpoint_idx" ON "ai_usage_logs"("endpoint");
CREATE INDEX "ai_usage_logs_model_idx" ON "ai_usage_logs"("model");
CREATE INDEX "ai_usage_logs_success_idx" ON "ai_usage_logs"("success");
CREATE INDEX "ai_usage_logs_created_at_idx" ON "ai_usage_logs"("created_at");

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_moderated_by_id_fkey" FOREIGN KEY ("moderated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reporter_user_id_fkey" FOREIGN KEY ("reporter_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reported_user_id_fkey" FOREIGN KEY ("reported_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_assigned_admin_id_fkey" FOREIGN KEY ("assigned_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

