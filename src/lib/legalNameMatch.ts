/**
 * Strict legal-name comparison for bank account holder vs GST/PAN legal name.
 * Normalizes spacing/case/harmless punctuation; no fuzzy matching.
 */

export function normalizeLegalName(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const cleaned = trimmed
    .toUpperCase()
    .replace(/&/g, " ")
    .replace(/[.,'/\\()\-]/g, " ")
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || null;
}

export function legalNamesMatch(
  verifiedLegalName: string | null | undefined,
  accountHolderName: string | null | undefined,
): boolean {
  const left = normalizeLegalName(verifiedLegalName);
  const right = normalizeLegalName(accountHolderName);
  if (!left || !right) return false;
  return left === right;
}

export function hasVerifiedLegalName(
  verifiedLegalName: string | null | undefined,
): boolean {
  return normalizeLegalName(verifiedLegalName) != null;
}

export const BANK_HOLDER_LEGAL_NAME_MISMATCH_MESSAGE =
  "Bank account holder name does not match your verified legal name as per GST/PAN records. Please enter the correct bank account holder name.";

export const BANK_HOLDER_LEGAL_NAME_MISSING_MESSAGE =
  "Verified legal name is missing. Complete agency GST/PAN details before submitting bank details.";
