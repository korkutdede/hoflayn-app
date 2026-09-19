/** Shared product constants (no secrets). */

export const FREE_PLAN_ID = "free";

/** Credits granted once at signup (aha-moment budget). */
export const FREE_INITIAL_CREDITS = 3;

/** Monthly credit allotment for the free plan (future renewals). */
export const FREE_MONTHLY_CREDITS = 90;

export const FREE_PLAN_DEFAULTS = {
  modules: {
    studio: true,
    writer: false,
    catalog: false,
    barcode: false,
  },
  limits: {
    max_ai_jobs_per_day: 10,
    storage_gb: 1,
  },
} as const;

export const APP_NAME = "Hoflayn";
