import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { ImageIcon, Loader2 } from "lucide-react";
import { adminService, type HotelRoom } from "@/features/admin/services/adminService";
import { PropertyMediaTab } from "../components/property-info/PropertyMediaTab";
import { useAuth } from "@/hooks";
import { canEditModule } from "@/lib/permissions";
import { ReadOnlySection } from "@/components/ui/ReadOnlySection";

export default function PhotosAndVideosPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const selectedHotelId = searchParams.get("hotelId");
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const isReadOnly = !canEditModule(user, "PROPERTY_PHOTOS_VIDEOS");

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
      <div className="container mx-auto px-4 py-4 sm:px-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef2ff] text-[#2f3d95]">
            <ImageIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              Photos & Videos
            </h1>
            <p className="text-sm text-slate-500">
              Select a hotel from the dropdown above
            </p>
          </div>
        </div>
        <div className="flex min-h-60 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
          <p className="text-sm text-slate-500">No hotel selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:px-6">
      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-[#2f3d95]/10 bg-gradient-to-r from-[#eef2ff]/80 via-white to-cyan-50/50 px-4 py-3 shadow-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#2f3d95] to-indigo-500 text-white shadow-md shadow-[#2f3d95]/30">
          <ImageIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Photos & Videos
          </h1>
          <p className="text-sm text-slate-600">
            Upload hotel and room photos — drag items to reorder.
          </p>
        </div>
      </div>
      {isLoadingRooms ? (
        <div className="flex min-h-60 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-[#2f3d95]" />
            Loading...
          </div>
        </div>
      ) : (
        <ReadOnlySection isReadOnly={isReadOnly}>
          <PropertyMediaTab hotelId={selectedHotelId} rooms={rooms} />
        </ReadOnlySection>
      )}
    </div>
  );
}
