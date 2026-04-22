import { useState } from "react";
import { Play, Tag, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MediaFile } from "./types";

interface MediaItemProps {
  item: MediaFile;
  onRemove?: (id: string) => void;
  onAssignTags?: (mediaId: number) => void;
  tagColor?: "blue" | "emerald";
  showDelete?: boolean;
}

export function MediaItem({
  item,
  onRemove,
  onAssignTags,
  tagColor = "blue",
  showDelete = false,
}: MediaItemProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  return (
    <>
      <div className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-100 shadow-sm hover:shadow-md transition-shadow">
        <button
          type="button"
          className="w-full text-left"
          onClick={() => setIsPreviewOpen(true)}
          title={item.type === "VIDEO" ? "Preview video" : "Preview image"}
        >
          {item.type === "IMAGE" ? (
            <div className="aspect-square relative">
              <img
                src={item.fileUrl}
                alt={item.tag}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="aspect-video relative bg-gray-900">
              <div className="w-full h-full flex items-center justify-center">
                <Play className="w-12 h-12 text-white opacity-70" />
              </div>
            </div>
          )}
        </button>

        {/* Hover overlay with delete action (if enabled) */}
        {showDelete && onRemove && (
          <div className="pointer-events-none absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto">
            <button
              type="button"
              onClick={() => onRemove(item.mediaId.toString())}
              className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {item.tag && item.tag !== "" && (
          <div
            className={cn(
              "absolute top-2 left-2 text-white text-xs px-2 py-1 rounded capitalize font-medium flex items-center gap-1",
              tagColor === "blue" ? "bg-blue-600" : "bg-emerald-600"
            )}
          >
            <Tag className="w-3 h-3" />
            {item.tag.replace("_", " ")}
          </div>
        )}
        {(!item.tag || item.tag === "") && (
          <div 
            className={cn(
              "absolute top-2 left-2 text-gray-600 text-xs px-2 py-1 rounded font-medium flex items-center gap-1 bg-gray-200 border border-gray-300 cursor-pointer hover:bg-gray-300 transition-colors",
              onAssignTags && "hover:border-blue-500 hover:bg-blue-50"
            )}
            onClick={onAssignTags ? () => onAssignTags(item.mediaId) : undefined}
            title={onAssignTags ? "Click to assign tags" : undefined}
          >
            <Tag className="w-3 h-3" />
            No Tag
          </div>
        )}
        
        {/* Always visible Assign Tag button */}
        {onAssignTags && (
          <button
            type="button"
            onClick={() => onAssignTags(item.mediaId)}
            className="absolute bottom-2 right-2 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 shadow-lg transition-colors z-10"
            title="Assign Tags"
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Tag</span>
          </button>
        )}
        
        {item.type === "VIDEO" && (
          <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded z-10">
            Video
          </div>
        )}
      </div>

      {isPreviewOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            className="flex h-full w-full flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/15 px-5 py-4 text-white">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {item.tag && item.tag !== "" ? item.tag.replace("_", " ") : "Media preview"}
                </p>
                <p className="text-xs text-white/70">
                  {item.type === "VIDEO" ? "Video" : "Image"} - full screen preview
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="rounded-full border border-white/25 bg-white/10 p-2 text-white hover:bg-white/20"
                aria-label="Close preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center p-4 md:p-8">
              {item.type === "IMAGE" ? (
                <img
                  src={item.fileUrl}
                  alt={item.tag || "Preview"}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <video
                  src={item.fileUrl}
                  controls
                  className="max-h-full max-w-full rounded-lg bg-black"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
