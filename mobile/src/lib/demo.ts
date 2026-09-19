import type { HomePulseDto, MeResponse, ProductDto } from '@hoflayn/contracts';

export const DEMO_ME: MeResponse = {
  user: {
    id: 'demo-user',
    email: 'merhaba@ornek-atolye.com',
    fullName: 'Elif',
  },
  workshop: {
    id: 'demo-workshop',
    name: 'Toprak & İz Atölyesi',
    slug: 'toprak-ve-iz',
    craftCategory: 'ceramics',
    craftCategories: ['ceramics'],
    creditBalance: 24,
    role: 'owner',
  },
  needsOnboarding: false,
  recentJobs: [
    {
      id: 'demo-job-1',
      operation: 'white_bg',
      status: 'succeeded',
      creditsCharged: 2,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'demo-job-2',
      operation: 'generate_caption',
      status: 'succeeded',
      creditsCharged: 2,
      createdAt: new Date(Date.now() - 86_400_000).toISOString(),
    },
  ],
};

export const DEMO_HOME_PULSE: HomePulseDto = {
  creditBalance: 24,
  todaySales: {
    revenueMinor: 21300,
    quantitySold: 2,
    saleCount: 1,
  },
  lowStockCount: 1,
  recentSales: [
    {
      id: 'demo-sale-1',
      totalMinor: 21300,
      status: 'completed',
      source: 'manual',
      soldAt: new Date().toISOString(),
      lineCount: 2,
    },
  ],
  empty: {
    noSalesToday: false,
    noRecentSales: false,
    noLowStock: false,
  },
};

export const DEMO_PRODUCTS: ProductDto[] = [
  {
    id: 'demo-product-1',
    tenantId: 'demo-workshop',
    name: 'El Yapımı Benekli Kupa',
    description: 'Günlük kahve ritüelleri için elde şekillendirilmiş seramik kupa.',
    descriptionAiGenerated: false,
    price: '680.00',
    costPrice: '210.00',
    stockQuantity: 8,
    category: 'Kupa',
    tags: 'seramik, el yapımı, kahve',
    coverImageId: null,
    coverUrl:
      'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=800&q=80',
    lengthCm: '12',
    widthCm: '9',
    heightCm: '10',
    weightKg: '0.350',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-product-2',
    tenantId: 'demo-workshop',
    name: 'Dalga Formlu Vazo',
    description: 'Mat dokulu, organik formlu dekoratif vazo.',
    descriptionAiGenerated: true,
    price: '1450.00',
    costPrice: '480.00',
    stockQuantity: 3,
    category: 'Vazo',
    tags: 'dekorasyon, seramik, vazo',
    coverImageId: null,
    coverUrl:
      'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=800&q=80',
    lengthCm: '20',
    widthCm: '20',
    heightCm: '35',
    weightKg: '1.800',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
