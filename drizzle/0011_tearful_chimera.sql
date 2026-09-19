CREATE TYPE "public"."sale_source" AS ENUM('manual', 'csv', 'hoflayn_web');--> statement-breakpoint
CREATE TYPE "public"."sale_status" AS ENUM('completed', 'voided');--> statement-breakpoint
CREATE TABLE "sale_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_minor" integer NOT NULL,
	"line_total_minor" integer NOT NULL,
	"product_name_snapshot" text NOT NULL,
	"stock_movement_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"source" "sale_source" DEFAULT 'manual' NOT NULL,
	"status" "sale_status" DEFAULT 'completed' NOT NULL,
	"currency" text DEFAULT 'TRY' NOT NULL,
	"total_minor" integer DEFAULT 0 NOT NULL,
	"note" text,
	"sold_at" timestamp with time zone DEFAULT now() NOT NULL,
	"idempotency_key" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sale_lines" ADD CONSTRAINT "sale_lines_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_lines" ADD CONSTRAINT "sale_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_lines" ADD CONSTRAINT "sale_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_lines" ADD CONSTRAINT "sale_lines_stock_movement_id_stock_movements_id_fk" FOREIGN KEY ("stock_movement_id") REFERENCES "public"."stock_movements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sale_lines_sale_idx" ON "sale_lines" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "sale_lines_tenant_idx" ON "sale_lines" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "sale_lines_product_idx" ON "sale_lines" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "sales_tenant_sold_idx" ON "sales" USING btree ("tenant_id","sold_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_tenant_idempotency_uq" ON "sales" USING btree ("tenant_id","idempotency_key");

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales FORCE ROW LEVEL SECURITY;
CREATE POLICY sales_select_member
  ON public.sales FOR SELECT
  TO authenticated
  USING (public.is_member_of(tenant_id));
CREATE POLICY sales_insert_member
  ON public.sales FOR INSERT
  TO authenticated
  WITH CHECK (public.is_member_of(tenant_id));
CREATE POLICY sales_update_member
  ON public.sales FOR UPDATE
  TO authenticated
  USING (public.is_member_of(tenant_id))
  WITH CHECK (public.is_member_of(tenant_id));
CREATE POLICY sales_delete_member
  ON public.sales FOR DELETE
  TO authenticated
  USING (public.is_member_of(tenant_id));

ALTER TABLE public.sale_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_lines FORCE ROW LEVEL SECURITY;
CREATE POLICY sale_lines_select_member
  ON public.sale_lines FOR SELECT
  TO authenticated
  USING (public.is_member_of(tenant_id));
CREATE POLICY sale_lines_insert_member
  ON public.sale_lines FOR INSERT
  TO authenticated
  WITH CHECK (public.is_member_of(tenant_id));
CREATE POLICY sale_lines_update_member
  ON public.sale_lines FOR UPDATE
  TO authenticated
  USING (public.is_member_of(tenant_id))
  WITH CHECK (public.is_member_of(tenant_id));
CREATE POLICY sale_lines_delete_member
  ON public.sale_lines FOR DELETE
  TO authenticated
  USING (public.is_member_of(tenant_id));