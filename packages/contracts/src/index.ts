export const CRAFT_CATEGORIES = [
  { id: "ceramics", label: "Seramik" },
  { id: "candle", label: "Mum / Kokulu ürün" },
  { id: "wood", label: "Ahşap" },
  { id: "epoxy", label: "Epoksi" },
  { id: "textile", label: "Tekstil" },
  { id: "other", label: "Diğer" },
] as const;

export type CraftCategoryId = (typeof CRAFT_CATEGORIES)[number]["id"];

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = {
  ok: false;
  error: { code: string; message: string; details?: unknown };
};
export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

export type SessionUser = {
  id: string;
  email: string;
  fullName: string | null;
};

export type Workshop = {
  id: string;
  name: string;
  slug: string;
  craftCategory: string | null;
  craftCategories: string[];
  creditBalance: number;
  role: "owner" | "admin" | "member";
};

export type RecentJob = {
  id: string;
  operation: string;
  status: string;
  creditsCharged: number;
  createdAt: string;
  beforeUrl?: string;
  afterUrl?: string;
};

export type MeResponse = {
  user: SessionUser;
  workshop: Workshop;
  needsOnboarding: boolean;
  recentJobs: RecentJob[];
};

export type ProductInput = {
  name: string;
  description?: string;
  price?: string;
  costPrice?: string;
  stockQuantity?: number;
  /** null = use tenant default low-stock threshold */
  lowStockThreshold?: number | null;
  category?: string;
  tags?: string;
  coverImageId?: string | null;
  lengthCm?: string;
  widthCm?: string;
  heightCm?: string;
  weightKg?: string;
  sku?: string;
  barcodeValue?: string;
  barcodeFormat?: "code128" | "qr" | "gs1_128";
};

