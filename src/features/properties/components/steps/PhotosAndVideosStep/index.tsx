import { useState, useRef, useEffect } from "react";
import { useFormContext } from "@/features/properties/context/useFormContext";
import { useSearchParams } from "react-router";
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
  const { formDataState } = useFormContext();
  const [searchParams] = useSearchParams();
  const hotelId = searchParams.get("draftId");

  const [activeTab, setActiveTab] = useState<ActiveTab>("inventory");
  const [expandedRooms, setExpandedRooms] = useState<string[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
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
    if (!files || files.length === 0 || !hotelId) return;

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
      alert("No valid files selected. Please select image or video files within size limits.");
      return;
    }

    try {
      // Upload files using hotel-specific endpoint
      const uploadResponses = await propertyService.uploadHotelMedia(hotelId, validFiles);
      
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
    } catch (error) {
      console.error("Error uploading files:", error);
      alert("Failed to upload files. Please try again.");
    }
  };

  // ---------------- Assign Tags to Single Media ----------------
  const handleAssignTagsToMedia = async (mediaId: number, tags: MediaTag[]) => {
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
    } catch (error) {
      console.error("Error assigning tags:", error);
      alert("Failed to assign tags. Please try again.");
    }
  };

  // ---------------- Assign Media ----------------
  const handleAssignMedia = async (mediaIds: string[]) => {
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
          inventory={inventory}
          onUploadClick={() => setShowUploadModal(true)}
          onRemove={undefined}
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
        />
      )}

      {activeTab === "hotel" && (
        <HotelMediaTab
          hotelName={hotelName}
          hotelMedia={hotelMedia}
          onAssignClick={() => openAssignmentModal("hotel")}
          onDetach={async (mediaId: string) => {
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
          rooms={roomsList}
          expandedRooms={expandedRooms}
          getRoomMedia={getRoomMedia}
          onToggleRoom={toggleRoomExpansion}
          onAssignClick={(roomId) => openAssignmentModal("room", roomId)}
          onDetach={async (mediaId: string, roomId: string) => {
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
        isOpen={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
        }}
        onFilesSelect={handleFilesSelect}
      />

      {mediaForTagAssignment && (
        <SingleMediaTagModal
          isOpen={!!mediaForTagAssignment}
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
          isOpen={showAssignmentModal}
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
