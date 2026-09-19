/**
 * Single entry point for the Drizzle schema. Each module owns a file; nothing
 * here imports application code, so this stays edge/tooling safe.
 */
export * from "./core";
export * from "./entitlements";
export * from "./credits";
export * from "./ai-jobs";
export * from "./media";
export * from "./billing";
export * from "./products";
export * from "./product-seo-history";
export * from "./catalogs";
export * from "./labels";
export * from "./stock-movements";
export * from "./sales";
export * from "./sync-links";
export * from "./tool-scenarios";
