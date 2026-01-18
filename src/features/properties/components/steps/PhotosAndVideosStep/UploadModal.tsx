import { useRef } from "react";
import { Upload, X, Check } from "lucide-react";
import { Button } from "@/components/ui";
import { MEDIA_TAGS } from "./constants";
import type { MediaTag } from "./types";
import { cn } from "@/lib/utils";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTags: MediaTag[];
  onTagsChange: (tags: MediaTag[]) => void;
  onFileSelect: (file: File | null, tags: MediaTag[]) => void;
}

export function UploadModal({
  isOpen,
  onClose,
  selectedTags,
  onTagsChange,
  onFileSelect,
}: UploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleTag = (tag: MediaTag) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
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
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Media Tags (Multiple)
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
              {MEDIA_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag.value as MediaTag);
                return (
                  <button
                    key={tag.value}
                    type="button"
                    onClick={() => toggleTag(tag.value as MediaTag)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left",
                      isSelected
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    {isSelected && <Check className="w-4 h-4" />}
                    <span>{tag.label}</span>
                  </button>
                );
              })}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => {
                if (
                  e.target.files &&
                  e.target.files.length > 0 &&
                  selectedTags.length > 0
                ) {
                  onFileSelect(e.target.files[0], selectedTags);
                }
              }}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={selectedTags.length === 0}
              className="gap-2 flex-1"
            >
              <Upload className="w-4 h-4" />
              Select File
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Max file size: 10MB per image, 100MB per video
          </p>
        </div>
      </div>
    </div>
  );
}
