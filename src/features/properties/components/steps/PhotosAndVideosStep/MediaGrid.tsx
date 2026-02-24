import { Image as ImageIcon } from "lucide-react";
import { MediaItem } from "./MediaItem";
import type { MediaFile } from "./types";

interface MediaGridProps {
  media: MediaFile[];
  onRemove?: (id: string) => void;
  onAssignTags?: (mediaId: number) => void;
  tagColor?: "blue" | "emerald";
  showDelete?: boolean;
  emptyMessage?: string;
  emptySubMessage?: string;
}

export function MediaGrid({
  media,
  onRemove,
  onAssignTags,
  tagColor = "blue",
  showDelete = false,
  emptyMessage = "No media available",
  emptySubMessage,
}: MediaGridProps) {
  if (media.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <ImageIcon className="w-16 h-16 mb-4" />
        <p className="text-lg font-medium">{emptyMessage}</p>
        {emptySubMessage && <p className="text-sm">{emptySubMessage}</p>}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {media.map((item) => (
        <MediaItem
          key={item.mediaId}
          item={item}
          onRemove={onRemove}
          onAssignTags={onAssignTags}
          tagColor={tagColor}
          showDelete={showDelete}
        />
      ))}
    </div>
  );
}

