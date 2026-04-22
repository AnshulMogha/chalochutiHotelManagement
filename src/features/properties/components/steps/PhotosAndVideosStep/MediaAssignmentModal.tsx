import { useState, useEffect } from "react";
import { Image as ImageIcon, X, Check, Play, Grid3x3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui";
import { MEDIA_TAGS } from "./constants";
import type { MediaFile } from "./types";

interface MediaAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: MediaFile[];
  assignedMediaIds: string[];
  onAssign: (mediaIds: string[]) => void;
  title: string;
}

export function MediaAssignmentModal({
  isOpen,
  onClose,
  inventory,
  assignedMediaIds,
  onAssign,
  title,
}: MediaAssignmentModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(assignedMediaIds);
  const [filterTag, setFilterTag] = useState<string>("");

  // Update selectedIds when modal opens or assignedMediaIds changes
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(assignedMediaIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredInventory = filterTag
    ? inventory.filter((item) => item.tag === filterTag)
    : inventory;

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    onAssign(selectedIds);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col m-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <Grid3x3 className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-600">
                Select media from inventory ({selectedIds.length} selected)
              </p>
            </div>
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

        {/* Filter */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <Select
            label="Filter by Tag"
            options={[
              { value: "", label: "All Tags" },
              ...MEDIA_TAGS.map((tag) => ({
                value: tag.value,
                label: tag.label,
              })),
            ]}
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
          />
        </div>

        {/* Media Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredInventory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <ImageIcon className="w-16 h-16 mb-4" />
              <p className="text-lg font-medium">No media available</p>
              <p className="text-sm">
                {filterTag
                  ? "No media with this tag"
                  : "Upload media in Media Inventory first"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredInventory.map((item) => {
                const itemId = item.mediaId.toString();
                const isSelected = selectedIds.includes(itemId);
                return (
                  <div
                    key={item.mediaId}
                    className={cn(
                      "relative group rounded-lg overflow-hidden border-2 transition-all cursor-pointer",
                      isSelected
                        ? "border-blue-600 shadow-lg"
                        : "border-gray-200 hover:border-blue-400"
                    )}
                    onClick={() => toggleSelection(itemId)}
                  >
                    {item.type === "IMAGE" ? (
                      <div className="aspect-square relative">
                        <img
                          src={item.fileUrl}
                          alt={item.tag}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center">
                            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                              <Check className="w-6 h-6 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="aspect-video relative bg-gray-900">
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="w-12 h-12 text-white opacity-70" />
                        </div>
                        {isSelected && (
                          <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center">
                            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                              <Check className="w-6 h-6 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded capitalize font-medium">
                      {item.tag && item.tag !== "" ? item.tag.replace("_", " ") : "No Tag"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600">
            {selectedIds.length} media selected
          </p>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={handleSave}>
              Save Assignment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

