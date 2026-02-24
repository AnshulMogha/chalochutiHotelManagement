import { useState, useRef, useEffect } from "react";
import { adminService, type HotelMediaItem, type HotelRoom } from "@/features/admin/services/adminService";
import { Building2, Image as ImageIcon, Plus, Upload, X, Check, Tag, Play, Trash2, Star, ChevronDown, ChevronRight, MoreVertical, Edit2, Move, ArrowUp, ArrowDown } from "lucide-react";
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
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
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

    const maxImageSize = 10 * 1024 * 1024;
    const maxVideoSize = 100 * 1024 * 1024;

    // Validate files
    const validFiles = files.filter((file) => {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      if (!isImage && !isVideo) return false;
      if (isImage && file.size > maxImageSize) return false;
      if (isVideo && file.size > maxVideoSize) return false;
      return true;
    });

    if (validFiles.length === 0) {
      showToast("No valid files selected. Please select image or video files within size limits.", "error");
      return;
    }

    try {
      setIsUploading(true);
      // POST /hotel/{hotelId}/media/upload with multipart/form-data, param name: files
      const responses = await adminService.uploadHotelMedia(hotelId, validFiles);

      showToast(`${responses.length} media file(s) uploaded successfully`, "success");
      setShowUploadModal(false);
      
      // Refresh media
      await fetchHotelMedia();
    } catch (error) {
      console.error("Error uploading media:", error);
      showToast("Failed to upload media", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAssignTag = async (imageId: number, tag: MediaTag | "") => {
    try {
      setIsProcessing(true);
      // PUT /hotel/{hotelId}/media/{imageId}/tag
      await adminService.assignMediaTag(hotelId, imageId, {
        category: tag || "",
      });
      showToast("Tag assigned successfully", "success");
      setShowTagModal(false);
      setSelectedMedia(null);
      await fetchHotelMedia();
      // Refresh room media if applicable
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

  const handleReorder = async (imageId: number, direction: "up" | "down") => {
    try {
      setIsProcessing(true);
      const currentMedia = [...hotelMedia].sort((a, b) => a.sortOrder - b.sortOrder);
      const currentIndex = currentMedia.findIndex(m => m.imageId === imageId);
      
      if (currentIndex === -1) return;
      
      let newIndex: number;
      if (direction === "up" && currentIndex > 0) {
        newIndex = currentIndex - 1;
      } else if (direction === "down" && currentIndex < currentMedia.length - 1) {
        newIndex = currentIndex + 1;
      } else {
        return;
      }
      
      const targetMedia = currentMedia[newIndex];
      const newSortOrder = targetMedia.sortOrder;
      
      // PUT /hotel/{hotelId}/media/reorder
      // Payload: { imageId: string, sortOrder: number }
      await adminService.reorderMedia(hotelId, { 
        imageId: imageId, 
        sortOrder: newSortOrder 
      });
      
      await fetchHotelMedia();
    } catch (error) {
      console.error("Error reordering media:", error);
      showToast("Failed to reorder media", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleTag = (tag: MediaTag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
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
                  variant="primary"
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
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
                    variant="primary"
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Upload Media
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {hotelMedia
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((item, index) => (
                      <MediaItem
                        key={item.imageId}
                        item={item}
                        onDetach={() => handleDetach(item.imageId)}
                        onSetCover={() => handleSetCover(item.imageId)}
                        onAssignTag={() => {
                          setSelectedMedia(item);
                          setShowTagModal(true);
                        }}
                        onMoveUp={() => handleReorder(item.imageId, "up")}
                        onMoveDown={() => handleReorder(item.imageId, "down")}
                        canMoveUp={index > 0}
                        canMoveDown={index < hotelMedia.length - 1}
                        showActions={true}
                        isProcessing={isProcessing}
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
                          {roomMedia.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                              <ImageIcon className="w-12 h-12 mb-3" />
                              <p className="text-sm mb-3">No media assigned</p>
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
                          ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                              {roomMedia
                                .sort((a, b) => a.sortOrder - b.sortOrder)
                                .map((item) => (
                                  <MediaItem
                                    key={item.imageId}
                                    item={item}
                                    onDetach={() => handleDetach(item.imageId, room.roomId)}
                                    onAssignTag={() => {
                                      setSelectedMedia(item);
                                      setShowTagModal(true);
                                    }}
                                    showActions={true}
                                    isProcessing={isProcessing}
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
        <UploadModal
          isOpen={showUploadModal}
          onClose={() => {
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

      {/* Tag Assignment Modal */}
      {showTagModal && selectedMedia && (
        <TagModal
          isOpen={showTagModal}
          onClose={() => {
            setShowTagModal(false);
            setSelectedMedia(null);
          }}
          currentTag={(selectedMedia.category as MediaTag) || ""}
          onSave={(tag) => {
            handleAssignTag(selectedMedia.imageId, tag);
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
  const isVideo = item.imageUrl.toLowerCase().includes('.mp4') || 
                  item.imageUrl.toLowerCase().includes('.mov') ||
                  item.imageUrl.toLowerCase().includes('.webm');
  
  return (
    <div className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-100 shadow-sm hover:shadow-md transition-shadow">
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
      
      {showActions && (
        <>
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
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

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setSelectedFiles(files);
    }
  };

  const handleUpload = () => {
    if (selectedFiles.length > 0) {
      onFilesSelect(selectedFiles);
      setSelectedFiles([]);
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
      onClick={(e) => e.target === e.currentTarget && onClose()}
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
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
                <Upload className="w-4 h-4" />
                {isUploading ? "Uploading..." : "Upload"}
              </Button>
            )}
            <Button
              onClick={onClose}
              variant="outline"
            >
              Cancel
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Max file size: 10MB per image, 100MB per video. You can select multiple files.
          </p>
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
}

function TagModal({ isOpen, onClose, currentTag, onSave, isProcessing }: TagModalProps) {
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
            <h2 className="text-xl font-bold text-gray-900">Assign Tag</h2>
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

