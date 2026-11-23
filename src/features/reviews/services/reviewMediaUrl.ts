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

/**
 * Turn a stored upload value into one file URL.
 * The profile API can already return
 * https://thedemonstrate.com/staycore/uploads/profile_1_….png
 * Prefixing the uploads folder again produces
 * …/uploads/https://thedemonstrate.com/staycore/uploads/profile_1_….png
 */
export function resolveStaycoreUploadUrl(
  value: string | null | undefined,
): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;

  const absoluteUrls = trimmed.match(/https?:\/\/\S+/gi);
  if (absoluteUrls?.length) {
    return absoluteUrls[absoluteUrls.length - 1];
  }

  let relative = trimmed.replace(/^\/+/, "");
  relative = relative.replace(/^(?:staycore\/)?uploads\//i, "");
  const base = getStaycoreUploadsBaseUrl().replace(/\/$/, "");
  return `${base}/${relative}`;
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
  if (direct) return resolveStaycoreUploadUrl(direct);

  return resolveStaycoreUploadUrl(media.storageKey);
}
