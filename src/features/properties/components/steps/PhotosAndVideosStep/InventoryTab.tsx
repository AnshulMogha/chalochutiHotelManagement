import { Folder, Plus, Upload, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui";
import { MediaGrid } from "./MediaGrid";
import type { MediaFile } from "./types";

interface InventoryTabProps {
  inventory: MediaFile[];
  onUploadClick: () => void;
  onRemove?: (id: string) => void;
  onAssignTags?: (mediaId: number) => void;
}

export function InventoryTab({
  inventory,
  onUploadClick,
  onRemove,
  onAssignTags,
}: InventoryTabProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
      <div className="bg-linear-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Folder className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Media Inventory
              </h2>
              <p className="text-xs text-gray-600 mt-0.5">
                {inventory.length} media items
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={onUploadClick}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Upload Media
          </Button>
        </div>
      </div>

      <div className="p-6">
        {inventory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <ImageIcon className="w-16 h-16 mb-4" />
            <p className="text-lg font-medium">No media in inventory</p>
            <p className="text-sm mb-4">Upload media to get started</p>
            <Button
              type="button"
              variant="primary"
              onClick={onUploadClick}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload Media
            </Button>
          </div>
        ) : (
          <MediaGrid
            media={inventory}
            onRemove={onRemove}
            onAssignTags={onAssignTags}
            showDelete={false}
            tagColor="blue"
          />
        )}
      </div>
    </div>
  );
}
