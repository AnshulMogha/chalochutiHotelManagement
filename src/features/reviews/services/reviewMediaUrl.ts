/**
 * Review media is stored under /staycore/uploads/{storageKey}.
 * storageKey example: reviews/2026/08/24/8c3ed94a-….jpg
 * → https://thedemonstrate.com/staycore/uploads/reviews/2026/08/24/8c3ed94a-….jpg
 */
export function getStaycoreUploadsBaseUrl(): string {
  const apiBase = String(import.meta.env.VITE_API_BASE_URL || "").replace(
    /\/$/,
    "",
  );
  if (apiBase) {
    const fromApi = apiBase.replace(/\/api\/v1$/i, "/uploads");
    if (fromApi !== apiBase) return fromApi;
    try {
      const origin = new URL(apiBase).origin;
      return `${origin}/staycore/uploads`;
    } catch {
      /* fall through */
    }
  }
  return "https://thedemonstrate.com/staycore/uploads";
}

export function resolveReviewMediaUrl(media: {
  storageKey?: string | null;
  url?: string | null;
  fileUrl?: string | null;
  signedUrl?: string | null;
}): string | null {
  const direct =
    media.url?.trim() ||
    media.fileUrl?.trim() ||
    media.signedUrl?.trim() ||
    "";
  if (direct) return direct;

  const key = media.storageKey?.trim();
  if (!key) return null;
  if (/^https?:\/\//i.test(key)) return key;

  return `${getStaycoreUploadsBaseUrl()}/${key.replace(/^\//, "")}`;
}
