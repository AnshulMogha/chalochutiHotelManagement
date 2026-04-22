import { useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFilesSelect: (files: File[]) => void;
  isUploading?: boolean;
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

  const isAllowedImageFile = (file: File) => {
    const lower = file.name.toLowerCase();
    const hasAllowedExt =
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg") ||
      lower.endsWith(".png") ||
      lower.endsWith(".webp");
    return ALLOWED_IMAGE_MIME_TYPES.has(file.type) || hasAllowedExt;
  };

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
      return Array.from(fileMap.values());
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      mergeFiles(filesArray);
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
      const droppedFiles = Array.from(e.dataTransfer.files);
      mergeFiles(droppedFiles);
      e.dataTransfer.clearData();
    }
  };

  const handleUpload = () => {
    if (isUploading) return;
    if (selectedFiles.length > 0) {
      setValidationError(null);
      onFilesSelect(selectedFiles);
    }
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between  rounded-t-2xl px-6 py-4 border-b border-gray-200 bg-linear-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <Upload className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Upload Media</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close modal"
            disabled={isUploading}
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Files (Multiple)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <div
              className={`mb-3 rounded-xl border-2 border-dashed min-h-[240px] p-8 transition-colors ${
                isDragActive
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-300 bg-gray-50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <p className="text-base text-gray-700 text-center mb-3">
                Drag & drop image/video files here
              </p>
              <p className="text-sm text-gray-500 text-center mb-6">
                or use the button below to browse files
              </p>
              <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                <p className="font-medium">
                  <span className="text-red-600">*</span> Image rules
                </p>
                <p>
                  <span className="text-red-600">*</span> Allowed: jpg, jpeg, png, webp
                </p>
                <p>
                  <span className="text-red-600">*</span> Max image size: 5 MB
                </p>
                <p className="mt-1 font-medium">
                  <span className="text-red-600">*</span> Video rules
                </p>
                <p>
                  <span className="text-red-600">*</span> Allowed: mp4, webm, mov
                </p>
                <p>
                  <span className="text-red-600">*</span> Max video size: 50 MB
                </p>
                <p>
                  <span className="text-red-600">*</span> Max files per upload: 10
                </p>
                <p className="mt-2">
                  <span className="text-red-600">*</span> Allowed image formats: jpg, jpeg, png, webp (max 5MB).{" "}
                  <span className="text-red-600">*</span> Allowed video formats: mp4, webm, mov (max 50MB).{" "}
                  <span className="text-red-600">*</span> Max 10 files per upload.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2 w-full"
                disabled={isUploading}
              >
                <Upload className="w-4 h-4" />
                Select Files
              </Button>
            </div>
            {selectedFiles.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-3 max-h-32 overflow-y-auto">
                <p className="text-xs text-gray-600 mb-2">
                  {selectedFiles.length} file(s) selected:
                </p>
                <ul className="text-xs text-gray-500 space-y-1">
                  {selectedFiles.map((file, index) => (
                    <li key={index} className="truncate">
                      {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {validationError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {validationError}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="primary"
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || isUploading}
              className="gap-2 flex-1"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload {selectedFiles.length > 0 ? `${selectedFiles.length} ` : ""}File{selectedFiles.length !== 1 ? "s" : ""}
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isUploading}>
              Cancel
            </Button>
          </div>
          {isUploading && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Upload in progress. Please wait...
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
