import { useState, useEffect } from "react";
import { X, Check, Image as ImageIcon, Play } from "lucide-react";
import { Button } from "@/components/ui";
import { MEDIA_TAGS } from "./constants";
import type { MediaTag, UploadMediaResponse } from "./types";
import { cn } from "@/lib/utils";

interface TagAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  uploadedMedia: UploadMediaResponse[];
  onTagsAssigned: (mediaWithTags: Array<{ media: UploadMediaResponse; tags: MediaTag[] }>) => void;
}

export function TagAssignmentModal({
  isOpen,
  onClose,
  uploadedMedia,
  onTagsAssigned,
}: TagAssignmentModalProps) {
  const [mediaTags, setMediaTags] = useState<Record<number, MediaTag[]>>({});

  useEffect(() => {
    if (isOpen) {
      // Initialize with empty tags for each media
      const initialTags: Record<number, MediaTag[]> = {};
      uploadedMedia.forEach((media) => {
        initialTags[media.mediaId] = [];
      });
      setMediaTags(initialTags);
    }
  }, [isOpen, uploadedMedia]);

  const toggleTag = (mediaId: number, tag: MediaTag) => {
    setMediaTags((prev) => {
      const currentTags = prev[mediaId] || [];
      if (currentTags.includes(tag)) {
        return {
          ...prev,
          [mediaId]: currentTags.filter((t) => t !== tag),
        };
      } else {
        return {
          ...prev,
          [mediaId]: [...currentTags, tag],
        };
      }
    });
  };

  const handleSave = () => {
    const mediaWithTags = uploadedMedia.map((media) => ({
      media,
      tags: mediaTags[media.mediaId] || [],
    })).filter((item) => item.tags.length > 0); // Only include media with at least one tag

    if (mediaWithTags.length > 0) {
      onTagsAssigned(mediaWithTags);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl m-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between rounded-t-2xl px-6 py-4 border-b border-gray-200 bg-linear-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <Check className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">
              Assign Tags to Uploaded Media
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

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {uploadedMedia.map((media) => {
              const tags = mediaTags[media.mediaId] || [];
              return (
                <div
                  key={media.mediaId}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex gap-4">
                    {/* Media Preview */}
                    <div className="flex-shrink-0">
                      {media.fileType === "IMAGE" ? (
                        <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-100">
                          <img
                            src={media.fileUrl}
                            alt="Uploaded media"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-32 h-32 rounded-lg bg-gray-900 flex items-center justify-center">
                          <Play className="w-8 h-8 text-white opacity-70" />
                        </div>
                      )}
                    </div>

                    {/* Tags Selection */}
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Tags (Multiple)
                      </label>
                      <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
                        {MEDIA_TAGS.map((tagOption) => {
                          const isSelected = tags.includes(tagOption.value as MediaTag);
                          return (
                            <button
                              key={tagOption.value}
                              type="button"
                              onClick={() => toggleTag(media.mediaId, tagOption.value as MediaTag)}
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
                      {tags.length === 0 && (
                        <p className="text-xs text-red-500 mt-1">
                          Please select at least one tag
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600">
            {uploadedMedia.length} media item(s) uploaded
          </p>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSave}
              disabled={
                uploadedMedia.some((media) => (mediaTags[media.mediaId] || []).length === 0)
              }
            >
              Assign Tags & Continue
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
