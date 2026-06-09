import type {
  OnboardingDocument,
  OnboardingDocumentType,
} from "../services/api.types";

export const REQUIRED_ONBOARDING_DOCUMENT_TYPES = [
  "GST_CERTIFICATE",
  "CANCELLED_CHEQUE",
] as const satisfies readonly OnboardingDocumentType[];

export const REQUIRED_ONBOARDING_DOCUMENT_LABELS: Record<
  (typeof REQUIRED_ONBOARDING_DOCUMENT_TYPES)[number],
  string
> = {
  GST_CERTIFICATE: "GST Certificate",
  CANCELLED_CHEQUE: "Cancelled Cheque",
};

export function documentsValidator(documents: OnboardingDocument[]) {
  const uploaded = new Set(documents.map((doc) => doc.docType));
  const errors: Record<string, string> = {};

  for (const docType of REQUIRED_ONBOARDING_DOCUMENT_TYPES) {
    if (!uploaded.has(docType)) {
      errors[docType] = `${REQUIRED_ONBOARDING_DOCUMENT_LABELS[docType]} is required`;
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}
