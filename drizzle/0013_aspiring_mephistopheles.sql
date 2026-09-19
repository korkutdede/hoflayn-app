ALTER TYPE "public"."sync_status" ADD VALUE 'rejected' BEFORE 'failed';--> statement-breakpoint
ALTER TABLE "sync_links" ADD COLUMN "external_url" text;--> statement-breakpoint
ALTER TABLE "sync_links" ADD COLUMN "last_operation" text;--> statement-breakpoint
ALTER TABLE "sync_links" ADD COLUMN "last_response_status" integer;--> statement-breakpoint
ALTER TABLE "sync_links" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "sync_links" ADD COLUMN "last_attempt_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sync_links" ADD COLUMN "last_success_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sync_links" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sync_links" ADD COLUMN "successful_payload_hash" text;