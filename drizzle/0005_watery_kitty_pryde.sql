ALTER TYPE "public"."ai_job_status" ADD VALUE 'dead_letter';--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD COLUMN "max_attempts" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD COLUMN "next_attempt_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD COLUMN "locked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD COLUMN "lock_token" uuid;--> statement-breakpoint
ALTER TABLE "ai_usage_logs" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX "credit_txn_tenant_idempotency_uq" ON "credit_transactions" USING btree ("tenant_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "ai_jobs_queue_idx" ON "ai_jobs" USING btree ("status","next_attempt_at","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_usage_tenant_idempotency_uq" ON "ai_usage_logs" USING btree ("tenant_id","idempotency_key");