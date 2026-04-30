import { useState, useRef, useEffect } from "react";
import { useFormContext } from "@/features/properties/context/useFormContext";
import { useOutletContext, useSearchParams } from "react-router";
import { propertyService } from "@/features/properties/services/propertyService";
import { TabNavigation } from "./TabNavigation";
import { InventoryTab } from "./InventoryTab";
import { HotelMediaTab } from "./HotelMediaTab";
import { RoomMediaTab } from "./RoomMediaTab";
import { UploadModal } from "./UploadModal";
import { MediaAssignmentModal } from "./MediaAssignmentModal";
import { SingleMediaTagModal } from "./SingleMediaTagModal";
import type { MediaFile, MediaTag, ActiveTab, RoomMediaFile } from "./types";

export function PhotosAndVideosStep() {
  const { readOnly } = useOutletContext<{ readOnly?: boolean }>();
  const { formDataState } = useFormContext();
  const [searchParams] = useSearchParams();
  const hotelId = searchParams.get("draftId");

  const [activeTab, setActiveTab] = useState<ActiveTab>("inventory");
  const [expandedRooms, setExpandedRooms] = useState<string[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [duplicateUploadError, setDuplicateUploadError] = useState<{
    message: string;
    files: Array<{ name: string; sizeMb: string }>;
  } | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [inventory, setInventory] = useState<MediaFile[]>([]);
  const [roomMedia, setRoomMedia] = useState<RoomMediaFile[]>([]);
  const [hotelMedia, setHotelMedia] = useState<MediaFile[]>([]);
  const [hotelMediaIds, setHotelMediaIds] = useState<string[]>([]);
  const [assignmentContext, setAssignmentContext] = useState<{
    type: "hotel" | "room";
    roomId?: string;
  } | null>(null);

  const [mediaForTagAssignment, setMediaForTagAssignment] = useState<{
    mediaId: number;
    fileUrl: string;
    fileType: "IMAGE" | "VIDEO";
    currentTags: MediaTag[];
  } | null>(null);
  const fileCounterRef = useRef(0);

  const hotelName = formDataState.basicInfo?.name || "Hotel";

  // ---------------- Rooms ----------------
  const [roomsList, setRoomsList] = useState<
    Array<{ id: string; roomName: string; roomType?: string }>
  >([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);

  useEffect(() => {
    const fetchMedia = async () => {
      if (!hotelId) return;
      try {
        const response = await propertyService.getMedia(hotelId);
        console.log(response);

        // Set hotel media - media without rooms (not attached to any room)
        const hotelMediaItems = response
          .filter((item) => !item.rooms || item.rooms.length === 0)
          .map((item) => ({
            mediaId: item.mediaId,
            fileUrl: item.fileUrl,
            type: item.fileType,
            tag: item.tags && item.tags.length > 0 ? item.tags[0] : "",
          }));
        setHotelMedia(hotelMediaItems);
        setHotelMediaIds(
          hotelMediaItems.map((item) => item.mediaId.toString())
        );

        // Set room media - media with rooms attached
        const roomMediaItems = response
          .filter((item) => item?.rooms?.length && item?.rooms?.length > 0)
          .map((item) => ({
            mediaId: item.mediaId,
            fileUrl: item.fileUrl,
            type: item.fileType,
            tag: item.tags && item.tags.length > 0 ? item.tags[0] : "",
            roomId: item.rooms?.[0]?.roomId || "",
            roomName: item.rooms?.[0]?.roomName || "",
          }));
        setRoomMedia(roomMediaItems);

        // Set inventory - only media that is uploaded but not attached to any entity
        // (no hotel attachment and no room attachment)
        const inventoryItems = response
          .filter(
            (item) =>
              (!item.hotel || !item.hotel.hotelId) &&
              (!item.rooms || item.rooms.length === 0)
          )
          .map((item) => ({
            mediaId: item.mediaId,
            fileUrl: item.fileUrl,
            type: item.fileType,
            tag: item.tags && item.tags.length > 0 ? item.tags[0] : "",
          }));
        setInventory(inventoryItems);
      } catch (error) {
        console.error("Error fetching media:", error);
      }
    };
    fetchMedia();
  }, [hotelId]);

  useEffect(() => {
    const fetchRooms = async () => {
      if (!hotelId) {
        setRoomsList([]);
        return;
      }

      setIsLoadingRooms(true);
      try {
        const response = await propertyService.getAllRooms(hotelId);
        const rooms = response.map((room) => ({
          id: room.data.roomKey,
          roomName:
            room.data.roomDetails?.roomName || `Room ${room.data.roomKey}`,
          roomType: room.data.roomDetails?.roomType || "",
        }));
        setRoomsList(rooms);
      } catch (error) {
        console.error("Error fetching rooms:", error);
        setRoomsList([]);
      } finally {
        setIsLoadingRooms(false);
      }
    };

    fetchRooms();
  }, [hotelId]);

  // ---------------- Upload ----------------
  const handleFilesSelect = async (files: File[]) => {
    if (readOnly) return;
    if (!files || files.length === 0 || !hotelId) return;

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
      alert("You can upload a maximum of 10 files at a time.");
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
      alert(
        "No valid files selected. Images: jpg/jpeg/png/webp up to 5MB. Videos: mp4/webm/mov up to 50MB. Max 10 files per upload.",
      );
      return;
    }

    try {
      setIsUploading(true);
      // Upload files using hotel-specific endpoint
      const uploadResponses = await propertyService.uploadHotelMedia(hotelId, validFiles);

      const duplicateUploads = uploadResponses.filter((item) => item.duplicate);
      if (duplicateUploads.length > 0) {
        const duplicateFiles = uploadResponses
          .map((item, index) => ({ item, file: validFiles[index] }))
          .filter(({ item, file }) => item.duplicate && !!file)
          .map(({ file }) => ({
            name: file.name,
            sizeMb: (file.size / (1024 * 1024)).toFixed(2),
          }));

        setDuplicateUploadError(
          {
            message:
              duplicateUploads.length === 1
                ? "Duplicate image detected. This file already exists."
                : `${duplicateUploads.length} duplicate images detected. These files already exist.`,
            files: duplicateFiles,
          },
        );
      }
      
      // Add uploaded media directly to inventory (without tags initially)
      const newMediaItems: MediaFile[] = uploadResponses.map((media) => ({
        mediaId: media.mediaId,
        fileUrl: media.fileUrl,
        type: media.fileType,
        tag: "", // No tag initially
      }));

      setInventory([...inventory, ...newMediaItems]);
      setShowUploadModal(false);

      // Refresh media data to ensure consistency
      if (hotelId) {
        try {
          const mediaResponse = await propertyService.getMedia(hotelId);
          const inventoryItems = mediaResponse
            .filter(
              (item) =>
                (!item.hotel || !item.hotel.hotelId) &&
                (!item.rooms || item.rooms.length === 0)
            )
            .map((item) => ({
              mediaId: item.mediaId,
              fileUrl: item.fileUrl,
              type: item.fileType,
              tag: item.tags && item.tags.length > 0 ? item.tags[0] : "",
            }));
          setInventory(inventoryItems);
        } catch (error) {
          console.error("Error refreshing media after upload:", error);
        }
      }
    } catch (error: any) {
      console.error("Error uploading files:", error);
      const message =
        error?.response?.data?.message ||
        error?.data?.message ||
        error?.message ||
        "Failed to upload files. Please try again.";
      alert(message);
    } finally {
      setIsUploading(false);
    }
  };

  // ---------------- Assign Tags to Single Media ----------------
  const handleAssignTagsToMedia = async (mediaId: number, tags: MediaTag[]) => {
    if (readOnly) return;
    try {
      // If tags array is empty, send empty array to API to remove all tags
      // Assign tags using mediaId only (no hotelId needed)
      await propertyService.assignMediaTagToHotel(mediaId, tags);

      // Update the media item in inventory with the new tag (or empty if no tags)
      setInventory((prev) =>
        prev.map((item) =>
          item.mediaId === mediaId
            ? { ...item, tag: tags.length > 0 ? tags[0] : "" }
            : item
        )
      );

      // Refresh media data
      if (hotelId) {
        try {
          const mediaResponse = await propertyService.getMedia(hotelId);
          const inventoryItems = mediaResponse
            .filter(
              (item) =>
                (!item.hotel || !item.hotel.hotelId) &&
                (!item.rooms || item.rooms.length === 0)
            )
            .map((item) => ({
              mediaId: item.mediaId,
              fileUrl: item.fileUrl,
              type: item.fileType,
              tag: item.tags && item.tags.length > 0 ? item.tags[0] : "",
            }));
          setInventory(inventoryItems);
        } catch (error) {
          console.error("Error refreshing media after tag assignment:", error);
        }
      }
    } catch (error: any) {
      console.error("Error assigning tags:", error);
      const message =
        error?.response?.data?.message ||
        error?.data?.message ||
        error?.message ||
        "Failed to assign tags. Please try again.";
      alert(message);
    }
  };

  // ---------------- Assign Media ----------------
  const handleAssignMedia = async (mediaIds: string[]) => {
    if (readOnly) return;
    if (!assignmentContext || !hotelId) return;

    try {
      for (const mediaIdStr of mediaIds) {
        const mediaId = parseInt(mediaIdStr, 10);
        if (isNaN(mediaId)) continue;

        const mediaItem = inventory.find((item) => item.mediaId === mediaId);
        if (!mediaItem) continue;

        if (assignmentContext.type === "hotel") {
          await propertyService.assignMedia(
            {
              entityType: "HOTEL",
              entityId: hotelId,
              cover: true,
              sortOrder: 1,
            },
            mediaId
          );

          // Add to hotel media if not already there
          if (!hotelMedia.find((item) => item.mediaId === mediaId)) {
            setHotelMedia([...hotelMedia, mediaItem]);
            setHotelMediaIds([...hotelMediaIds, mediaIdStr]);
          }
        } else if (assignmentContext.roomId) {
          await propertyService.assignMedia(
            {
              entityType: "ROOM",
              entityId: assignmentContext.roomId,
              cover: false,
              sortOrder: 1,
            },
            mediaId
          );

          // Add to room media if not already there
          const roomName =
            roomsList.find((room) => room.id === assignmentContext.roomId)
              ?.roomName || "";
          if (
            !roomMedia.find(
              (item) =>
                item.mediaId === mediaId &&
                item.roomId === assignmentContext.roomId
            )
          ) {
            setRoomMedia([
              ...roomMedia,
              {
                mediaId: mediaId,
                fileUrl: mediaItem.fileUrl,
                type: mediaItem.type,
                tag: mediaItem.tag,
                roomId: assignmentContext.roomId,
                roomName,
              },
            ]);
          }
        }
      }

      // Refresh media data
      const response = await propertyService.getMedia(hotelId);
      const hotelMediaItems = response
        .filter((item) => !item.rooms || item.rooms.length === 0)
        .map((item) => ({
          mediaId: item.mediaId,
          fileUrl: item.fileUrl,
          type: item.fileType,
          tag: item.tags[0] || "OTHER",
        }));
      setHotelMedia(hotelMediaItems);
      setHotelMediaIds(hotelMediaItems.map((item) => item.mediaId.toString()));

      const roomMediaItems = response
        .filter((item) => item?.rooms?.length && item?.rooms?.length > 0)
        .map((item) => ({
          mediaId: item.mediaId,
          fileUrl: item.fileUrl,
          type: item.fileType,
          tag: item.tags[0] || "OTHER",
          roomId: item.rooms?.[0]?.roomId || "",
          roomName: item.rooms?.[0]?.roomName || "",
        }));
      setRoomMedia(roomMediaItems);

      // Update inventory - only unattached media
      const inventoryItems = response
        .filter(
          (item) =>
            (!item.hotel || !item.hotel.hotelId) &&
            (!item.rooms || item.rooms.length === 0)
        )
        .map((item) => ({
          mediaId: item.mediaId,
          fileUrl: item.fileUrl,
          type: item.fileType,
          tag: item.tags[0] || "OTHER",
        }));
      setInventory(inventoryItems);
    } catch (error) {
      console.error("Error assigning media:", error);
    }

    setShowAssignmentModal(false);
    setAssignmentContext(null);
  };

  const openAssignmentModal = (type: "hotel" | "room", roomId?: string) => {
    if (readOnly) return;
    setAssignmentContext({ type, roomId });
    setShowAssignmentModal(true);
  };

  const toggleRoomExpansion = (roomId: string) => {
    setExpandedRooms((prev) =>
      prev.includes(roomId)
        ? prev.filter((id) => id !== roomId)
        : [...prev, roomId]
    );
  };

  // ---------------- Get Room Media ----------------
  const getRoomMedia = (roomId: string): MediaFile[] => {
    return roomMedia
      .filter((item) => item.roomId === roomId)
      .map((item) => ({
        mediaId: item.mediaId,
        fileUrl: item.fileUrl,
        type: item.type,
        tag: item.tag,
      }));
  };

  // ---------------- Get Filtered Inventory for Assignment ----------------
  const getFilteredInventoryForAssignment = (): MediaFile[] => {
    if (!assignmentContext) return inventory;

    if (assignmentContext.type === "hotel") {
      // Include inventory + hotel media, but exclude media assigned to any room
      const roomMediaIds = new Set(
        roomMedia.map((item) => item.mediaId.toString())
      );
      const allAvailableMedia = [...inventory, ...hotelMedia];
      // Deduplicate by mediaId and filter out room-assigned media
      const mediaMap = new Map<number, MediaFile>();
      allAvailableMedia.forEach((item) => {
        const itemId = item.mediaId.toString();
        if (!roomMediaIds.has(itemId)) {
          mediaMap.set(item.mediaId, item);
        }
      });
      return Array.from(mediaMap.values());
    } else if (assignmentContext.roomId) {
      // Include inventory + hotel media + room media for this room
      // Hotel media can also be assigned to rooms
      const roomMediaForThisRoom = getRoomMedia(assignmentContext.roomId);
      const allAvailableMedia = [...inventory, ...hotelMedia, ...roomMediaForThisRoom];
      // Deduplicate by mediaId
      const mediaMap = new Map<number, MediaFile>();
      allAvailableMedia.forEach((item) => {
        mediaMap.set(item.mediaId, item);
      });
      return Array.from(mediaMap.values());
    }

    return inventory;
  };

  // ---------------- UI ----------------
  return (
    <div className="space-y-6 w-3xl">
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "inventory" && (
        <InventoryTab
          readOnly={!!readOnly}
          inventory={inventory}
          onUploadClick={() => setShowUploadModal(true)}
          onRemove={async (mediaId: string) => {
            if (readOnly) return;
            if (!hotelId) return;
            const id = parseInt(mediaId, 10);
            if (isNaN(id)) return;
            try {
              await propertyService.deattachMedia(id, "HOTEL", hotelId);
              setInventory((prev) =>
                prev.filter((item) => item.mediaId.toString() !== mediaId),
              );
            } catch (error) {
              console.error("Error deleting media from inventory:", error);
            }
          }}
          onAssignTags={(mediaId) => {
            const mediaItem = inventory.find((item) => item.mediaId === mediaId);
            if (mediaItem) {
              setMediaForTagAssignment({
                mediaId: mediaItem.mediaId,
                fileUrl: mediaItem.fileUrl,
                fileType: mediaItem.type,
                currentTags: mediaItem.tag && mediaItem.tag !== "" 
                  ? [mediaItem.tag as MediaTag].filter(Boolean)
                  : [],
              });
            }
          }}
          showDelete={!readOnly}
        />
      )}

      {activeTab === "hotel" && (
        <HotelMediaTab
          readOnly={!!readOnly}
          hotelName={hotelName}
          hotelMedia={hotelMedia}
          onAssignClick={() => openAssignmentModal("hotel")}
          onDetach={async (mediaId: string) => {
            if (readOnly) return;
            const id = parseInt(mediaId, 10);
            if (isNaN(id) || !hotelId) return;
            try {
              await propertyService.deattachMedia(id, "HOTEL", hotelId);

              // Get the detached item before refreshing
              const detachedItem = hotelMedia.find(
                (item) => item.mediaId.toString() === mediaId
              );

              // Refresh media data
              const response = await propertyService.getMedia(hotelId);
              const hotelMediaItems = response
                .filter((item) => !item.rooms || item.rooms.length === 0)
                .map((item) => ({
                  mediaId: item.mediaId,
                  fileUrl: item.fileUrl,
                  type: item.fileType,
                  tag: item.tags && item.tags.length > 0 ? item.tags[0] : "",
                }));
              setHotelMedia(hotelMediaItems);
              setHotelMediaIds(
                hotelMediaItems.map((item) => item.mediaId.toString())
              );

              // Update inventory - API only returns attached media, so we need to add detached media manually
              const inventoryItems = response
                .filter(
                  (item) =>
                    (!item.hotel || !item.hotel.hotelId) &&
                    (!item.rooms || item.rooms.length === 0)
                )
                .map((item) => ({
                  mediaId: item.mediaId,
                  fileUrl: item.fileUrl,
                  type: item.fileType,
                  tag: item.tags && item.tags.length > 0 ? item.tags[0] : "",
                }));

              // Add detached media to inventory if it exists and not already there
              if (detachedItem) {
                const existsInInventory = inventoryItems.some(
                  (item) => item.mediaId === detachedItem.mediaId
                );
                if (!existsInInventory) {
                  inventoryItems.push(detachedItem);
                }
              }

              // Also merge with existing inventory to preserve any unattached media
              const existingInventoryMap = new Map(
                inventory.map((item) => [item.mediaId, item])
              );
              inventoryItems.forEach((item) => {
                existingInventoryMap.set(item.mediaId, item);
              });
              if (
                detachedItem &&
                !existingInventoryMap.has(detachedItem.mediaId)
              ) {
                existingInventoryMap.set(detachedItem.mediaId, detachedItem);
              }

              setInventory(Array.from(existingInventoryMap.values()));
            } catch (error) {
              console.error("Error detaching media:", error);
            }
          }}
        />
      )}

      {activeTab === "rooms" && (
        <RoomMediaTab
          readOnly={!!readOnly}
          rooms={roomsList}
          expandedRooms={expandedRooms}
          getRoomMedia={getRoomMedia}
          onToggleRoom={toggleRoomExpansion}
          onAssignClick={(roomId) => openAssignmentModal("room", roomId)}
          onDetach={async (mediaId: string, roomId: string) => {
            if (readOnly) return;
            const id = parseInt(mediaId, 10);
            if (isNaN(id) || !roomId) return;
            try {
              await propertyService.deattachMedia(id, "ROOM", roomId);

              // Get the detached item before refreshing
              const detachedItem = roomMedia.find(
                (item) =>
                  item.mediaId.toString() === mediaId && item.roomId === roomId
              );

              // Refresh media data
              const response = await propertyService.getMedia(hotelId!);
              const roomMediaItems = response
                .filter(
                  (item) => item?.rooms?.length && item?.rooms?.length > 0
                )
                .map((item) => ({
                  mediaId: item.mediaId,
                  fileUrl: item.fileUrl,
                  type: item.fileType,
                  tag: item.tags && item.tags.length > 0 ? item.tags[0] : "",
                  roomId: item.rooms?.[0]?.roomId || "",
                  roomName: item.rooms?.[0]?.roomName || "",
                }));
              setRoomMedia(roomMediaItems);

              // Update inventory - API only returns attached media, so we need to add detached media manually
              const inventoryItems = response
                .filter(
                  (item) =>
                    (!item.hotel || !item.hotel.hotelId) &&
                    (!item.rooms || item.rooms.length === 0)
                )
                .map((item) => ({
                  mediaId: item.mediaId,
                  fileUrl: item.fileUrl,
                  type: item.fileType,
                  tag: item.tags && item.tags.length > 0 ? item.tags[0] : "",
                }));

              // Add detached media to inventory if it exists and not already there
              if (detachedItem) {
                const detachedMediaItem = {
                  mediaId: detachedItem.mediaId,
                  fileUrl: detachedItem.fileUrl,
                  type: detachedItem.type,
                  tag: detachedItem.tag,
                };
                const existsInInventory = inventoryItems.some(
                  (item) => item.mediaId === detachedMediaItem.mediaId
                );
                if (!existsInInventory) {
                  inventoryItems.push(detachedMediaItem);
                }
              }

              // Also merge with existing inventory to preserve any unattached media
              const existingInventoryMap = new Map(
                inventory.map((item) => [item.mediaId, item])
              );
              inventoryItems.forEach((item) => {
                existingInventoryMap.set(item.mediaId, item);
              });
              if (detachedItem) {
                const detachedMediaItem = {
                  mediaId: detachedItem.mediaId,
                  fileUrl: detachedItem.fileUrl,
                  type: detachedItem.type,
                  tag: detachedItem.tag,
                };
                if (!existingInventoryMap.has(detachedMediaItem.mediaId)) {
                  existingInventoryMap.set(
                    detachedMediaItem.mediaId,
                    detachedMediaItem
                  );
                }
              }

              setInventory(Array.from(existingInventoryMap.values()));
            } catch (error) {
              console.error("Error detaching media:", error);
            }
          }}
          isLoading={isLoadingRooms}
        />
      )}

      <UploadModal
        isOpen={!readOnly && showUploadModal}
        onClose={() => {
          if (isUploading) return;
          setShowUploadModal(false);
        }}
        onFilesSelect={handleFilesSelect}
        isUploading={isUploading}
      />

      {duplicateUploadError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-red-100">
            <div className="px-6 py-4 border-b border-gray-200 bg-red-50 rounded-t-2xl">
              <h3 className="text-base font-semibold text-red-700">
                Duplicate Image Detected
              </h3>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-gray-700">{duplicateUploadError.message}</p>
              {duplicateUploadError.files.length > 0 && (
                <div className="mt-3 rounded-lg border border-red-100 bg-red-50/60 p-3">
                  <p className="text-xs font-semibold text-red-700 mb-2">
                    Duplicate files
                  </p>
                  <ul className="space-y-1.5 text-xs text-gray-700">
                    {duplicateUploadError.files.map((file, index) => (
                      <li key={`${file.name}-${index}`} className="truncate">
                        {index + 1}. {file.name} ({file.sizeMb} MB)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
                onClick={() => setDuplicateUploadError(null)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {mediaForTagAssignment && (
        <SingleMediaTagModal
          isOpen={!readOnly && !!mediaForTagAssignment}
          onClose={() => setMediaForTagAssignment(null)}
          mediaId={mediaForTagAssignment.mediaId}
          mediaUrl={mediaForTagAssignment.fileUrl}
          mediaType={mediaForTagAssignment.fileType}
          currentTags={mediaForTagAssignment.currentTags}
          onTagsAssigned={handleAssignTagsToMedia}
        />
      )}

      {showAssignmentModal && assignmentContext && (
        <MediaAssignmentModal
          isOpen={!readOnly && showAssignmentModal}
          onClose={() => {
            setShowAssignmentModal(false);
            setAssignmentContext(null);
          }}
          inventory={getFilteredInventoryForAssignment()}
          assignedMediaIds={
            assignmentContext.type === "hotel"
              ? hotelMediaIds
              : assignmentContext.roomId
              ? getRoomMedia(assignmentContext.roomId).map((item) =>
                  item.mediaId.toString()
                )
              : []
          }
          onAssign={handleAssignMedia}
          title={
            assignmentContext.type === "hotel"
              ? `Assign Media to ${hotelName}`
              : `Assign Media to Room`
          }
        />
      )}
    </div>
  );
}
