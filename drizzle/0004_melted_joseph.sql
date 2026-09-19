CREATE TYPE "public"."sync_provider" AS ENUM('hoflayn_web');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('draft', 'pending', 'published', 'failed', 'archived');--> statement-breakpoint
CREATE TABLE "sync_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"provider" "sync_provider" DEFAULT 'hoflayn_web' NOT NULL,
	"external_id" text,
	"status" "sync_status" DEFAULT 'draft' NOT NULL,
	"last_synced_at" timestamp with time zone,
	"last_error" text,
	"payload_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sync_links" ADD CONSTRAINT "sync_links_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_links" ADD CONSTRAINT "sync_links_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sync_links_provider_product_uq" ON "sync_links" USING btree ("provider","product_id");--> statement-breakpoint
CREATE INDEX "sync_links_tenant_status_idx" ON "sync_links" USING btree ("tenant_id","status");--> statement-breakpoint

ALTER TABLE public.sync_links ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.sync_links FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY sync_links_select_member
  ON public.sync_links FOR SELECT
  TO authenticated
  USING (public.is_member_of(tenant_id));
