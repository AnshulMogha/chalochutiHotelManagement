/**
 * Production serves hotel documents from private S3 and requires a
 * short-lived signed download URL. Staging/dev still return usable
 * documentUrl/fileUrl on the list APIs.
 */
export function usesSignedDocumentDownloadUrls(): boolean {
  return import.meta.env.MODE === "production";
}

export function getStoredDocumentUrl(document: {
  documentUrl?: string | null;
  fileUrl?: string | null;
}): string {
  return String(document.documentUrl || document.fileUrl || "").trim();
}

/** List APIs return `documentId`; older payloads may use `id`. */
export function getDocumentId(document: {
  documentId?: number | string | null;
  id?: number | string | null;
}): number | null {
  const raw = document.documentId ?? document.id;
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
