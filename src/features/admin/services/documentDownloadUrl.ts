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
