import {
  Image as ImageIcon,
  Camera,
  ChevronDown,
  ChevronRight,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui";
import { MediaGrid } from "./MediaGrid";
import type { MediaFile } from "./types";

interface Room {
  id: string;
  roomName: string;
  roomType?: string;
}

interface RoomMediaTabProps {
  rooms: Room[];
  expandedRooms: string[];
  getRoomMedia: (roomId: string) => MediaFile[];
  onToggleRoom: (roomId: string) => void;
  onAssignClick: (roomId: string) => void;
  onDetach?: (mediaId: string, roomId: string) => void;
  isLoading?: boolean;
}

export function RoomMediaTab({
  rooms,
  expandedRooms,
  getRoomMedia,
  onToggleRoom,
  onAssignClick,
  onDetach,
  isLoading = false,
}: RoomMediaTabProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Room Media</h2>
            <p className="text-xs text-gray-600 mt-0.5">
              {isLoading
                ? "Loading rooms..."
                : `${rooms.length} room(s) available`}
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 flex flex-col items-center justify-center">
          <div className="h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm text-gray-500">Loading rooms...</p>
        </div>
      ) : rooms.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">
            No rooms available. Please add rooms in the Rooms step first.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {rooms.map((room) => {
            const isExpanded = expandedRooms.includes(room.id);
            const roomMedia = getRoomMedia(room.id);

            return (
              <div key={room.id} className="bg-gray-50/50">
                <button
                  type="button"
                  onClick={() => onToggleRoom(room.id)}
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
                      {room.roomType && (
                        <p className="text-xs text-gray-500 capitalize">
                          {room.roomType.replace("_", " ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Camera className="w-4 h-4" />
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
                        type="button"
                        variant="primary"
                        onClick={() => onAssignClick(room.id)}
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
                          type="button"
                          variant="outline"
                          onClick={() => onAssignClick(room.id)}
                          className="gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Assign Media
                        </Button>
                      </div>
                    ) : (
                      <MediaGrid
                        media={roomMedia}
                        tagColor="emerald"
                        emptyMessage="No media assigned"
                        onRemove={
                          onDetach
                            ? (mediaId: string) => onDetach(mediaId, room.id)
                            : undefined
                        }
                        showDelete={true}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
