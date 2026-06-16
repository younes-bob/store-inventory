/**
 * subscription.js
 * Defines plans and checks feature access.
 * Subscription data is stored in Supabase `subscriptions` table.
 */

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    nameAr: 'مجاني',
    nameFr: 'Gratuit',
    price: 0,
    color: '#6b7280',
    gradient: 'linear-gradient(135deg,#6b7280,#4b5563)',
    limits: {
      stores: 1,
      products: 30,
      csvExport: false,
      visualSearch: false,
      salesHistory: 30, // days
    },
    features: [
      '1 store',
      'Up to 30 products',
      '30-day sales history',
      'Basic inventory',
    ],
    missing: [
      'CSV export',
      'Photo search',
      'Full sales history',
      'Multiple stores',
    ],
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    nameAr: 'قياسي',
    nameFr: 'Standard',
    price: 990,
    color: '#4f46e5',
    gradient: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
    limits: {
      stores: 3,
      products: Infinity,
      csvExport: true,
      visualSearch: true,
      salesHistory: Infinity,
    },
    features: [
      'Up to 3 stores',
      'Unlimited products',
      'Full sales history',
      'CSV export',
      'Photo search (AI)',
    ],
    missing: [
      'Unlimited stores',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    nameAr: 'احترافي',
    nameFr: 'Pro',
    price: 2490,
    color: '#059669',
    gradient: 'linear-gradient(135deg,#059669,#0d9488)',
    badge: 'Best Value',
    limits: {
      stores: Infinity,
      products: Infinity,
      csvExport: true,
      visualSearch: true,
      salesHistory: Infinity,
    },
    features: [
      'Unlimited stores',
      'Unlimited products',
      'Full sales history',
      'CSV export',
      'Photo search (AI)',
      'Priority support',
    ],
    missing: [],
  },
};

export function getPlan(planId) {
  return PLANS[planId] || PLANS.free;
}

export function canAddProduct(plan, currentCount) {
  return currentCount < getPlan(plan).limits.products;
}

export function canExportCSV(plan) {
  return getPlan(plan).limits.csvExport;
}

export function canUseVisualSearch(plan) {
  return getPlan(plan).limits.visualSearch;
}

export function canAddStore(plan, currentCount) {
  return currentCount < getPlan(plan).limits.stores;
}

export function getSalesHistoryLimit(plan) {
  return getPlan(plan).limits.salesHistory;
}
