/** GSTIN positions 3–12 (1-based) embed the business / proprietor PAN. */
export function extractPanFromGstin(gstin: string): string | null {
  const normalized = String(gstin || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (normalized.length < 12) return null;
  return normalized.slice(2, 12);
}

/**
 * Basic consistency check: submitted PAN must equal GSTIN chars 3–12.
 * Returns true when either value is incomplete (so mid-typing is not blocked).
 */
export function gstinMatchesPan(gstin: string, pan: string): boolean {
  const embedded = extractPanFromGstin(gstin);
  const normalizedPan = String(pan || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (!embedded || embedded.length !== 10 || normalizedPan.length !== 10) {
    return true;
  }
  return embedded === normalizedPan;
}

export const GSTIN_PAN_MISMATCH_MESSAGE =
  "PAN must match the business PAN in GSTIN (characters 3–12 of the GSTIN).";
