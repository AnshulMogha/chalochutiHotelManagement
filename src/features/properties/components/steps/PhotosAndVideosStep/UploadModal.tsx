import { useRef, useState } from "react";
import { FileImage, FileVideo, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFilesSelect: (files: File[]) => void;
  isUploading?: boolean;
}

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;
const MAX_FILES_PER_UPLOAD = 10;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);
const ALLOWED_VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function isAllowedImageFile(file: File) {
  const lower = file.name.toLowerCase();
  const hasAllowedExt =
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".webp");
  return ALLOWED_IMAGE_MIME_TYPES.has(file.type) || hasAllowedExt;
}

export function UploadModal({
  isOpen,
  onClose,
  onFilesSelect,
  isUploading = false,
}: UploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateFiles = (incomingFiles: File[]) => {
    const valid: File[] = [];
    const invalid: string[] = [];

    if (incomingFiles.length > MAX_FILES_PER_UPLOAD) {
      setValidationError(`Maximum ${MAX_FILES_PER_UPLOAD} files are allowed at a time.`);
      return [];
    }

    incomingFiles.forEach((file) => {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      const lower = file.name.toLowerCase();
      const isAllowedVideoExt =
        lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".mov");

      if (!isImage && !isVideo) {
        invalid.push(`${file.name}: unsupported file type`);
        return;
      }

      if (isImage && !isAllowedImageFile(file)) {
        invalid.push(`${file.name}: only jpg/jpeg/png/webp images are allowed`);
        return;
      }

      if (isVideo && !(ALLOWED_VIDEO_MIME_TYPES.has(file.type) || isAllowedVideoExt)) {
        invalid.push(`${file.name}: only mp4/webm/mov videos are allowed`);
        return;
      }

      if (isImage && file.size > MAX_IMAGE_SIZE_BYTES) {
        invalid.push(`${file.name}: image exceeds 5 MB`);
        return;
      }

      if (isVideo && file.size > MAX_VIDEO_SIZE_BYTES) {
        invalid.push(`${file.name}: video exceeds 50 MB`);
        return;
      }

      valid.push(file);
    });

    if (invalid.length > 0) {
      const preview = invalid.slice(0, 2).join(" | ");
      const more = invalid.length > 2 ? ` (+${invalid.length - 2} more)` : "";
      setValidationError(preview + more);
    } else {
      setValidationError(null);
    }

    return valid;
  };

  const mergeFiles = (incomingFiles: File[]) => {
    const validFiles = validateFiles(incomingFiles);
    if (!validFiles.length) return;
    setSelectedFiles((prev) => {
      const fileMap = new Map<string, File>();
      [...prev, ...validFiles].forEach((file) => {
        const key = `${file.name}-${file.size}-${file.lastModified}`;
        fileMap.set(key, file);
      });
      const merged = Array.from(fileMap.values());
      if (merged.length > MAX_FILES_PER_UPLOAD) {
        setValidationError(`Maximum ${MAX_FILES_PER_UPLOAD} files are allowed at a time.`);
        return merged.slice(0, MAX_FILES_PER_UPLOAD);
      }
      return merged;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      mergeFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      mergeFiles(Array.from(e.dataTransfer.files));
      e.dataTransfer.clearData();
    }
  };

  const handleUpload = () => {
    if (isUploading || selectedFiles.length === 0) return;
    setValidationError(null);
    onFilesSelect(selectedFiles);
  };

  const handleClose = () => {
    if (isUploading) return;
    setSelectedFiles([]);
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setValidationError(null);
  };

  if (!isOpen) return null;

  const hasFiles = selectedFiles.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className="flex max-h-[min(90vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-linear-to-r from-blue-50 to-indigo-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <Upload className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Upload Media</h2>
              {hasFiles ? (
                <p className="text-xs text-gray-500">
                  {selectedFiles.length} of {MAX_FILES_PER_UPLOAD} files selected
                </p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close modal"
            disabled={isUploading}
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-blue-100 bg-blue-50/80 px-3 py-2.5 text-xs text-blue-900">
              <p className="mb-1 font-semibold">Images</p>
              <p className="text-blue-800">jpg, jpeg, png, webp</p>
              <p className="mt-1 text-blue-700">Max 5 MB each</p>
            </div>
            <div className="rounded-lg border border-indigo-100 bg-indigo-50/80 px-3 py-2.5 text-xs text-indigo-900">
              <p className="mb-1 font-semibold">Videos</p>
              <p className="text-indigo-800">mp4, webm, mov</p>
              <p className="mt-1 text-indigo-700">Max 50 MB each</p>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Up to {MAX_FILES_PER_UPLOAD} files per upload. Drag and drop or browse below.
          </p>

          <div
            className={cn(
              "rounded-xl border-2 border-dashed transition-colors",
              isDragActive
                ? "border-blue-400 bg-blue-50"
                : "border-gray-300 bg-gray-50",
              hasFiles ? "px-4 py-3" : "px-6 py-8",
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {hasFiles ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-gray-600">
                  Drop more files here or add from your device
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0 gap-1.5"
                  disabled={isUploading}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Add files
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-base font-medium text-gray-700">
                  Drag & drop image/video files here
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  or use the button below to browse files
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-5 gap-2"
                  disabled={isUploading}
                >
                  <Upload className="h-4 w-4" />
                  Select Files
                </Button>
              </div>
            )}
          </div>

          {hasFiles ? (
            <div className="rounded-lg border border-gray-200">
              <div className="border-b border-gray-100 bg-gray-50 px-3 py-2">
                <p className="text-xs font-medium text-gray-700">
                  Selected files ({selectedFiles.length})
                </p>
              </div>
              <ul className="max-h-44 space-y-1 overflow-y-auto p-2">
                {selectedFiles.map((file, index) => {
                  const isVideo = file.type.startsWith("video/");
                  const Icon = isVideo ? FileVideo : FileImage;
                  return (
                    <li
                      key={`${file.name}-${file.size}-${file.lastModified}`}
                      className="flex items-center gap-2 rounded-md bg-gray-50 px-2 py-1.5"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-gray-500" />
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate text-sm font-medium text-gray-800"
                          title={file.name}
                        >
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {isVideo ? "Video" : "Image"} · {formatFileSize(file.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="shrink-0 rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                        aria-label={`Remove ${file.name}`}
                        disabled={isUploading}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {validationError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {validationError}
            </div>
          ) : null}

          {isUploading ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Upload in progress. Please wait...
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-3 border-t border-gray-200 bg-white px-6 py-4">
          <Button
            type="button"
            variant="primary"
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || isUploading}
            className="flex-1 gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload {hasFiles ? `${selectedFiles.length} ` : ""}
                File{selectedFiles.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isUploading}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
