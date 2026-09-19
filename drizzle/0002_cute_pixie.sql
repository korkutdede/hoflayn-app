CREATE TYPE "public"."subscription_status" AS ENUM('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'unpaid');--> statement-breakpoint
CREATE TABLE "billing_customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider" text DEFAULT 'stripe' NOT NULL,
	"customer_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"external_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"status" text DEFAULT 'processing' NOT NULL,
	"error" text,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider" text DEFAULT 'stripe' NOT NULL,
	"customer_id" text NOT NULL,
	"subscription_id" text NOT NULL,
	"price_id" text,
	"status" "subscription_status" NOT NULL,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "billing_customers" ADD CONSTRAINT "billing_customers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "billing_customers_tenant_provider_uq" ON "billing_customers" USING btree ("tenant_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_customers_provider_customer_uq" ON "billing_customers" USING btree ("provider","customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_events_provider_external_uq" ON "billing_events" USING btree ("provider","external_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_tenant_provider_uq" ON "subscriptions" USING btree ("tenant_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_provider_subscription_uq" ON "subscriptions" USING btree ("provider","subscription_id");--> statement-breakpoint

ALTER TABLE public.billing_customers ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.billing_customers FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY billing_customers_select_member
  ON public.billing_customers FOR SELECT
  TO authenticated
  USING (public.is_member_of(tenant_id));--> statement-breakpoint

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.subscriptions FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY subscriptions_select_member
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (public.is_member_of(tenant_id));--> statement-breakpoint

-- Webhook inbox is server-only. RLS is enabled with no authenticated policy.
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.billing_events FORCE ROW LEVEL SECURITY;--> statement-breakpoint

INSERT INTO public.plans (
  id, name, monthly_credits, price_cents, currency, defaults
)
VALUES (
  'pro',
  'Profesyonel',
  900,
  2499,
  'USD',
  '{"modules":{"studio":true,"writer":true,"catalog":false,"barcode":false},"limits":{"max_ai_jobs_per_day":100,"storage_gb":20}}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  monthly_credits = EXCLUDED.monthly_credits,
  price_cents = EXCLUDED.price_cents,
  currency = EXCLUDED.currency,
  defaults = EXCLUDED.defaults;