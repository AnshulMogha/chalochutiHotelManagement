/**
 * Helper functions for rate calendar data
 */

import type {
  BulkUpdateDerivedRatesRequest,
  TargetPricingRule,
  UpdateSingleRateRequest,
} from '../services/rateService';
import type { RatesRoom, RoomRateDay } from '../type';

export interface SingleDerivedRateUpdateInput {
  roomId: number;
  ratePlanId: number;
  customerType: string;
  date: string;
  baseRate: number;
  singleOccupancyRate?: number | null;
  extraAdultCharge?: number;
  paidChildCharge?: number;
}

function normalizeSingleOccupancyRate(
  value: number | null | undefined,
): number | null {
  return value ?? null;
}

/** Blocks minus / scientific-notation keys on numeric inventory and rate inputs. */
export function blockNegativeNumberKey(e: {
  key: string;
  preventDefault: () => void;
}): void {
  if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
    e.preventDefault();
  }
}

/** Parses a rate field: empty = undefined; must be finite and > 0. */
export function parsePositiveRateInput(rawValue: string): number | undefined {
  if (rawValue === '' || rawValue.includes('-')) {
    return undefined;
  }

  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

/** Inventory total: empty → 0; negatives are rejected. */
export function parseNonNegativeInventoryInput(rawValue: string): number {
  if (rawValue === '' || rawValue.includes('-')) {
    return 0;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

/**
 * Returns a safe display string for inventory local state,
 * or null when the keystroke should be ignored (e.g. minus sign).
 */
export function sanitizeNonNegativeDisplayInput(
  rawValue: string,
): string | null {
  if (rawValue === '') return '';
  if (rawValue.includes('-')) return null;

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed < 0) return null;

  return rawValue;
}

/** Original day row before inline edits (from calendar snapshot ref). */
export function getOriginalRateDay(
  rooms: RatesRoom[],
  roomId: number,
  ratePlanId: number,
  date: string,
): RoomRateDay | null {
  const room = rooms.find((r) => r.roomId === roomId);
  const ratePlan = room?.ratePlans.find((rp) => rp.ratePlanId === ratePlanId);
  return ratePlan?.days.find((d) => d.date === date) ?? null;
}

/**
 * PUT /hotel/rates/single-derived — include only rate fields that differ from the snapshot.
 * When `forceSave` is true (explicit Save Changes), include provided rate fields even if unchanged.
 */
export function buildSingleDerivedRateUpdatePayload(
  input: SingleDerivedRateUpdateInput,
  originalDay: RoomRateDay | null | undefined,
  options?: { forceSave?: boolean },
): UpdateSingleRateRequest | null {
  const currency = originalDay?.currency ?? 'INR';
  const payload: UpdateSingleRateRequest = {
    roomId: input.roomId,
    ratePlanId: input.ratePlanId,
    customerType: input.customerType,
    date: input.date,
    currency,
  };

  const origBase = originalDay?.baseRate ?? 0;
  const origSingle = normalizeSingleOccupancyRate(originalDay?.singleOccupancyRate);
  const origExtra = originalDay?.extraAdultCharge ?? 0;
  const origPaid = originalDay?.paidChildCharge ?? 0;

  const newBase = input.baseRate || 0;

  if (options?.forceSave) {
    if (newBase > 0) {
      payload.baseRate = newBase;
    }
    if (input.singleOccupancyRate !== undefined) {
      payload.singleOccupancyRate = normalizeSingleOccupancyRate(
        input.singleOccupancyRate,
      );
    }
    if (input.extraAdultCharge !== undefined) {
      payload.extraAdultCharge = input.extraAdultCharge;
    }
    if (input.paidChildCharge !== undefined) {
      payload.paidChildCharge = input.paidChildCharge;
    }

    const hasAnyField =
      payload.baseRate !== undefined ||
      payload.singleOccupancyRate !== undefined ||
      payload.extraAdultCharge !== undefined ||
      payload.paidChildCharge !== undefined;

    return hasAnyField ? payload : null;
  }

  if (newBase !== origBase) {
    payload.baseRate = newBase;
  }

  if (input.singleOccupancyRate !== undefined) {
    const normalizedNew = normalizeSingleOccupancyRate(input.singleOccupancyRate);
    if (normalizedNew !== origSingle) {
      payload.singleOccupancyRate = normalizedNew;
    }
  }

  if (input.extraAdultCharge !== undefined && input.extraAdultCharge !== origExtra) {
    payload.extraAdultCharge = input.extraAdultCharge;
  }

  if (input.paidChildCharge !== undefined && input.paidChildCharge !== origPaid) {
    payload.paidChildCharge = input.paidChildCharge;
  }

  const hasRateFieldChange =
    payload.baseRate !== undefined ||
    payload.singleOccupancyRate !== undefined ||
    payload.extraAdultCharge !== undefined ||
    payload.paidChildCharge !== undefined;

  return hasRateFieldChange ? payload : null;
}

export type B2bB2cPricingMode =
  | 'SAME_AS_SOURCE'
  | 'PERCENTAGE_DECREASE'
  | 'PERCENTAGE_INCREASE'
  | 'FIXED_INCREASE'
  | 'FIXED_DECREASE';

export const B2B_PRICING_MODE_OPTIONS: {
  value: B2bB2cPricingMode;
  label: string;
}[] = [
  { value: 'SAME_AS_SOURCE', label: 'Same as source (B2C)' },
  { value: 'PERCENTAGE_DECREASE', label: 'Percentage decrease' },
  { value: 'PERCENTAGE_INCREASE', label: 'Percentage increase' },
  { value: 'FIXED_DECREASE', label: 'Fixed amount decrease' },
  { value: 'FIXED_INCREASE', label: 'Fixed amount increase' },
];

export function isB2bFixedPricingMode(
  mode: B2bB2cPricingState['mode'],
): mode is 'FIXED_INCREASE' | 'FIXED_DECREASE' {
  return mode === 'FIXED_INCREASE' || mode === 'FIXED_DECREASE';
}

export function isB2bPercentagePricingMode(
  mode: B2bB2cPricingState['mode'],
): mode is 'PERCENTAGE_DECREASE' | 'PERCENTAGE_INCREASE' {
  return mode === 'PERCENTAGE_DECREASE' || mode === 'PERCENTAGE_INCREASE';
}

export function getB2bPricingModeHint(mode: B2bB2cPricingState['mode']): string | null {
  switch (mode) {
    case 'SAME_AS_SOURCE':
      return 'B2B rate will match the B2C rate you entered.';
    case 'PERCENTAGE_DECREASE':
      return 'B2B rate = B2C rate minus this percentage.';
    case 'PERCENTAGE_INCREASE':
      return 'B2B rate = B2C rate plus this percentage.';
    case 'FIXED_DECREASE':
      return 'B2B rate = B2C rate minus this fixed amount.';
    case 'FIXED_INCREASE':
      return 'B2B rate = B2C rate plus this fixed amount.';
    default:
      return null;
  }
}

export interface B2bB2cPricingState {
  mode: B2bB2cPricingMode | '';
  fixedAmount: string;
  percentage: string;
}

export const createDefaultB2bPricingState = (): B2bB2cPricingState => ({
  mode: '',
  fixedAmount: '',
  percentage: '',
});

/** Clamp typed B2B percentage to 0–100 (empty string allowed). */
export function clampB2bPercentageInput(raw: string): string {
  if (!raw.trim()) return '';
  const parsed = parseFloat(raw);
  if (Number.isNaN(parsed)) return '';
  if (parsed < 0) return '0';
  if (parsed > 100) return '100';
  return raw;
}

export type B2bRateFieldKey = DerivedRateFieldKey;

export type B2bPricingFieldErrors = Partial<Record<B2bRateFieldKey, string>>;

export function getB2bPricingFieldErrors(
  formEntries: Array<{
    baseRate?: number;
    singleOccupancyRate?: number;
    extraAdultCharge?: number;
    paidChildCharge?: number;
  }>,
  b2bStates: Record<B2bRateFieldKey, B2bB2cPricingState>,
): B2bPricingFieldErrors {
  const errors: B2bPricingFieldErrors = {};

  for (const { sourceKey, label } of DERIVED_RATE_FIELDS) {
    const hasFieldInForm = formEntries.some(
      (entry) => entry[sourceKey] !== undefined,
    );
    if (!hasFieldInForm) continue;

    const state = b2bStates[sourceKey];
    if (!state.mode) {
      errors[sourceKey] = `Select B2B pricing for ${label}`;
      continue;
    }
    if (isB2bFixedPricingMode(state.mode)) {
      const amount = parseFloat(state.fixedAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        errors[sourceKey] = `Enter a valid fixed amount for ${label}`;
      }
      continue;
    }
    if (isB2bPercentagePricingMode(state.mode)) {
      const percentage = parseFloat(state.percentage);
      if (!Number.isFinite(percentage) || percentage <= 0) {
        errors[sourceKey] = `Enter a valid percentage for ${label}`;
      } else if (percentage > 100) {
        errors[sourceKey] = `Percentage cannot exceed 100 for ${label}`;
      }
    }
  }

  return errors;
}

export function mapB2bPricingStateToTargetRule(
  state: B2bB2cPricingState,
): TargetPricingRule | null {
  if (!state.mode) return null;

  switch (state.mode) {
    case 'SAME_AS_SOURCE':
      return { mode: 'SAME_AS_SOURCE' };
    case 'FIXED_DECREASE':
    case 'FIXED_INCREASE': {
      const fixedAmount = parseFloat(state.fixedAmount);
      if (!Number.isFinite(fixedAmount) || fixedAmount <= 0) return null;
      return { mode: state.mode, fixedAmount };
    }
    case 'PERCENTAGE_DECREASE':
    case 'PERCENTAGE_INCREASE': {
      const percentage = parseFloat(state.percentage);
      if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) {
        return null;
      }
      return { mode: state.mode, percentage };
    }
    default:
      return null;
  }
}

type DerivedRateFieldKey = keyof BulkUpdateDerivedRatesRequest['sourceRates'];

const DERIVED_RATE_FIELDS: Array<{
  sourceKey: DerivedRateFieldKey;
  label: string;
}> = [
  { sourceKey: 'baseRate', label: 'Base Rate' },
  { sourceKey: 'singleOccupancyRate', label: 'Single Rate' },
  { sourceKey: 'extraAdultCharge', label: 'Extra Adult Charge' },
  { sourceKey: 'paidChildCharge', label: 'Paid Child Rate' },
];

export function validateB2bPricingConfig(
  formEntries: Array<{
    baseRate?: number;
    singleOccupancyRate?: number;
    extraAdultCharge?: number;
    paidChildCharge?: number;
  }>,
  b2bStates: Record<B2bRateFieldKey, B2bB2cPricingState>,
): string | null {
  const errors = getB2bPricingFieldErrors(formEntries, b2bStates);
  return Object.values(errors)[0] ?? null;
}

export function buildBulkUpdateDerivedPayload(
  data: {
    numericRoomId: number;
    ratePlanId: number;
    baseRate?: number;
    singleOccupancyRate?: number;
    extraAdultCharge?: number;
    paidChildCharge?: number;
  },
  from: string,
  to: string,
  weekDays: string[],
  b2bStates: Record<DerivedRateFieldKey, B2bB2cPricingState>,
): BulkUpdateDerivedRatesRequest | null {
  const sourceRates: BulkUpdateDerivedRatesRequest['sourceRates'] = {};
  const targetPricingRules: BulkUpdateDerivedRatesRequest['targetPricingRules'] =
    {};

  for (const { sourceKey } of DERIVED_RATE_FIELDS) {
    const value = data[sourceKey];
    if (value === undefined) continue;

    sourceRates[sourceKey] = value;
    const rule = mapB2bPricingStateToTargetRule(b2bStates[sourceKey]);
    if (rule) {
      targetPricingRules[sourceKey] = rule;
    }
  }

  if (Object.keys(sourceRates).length === 0) {
    return null;
  }

  return {
    roomId: data.numericRoomId,
    ratePlanId: data.ratePlanId,
    from,
    to,
    weekDays,
    currency: 'INR',
    sourceCustomerType: 'RETAIL',
    targetCustomerType: 'AGENT',
    sourceRates,
    targetPricingRules,
    previewOnly: false,
  };
}

/**
 * Get room by ID
 */
export function getRoomById(rooms: RatesRoom[], roomId: number): RatesRoom | undefined {
  return rooms.find((room) => room.roomId === roomId);
}

/**
 * Format currency value
 * If currency is null, defaults to "INR"
 */
export function formatCurrency(value: number | null | undefined, currency: string | null | undefined): string {
  const currencyCode = currency ?? 'INR';
  if (value === null || value === undefined) {
    return '--';
  }
  // For now, just return the value with currency code
  // Can be enhanced to format based on locale
  return `${value} ${currencyCode}`;
}

/**
 * Format rate value for display
 * Shows 0 as "0" (not blank), null/undefined as "--"
 */
export function formatRate(value: number | null | undefined): string | number {
  if (value === null || value === undefined) {
    return '--';
  }
  return value;
}

/**
 * Format time value
 * Shows null as "--"
 */
export function formatTime(time: string | null | undefined): string {
  if (!time) return '--';
  // Handle both "HH:mm:ss" and "HH:mm" formats
  const parts = time.split(':');
  return `${parts[0]}:${parts[1]}`;
}

/**
 * Format time for input (HH:mm format)
 */
export function formatTimeForInput(time: string | null | undefined): string {
  if (!time) return '';
  const parts = time.split(':');
  return `${parts[0]}:${parts[1]}`;
}

/** User-facing 12-hour time (e.g. "6:00 PM") from HH:mm or HH:mm:ss */
export function formatTimeForDisplay(time: string): string {
  const parts = time.split(':');
  const hours = parseInt(parts[0] ?? '0', 10);
  const minutes = parseInt(parts[1] ?? '0', 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return time;
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
}

export type CutoffPreset =
  | ''
  | 'MIDNIGHT'
  | 'BEFORE_MIDNIGHT'
  | 'AFTER_MIDNIGHT'
  | 'FIXED_TIME';

export type InventoryCutoffType =
  | 'BEFORE_MIDNIGHT'
  | 'MIDNIGHT'
  | 'AFTER_MIDNIGHT'
  | 'FIXED_TIME';

/** Human-readable booking cutoff from inventory calendar API fields. */
export function formatInventoryCutoffDisplay(
  cutoffType: InventoryCutoffType | string | null | undefined,
  cutoffHours: number | null | undefined,
  bookingCutoffTime: string | null | undefined,
): string {
  if (!cutoffType) return '--';

  switch (cutoffType) {
    case 'MIDNIGHT':
      return 'At midnight (check-in day)';
    case 'BEFORE_MIDNIGHT': {
      if (cutoffHours == null || !Number.isFinite(cutoffHours)) {
        return 'Hours before midnight';
      }
      const hourLabel = cutoffHours === 1 ? 'hour' : 'hours';
      return `${cutoffHours} ${hourLabel} before midnight`;
    }
    case 'AFTER_MIDNIGHT': {
      if (cutoffHours == null || !Number.isFinite(cutoffHours)) {
        return 'Hours after midnight';
      }
      const hourLabel = cutoffHours === 1 ? 'hour' : 'hours';
      return `${cutoffHours} ${hourLabel} after midnight`;
    }
    case 'FIXED_TIME': {
      if (!bookingCutoffTime?.trim()) return 'Fixed time on check-in day';
      return formatTimeForDisplay(bookingCutoffTime);
    }
    default:
      return '--';
  }
}

export function isInventoryCutoffConfigured(
  cutoffType: InventoryCutoffType | string | null | undefined,
): boolean {
  return Boolean(cutoffType);
}

export const CUTOFF_PRESET_OPTIONS: { value: Exclude<CutoffPreset, ''>; label: string }[] = [
  { value: 'MIDNIGHT', label: 'At midnight (check-in day)' },
  { value: 'BEFORE_MIDNIGHT', label: 'Hours before midnight' },
  { value: 'AFTER_MIDNIGHT', label: 'Hours after midnight' },
  { value: 'FIXED_TIME', label: 'Fixed time on check-in day' },
];

export const CUTOFF_HOURS_MAX: Record<'BEFORE_MIDNIGHT' | 'AFTER_MIDNIGHT', number> = {
  BEFORE_MIDNIGHT: 23,
  AFTER_MIDNIGHT: 6,
};

export function getCutoffHoursMax(preset: CutoffPreset): number | null {
  if (preset === 'BEFORE_MIDNIGHT' || preset === 'AFTER_MIDNIGHT') {
    return CUTOFF_HOURS_MAX[preset];
  }
  return null;
}

/** Clamp typed hours to 1..max for the active preset (empty string allowed). */
export function clampCutoffHoursInput(preset: CutoffPreset, raw: string): string {
  if (!raw.trim()) return '';
  const max = getCutoffHoursMax(preset);
  if (max === null) return raw;

  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed)) return '';

  if (parsed < 1) return '1';
  if (parsed > max) return String(max);
  return String(parsed);
}

