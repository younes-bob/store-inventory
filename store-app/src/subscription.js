import { PLANS } from './config';

export { PLANS };

export function getPlan(planId) {
  return PLANS[planId] || PLANS.free;
}

export function canAddProduct(planId, currentCount) {
  return currentCount < getPlan(planId).limits.products;
}

export function canExportCSV(planId) {
  return getPlan(planId).limits.csvExport;
}

export function canUseVisualSearch(planId) {
  return getPlan(planId).limits.visualSearch;
}

export function canAddStore(planId, currentCount) {
  return currentCount < getPlan(planId).limits.stores;
}
