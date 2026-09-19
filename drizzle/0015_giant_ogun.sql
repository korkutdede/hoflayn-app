ALTER TABLE "tenants" ADD COLUMN "content_locale" text DEFAULT 'tr' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "locale" text;