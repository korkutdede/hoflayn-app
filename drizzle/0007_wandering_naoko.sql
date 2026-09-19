CREATE TYPE "public"."seo_channel" AS ENUM('generic_web', 'hoflayn_web');--> statement-breakpoint
CREATE TABLE "product_seo_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"job_id" uuid,
	"channel" "seo_channel" NOT NULL,
	"suggestion" jsonb NOT NULL,
	"audit" jsonb NOT NULL,
	"applied_fields" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"applied_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "seo_title" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "seo_meta_description" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "seo_slug" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "seo_primary_keyword" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "seo_secondary_keywords" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "seo_channel" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "seo_applied_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "product_seo_history" ADD CONSTRAINT "product_seo_history_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_seo_history" ADD CONSTRAINT "product_seo_history_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_seo_history" ADD CONSTRAINT "product_seo_history_job_id_ai_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."ai_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_seo_history_product_created_idx" ON "product_seo_history" USING btree ("product_id","created_at");--> statement-breakpoint
CREATE INDEX "product_seo_history_tenant_created_idx" ON "product_seo_history" USING btree ("tenant_id","created_at");--> statement-breakpoint

ALTER TABLE public.product_seo_history ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.product_seo_history FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY product_seo_history_select_member
  ON public.product_seo_history FOR SELECT
  TO authenticated
  USING (public.is_member_of(tenant_id));--> statement-breakpoint
CREATE POLICY product_seo_history_insert_member
  ON public.product_seo_history FOR INSERT
  TO authenticated
  WITH CHECK (public.is_member_of(tenant_id));--> statement-breakpoint
CREATE POLICY product_seo_history_update_member
  ON public.product_seo_history FOR UPDATE
  TO authenticated
  USING (public.is_member_of(tenant_id))
  WITH CHECK (public.is_member_of(tenant_id));--> statement-breakpoint
CREATE POLICY product_seo_history_delete_member
  ON public.product_seo_history FOR DELETE
  TO authenticated
  USING (public.is_member_of(tenant_id));