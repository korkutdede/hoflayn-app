ALTER TABLE "tenants" ADD COLUMN "default_low_stock_threshold" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "low_stock_threshold" integer;