export type BulkRestrictionsCutoffPayload =
  | { cutoffType: 'BEFORE_MIDNIGHT'; cutoffHours: number }
  | { cutoffType: 'MIDNIGHT' }
  | { cutoffType: 'AFTER_MIDNIGHT'; cutoffHours: number }
  | { cutoffType: 'FIXED_TIME'; bookingCutoffTime: string };

/** Normalize HH:mm from time input to API HH:mm:ss */
export function formatBookingCutoffTimeForApi(time: string): string | null {
  const trimmed = time.trim();
  if (!trimmed) return null;
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = match[3] ? parseInt(match[3], 10) : 0;
  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    !Number.isFinite(seconds) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59 ||
    seconds < 0 ||
    seconds > 59
  ) {
    return null;
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** Build API `cutoffTime` (HH:mm:ss) from preset + hours offset (calendar display). */
export function buildCutoffTimeFromPreset(
  preset: CutoffPreset,
  hours: number,
): string | null {
  if (!preset) return null;
  if (preset === 'MIDNIGHT') return '00:00:00';
  if (preset === 'FIXED_TIME') {
    return null;
  }

  if (preset === 'BEFORE_MIDNIGHT') {
    if (!Number.isFinite(hours) || hours < 1 || hours > CUTOFF_HOURS_MAX.BEFORE_MIDNIGHT) {
      return null;
    }
    const hourOfDay = 24 - hours;
    return `${String(hourOfDay).padStart(2, '0')}:00:00`;
  }

  if (preset === 'AFTER_MIDNIGHT') {
    if (!Number.isFinite(hours) || hours < 1 || hours > CUTOFF_HOURS_MAX.AFTER_MIDNIGHT) {
      return null;
    }
    return `${String(hours).padStart(2, '0')}:00:00`;
  }

  return null;
}

export function buildBulkRestrictionsCutoff(
  preset: CutoffPreset,
  hoursStr: string,
  fixedTimeStr: string,
):
  | { success: true; cutoff: BulkRestrictionsCutoffPayload | null }
  | { success: false; message: string } {
  if (!preset) {
    return { success: true, cutoff: null };
  }

  if (preset === 'MIDNIGHT') {
    return { success: true, cutoff: { cutoffType: 'MIDNIGHT' } };
  }

  if (preset === 'BEFORE_MIDNIGHT' || preset === 'AFTER_MIDNIGHT') {
    const hours = parseInt(hoursStr, 10);
    const max = CUTOFF_HOURS_MAX[preset];
    if (!hours || hours < 1 || hours > max) {
      return {
        success: false,
        message:
          preset === 'BEFORE_MIDNIGHT'
            ? 'Enter between 1 and 23 hours before midnight.'
            : 'Enter between 1 and 6 hours after midnight.',
      };
    }
    return {
      success: true,
      cutoff: { cutoffType: preset, cutoffHours: hours },
    };
  }

  if (preset === 'FIXED_TIME') {
    const bookingCutoffTime = formatBookingCutoffTimeForApi(fixedTimeStr);
    if (!bookingCutoffTime) {
      return {
        success: false,
        message: 'Select a valid fixed cutoff time (e.g. 6:00 PM).',
      };
    }
    return {
      success: true,
      cutoff: { cutoffType: 'FIXED_TIME', bookingCutoffTime },
    };
  }

  return { success: false, message: 'Invalid cutoff type.' };
}

export function getCutoffHelperMessage(
  preset: CutoffPreset,
  hours: number,
  fixedTime: string,
): string | null {
  if (!preset) return null;

  if (preset === 'MIDNIGHT') {
    return 'Guests can book until 11:59 PM on the check-in day. Booking closes at midnight.';
  }

  if (preset === 'BEFORE_MIDNIGHT') {
    if (!hours || hours < 1) {
      return `Enter 1–${CUTOFF_HOURS_MAX.BEFORE_MIDNIGHT} hours before midnight on the check-in day (e.g. 6 closes booking at 6:00 PM).`;
    }
    const resolved = buildCutoffTimeFromPreset(preset, hours);
    if (!resolved) return null;
    const hourLabel = hours === 1 ? 'hour' : 'hours';
    return `Booking closes ${hours} ${hourLabel} before midnight on the check-in day (at ${formatTimeForDisplay(resolved)}).`;
  }

  if (preset === 'AFTER_MIDNIGHT') {
    if (!hours || hours < 1) {
      return `Enter 1–${CUTOFF_HOURS_MAX.AFTER_MIDNIGHT} hours after midnight (e.g. 3 allows booking until 3:00 AM on the check-in day).`;
    }
    const resolved = buildCutoffTimeFromPreset(preset, hours);
    if (!resolved) return null;
    const hourLabel = hours === 1 ? 'hour' : 'hours';
    return `Booking closes ${hours} ${hourLabel} after midnight on the check-in day (at ${formatTimeForDisplay(resolved)}).`;
  }

  if (preset === 'FIXED_TIME') {
    if (!fixedTime.trim()) {
      return 'Pick the exact clock time on the check-in day when booking closes (hotel local time).';
    }
    const apiTime = formatBookingCutoffTimeForApi(fixedTime);
    if (!apiTime) {
      return 'Enter a valid time between 12:00 AM and 11:59 PM.';
    }
    return `Booking closes at ${formatTimeForDisplay(apiTime)} on the check-in day. Guests cannot book after this time.`;
  }

  return null;
}

/** `true` = close, `false` = inactivate/open, `null` = no change selected. */
export function resolveRestrictionTriState(
  closeChecked: boolean,
  inactivateChecked: boolean,
): boolean | null {
  if (closeChecked) return true;
  if (inactivateChecked) return false;
  return null;
}

/** @deprecated Use getCutoffHelperMessage */
export function getCutoffHoursHelperMessage(
  preset: CutoffPreset,
  hours: number,
): string | null {
  return getCutoffHelperMessage(preset, hours, '');
}

/**
 * Get day data for a specific date
 */
export function getDayData(days: RoomRateDay[], dateStr: string): RoomRateDay | null {
  return days.find((d) => d.date === dateStr) || null;
}
