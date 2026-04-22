/**
 * Helper functions for rate calendar data
 */

import type { RatesRoom, RoomRateDay } from '../type';

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

/**
 * Get day data for a specific date
 */
export function getDayData(days: RoomRateDay[], dateStr: string): RoomRateDay | null {
  return days.find((d) => d.date === dateStr) || null;
}
