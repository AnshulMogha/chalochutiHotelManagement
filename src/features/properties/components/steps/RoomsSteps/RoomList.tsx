import { propertyService } from "@/features/properties/services/propertyService";
import type { RoomList } from "@/features/properties/types";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { Card } from "@/components/ui/Card";


interface RoomsListProps {
  onAddNew: () => void;
  onEdit: (roomId: string) => void;
  hotelId: string | null;
}

const getStatusConfig = (status: string) => {
  const statusUpper = status.toUpperCase();

  switch (statusUpper) {
    case "DRAFT":
      return {
        label: "Draft",
        className: "bg-gray-100 text-gray-700 border-gray-300",
        dotColor: "bg-gray-500",
      };
    case "IN_PROGRESS":
      return {
        label: "In Progress",
        className: "bg-amber-100 text-amber-700 border-amber-300",
        dotColor: "bg-amber-500",
      };
    case "COMPLETED":
      return {
        label: "Completed",
        className: "bg-green-100 text-green-700 border-green-300",
        dotColor: "bg-green-500",
      };
    case "UNDER_REVIEW":
      return {
        label: "Under Review",
        className: "bg-blue-100 text-blue-700 border-blue-300",
        dotColor: "bg-blue-500",
      };
    case "LIVE":
      return {
        label: "Live",
        className: "bg-emerald-100 text-emerald-700 border-emerald-300",
        dotColor: "bg-emerald-500",
      };
    case "REJECTED":
      return {
        label: "Rejected",
        className: "bg-red-100 text-red-700 border-red-300",
        dotColor: "bg-red-500",
      };
    default:
      return {
        label: status,
        className: "bg-slate-100 text-slate-700 border-slate-300",
        dotColor: "bg-slate-500",
      };
  }
};

const formatRoomType = (roomType: string): string => {
  return roomType
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
};

export function RoomsList({ onAddNew, onEdit, hotelId }: RoomsListProps) {
  const [rooms, setRooms] = useState<RoomList[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRooms = async () => {
      if (!hotelId) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await propertyService.getAllRooms(hotelId);
        setRooms(
          response.map((room) => ({
            status: room.status,
            draft: room.draft,
            roomKey: room.data.roomKey,
            roomName: room.data.roomDetails.roomName,
            roomType: room.data.roomDetails.roomType,
            roomSize: room.data.roomDetails.roomSize,
            roomSizeUnit: room.data.roomDetails.roomSizeUnit,
            totalRooms: room.data.roomDetails.totalRooms,
          }))
        );
      } catch (err) {
        setError("Failed to load rooms. Please try again.");
        console.error("Error fetching rooms:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRooms();
  }, [hotelId]);


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Rooms</h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage your hotel room configurations
          </p>
        </div>
        <Button onClick={onAddNew} variant="primary" size="md">
          + Add New Room
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-slate-500">Loading rooms...</p>
          </div>
        </div>
      ) : error ? (
        <Card variant="outlined" className="p-6">
          <div className="flex items-center gap-3 text-red-600">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p>{error}</p>
          </div>
        </Card>
      ) : rooms.length === 0 ? (
        <Card variant="outlined" className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="h-8 w-8 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No rooms created yet
            </h3>
            <p className="text-slate-500 mb-6 max-w-sm">
              Get started by adding your first room configuration. You can add
              multiple room types with different amenities and pricing.
            </p>
            <Button onClick={onAddNew} variant="primary">
              Create Your First Room
            </Button>
          </div>
        </Card>
      ) : (
        <Card variant="outlined" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Room Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Total Rooms
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {rooms.map((room) => {
                  const statusConfig = getStatusConfig(room.status);
                  return (
                    <tr
                      key={room.roomKey}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-slate-900">
                          {room.roomName}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-slate-600">
                          {formatRoomType(room.roomType)}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-slate-600">
                          {room.roomSize} {room.roomSizeUnit}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-slate-600">
                          {room.totalRooms} {room.totalRooms === 1 ? "Room" : "Rooms"}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig.className}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${statusConfig.dotColor}`}
                          ></span>
                          {statusConfig.label}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Button
                          onClick={() => onEdit(room.roomKey)}
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          {room.draft ? "Edit" : "View"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
