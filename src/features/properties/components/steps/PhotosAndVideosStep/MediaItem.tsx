import { Play, Tag, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MediaFile } from "./types";

interface MediaItemProps {
  item: MediaFile;
  onRemove?: (id: string) => void;
  tagColor?: "blue" | "emerald";
  showDelete?: boolean;
}

export function MediaItem({
  item,
  onRemove,
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
      {showDelete && onRemove && (
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onRemove(item.mediaId.toString())}
            className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
      <div
        className={cn(
          "absolute top-2 left-2 text-white text-xs px-2 py-1 rounded capitalize font-medium flex items-center gap-1",
          tagColor === "blue" ? "bg-blue-600" : "bg-emerald-600"
        )}
      >
        <Tag className="w-3 h-3" />
        {item.tag.replace("_", " ")}
      </div>
      {item.type === "VIDEO" && (
        <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
          Video
        </div>
      )}
    </div>
  );
}
