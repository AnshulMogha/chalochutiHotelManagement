import { Play, Tag, Trash2 } from "lucide-react";
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
  return (
    <div className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-100 shadow-sm hover:shadow-md transition-shadow">
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
      
      {/* Hover overlay with delete action (if enabled) */}
      {showDelete && onRemove && (
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
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
  );
}
