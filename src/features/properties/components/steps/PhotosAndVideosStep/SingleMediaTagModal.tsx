import { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import { Button } from "@/components/ui";
import { MEDIA_TAGS } from "./constants";
import type { MediaTag } from "./types";
import { cn } from "@/lib/utils";

interface SingleMediaTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaId: number;
  mediaUrl: string;
  mediaType: "IMAGE" | "VIDEO";
  currentTags: MediaTag[];
  onTagsAssigned: (mediaId: number, tags: MediaTag[]) => void;
}

export function SingleMediaTagModal({
  isOpen,
  onClose,
  mediaId,
  mediaUrl,
  mediaType,
  currentTags,
  onTagsAssigned,
}: SingleMediaTagModalProps) {
  const [selectedTags, setSelectedTags] = useState<MediaTag[]>(currentTags);

  useEffect(() => {
    if (isOpen) {
      setSelectedTags(currentTags);
    }
  }, [isOpen, currentTags]);

  const toggleTag = (tag: MediaTag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSave = () => {
    // Allow saving even with empty tags (to remove all tags)
    onTagsAssigned(mediaId, selectedTags);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between rounded-t-2xl px-6 py-4 border-b border-gray-200 bg-linear-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <Check className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">
              Assign Tags to Media
            </h2>
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

        <div className="p-6 space-y-6">
          {/* Media Preview */}
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              {mediaType === "IMAGE" ? (
                <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={mediaUrl}
                    alt="Media preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-lg bg-gray-900 flex items-center justify-center">
                  <div className="w-12 h-12 text-white opacity-70">▶</div>
                </div>
              )}
            </div>

            {/* Tags Selection */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Tags (Multiple)
              </label>
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {MEDIA_TAGS.map((tagOption) => {
                  const isSelected = selectedTags.includes(tagOption.value as MediaTag);
                  return (
                    <button
                      key={tagOption.value}
                      type="button"
                      onClick={() => toggleTag(tagOption.value as MediaTag)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left",
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      )}
                    >
                      {isSelected && <Check className="w-4 h-4" />}
                      <span>{tagOption.label}</span>
                    </button>
                  );
                })}
              </div>
              {selectedTags.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  No tags selected - media will have no tag
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600">
            {selectedTags.length} tag(s) selected
          </p>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSave}
            >
              {selectedTags.length > 0 ? "Assign Tags" : "Remove Tags"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
