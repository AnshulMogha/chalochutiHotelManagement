import { useState, useRef, useEffect } from "react";
import { adminService, type HotelMediaItem, type HotelRoom } from "@/features/admin/services/adminService";
import { Building2, Image as ImageIcon, Plus, Upload, X, Check, Tag, Play, Trash2, Star, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Toast, useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { MEDIA_TAGS } from "@/features/properties/components/steps/PhotosAndVideosStep/constants";
import type { MediaTag } from "@/features/properties/components/steps/PhotosAndVideosStep/types";

interface PropertyMediaTabProps {
  hotelId: string;
  rooms: HotelRoom[];
}

type ActiveTab = "hotel" | "rooms";

interface MediaFile {
  imageId: number;
  imageUrl: string;
  thumbnailUrl: string;
  category: string;
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
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTags, setSelectedTags] = useState<MediaTag[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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

  const handleFileUpload = async (file: File | null) => {
    if (!file) return;

    const maxImageSize = 10 * 1024 * 1024;
    const maxVideoSize = 100 * 1024 * 1024;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      showToast("Please select an image or video file", "error");
      return;
    }

    if (isImage && file.size > maxImageSize) {
      showToast("Image size must be less than 10MB", "error");
      return;
    }

    if (isVideo && file.size > maxVideoSize) {
      showToast("Video size must be less than 100MB", "error");
      return;
    }

    try {
      setIsUploading(true);
      const response = await adminService.uploadHotelMedia(hotelId, file);

      // Assign tag if selected
      if (selectedTags.length > 0) {
        await adminService.assignMediaTag(hotelId, response.imageId, {
          category: selectedTags[0],
        });
      }

      showToast("Media uploaded successfully", "success");
      setShowUploadModal(false);
      setSelectedTags([]);
      
      // Refresh media
      await fetchHotelMedia();
    } catch (error) {
      console.error("Error uploading media:", error);
      showToast("Failed to upload media", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAssignToHotel = async (imageId: number) => {
    try {
      await adminService.assignMediaToHotel(hotelId, imageId);
      showToast("Media assigned to hotel successfully", "success");
      await fetchHotelMedia();
    } catch (error) {
      console.error("Error assigning media to hotel:", error);
      showToast("Failed to assign media to hotel", "error");
    }
  };

  const handleAssignToRoom = async (imageId: number, roomId: string) => {
    try {
      await adminService.assignMediaToRoom(hotelId, imageId, { roomId });
      showToast("Media assigned to room successfully", "success");
      await fetchRoomMedia(roomId);
      await fetchHotelMedia();
    } catch (error) {
      console.error("Error assigning media to room:", error);
      showToast("Failed to assign media to room", "error");
    }
  };

  const handleDetach = async (imageId: number, roomId?: string) => {
    try {
      await adminService.detachMedia(hotelId, imageId);
      showToast("Media detached successfully", "success");
      if (roomId) {
        await fetchRoomMedia(roomId);
      }
      await fetchHotelMedia();
    } catch (error) {
      console.error("Error detaching media:", error);
      showToast("Failed to detach media", "error");
    }
  };

  const handleSetCover = async (imageId: number) => {
    try {
      await adminService.setMediaCover(hotelId, imageId);
      showToast("Cover image set successfully", "success");
      await fetchHotelMedia();
    } catch (error) {
      console.error("Error setting cover:", error);
      showToast("Failed to set cover image", "error");
    }
  };

  const handleReorder = async (imageId: number, newSortOrder: number) => {
    try {
      await adminService.reorderMedia(hotelId, { imageId, sortOrder: newSortOrder });
      await fetchHotelMedia();
    } catch (error) {
      console.error("Error reordering media:", error);
      showToast("Failed to reorder media", "error");
    }
  };

  const toggleTag = (tag: MediaTag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
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
                      {hotelMedia.length} media items
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowUploadModal(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Media
                </Button>
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
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Upload Media
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {hotelMedia
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((item) => (
                      <MediaItem
                        key={item.imageId}
                        item={item}
                        onDetach={() => handleDetach(item.imageId)}
                        onSetCover={() => handleSetCover(item.imageId)}
                        showActions={true}
                      />
                    ))}
                </div>
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
                            <Button
                              onClick={() => {
                                setSelectedRoomId(room.roomId);
                                setShowAssignModal(true);
                              }}
                              className="bg-blue-500 hover:bg-blue-600 text-white"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Assign Media
                            </Button>
                          </div>
                          {roomMedia.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                              <ImageIcon className="w-12 h-12 mb-3" />
                              <p className="text-sm mb-3">No media assigned</p>
                              <Button
                                onClick={() => {
                                  setSelectedRoomId(room.roomId);
                                  setShowAssignModal(true);
                                }}
                                className="bg-blue-500 hover:bg-blue-600 text-white"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Assign Media
                              </Button>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                              {roomMedia
                                .sort((a, b) => a.sortOrder - b.sortOrder)
                                .map((item) => (
                                  <MediaItem
                                    key={item.imageId}
                                    item={item}
                                    onDetach={() => handleDetach(item.imageId, room.roomId)}
                                    showActions={true}
                                  />
                                ))}
                            </div>
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setShowUploadModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between rounded-t-2xl px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <Upload className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">Upload Media</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Media Category (Optional)
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {MEDIA_TAGS.map((tag) => {
                    const isSelected = selectedTags.includes(tag.value as MediaTag);
                    return (
                      <button
                        key={tag.value}
                        type="button"
                        onClick={() => toggleTag(tag.value as MediaTag)}
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
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploading ? "Uploading..." : "Select File"}
                </Button>
                <Button
                  onClick={() => setShowUploadModal(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Max file size: 10MB per image, 100MB per video
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && selectedRoomId && (
        <AssignModal
          isOpen={showAssignModal}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedRoomId(null);
          }}
          hotelMedia={hotelMedia.filter(item => !item.roomId)}
          onAssign={(imageId) => {
            handleAssignToRoom(imageId, selectedRoomId);
            setShowAssignModal(false);
            setSelectedRoomId(null);
          }}
        />
      )}
    </>
  );
}

interface MediaItemProps {
  item: MediaFile;
  onDetach?: () => void;
  onSetCover?: () => void;
  showActions?: boolean;
}

function MediaItem({ item, onDetach, onSetCover, showActions = false }: MediaItemProps) {
  const isVideo = item.imageUrl.toLowerCase().includes('.mp4') || item.imageUrl.toLowerCase().includes('.mov');
  
  return (
    <div className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-100 shadow-sm hover:shadow-md transition-shadow">
      {!isVideo ? (
        <div className="aspect-square relative">
          <img
            src={item.thumbnailUrl || item.imageUrl}
            alt={item.category}
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
      {showActions && (
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          {onSetCover && !item.cover && (
            <button
              type="button"
              onClick={onSetCover}
              className="p-2 bg-yellow-600 text-white rounded-full hover:bg-yellow-700 transition-colors"
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
          {onDetach && (
            <button
              type="button"
              onClick={onDetach}
              className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
              title="Detach"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
      <div className="absolute top-2 left-2 text-white text-xs px-2 py-1 rounded capitalize font-medium flex items-center gap-1 bg-blue-600">
        <Tag className="w-3 h-3" />
        {item.category.replace("_", " ")}
      </div>
      {isVideo && (
        <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
          Video
        </div>
      )}
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
              <p>No media available to assign</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {hotelMedia.map((item) => (
                <div
                  key={item.imageId}
                  className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => onAssign(item.imageId)}
                >
                  <div className="aspect-square relative">
                    <img
                      src={item.thumbnailUrl || item.imageUrl}
                      alt={item.category}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="primary">
                        Assign
                      </Button>
                    </div>
                  </div>
                  <div className="absolute top-2 left-2 text-white text-xs px-2 py-1 rounded capitalize font-medium flex items-center gap-1 bg-blue-600">
                    <Tag className="w-3 h-3" />
                    {item.category.replace("_", " ")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

