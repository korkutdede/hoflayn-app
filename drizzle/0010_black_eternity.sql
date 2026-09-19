CREATE TYPE "public"."stock_movement_type" AS ENUM('in', 'out', 'adjust', 'reserve');--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"type" "stock_movement_type" NOT NULL,
	"quantity" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"note" text,
	"related_type" text,
	"related_id" text,
	"allow_negative" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"idempotency_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stock_movements_product_created_idx" ON "stock_movements" USING btree ("product_id","created_at");--> statement-breakpoint
CREATE INDEX "stock_movements_tenant_created_idx" ON "stock_movements" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_movements_tenant_idempotency_uq" ON "stock_movements" USING btree ("tenant_id","idempotency_key");--> statement-breakpoint

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.stock_movements FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY stock_movements_select_member
  ON public.stock_movements FOR SELECT
  TO authenticated
  USING (public.is_member_of(tenant_id));--> statement-breakpoint
CREATE POLICY stock_movements_insert_member
  ON public.stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (public.is_member_of(tenant_id));--> statement-breakpoint
CREATE POLICY stock_movements_update_member
  ON public.stock_movements FOR UPDATE
  TO authenticated
  USING (public.is_member_of(tenant_id))
  WITH CHECK (public.is_member_of(tenant_id));--> statement-breakpoint
CREATE POLICY stock_movements_delete_member
  ON public.stock_movements FOR DELETE
  TO authenticated
  USING (public.is_member_of(tenant_id));