import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFilesSelect: (files: File[]) => void;
}

export function UploadModal({
  isOpen,
  onClose,
  onFilesSelect,
}: UploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(filesArray);
    }
  };

  const handleUpload = () => {
    if (selectedFiles.length > 0) {
      onFilesSelect(selectedFiles);
      setSelectedFiles([]);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleClose = () => {
    setSelectedFiles([]);
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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md m-4"
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
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close modal"
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
            <div className="flex items-center gap-3 mb-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2 flex-1"
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
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="primary"
              onClick={handleUpload}
              disabled={selectedFiles.length === 0}
              className="gap-2 flex-1"
            >
              <Upload className="w-4 h-4" />
              Upload {selectedFiles.length > 0 ? `${selectedFiles.length} ` : ""}File{selectedFiles.length !== 1 ? "s" : ""}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Max file size: 10MB per image, 100MB per video. You can select multiple files at once.
          </p>
        </div>
      </div>
    </div>
  );
}
