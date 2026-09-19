CREATE TYPE "public"."catalog_export_status" AS ENUM('pending', 'running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."catalog_template" AS ENUM('grid', 'lookbook');--> statement-breakpoint
CREATE TYPE "public"."catalog_theme" AS ENUM('linen', 'ink');--> statement-breakpoint
CREATE TABLE "catalog_exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"catalog_id" uuid NOT NULL,
	"job_id" uuid,
	"media_asset_id" uuid,
	"status" "catalog_export_status" DEFAULT 'pending' NOT NULL,
	"idempotency_key" text NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "catalog_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"catalog_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"name_snapshot" text NOT NULL,
	"description_snapshot" text,
	"price_snapshot" text,
	"cover_path_snapshot" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalogs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" text NOT NULL,
	"template_id" "catalog_template" DEFAULT 'grid' NOT NULL,
	"theme" "catalog_theme" DEFAULT 'linen' NOT NULL,
	"show_prices" boolean DEFAULT true NOT NULL,
	"show_workshop" boolean DEFAULT true NOT NULL,
	"cover_product_id" uuid,
	"workshop_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "catalog_exports" ADD CONSTRAINT "catalog_exports_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_exports" ADD CONSTRAINT "catalog_exports_catalog_id_catalogs_id_fk" FOREIGN KEY ("catalog_id") REFERENCES "public"."catalogs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_exports" ADD CONSTRAINT "catalog_exports_job_id_ai_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."ai_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_exports" ADD CONSTRAINT "catalog_exports_media_asset_id_media_assets_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_catalog_id_catalogs_id_fk" FOREIGN KEY ("catalog_id") REFERENCES "public"."catalogs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalogs" ADD CONSTRAINT "catalogs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalogs" ADD CONSTRAINT "catalogs_cover_product_id_products_id_fk" FOREIGN KEY ("cover_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_exports_tenant_idempotency_uq" ON "catalog_exports" USING btree ("tenant_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "catalog_exports_catalog_created_idx" ON "catalog_exports" USING btree ("catalog_id","created_at");--> statement-breakpoint
CREATE INDEX "catalog_exports_tenant_created_idx" ON "catalog_exports" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_items_catalog_product_uq" ON "catalog_items" USING btree ("catalog_id","product_id");--> statement-breakpoint
CREATE INDEX "catalog_items_catalog_sort_idx" ON "catalog_items" USING btree ("catalog_id","sort_order");--> statement-breakpoint
CREATE INDEX "catalog_items_tenant_idx" ON "catalog_items" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "catalogs_tenant_updated_idx" ON "catalogs" USING btree ("tenant_id","updated_at");--> statement-breakpoint

ALTER TABLE public.catalogs ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.catalogs FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY catalogs_select_member
  ON public.catalogs FOR SELECT
  TO authenticated
  USING (public.is_member_of(tenant_id));--> statement-breakpoint
CREATE POLICY catalogs_insert_member
  ON public.catalogs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_member_of(tenant_id));--> statement-breakpoint
CREATE POLICY catalogs_update_member
  ON public.catalogs FOR UPDATE
  TO authenticated
  USING (public.is_member_of(tenant_id))
  WITH CHECK (public.is_member_of(tenant_id));--> statement-breakpoint
CREATE POLICY catalogs_delete_member
  ON public.catalogs FOR DELETE
  TO authenticated
  USING (public.is_member_of(tenant_id));--> statement-breakpoint

ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.catalog_items FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY catalog_items_select_member
  ON public.catalog_items FOR SELECT
  TO authenticated
  USING (public.is_member_of(tenant_id));--> statement-breakpoint
CREATE POLICY catalog_items_insert_member
  ON public.catalog_items FOR INSERT
  TO authenticated
  WITH CHECK (public.is_member_of(tenant_id));--> statement-breakpoint
CREATE POLICY catalog_items_update_member
  ON public.catalog_items FOR UPDATE
  TO authenticated
  USING (public.is_member_of(tenant_id))
  WITH CHECK (public.is_member_of(tenant_id));--> statement-breakpoint
CREATE POLICY catalog_items_delete_member
  ON public.catalog_items FOR DELETE
  TO authenticated
  USING (public.is_member_of(tenant_id));--> statement-breakpoint

ALTER TABLE public.catalog_exports ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.catalog_exports FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY catalog_exports_select_member
  ON public.catalog_exports FOR SELECT
  TO authenticated
  USING (public.is_member_of(tenant_id));--> statement-breakpoint
CREATE POLICY catalog_exports_insert_member
  ON public.catalog_exports FOR INSERT
  TO authenticated
  WITH CHECK (public.is_member_of(tenant_id));--> statement-breakpoint
CREATE POLICY catalog_exports_update_member
  ON public.catalog_exports FOR UPDATE
  TO authenticated
  USING (public.is_member_of(tenant_id))
  WITH CHECK (public.is_member_of(tenant_id));--> statement-breakpoint
CREATE POLICY catalog_exports_delete_member
  ON public.catalog_exports FOR DELETE
  TO authenticated
  USING (public.is_member_of(tenant_id));