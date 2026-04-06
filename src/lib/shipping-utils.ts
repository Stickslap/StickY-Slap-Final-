
import { addDays, format, isBefore, parseISO, startOfDay, getDay } from 'date-fns';
import { ShippingOption, ShippingSettings, ShippingEstimate } from './types';

/**
 * Checks if a date is a business day based on settings and holidays.
 */
export function isBusinessDay(date: Date, settings: ShippingSettings): boolean {
  if (!settings || !settings.businessDays) return true;
  
  const day = getDay(date);
  if (!settings.businessDays.includes(day)) return false;
  
  const isoDate = format(date, 'yyyy-MM-dd');
  if (settings.holidays && settings.holidays.includes(isoDate)) return false;
  
  return true;
}

/**
 * Adds business days to a date, skipping weekends and holidays defined in settings.
 */
export function addBusinessDays(startDate: Date, days: number, settings: ShippingSettings): Date {
  let currentDate = new Date(startDate);
  let addedDays = 0;
  
  while (addedDays < days) {
    currentDate = addDays(currentDate, 1);
    if (isBusinessDay(currentDate, settings)) {
      addedDays++;
    }
  }
  
  return currentDate;
}

/**
 * Main delivery estimator logic.
 * Deterministic calculation used by both Admin and Checkout.
 * Now factors in product manufacturing lead times.
 */
export function calculateEstimate(
  createdAt: string,
  option: ShippingOption,
  settings: ShippingSettings,
  context: { 
    isRush: boolean; 
    isProofRequired: boolean; 
    isArtworkMissing: boolean;
    productTurnaroundDays?: number; // Specific manufacturing lead time
  }
): ShippingEstimate {
  const createdDate = createdAt ? parseISO(createdAt) : new Date();
  let baseStartDate = new Date(createdDate);
  
  const effectiveCutoff = option.cutoffTime || settings.defaultCutoffTime || '14:00';
  
  // 1. Daily Cutoff Time Rule
  if (effectiveCutoff) {
    const [cutoffHour, cutoffMinute] = effectiveCutoff.split(':').map(Number);
    const cutoffTimeToday = new Date(baseStartDate);
    cutoffTimeToday.setHours(cutoffHour || 14, cutoffMinute || 0, 0, 0);
    
    if (isBefore(cutoffTimeToday, baseStartDate)) {
      baseStartDate = addBusinessDays(baseStartDate, 1, settings);
    }
  }

  // 2. Workflow Adjustment
  if (context.isArtworkMissing || context.isProofRequired) {
    // Add 1-day buffer for proofing lifecycle
    baseStartDate = addBusinessDays(baseStartDate, 1, settings);
  }
  
  // 3. Processing (Production) Range
  // We take the larger of the shipping option's base processing or the actual product's lead time
  const baseLeadTimeMin = Math.max(option.processing.minDays, context.productTurnaroundDays || 0);
  const baseLeadTimeMax = Math.max(option.processing.maxDays, context.productTurnaroundDays || 0);

  const pMin = context.isRush ? (option.processing.rushMinDays || Math.ceil(baseLeadTimeMin / 2)) : baseLeadTimeMin;
  const pMax = context.isRush ? (option.processing.rushMaxDays || Math.ceil(baseLeadTimeMax / 2)) : baseLeadTimeMax;
  
  const shipDateMin = addBusinessDays(baseStartDate, pMin, settings);
  const shipDateMax = addBusinessDays(baseStartDate, pMax, settings);
  
  // 4. Transit (Carrier) Range
  const deliveryDateMin = addBusinessDays(shipDateMin, option.transit.minDays, settings);
  const deliveryDateMax = addBusinessDays(shipDateMax, option.transit.maxDays, settings);
  
  return {
    processingDaysMin: pMin,
    processingDaysMax: pMax,
    transitDaysMin: option.transit.minDays,
    transitDaysMax: option.transit.maxDays,
    estimatedShipDateMin: shipDateMin.toISOString(),
    estimatedShipDateMax: shipDateMax.toISOString(),
    estimatedDeliveryDateMin: deliveryDateMin.toISOString(),
    estimatedDeliveryDateMax: deliveryDateMax.toISOString(),
    version: 1
  };
}

/**
 * Returns a human-readable badge status for fulfillment deadlines.
 */
export function getDeadlineStatus(maxShipDate: string): 'On Track' | 'Due Soon' | 'Late' {
  if (!maxShipDate) return 'On Track';
  
  try {
    const now = startOfDay(new Date());
    const deadline = startOfDay(parseISO(maxShipDate));
    
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Late';
    if (diffDays <= 1) return 'Due Soon';
    return 'On Track';
  } catch (e) {
    return 'On Track';
  }
}
