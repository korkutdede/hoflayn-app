CREATE TYPE "public"."tool_scenario_kind" AS ENUM('desi', 'profit');--> statement-breakpoint
CREATE TABLE "tool_scenarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"product_id" uuid,
	"kind" "tool_scenario_kind" NOT NULL,
	"name" text NOT NULL,
	"currency" text DEFAULT 'TRY' NOT NULL,
	"inputs" jsonb NOT NULL,
	"results" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "length_cm" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "width_cm" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "height_cm" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "weight_kg" numeric(8, 3);--> statement-breakpoint
ALTER TABLE "tool_scenarios" ADD CONSTRAINT "tool_scenarios_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_scenarios" ADD CONSTRAINT "tool_scenarios_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tool_scenarios_tenant_updated_idx" ON "tool_scenarios" USING btree ("tenant_id","updated_at");--> statement-breakpoint
CREATE INDEX "tool_scenarios_tenant_kind_idx" ON "tool_scenarios" USING btree ("tenant_id","kind");--> statement-breakpoint

ALTER TABLE public.tool_scenarios ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.tool_scenarios FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY tool_scenarios_select_member
  ON public.tool_scenarios FOR SELECT
  TO authenticated
  USING (public.is_member_of(tenant_id));--> statement-breakpoint
CREATE POLICY tool_scenarios_insert_member
  ON public.tool_scenarios FOR INSERT
  TO authenticated
  WITH CHECK (public.is_member_of(tenant_id));--> statement-breakpoint
CREATE POLICY tool_scenarios_update_member
  ON public.tool_scenarios FOR UPDATE
  TO authenticated
  USING (public.is_member_of(tenant_id))
  WITH CHECK (public.is_member_of(tenant_id));--> statement-breakpoint
CREATE POLICY tool_scenarios_delete_member
  ON public.tool_scenarios FOR DELETE
  TO authenticated
  USING (public.is_member_of(tenant_id));