import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { adminService, type HotelRoom } from "@/features/admin/services/adminService";
import { PropertyMediaTab } from "../components/property-info/PropertyMediaTab";

export default function PhotosAndVideosPage() {
  const [searchParams] = useSearchParams();
  const selectedHotelId = searchParams.get("hotelId");
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);

  useEffect(() => {
    const fetchRooms = async () => {
      if (!selectedHotelId) {
        setRooms([]);
        return;
      }

      try {
        setIsLoadingRooms(true);
        const data = await adminService.getHotelAdminRooms(selectedHotelId);
        if (data) {
          setRooms(data.rooms || []);
        }
      } catch (error) {
        console.error("Error fetching rooms:", error);
        setRooms([]);
      } finally {
        setIsLoadingRooms(false);
      }
    };

    if (selectedHotelId) {
      fetchRooms();
    }
  }, [selectedHotelId]);

  if (!selectedHotelId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Photos and Videos</h1>
          <p className="text-gray-500 mt-2">Please select a hotel from the dropdown above to view photos and videos</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <p className="text-gray-500">No hotel selected</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Photos and Videos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage media for your hotel and rooms
        </p>
      </div>
      {isLoadingRooms ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      ) : (
        <PropertyMediaTab hotelId={selectedHotelId} rooms={rooms} />
      )}
    </div>
  );
}