export type ProductDto = ProductInput & {
  id: string;
  tenantId: string;
  descriptionAiGenerated: boolean;
  coverUrl?: string;
  seoTitle?: string;
  seoMetaDescription?: string;
  seoSlug?: string;
  seoPrimaryKeyword?: string;
  seoSecondaryKeywords?: string;
  seoChannel?: string;
  seoAppliedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductImageAnalysis = {
  name: string;
  description: string;
  category: string;
  tags: string;
  material: string;
  colors: string[];
  confidence: number;
};

export type ProductImageAnalysisResult = {
  jobId: string;
  status: string;
  analysis?: ProductImageAnalysis;
  coverImageId: string;
  imageUrl: string;
  creditsCharged: number;
  error?: string;
};

export type ProductDescriptionSuggestion = {
  title: string;
  shortDescription: string;
  longDescription: string;
  bullets: string[];
  seoKeywords: string[];
};

export type ProductCaptionSuggestion = {
  caption: string;
  callToAction: string;
  hashtags: string[];
};

export type AiSuggestionResult<T> = {
  jobId: string;
  status: string;
  suggestion?: T;
  creditsCharged: number;
  provider: string | null;
  error?: string;
};

export type AiJobDto = {
  id: string;
  module: string;
  operation: string;
  status: string;
  provider: string | null;
  creditsReserved: number;
  creditsCharged: number;
  attempts: number;
  maxAttempts: number;
  output?: Record<string, unknown>;
  error?: string;
  nextAttemptAt?: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
};

export type InviteGateMode = "open" | "allowlist" | "closed";

export type InviteGateStatusDto = {
  gate: InviteGateMode;
  maxTenants: number | null;
  tenantCount: number | null;
  remaining: number | null;
};

export type InviteCheckDto = {
  allowed: true;
  status: "open" | "allowlisted";
};

export type TenantUsageBreakdownItem = {
  operation: string;
  label: string;
  creditsUsed: number;
  jobCount: number;
  unitCost: number | null;
};

export type TenantUsageSummary = {
  windowDays: number;
  creditsUsed: number;
  jobCount: number;
  succeededJobs: number;
  byOperation: TenantUsageBreakdownItem[];
};

export type BillingStatus = {
  configured: boolean;
  mode: "test" | "live" | "unconfigured";
  plan: string;
  isPro: boolean;
  creditBalance: number;
  subscriptionStatus?: string;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string;
  pro: {
    name: string;
    priceCents: number;
    currency: string;
    monthlyCredits: number;
  };
  creditPacks: Array<{
    id: "credits_50" | "credits_200";
    credits: number;
    label: string;
    priceCents: number;
  }>;
};

export type BridgeStatus = {
  configured: boolean;
  /** Whether this tenant has a valid marketplace connection. */
  connected: boolean;
  status:
    | "draft"
    | "pending"
    | "published"
    | "rejected"
    | "failed"
    | "archived";
  externalId?: string;
  externalUrl?: string;
  lastError?: string;
  rejectionReason?: string;
  lastAttemptAt?: string;
  lastSyncedAt?: string;
  publishedAt?: string;
  /** True when the local product changed after the last successful export. */
  needsUpdate?: boolean;
  /** Fields that must be completed before the product can be published. */
  missingFields?: string[];
};

export type ToolScenarioKind = "desi" | "profit";

export type ToolScenarioDto = {
  id: string;
  productId?: string | null;
  kind: ToolScenarioKind;
  name: string;
  currency: string;
  inputs: Record<string, unknown>;
  results: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type ToolScenarioInput = {
  kind: ToolScenarioKind;
  name: string;
  productId?: string | null;
  currency?: string;
  inputs: Record<string, unknown>;
};

export type StudioJobResult = {
  id: string;
  status: string;
  operation: "remove_bg" | "white_bg";
  creditsCharged: number;
  provider: string | null;
  beforeUrl?: string;
  afterUrl?: string;
  processedAssetId?: string;
  error?: string;
};

export type SeoChannelId = "generic_web" | "hoflayn_web";

export type SeoSuggestion = {
  channel: SeoChannelId;
  title: string;
  metaDescription: string;
  slug: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
};

export type SeoAudit = {
  score: number;
  missing: string[];
  warnings: string[];
  checks: Record<string, unknown>;
};

export type SeoApplyFlags = {
  title?: boolean;
  metaDescription?: boolean;
  slug?: boolean;
  primaryKeyword?: boolean;
  secondaryKeywords?: boolean;
  tagsFromKeywords?: boolean;
};

export type ProductSeoHistoryDto = {
  id: string;
  productId: string;
  jobId?: string | null;
  channel: SeoChannelId;
  suggestion: Record<string, unknown>;
  audit: Record<string, unknown>;
  appliedFields?: Record<string, boolean> | null;
  createdAt: string;
  appliedAt?: string | null;
};

export type ProductSeoState = {
  current: {
    seoTitle: string;
    seoMetaDescription: string;
    seoSlug: string;
    seoPrimaryKeyword: string;
    seoSecondaryKeywords: string;
    seoChannel: string;
    seoAppliedAt: string | null;
  };
  lastApplied: ProductSeoHistoryDto | null;
  history: ProductSeoHistoryDto[];
};

export type SeoAnalyzeResult = {
  jobId: string;
  status: string;
  suggestion?: SeoSuggestion;
  audit?: SeoAudit;
  creditsCharged: number;
  provider: string | null;
  error?: string;
  pendingConfirmation: true;
};

export type CatalogTemplateId = "grid" | "lookbook";
export type CatalogThemeId = "linen" | "ink";

export type CatalogItemDto = {
  id: string;
  productId: string;
  sortOrder: number;
  name: string;
  description: string;
  price: string;
};

export type CatalogExportDto = {
  id: string;
  catalogId: string;
  jobId?: string | null;
  mediaAssetId?: string | null;
  status: "pending" | "running" | "succeeded" | "failed";
  idempotencyKey: string;
  error?: string;
  pdfUrl?: string;
  createdAt: string;
  finishedAt?: string | null;
};

export type CatalogDto = {
  id: string;
  title: string;
  templateId: CatalogTemplateId;
  theme: CatalogThemeId;
  showPrices: boolean;
  showWorkshop: boolean;
  coverProductId?: string | null;
  workshopSnapshot: Record<string, unknown>;
  itemCount: number;
  items: CatalogItemDto[];
  latestExport?: CatalogExportDto | null;
  createdAt: string;
  updatedAt: string;
};

export type CatalogCreateInput = {
  title: string;
  templateId?: CatalogTemplateId;
  theme?: CatalogThemeId;
  showPrices?: boolean;
  showWorkshop?: boolean;
  coverProductId?: string | null;
  productIds: string[];
};

export type CatalogExportStartResult = {
  export: CatalogExportDto;
  jobId: string | null;
  reused: boolean;
};

export type LabelSizeId = "50x30" | "62x29" | "100x50";
export type LabelBarcodeFormat = "code128" | "qr" | "gs1_128";

export type LabelExportItemDto = {
  id: string;
  productId: string;
  name: string;
  price: string;
  sku: string;
  barcodeValue: string;
};

export type LabelExportDto = {
  id: string;
  status: "pending" | "running" | "succeeded" | "failed";
  size: LabelSizeId;
  format: LabelBarcodeFormat;
  copies: number;
  showPrice: boolean;
  showName: boolean;
  idempotencyKey: string;
  jobId?: string | null;
  mediaAssetId?: string | null;
  error?: string;
  pdfUrl?: string;
  itemCount: number;
  items: LabelExportItemDto[];
  createdAt: string;
  finishedAt?: string | null;
};

export type LabelExportStartResult = {
  export: LabelExportDto;
  jobId: string | null;
  reused: boolean;
};

export type StockMovementType = "in" | "out" | "adjust" | "reserve";

export type StockMovementDto = {
  id: string;
  productId: string;
  type: StockMovementType;
  quantity: number;
  balanceAfter: number;
  note: string;
  relatedType?: string | null;
  relatedId?: string | null;
  allowNegative: boolean;
  createdBy?: string | null;
  createdAt: string;
};

export type StockMovementInput = {
  type: StockMovementType;
  quantity: number;
  note?: string;
  allowNegative?: boolean;
  relatedType?: string | null;
  relatedId?: string | null;
  idempotencyKey?: string | null;
};

export type LowStockAlertDto = {
  productId: string;
  name: string;
  stockQuantity: number;
  threshold: number;
  productOverride: number | null;
};

export type LowStockListDto = {
  defaultThreshold: number;
  count: number;
  items: LowStockAlertDto[];
};

export type StockMovementResult = {
  movement: StockMovementDto;
  stockQuantity: number;
  reused: boolean;
  lowStockAlerts?: LowStockAlertDto[];
};

export type SaleSource = "manual" | "csv" | "hoflayn_web";
export type SaleStatus = "completed" | "voided";

export type SaleLineDto = {
  id: string;
  saleId: string;
  productId: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
  productNameSnapshot: string;
  stockMovementId?: string | null;
  createdAt: string;
};

export type SaleDto = {
  id: string;
  source: SaleSource;
  status: SaleStatus;
  currency: string;
  totalMinor: number;
  note: string;
  soldAt: string;
  idempotencyKey?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  lines: SaleLineDto[];
};

export type SaleLineInput = {
  productId: string;
  quantity: number;
  unitPrice: string;
};

export type SaleInput = {
  source?: SaleSource;
  note?: string;
  soldAt?: string | null;
  currency?: string;
  allowNegativeStock?: boolean;
  idempotencyKey?: string | null;
  lines: SaleLineInput[];
};

export type SaleCreateResult = {
  sale: SaleDto;
  reused: boolean;
  lowStockAlerts?: LowStockAlertDto[];
};

export type SaleVoidInput = {
  note?: string;
  idempotencyKey?: string | null;
};

export type SaleVoidResult = {
  sale: SaleDto;
  reused: boolean;
  lowStockAlerts?: LowStockAlertDto[];
};

export type SaleSummaryWindowMetrics = {
  revenueMinor: number;
  quantitySold: number;
  saleCount: number;
};

export type SaleSummaryTopProduct = {
  productId: string;
  productName: string;
  quantitySold: number;
  revenueMinor: number;
};

export type SaleSummaryDto = {
  currency: string;
  windows: {
    today: SaleSummaryWindowMetrics;
    last7Days: SaleSummaryWindowMetrics;
    last30Days: SaleSummaryWindowMetrics;
  };
  topProducts: SaleSummaryTopProduct[];
};

export type HomePulseRecentSale = {
  id: string;
  totalMinor: number;
  status: string;
  source: string;
  soldAt: string;
  lineCount: number;
};

export type HomePulseDto = {
  creditBalance: number;
  todaySales: SaleSummaryWindowMetrics;
  lowStockCount: number;
  recentSales: HomePulseRecentSale[];
  empty: {
    noSalesToday: boolean;
    noRecentSales: boolean;
    noLowStock: boolean;
  };
};


