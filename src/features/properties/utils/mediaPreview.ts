/** True when a media URL looks like a video (ignores query/hash). */
export function isVideoMediaUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  const path = url.split("?")[0]?.split("#")[0]?.toLowerCase() ?? "";
  return /\.(mp4|mov|webm|m4v|avi|mkv|ogg)$/i.test(path);
}

export function isVideoMediaType(
  type: string | null | undefined,
  url?: string | null,
): boolean {
  if (type?.toUpperCase() === "VIDEO") return true;
  if (type?.toUpperCase() === "IMAGE") return false;
  return isVideoMediaUrl(url);
}
