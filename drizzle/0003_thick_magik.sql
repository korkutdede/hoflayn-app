CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"description_ai_generated" boolean DEFAULT false NOT NULL,
	"price" numeric(10, 2),
	"cost_price" numeric(10, 2),
	"stock_quantity" integer DEFAULT 0 NOT NULL,
	"category" text,
	"tags" text,
	"cover_image_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_cover_image_id_media_assets_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "products_tenant_created_idx" ON "products" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "products_tenant_name_idx" ON "products" USING btree ("tenant_id","name");--> statement-breakpoint

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.products FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY products_select_member
  ON public.products FOR SELECT
  TO authenticated
  USING (public.is_member_of(tenant_id));--> statement-breakpoint
CREATE POLICY products_insert_member
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (public.is_member_of(tenant_id));--> statement-breakpoint
CREATE POLICY products_update_member
  ON public.products FOR UPDATE
  TO authenticated
  USING (public.is_member_of(tenant_id))
  WITH CHECK (public.is_member_of(tenant_id));--> statement-breakpoint
CREATE POLICY products_delete_member
  ON public.products FOR DELETE
  TO authenticated
  USING (public.is_member_of(tenant_id));--> statement-breakpoint

UPDATE public.plans
SET
  defaults = '{"modules":{"studio":true,"writer":true,"catalog":false,"barcode":false},"limits":{"max_ai_jobs_per_day":100,"storage_gb":20}}'::jsonb
WHERE id = 'pro';
