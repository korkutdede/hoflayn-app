CREATE TYPE "public"."label_barcode_format" AS ENUM('code128', 'qr', 'gs1_128');--> statement-breakpoint
CREATE TYPE "public"."label_export_status" AS ENUM('pending', 'running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."label_size" AS ENUM('50x30', '62x29', '100x50');--> statement-breakpoint
CREATE TABLE "label_export_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"export_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"name_snapshot" text NOT NULL,
	"price_snapshot" text,
	"sku_snapshot" text,
	"barcode_value_snapshot" text NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "label_exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"job_id" uuid,
	"media_asset_id" uuid,
	"status" "label_export_status" DEFAULT 'pending' NOT NULL,
	"size" "label_size" DEFAULT '50x30' NOT NULL,
	"format" "label_barcode_format" DEFAULT 'code128' NOT NULL,
	"copies" integer DEFAULT 1 NOT NULL,
	"show_price" boolean DEFAULT true NOT NULL,
	"show_name" boolean DEFAULT true NOT NULL,
	"idempotency_key" text NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "sku" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "barcode_value" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "barcode_format" text DEFAULT 'code128';--> statement-breakpoint
ALTER TABLE "label_export_items" ADD CONSTRAINT "label_export_items_export_id_label_exports_id_fk" FOREIGN KEY ("export_id") REFERENCES "public"."label_exports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "label_export_items" ADD CONSTRAINT "label_export_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "label_export_items" ADD CONSTRAINT "label_export_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "label_exports" ADD CONSTRAINT "label_exports_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "label_exports" ADD CONSTRAINT "label_exports_job_id_ai_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."ai_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "label_exports" ADD CONSTRAINT "label_exports_media_asset_id_media_assets_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "label_export_items_export_sort_idx" ON "label_export_items" USING btree ("export_id","sort_order");--> statement-breakpoint
CREATE INDEX "label_export_items_tenant_idx" ON "label_export_items" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "label_exports_tenant_idempotency_uq" ON "label_exports" USING btree ("tenant_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "label_exports_tenant_created_idx" ON "label_exports" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "products_tenant_sku_idx" ON "products" USING btree ("tenant_id","sku");--> statement-breakpoint

ALTER TABLE public.label_exports ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.label_exports FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY label_exports_select_member
  ON public.label_exports FOR SELECT
  TO authenticated
  USING (public.is_member_of(tenant_id));--> statement-breakpoint
CREATE POLICY label_exports_insert_member
  ON public.label_exports FOR INSERT
  TO authenticated
  WITH CHECK (public.is_member_of(tenant_id));--> statement-breakpoint
CREATE POLICY label_exports_update_member
  ON public.label_exports FOR UPDATE
  TO authenticated
  USING (public.is_member_of(tenant_id))
  WITH CHECK (public.is_member_of(tenant_id));--> statement-breakpoint
CREATE POLICY label_exports_delete_member
  ON public.label_exports FOR DELETE
  TO authenticated
  USING (public.is_member_of(tenant_id));--> statement-breakpoint

ALTER TABLE public.label_export_items ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.label_export_items FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY label_export_items_select_member
  ON public.label_export_items FOR SELECT
  TO authenticated
  USING (public.is_member_of(tenant_id));--> statement-breakpoint
CREATE POLICY label_export_items_insert_member
  ON public.label_export_items FOR INSERT
  TO authenticated
  WITH CHECK (public.is_member_of(tenant_id));--> statement-breakpoint
CREATE POLICY label_export_items_update_member
  ON public.label_export_items FOR UPDATE
  TO authenticated
  USING (public.is_member_of(tenant_id))
  WITH CHECK (public.is_member_of(tenant_id));--> statement-breakpoint
CREATE POLICY label_export_items_delete_member
  ON public.label_export_items FOR DELETE
  TO authenticated
  USING (public.is_member_of(tenant_id));