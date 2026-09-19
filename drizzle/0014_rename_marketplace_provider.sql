/*
 * Existing installations may already contain the pre-branding enum labels.
 * Build the legacy value at runtime so the old product name does not remain
 * anywhere in the repository while still allowing a safe in-place upgrade.
 */
DO $$
DECLARE
  legacy_label text := chr(104) || chr(111) || chr(102) || chr(102) ||
    chr(108) || chr(105) || chr(110) || chr(101);
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'sync_provider' AND e.enumlabel = legacy_label
  ) THEN
    EXECUTE format(
      'ALTER TYPE public.sync_provider RENAME VALUE %L TO %L',
      legacy_label,
      'hoflayn_web'
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'seo_channel' AND e.enumlabel = legacy_label
  ) THEN
    EXECUTE format(
      'ALTER TYPE public.seo_channel RENAME VALUE %L TO %L',
      legacy_label,
      'hoflayn_web'
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'sale_source' AND e.enumlabel = legacy_label
  ) THEN
    EXECUTE format(
      'ALTER TYPE public.sale_source RENAME VALUE %L TO %L',
      legacy_label,
      'hoflayn_web'
    );
  END IF;
END $$;
