import { useState, useRef, useEffect, type DragEvent } from "react";
import { adminService, type HotelMediaItem, type HotelRoom } from "@/features/admin/services/adminService";
import { Building2, Image as ImageIcon, Plus, Upload, X, Check, Tag, Play, Trash2, Star, ChevronDown, ChevronRight, MoreVertical, ArrowUp, ArrowDown, CheckSquare, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Toast, useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { MEDIA_TAGS } from "@/features/properties/components/steps/PhotosAndVideosStep/constants";
import type { MediaTag } from "@/features/properties/components/steps/PhotosAndVideosStep/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PropertyMediaTabProps {
  hotelId: string;
  rooms: HotelRoom[];
}

type ActiveTab = "hotel" | "rooms";

interface MediaFile {
  imageId: number;
  imageUrl: string;
  thumbnailUrl: string;
  category: string | null;
  sortOrder: number;
  roomId: string | null;
  roomKey: string | null;
  roomName: string | null;
  cover: boolean;
}

export function PropertyMediaTab({ hotelId, rooms }: PropertyMediaTabProps) {
  const { toast, showToast, hideToast } = useToast();
  const [activeTab, setActiveTab] = useState<ActiveTab>("hotel");
  const [hotelMedia, setHotelMedia] = useState<MediaFile[]>([]);
  const [roomMediaMap, setRoomMediaMap] = useState<Record<string, MediaFile[]>>({});
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadRoomKey, setUploadRoomKey] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [draggedImageId, setDraggedImageId] = useState<number | null>(null);
  const [dragOverImageId, setDragOverImageId] = useState<number | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch hotel media
  const fetchHotelMedia = async () => {
    try {
      setIsLoading(true);
      const data = await adminService.getHotelMedia(hotelId);
      setHotelMedia(data.map(item => ({
        imageId: item.imageId,
        imageUrl: item.imageUrl,
        thumbnailUrl: item.thumbnailUrl,
        category: item.category,
        sortOrder: item.sortOrder,
        roomId: item.roomId,
        roomKey: item.roomKey,
        roomName: item.roomName,
        cover: item.cover,
      })));
    } catch (error) {
      console.error("Error fetching hotel media:", error);
      showToast("Failed to load hotel media", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch room media
  const fetchRoomMedia = async (roomId: string) => {
    try {
      const data = await adminService.getRoomMedia(hotelId, roomId);
      setRoomMediaMap(prev => ({
        ...prev,
        [roomId]: data.map(item => ({
          imageId: item.imageId,
          imageUrl: item.imageUrl,
          thumbnailUrl: item.thumbnailUrl,
          category: item.category,
          sortOrder: item.sortOrder,
          roomId: item.roomId,
          roomKey: item.roomKey,
          roomName: item.roomName,
          cover: item.cover,
        })),
      }));
    } catch (error) {
      console.error("Error fetching room media:", error);
      showToast("Failed to load room media", "error");
    }
  };

  useEffect(() => {
    if (hotelId) {
      fetchHotelMedia();
    }
  }, [hotelId]);

  const handleToggleRoom = (roomId: string) => {
    const isExpanded = expandedRooms.has(roomId);
    if (isExpanded) {
      setExpandedRooms(prev => {
        const newSet = new Set(prev);
        newSet.delete(roomId);
        return newSet;
      });
    } else {
      setExpandedRooms(prev => new Set(prev).add(roomId));
      if (!roomMediaMap[roomId]) {
        fetchRoomMedia(roomId);
      }
    }
  };

  const handleFilesUpload = async (files: File[]) => {
    if (!files || files.length === 0) return;

    const maxImageSize = 5 * 1024 * 1024;
    const maxVideoSize = 50 * 1024 * 1024;
    const maxFilesPerUpload = 10;
    const allowedImageMimeTypes = new Set([
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ]);
    const allowedVideoMimeTypes = new Set([
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ]);

    if (files.length > maxFilesPerUpload) {
      showToast("You can upload a maximum of 10 files at a time.", "error");
      return;
    }

    // Validate files
    const validFiles = files.filter((file) => {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      const lowerName = file.name.toLowerCase();
      const hasAllowedImageExt =
        lowerName.endsWith(".jpg") ||
        lowerName.endsWith(".jpeg") ||
        lowerName.endsWith(".png") ||
        lowerName.endsWith(".webp");
      const hasAllowedVideoExt =
        lowerName.endsWith(".mp4") ||
        lowerName.endsWith(".webm") ||
        lowerName.endsWith(".mov");
      if (!isImage && !isVideo) return false;
      if (isImage && !(allowedImageMimeTypes.has(file.type) || hasAllowedImageExt))
        return false;
      if (isVideo && !(allowedVideoMimeTypes.has(file.type) || hasAllowedVideoExt))
        return false;
      if (isImage && file.size > maxImageSize) return false;
      if (isVideo && file.size > maxVideoSize) return false;
      return true;
    });

    if (validFiles.length === 0) {
      showToast(
        "No valid files selected. Images: jpg/jpeg/png/webp up to 5MB. Videos: mp4/webm/mov up to 50MB. Max 10 files per upload.",
        "error",
      );
      return;
    }

    try {
      setIsUploading(true);
      // Upload either to hotel or to a specific room based on context
      let responses;
      if (uploadRoomKey) {
        responses = await adminService.uploadRoomMedia(hotelId, uploadRoomKey, validFiles);
      } else {
        responses = await adminService.uploadHotelMedia(hotelId, validFiles);
      }

      showToast(`${responses.length} media file(s) uploaded successfully`, "success");
      setShowUploadModal(false);
      
      // Refresh media
      await fetchHotelMedia();
      if (uploadRoomKey) {
        const room = rooms.find(
          (r) => r.roomKey === uploadRoomKey || r.roomId === uploadRoomKey
        );
        if (room) {
          await fetchRoomMedia(room.roomId);
        }
      }
    } catch (error: any) {
      console.error("Error uploading media:", error);
      const message =
        error?.response?.data?.message ||
        error?.data?.message ||
        error?.message ||
        "Failed to upload media";
      showToast(message, "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAssignTag = async (imageId: number, tag: MediaTag | "") => {
    try {
      setIsProcessing(true);
      await adminService.assignMediaTag(hotelId, imageId, {
        category: tag || "",
      });
      showToast("Tag assigned successfully", "success");
      setShowTagModal(false);
      setSelectedMedia(null);
      await fetchHotelMedia();
      if (selectedMedia?.roomId) {
        await fetchRoomMedia(selectedMedia.roomId);
      }
    } catch (error) {
      console.error("Error assigning tag:", error);
      showToast("Failed to assign tag", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAssignTagBulk = async (imageIds: number[], tag: MediaTag | "") => {
    if (imageIds.length === 0) return;
    try {
      setIsProcessing(true);
      await adminService.assignMediaTagBulk(hotelId, {
        imageIds,
        category: tag || "",
      });
      showToast(`Tag assigned to ${imageIds.length} item(s)`, "success");
      setShowTagModal(false);
      setSelectedImageIds(new Set());
      await fetchHotelMedia();
    } catch (error) {
      console.error("Error assigning tag in bulk:", error);
      showToast("Failed to assign tag", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSelectImage = (imageId: number) => {
    setSelectedImageIds((prev) => {
      const next = new Set(prev);
      if (next.has(imageId)) next.delete(imageId);
      else next.add(imageId);
      return next;
    });
  };

  const handleAssignToHotel = async (imageId: number) => {
    try {
      setIsProcessing(true);
      // PUT /hotel/{hotelId}/media/{imageId}/assign-hotel
      await adminService.assignMediaToHotel(hotelId, imageId);
      showToast("Media assigned to hotel successfully", "success");
      await fetchHotelMedia();
    } catch (error) {
      console.error("Error assigning media to hotel:", error);
      showToast("Failed to assign media to hotel", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAssignToRoom = async (imageId: number, roomKey: string) => {
    try {
      setIsProcessing(true);
      // PUT /hotel/{hotelId}/media/{imageId}/assign-room
      await adminService.assignMediaToRoom(hotelId, imageId, { roomKey });
      showToast("Media assigned to room successfully", "success");
      // Find roomId from roomKey to refresh room media
      const room = rooms.find(r => r.roomKey === roomKey);
      if (room) {
        await fetchRoomMedia(room.roomId);
      }
      await fetchHotelMedia();
    } catch (error) {
      console.error("Error assigning media to room:", error);
      showToast("Failed to assign media to room", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDetach = async (imageId: number, roomId?: string) => {
    try {
      setIsProcessing(true);
      // PUT /hotel/{hotelId}/media/{imageId}/detach
      await adminService.detachMedia(hotelId, imageId);
      showToast("Media detached successfully", "success");
      if (roomId) {
        await fetchRoomMedia(roomId);
      }
      await fetchHotelMedia();
    } catch (error) {
      console.error("Error detaching media:", error);
      showToast("Failed to detach media", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSetCover = async (imageId: number) => {
    try {
      setIsProcessing(true);
      // PUT /hotel/{hotelId}/media/{imageId}/cover
      await adminService.setMediaCover(hotelId, imageId);
      showToast("Cover image set successfully", "success");
      await fetchHotelMedia();
    } catch (error) {
      console.error("Error setting cover:", error);
      showToast("Failed to set cover image", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReorder = async (imageId: number, direction: "up" | "down", orderedList: MediaFile[]) => {
    try {
      setIsProcessing(true);
      const currentIndex = orderedList.findIndex(m => m.imageId === imageId);
      if (currentIndex === -1) return;

      const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= orderedList.length) return;

      const reordered = [...orderedList];
      const [removed] = reordered.splice(currentIndex, 1);
      reordered.splice(newIndex, 0, removed);

      const items = reordered.map((m, i) => ({ imageId: m.imageId, sortOrder: i + 1 }));
      await adminService.reorderMedia(hotelId, { items });

      await fetchHotelMedia();
    } catch (error) {
      console.error("Error reordering media:", error);
      showToast("Failed to reorder media", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, imageId: number) => {
    setDraggedImageId(imageId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/json", JSON.stringify({ imageId }));
    e.dataTransfer.setData("text/plain", String(imageId));
  };

  const handleDragOver = (e: React.DragEvent, imageId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedImageId !== null && draggedImageId !== imageId) {
      setDragOverImageId(imageId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    const related = e.relatedTarget as Node | null;
    if (!related || !e.currentTarget.contains(related)) {
      setDragOverImageId(null);
    }
  };

  const handleDrop = async (
    e: React.DragEvent,
    targetItem: MediaFile,
    orderedList: MediaFile[],
    roomId?: string
  ) => {
    e.preventDefault();
    setDragOverImageId(null);
    setDraggedImageId(null);
    let payload: { imageId: number } | null = null;
    try {
      const raw = e.dataTransfer.getData("application/json");
      if (raw) payload = JSON.parse(raw) as { imageId: number };
      else payload = { imageId: Number(e.dataTransfer.getData("text/plain")) };
    } catch {
      return;
    }
    const draggedImageIdVal = payload.imageId;
    if (draggedImageIdVal === targetItem.imageId || isProcessing) return;

    const draggedIndex = orderedList.findIndex((m) => m.imageId === draggedImageIdVal);
    const targetIndex = orderedList.findIndex((m) => m.imageId === targetItem.imageId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    try {
      setIsProcessing(true);
      const reordered = [...orderedList];
      const [removed] = reordered.splice(draggedIndex, 1);
      reordered.splice(targetIndex, 0, removed);
      const items = reordered.map((m, i) => ({ imageId: m.imageId, sortOrder: i + 1 }));
      await adminService.reorderMedia(hotelId, { items });
      showToast("Order updated", "success");
      await fetchHotelMedia();
      if (roomId) await fetchRoomMedia(roomId);
    } catch (error) {
      console.error("Error reordering media:", error);
      showToast("Failed to reorder media", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragEnd = () => {
    setDraggedImageId(null);
    setDragOverImageId(null);
  };

  // Get unassigned media (not assigned to hotel or room)
  const getUnassignedMedia = () => {
    return hotelMedia.filter(item => !item.roomId && !item.cover);
  };

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "hotel"}
              onClick={() => setActiveTab("hotel")}
              className={cn(
                "flex-1 px-6 py-4 text-center font-semibold transition-colors relative",
                activeTab === "hotel"
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <Building2 className="w-5 h-5" />
                <span>Hotel Media</span>
              </div>
              {activeTab === "hotel" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "rooms"}
              onClick={() => setActiveTab("rooms")}
              className={cn(
                "flex-1 px-6 py-4 text-center font-semibold transition-colors relative",
                activeTab === "rooms"
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <ImageIcon className="w-5 h-5" />
                <span>Room Media</span>
              </div>
              {activeTab === "rooms" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
          </div>
        </div>

        {/* Hotel Media Tab */}
        {activeTab === "hotel" && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Hotel Media</h2>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {hotelMedia.length} media items · Drag to reorder
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => {
                      setSelectionMode((m) => !m);
                      if (selectionMode) setSelectedImageIds(new Set());
                    }}
                    variant={selectionMode ? "primary" : "outline"}
                    className="gap-2"
                  >
                    {selectionMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    {selectionMode ? "Cancel select" : "Select"}
                  </Button>
                  {selectionMode && selectedImageIds.size > 0 && (
                    <Button
                      onClick={() => {
                        setSelectedMedia(null);
                        setShowTagModal(true);
                      }}
                      variant="primary"
                      className="gap-2"
                    >
                      <Tag className="w-4 h-4" />
                      Assign tag ({selectedImageIds.size})
                    </Button>
                  )}
                <Button
                  onClick={() => {
                    setUploadRoomKey(null);
                    setShowUploadModal(true);
                  }}
                  variant="primary"
                  className="gap-2"
                >
                    <Upload className="w-4 h-4" />
                    Upload Media
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : hotelMedia.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <ImageIcon className="w-16 h-16 mb-4" />
                  <p className="text-lg font-medium">No media available</p>
                  <p className="text-sm mb-4">Upload media to get started</p>
                  <Button
                    onClick={() => setShowUploadModal(true)}
                    variant="primary"
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Upload Media
                  </Button>
                </div>
              ) : (
                (() => {
                  const sortedHotel = [...hotelMedia].sort((a, b) => a.sortOrder - b.sortOrder);
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {sortedHotel.map((item, index) => {
                        const isSelected = selectedImageIds.has(item.imageId);
                        return (
                          <div
                            key={item.imageId}
                            draggable={!selectionMode}
                            onDragStart={selectionMode ? undefined : (e) => handleDragStart(e, item.imageId)}
                            onDragOver={selectionMode ? undefined : (e) => handleDragOver(e, item.imageId)}
                            onDragLeave={selectionMode ? undefined : handleDragLeave}
                            onDrop={selectionMode ? undefined : (e) => handleDrop(e, item, sortedHotel)}
                            onDragEnd={selectionMode ? undefined : handleDragEnd}
                            onClick={selectionMode ? () => toggleSelectImage(item.imageId) : undefined}
                            role={selectionMode ? "button" : undefined}
                            className={cn(
                              "relative rounded-lg transition-all duration-150",
                              !selectionMode && "cursor-grab active:cursor-grabbing",
                              selectionMode && "cursor-pointer",
                              draggedImageId === item.imageId && "opacity-50 scale-95",
                              dragOverImageId === item.imageId && "ring-2 ring-blue-500 ring-offset-2",
                              selectionMode && isSelected && "ring-2 ring-blue-500 ring-offset-2"
                            )}
                          >
                            {selectionMode && (
                              <div className="absolute top-2 left-2 z-20">
                                <div className={cn(
                                  "w-6 h-6 rounded border-2 flex items-center justify-center bg-white/90",
                                  isSelected ? "border-blue-600 bg-blue-600" : "border-gray-400"
                                )}>
                                  {isSelected && <Check className="w-4 h-4 text-white" />}
                                </div>
                              </div>
                            )}
                            <MediaItem
                              item={item}
                              onDetach={() => handleDetach(item.imageId)}
                              onSetCover={() => handleSetCover(item.imageId)}
                              onAssignTag={() => {
                                setSelectedImageIds(new Set());
                                setSelectedMedia(item);
                                setShowTagModal(true);
                              }}
                              onMoveUp={() => handleReorder(item.imageId, "up", sortedHotel)}
                              onMoveDown={() => handleReorder(item.imageId, "down", sortedHotel)}
                              canMoveUp={index > 0}
                              canMoveDown={index < sortedHotel.length - 1}
                              showActions={!selectionMode}
                              isProcessing={isProcessing}
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        )}

        {/* Room Media Tab */}
        {activeTab === "rooms" && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Room Media</h2>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {rooms.length} room(s) available
                  </p>
                </div>
              </div>
            </div>

            {rooms.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No rooms available</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {rooms.map((room) => {
                  const isExpanded = expandedRooms.has(room.roomId);
                  const roomMedia = roomMediaMap[room.roomId] || [];

                  return (
                    <div key={room.roomId} className="bg-gray-50/50">
                      <button
                        type="button"
                        data-readonly-allow="true"
                        onClick={() => handleToggleRoom(room.roomId)}
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-gray-600" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-600" />
                          )}
                          <div className="text-left">
                            <h3 className="text-base font-semibold text-gray-900">
                              {room.roomName}
                            </h3>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <ImageIcon className="w-4 h-4" />
                            {roomMedia.length}
                          </span>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-6 py-4 bg-white">
                          <div className="flex items-center justify-between mb-4">
                            <p className="text-sm text-gray-600">
                              {roomMedia.length} media assigned
                            </p>
                            <div className="flex items-center gap-2">
                              <Button
                                onClick={() => {
                                  setUploadRoomKey(room.roomKey || room.roomId);
                                  setShowUploadModal(true);
                                }}
                                variant="outline"
                                className="gap-2"
                              >
                                <Upload className="w-4 h-4" />
                                Upload
                              </Button>
                              <Button
                                onClick={() => {
                                  setSelectionMode((m) => !m);
                                  if (selectionMode) {
                                    setSelectedImageIds(new Set());
                                  }
                                }}
                                variant={selectionMode ? "primary" : "outline"}
                                className="gap-2"
                              >
                                {selectionMode ? (
                                  <CheckSquare className="w-4 h-4" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                                {selectionMode ? "Cancel select" : "Select"}
                              </Button>
                              <Button
                                onClick={() => {
                                  const sortedRoom = [...roomMedia].sort(
                                    (a, b) => a.sortOrder - b.sortOrder
                                  );
                                  const onlyThisRoom = sortedRoom
                                    .filter((item) => selectedImageIds.has(item.imageId))
                                    .map((item) => item.imageId);
                                  if (onlyThisRoom.length === 0) return;
                                  setSelectedMedia(null);
                                  setSelectedImageIds(new Set(onlyThisRoom));
                                  setShowTagModal(true);
                                }}
                                variant="primary"
                                className="gap-2"
                                disabled={!selectionMode}
                              >
                                <Tag className="w-4 h-4" />
                                Assign tag
                              </Button>
                              <Button
                                onClick={() => {
                                  setSelectedRoomId(room.roomKey || room.roomId);
                                  setShowAssignModal(true);
                                }}
                                variant="primary"
                                className="gap-2"
                              >
                                <Plus className="w-4 h-4" />
                                Assign Media
                              </Button>
                            </div>
                          </div>
                          {roomMedia.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                              <ImageIcon className="w-12 h-12 mb-3" />
                              <p className="text-sm mb-3">No media assigned</p>
                              <div className="flex items-center gap-2">
                                <Button
                                  onClick={() => {
                                    setUploadRoomKey(room.roomKey || room.roomId);
                                    setShowUploadModal(true);
                                  }}
                                  variant="outline"
                                  className="gap-2"
                                >
                                  <Upload className="w-4 h-4" />
                                  Upload
                                </Button>
                                <Button
                                  onClick={() => {
                                    setSelectedRoomId(room.roomKey || room.roomId);
                                    setShowAssignModal(true);
                                  }}
                                  variant="primary"
                                  className="gap-2"
                                >
                                  <Plus className="w-4 h-4" />
                                  Assign Media
                                </Button>
                              </div>
                            </div>
                          ) : (
                            (() => {
                              const sortedRoom = [...roomMedia].sort(
                                (a, b) => a.sortOrder - b.sortOrder
                              );
                              return (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                  {sortedRoom.map((item) => {
                                    const isSelected = selectedImageIds.has(item.imageId);
                                    return (
                                      <div
                                        key={item.imageId}
                                        draggable={!selectionMode}
                                        onDragStart={
                                          selectionMode
                                            ? undefined
                                            : (e) => handleDragStart(e, item.imageId)
                                        }
                                        onDragOver={
                                          selectionMode
                                            ? undefined
                                            : (e) => handleDragOver(e, item.imageId)
                                        }
                                        onDragLeave={
                                          selectionMode ? undefined : handleDragLeave
                                        }
                                        onDrop={
                                          selectionMode
                                            ? undefined
                                            : (e) =>
                                                handleDrop(
                                                  e,
                                                  item,
                                                  sortedRoom,
                                                  room.roomId
                                                )
                                        }
                                        onDragEnd={selectionMode ? undefined : handleDragEnd}
                                        onClick={
                                          selectionMode
                                            ? () => toggleSelectImage(item.imageId)
                                            : undefined
                                        }
                                        role={selectionMode ? "button" : undefined}
                                        className={cn(
                                          "relative rounded-lg transition-all duration-150",
                                          !selectionMode &&
                                            "cursor-grab active:cursor-grabbing",
                                          selectionMode && "cursor-pointer",
                                          draggedImageId === item.imageId &&
                                            "opacity-50 scale-95",
                                          dragOverImageId === item.imageId &&
                                            "ring-2 ring-blue-500 ring-offset-2",
                                          selectionMode &&
                                            isSelected &&
                                            "ring-2 ring-blue-500 ring-offset-2"
                                        )}
                                      >
                                        {selectionMode && (
                                          <div className="absolute top-2 left-2 z-20">
                                            <div
                                              className={cn(
                                                "w-6 h-6 rounded border-2 flex items-center justify-center bg-white/90",
                                                isSelected
                                                  ? "border-blue-600 bg-blue-600"
                                                  : "border-gray-400"
                                              )}
                                            >
                                              {isSelected && (
                                                <Check className="w-4 h-4 text-white" />
                                              )}
                                            </div>
                                          </div>
                                        )}
                                        <MediaItem
                                          item={item}
                                          onDetach={() =>
                                            handleDetach(item.imageId, room.roomId)
                                          }
                                          onAssignTag={() => {
                                            setSelectedImageIds(new Set());
                                            setSelectedMedia(item);
                                            setShowTagModal(true);
                                          }}
                                          showActions={!selectionMode}
                                          isProcessing={isProcessing}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          isOpen={showUploadModal}
          onClose={() => {
            if (isUploading) return;
            setShowUploadModal(false);
          }}
          onFilesSelect={handleFilesUpload}
          isUploading={isUploading}
          fileInputRef={fileInputRef}
        />
      )}

      {/* Assign to Room Modal */}
      {showAssignModal && selectedRoomId && (
        <AssignModal
          isOpen={showAssignModal}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedRoomId(null);
          }}
          hotelMedia={getUnassignedMedia()}
          onAssign={(imageId) => {
            handleAssignToRoom(imageId, selectedRoomId);
            setShowAssignModal(false);
            setSelectedRoomId(null);
          }}
        />
      )}

      {/* Tag Assignment Modal (single or bulk) */}
      {showTagModal && (selectedMedia || selectedImageIds.size > 0) && (
        <TagModal
          isOpen={showTagModal}
          onClose={() => {
            setShowTagModal(false);
            setSelectedMedia(null);
            setSelectedImageIds(new Set());
          }}
          currentTag={
            selectedMedia
              ? ((selectedMedia.category as MediaTag) || "")
              : ""
          }
          title={selectedImageIds.size > 0 ? `Assign tag to ${selectedImageIds.size} item(s)` : undefined}
          onSave={(tag) => {
            if (selectedImageIds.size > 0) {
              handleAssignTagBulk(Array.from(selectedImageIds), tag);
            } else if (selectedMedia) {
              handleAssignTag(selectedMedia.imageId, tag);
            }
          }}
          isProcessing={isProcessing}
        />
      )}

    </>
  );
}

interface MediaItemProps {
  item: MediaFile;
  onDetach?: () => void;
  onSetCover?: () => void;
  onAssignTag?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  showActions?: boolean;
  isProcessing?: boolean;
}

function MediaItem({ 
  item, 
  onDetach, 
  onSetCover, 
  onAssignTag,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
  showActions = false,
  isProcessing = false
}: MediaItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const isVideo = item.imageUrl.toLowerCase().includes('.mp4') || 
                  item.imageUrl.toLowerCase().includes('.mov') ||
                  item.imageUrl.toLowerCase().includes('.webm');
  
  return (
    <>
      <div className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-100 shadow-sm hover:shadow-md transition-shadow">
        <button
          type="button"
          className="w-full text-left"
          onClick={() => setIsPreviewOpen(true)}
          title={isVideo ? "Preview video" : "Preview image"}
        >
          {!isVideo ? (
            <div className="aspect-square relative">
              <img
                src={item.thumbnailUrl || item.imageUrl}
                alt={item.category || "Media"}
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

        {showActions && (
          <>
            <div className="pointer-events-none absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto">
              {onSetCover && !item.cover && (
                <button
                  type="button"
                  onClick={onSetCover}
                  disabled={isProcessing}
                  className="p-2 bg-yellow-600 text-white rounded-full hover:bg-yellow-700 transition-colors disabled:opacity-50"
                  title="Set as cover"
                >
                  <Star className="w-4 h-4" />
                </button>
              )}
              {item.cover && (
                <div className="p-2 bg-yellow-600 text-white rounded-full">
                  <Star className="w-4 h-4 fill-current" />
                </div>
              )}
            </div>
            
            {/* Actions Menu */}
            <div className="absolute top-2 right-2">
              <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="p-1.5 bg-white/90 hover:bg-white rounded-full shadow-md transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(true);
                    }}
                  >
                    <MoreVertical className="w-4 h-4 text-gray-700" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {onAssignTag && (
                    <DropdownMenuItem onClick={onAssignTag}>
                      <Tag className="w-4 h-4 mr-2" />
                      Change Tag
                    </DropdownMenuItem>
                  )}
                  {onMoveUp && canMoveUp && (
                    <DropdownMenuItem onClick={onMoveUp} disabled={isProcessing}>
                      <ArrowUp className="w-4 h-4 mr-2" />
                      Move Up
                    </DropdownMenuItem>
                  )}
                  {onMoveDown && canMoveDown && (
                    <DropdownMenuItem onClick={onMoveDown} disabled={isProcessing}>
                      <ArrowDown className="w-4 h-4 mr-2" />
                      Move Down
                    </DropdownMenuItem>
                  )}
                  {onDetach && (
                    <DropdownMenuItem onClick={onDetach} className="text-red-600">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Detach
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        )}
        
        {item.category && (
          <div className="absolute top-2 left-2 text-white text-xs px-2 py-1 rounded capitalize font-medium flex items-center gap-1 bg-blue-600">
            <Tag className="w-3 h-3" />
            {item.category.replace("_", " ")}
          </div>
        )}
        {!item.category && (
          <div className="absolute top-2 left-2 text-white text-xs px-2 py-1 rounded capitalize font-medium flex items-center gap-1 bg-gray-500">
            <Tag className="w-3 h-3" />
            No Tag
          </div>
        )}
        
        {item.cover && (
          <div className="absolute bottom-2 left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded font-medium flex items-center gap-1">
            <Star className="w-3 h-3 fill-current" />
            Cover
          </div>
        )}
        
        {isVideo && (
          <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
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
                  {item.category ? item.category.replace("_", " ") : "Media preview"}
                </p>
                <p className="text-xs text-white/70">
                  {isVideo ? "Video" : "Image"} - full screen preview
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
              {!isVideo ? (
                <img
                  src={item.imageUrl}
                  alt={item.category || "Media preview"}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <video
                  src={item.imageUrl}
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

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFilesSelect: (files: File[]) => void;
  isUploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

function UploadModal({ 
  isOpen, 
  onClose, 
  onFilesSelect, 
  isUploading,
  fileInputRef 
}: UploadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
  const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;
  const MAX_FILES_PER_UPLOAD = 10;
  const ALLOWED_IMAGE_MIME_TYPES = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ]);
  const ALLOWED_VIDEO_MIME_TYPES = new Set([
    "video/mp4",
    "video/webm",
    "video/quicktime",
  ]);

  if (!isOpen) return null;

  const isAllowedImageFile = (file: File) => {
    const lower = file.name.toLowerCase();
    const hasAllowedExt =
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg") ||
      lower.endsWith(".png") ||
      lower.endsWith(".webp");
    return ALLOWED_IMAGE_MIME_TYPES.has(file.type) || hasAllowedExt;
  };

  const processSelectedFiles = (files: File[]) => {
    const valid: File[] = [];
    const invalid: string[] = [];

    if (files.length > MAX_FILES_PER_UPLOAD) {
      setValidationError(`Maximum ${MAX_FILES_PER_UPLOAD} files are allowed at a time.`);
      setSelectedFiles([]);
      return;
    }

    files.forEach((file) => {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      const lower = file.name.toLowerCase();
      const isAllowedVideoExt =
        lower.endsWith(".mp4") ||
        lower.endsWith(".webm") ||
        lower.endsWith(".mov");

      if (!isImage && !isVideo) {
        invalid.push(`${file.name}: unsupported file type`);
        return;
      }

      if (isImage && !isAllowedImageFile(file)) {
        invalid.push(`${file.name}: only jpg/jpeg/png/webp are allowed`);
        return;
      }

      if (isVideo && !(ALLOWED_VIDEO_MIME_TYPES.has(file.type) || isAllowedVideoExt)) {
        invalid.push(`${file.name}: only mp4/webm/mov are allowed`);
        return;
      }

      if (isImage && file.size > MAX_IMAGE_SIZE_BYTES) {
        invalid.push(`${file.name}: image exceeds 5 MB`);
        return;
      }

      if (isVideo && file.size > MAX_VIDEO_SIZE_BYTES) {
        invalid.push(`${file.name}: video exceeds 50 MB`);
        return;
      }

      valid.push(file);
    });

    if (invalid.length > 0) {
      const preview = invalid.slice(0, 2).join(" | ");
      const more = invalid.length > 2 ? ` (+${invalid.length - 2} more)` : "";
      setValidationError(preview + more);
    } else {
      setValidationError(null);
    }

    setSelectedFiles(valid);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    const droppedFiles = Array.from(e.dataTransfer.files || []);
    if (droppedFiles.length > 0) {
      processSelectedFiles(droppedFiles);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleUpload = () => {
    if (selectedFiles.length > 0) {
      onFilesSelect(selectedFiles);
      setSelectedFiles([]);
      setValidationError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && !isUploading && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between rounded-t-2xl px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <Upload className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Upload Media</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isUploading}
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            
            {selectedFiles.length > 0 && (
              <div className="mb-4 space-y-2 max-h-48 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <span className="text-sm text-gray-700 truncate flex-1">
                      {file.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="ml-2 p-1 hover:bg-gray-200 rounded"
                    >
                      <X className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div
              className={cn(
                "mb-4 rounded-lg border-2 border-dashed min-h-[180px] p-6 text-center transition-colors cursor-pointer flex flex-col items-center justify-center",
                isDragActive
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/40",
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
            >
              <p className="text-sm font-medium text-gray-700">
                Drag and drop files here
              </p>
              <p className="text-xs text-gray-500 mt-1">
                or click to select images/videos
              </p>
            </div>
            <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
              <p className="font-medium">
                <span className="text-red-600">*</span> Image rules
              </p>
              <p>
                <span className="text-red-600">*</span> Allowed: jpg, jpeg, png, webp
              </p>
              <p>
                <span className="text-red-600">*</span> Max image size: 5 MB
              </p>
              <p className="mt-1 font-medium">
                <span className="text-red-600">*</span> Video rules
              </p>
              <p>
                <span className="text-red-600">*</span> Allowed: mp4, webm, mov
              </p>
              <p>
                <span className="text-red-600">*</span> Max video size: 50 MB
              </p>
              <p>
                <span className="text-red-600">*</span> Max files per upload: 10
              </p>
              <p className="mt-2">
                <span className="text-red-600">*</span> Allowed image formats: jpg, jpeg, png, webp (max 5MB).{" "}
                <span className="text-red-600">*</span> Allowed video formats: mp4, webm, mov (max 50MB).{" "}
                <span className="text-red-600">*</span> Max 10 files per upload.
              </p>
            </div>
            {validationError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {validationError}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              variant="outline"
              className="flex-1 gap-2"
            >
              <Upload className="w-4 h-4" />
              {selectedFiles.length > 0 ? "Change Files" : "Select Files"}
            </Button>
            {selectedFiles.length > 0 && (
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                variant="primary"
                className="flex-1 gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload
                  </>
                )}
              </Button>
            )}
            <Button
              onClick={onClose}
              variant="outline"
              disabled={isUploading}
            >
              Cancel
            </Button>
          </div>
          {isUploading && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Upload in progress. Please wait...
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface AssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  hotelMedia: MediaFile[];
  onAssign: (imageId: number) => void;
}

function AssignModal({ isOpen, onClose, hotelMedia, onAssign }: AssignModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl m-4 max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between rounded-t-2xl px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <Plus className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Assign Media to Room</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {hotelMedia.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No media available to assign</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {hotelMedia.map((item) => {
                const imageUrl = item.thumbnailUrl || item.imageUrl;
                const isVideo = imageUrl?.toLowerCase().includes('.mp4') || 
                                imageUrl?.toLowerCase().includes('.mov') ||
                                imageUrl?.toLowerCase().includes('.webm');
                
                return (
                  <div
                    key={item.imageId}
                    className="relative group rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => onAssign(item.imageId)}
                  >
                    <div className="aspect-square relative bg-gray-50 overflow-hidden">
                      {!isVideo && imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={item.category || "Media"}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          style={{ display: 'block' }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent && !parent.querySelector('.error-placeholder')) {
                              const placeholder = document.createElement('div');
                              placeholder.className = 'error-placeholder w-full h-full flex items-center justify-center bg-gray-200';
                              placeholder.innerHTML = '<svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
                              parent.appendChild(placeholder);
                            }
                          }}
                        />
                      ) : isVideo ? (
                        <div className="w-full h-full flex items-center justify-center bg-gray-900">
                          <Play className="w-12 h-12 text-white opacity-70" />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <ImageIcon className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/40 flex items-center justify-center pointer-events-none z-20">
                      <div className="pointer-events-auto">
                        <Button variant="primary" onClick={(e) => {
                          e.stopPropagation();
                          onAssign(item.imageId);
                        }}>
                          Assign
                        </Button>
                      </div>
                    </div>
                    {item.category && (
                      <div className="absolute top-2 left-2 z-10 text-white text-xs px-2 py-1 rounded capitalize font-medium flex items-center gap-1 bg-blue-600">
                        <Tag className="w-3 h-3" />
                        {item.category.replace("_", " ")}
                      </div>
                    )}
                    {!item.category && (
                      <div className="absolute top-2 left-2 z-10 text-white text-xs px-2 py-1 rounded capitalize font-medium flex items-center gap-1 bg-gray-500">
                        <Tag className="w-3 h-3" />
                        No Tag
                      </div>
                    )}
                    {isVideo && (
                      <div className="absolute top-2 right-2 z-10 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        Video
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface TagModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTag: MediaTag | null | "";
  onSave: (tag: MediaTag | "") => void;
  isProcessing: boolean;
  title?: string;
}

function TagModal({ isOpen, onClose, currentTag, onSave, isProcessing, title }: TagModalProps) {
  const [selectedTag, setSelectedTag] = useState<MediaTag | "">(currentTag || "");

  useEffect(() => {
    if (isOpen) {
      setSelectedTag(currentTag || "");
    }
  }, [isOpen, currentTag]);

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
        <div className="flex items-center justify-between rounded-t-2xl px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <Tag className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">{title ?? "Assign Tag"}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Media Category
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
              {MEDIA_TAGS.map((tag) => {
                const isSelected = selectedTag === tag.value;
                return (
                  <button
                    key={tag.value}
                    type="button"
                    onClick={() => setSelectedTag(tag.value as MediaTag)}
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
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              onClick={onClose}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={() => onSave(selectedTag)}
              variant="primary"
              disabled={isProcessing}
            >
              {isProcessing ? "Saving..." : selectedTag ? "Save Tag" : "Remove Tag"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

