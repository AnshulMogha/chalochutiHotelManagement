import imageCompression from "browser-image-compression";
import compressionWorkerUrl from "browser-image-compression/dist/browser-image-compression.js?url";

/** Original photos smaller than this are still rejected. */
export const IMAGE_MIN_ORIGINAL_BYTES = 250 * 1024;
/** Photos larger than this are compressed in the browser before upload. */
export const IMAGE_COMPRESS_ABOVE_BYTES = 2 * 1024 * 1024;
/** Largest file we will send to the API. */
export const IMAGE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
/** Largest original the browser will try to compress. */
export const IMAGE_SOURCE_MAX_BYTES = 30 * 1024 * 1024;

function jpegFileName(name: string) {
  const base = name.replace(/\.[^.]+$/, "").trim() || "photo";
  return `${base}.jpg`;
}

export function shouldCompressHotelImage(file: File) {
  return file.type.startsWith("image/") && file.size > IMAGE_COMPRESS_ABOVE_BYTES;
}

async function compressOnce(
  file: File,
  maxSizeMB: number,
  maxWidthOrHeight: number,
  initialQuality: number,
) {
  const options = {
    maxSizeMB,
    maxWidthOrHeight,
    initialQuality,
    fileType: "image/jpeg" as const,
  };
  try {
    return await imageCompression(file, {
      ...options,
      useWebWorker: true,
      libURL: compressionWorkerUrl,
    });
  } catch {
    return imageCompression(file, { ...options, useWebWorker: false });
  }
}

/** Shrink a hotel photo to a JPEG the upload API will accept. */
export async function compressHotelImage(file: File): Promise<File> {
  if (!shouldCompressHotelImage(file)) return file;

  let compressed = await compressOnce(file, 2, 2560, 0.8);
  if (compressed.size > IMAGE_UPLOAD_MAX_BYTES) {
    compressed = await compressOnce(file, 1.2, 1920, 0.7);
  }

  const named = new File([compressed], jpegFileName(file.name), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });

  if (named.size > IMAGE_UPLOAD_MAX_BYTES) {
    throw new Error(`${file.name}: image exceeds 5 MB`);
  }

  if (named.size < file.size) return named;
  if (file.size <= IMAGE_UPLOAD_MAX_BYTES) return file;
  return named;
}
