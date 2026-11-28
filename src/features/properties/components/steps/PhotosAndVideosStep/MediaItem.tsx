import { useEffect, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { Eye, Play, Tag, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { isVideoMediaType } from "@/features/properties/utils/mediaPreview";
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
  const isVideo = isVideoMediaType(item.type, item.fileUrl);

  useEffect(() => {
    if (!isPreviewOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsPreviewOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isPreviewOpen]);

  const openPreview = (event?: MouseEvent) => {
    event?.stopPropagation();
    setIsPreviewOpen(true);
  };

  return (
    <>
      <div className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-100 shadow-sm hover:shadow-md transition-shadow">
        <button
          type="button"
          className="w-full text-left"
          onClick={openPreview}
          title={isVideo ? "Preview video" : "Preview image"}
        >
          {isVideo ? (
            <div className="aspect-video relative bg-gray-900">
              <video
                src={item.fileUrl}
                muted
                playsInline
                preload="metadata"
                className="h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/35">
                <Play className="h-12 w-12 text-white opacity-90" />
              </div>
            </div>
          ) : (
            <div className="aspect-square relative">
              <img
                src={item.fileUrl}
                alt={item.tag}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}
        </button>

        {showDelete && onRemove ? (
          <div className="pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onRemove(item.mediaId.toString());
              }}
              className="pointer-events-auto p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : null}

        {item.tag && item.tag !== "" ? (
          <div
            className={cn(
              "absolute top-2 left-2 text-white text-xs px-2 py-1 rounded capitalize font-medium flex items-center gap-1",
              tagColor === "blue" ? "bg-blue-600" : "bg-emerald-600",
            )}
          >
            <Tag className="w-3 h-3" />
            {item.tag.replace("_", " ")}
          </div>
        ) : (
          <div
            className={cn(
              "absolute top-2 left-2 text-gray-600 text-xs px-2 py-1 rounded font-medium flex items-center gap-1 bg-gray-200 border border-gray-300",
              onAssignTags &&
                "cursor-pointer hover:bg-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-colors",
            )}
            onClick={
              onAssignTags ? () => onAssignTags(item.mediaId) : undefined
            }
            title={onAssignTags ? "Click to assign tags" : undefined}
          >
            <Tag className="w-3 h-3" />
            No Tag
          </div>
        )}

        <div className="absolute bottom-2 right-2 z-20 flex items-center gap-2">
          <button
            type="button"
            onClick={openPreview}
            className="bg-white/95 hover:bg-white text-gray-800 p-2 rounded-md shadow-lg transition-colors border border-gray-200"
            title={isVideo ? "Preview video" : "Preview image"}
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          {onAssignTags ? (
            <button
              type="button"
              onClick={() => onAssignTags(item.mediaId)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 shadow-lg transition-colors"
              title="Assign Tags"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Tag</span>
            </button>
          ) : null}
        </div>

        {isVideo ? (
          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded z-10">
            Video
          </div>
        ) : null}
      </div>

      {isPreviewOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm"
              onClick={() => setIsPreviewOpen(false)}
              role="dialog"
              aria-modal="true"
              aria-label={isVideo ? "Video preview" : "Image preview"}
            >
              <div
                className="flex h-full w-full flex-col"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-white/15 px-5 py-4 text-white">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {item.tag && item.tag !== ""
                        ? item.tag.replace("_", " ")
                        : "Media preview"}
                    </p>
                    <p className="text-xs text-white/70">
                      {isVideo ? "Video" : "Image"} — full screen preview
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
                  {isVideo ? (
                    <video
                      src={item.fileUrl}
                      controls
                      autoPlay
                      className="max-h-full max-w-full rounded-lg bg-black"
                    />
                  ) : (
                    <img
                      src={item.fileUrl}
                      alt={item.tag || "Preview"}
                      className="max-h-full max-w-full object-contain"
                    />
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
