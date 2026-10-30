import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { Building2 } from "lucide-react";
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
      <div className="min-h-full bg-slate-50">
        <div className="mx-auto max-w-350 px-3 py-4 sm:px-5">
          <div className="flex min-h-60 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-200">
                <Building2 className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-slate-700">
                No hotel selected
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Select a hotel from the top bar to manage photos and videos
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-350 px-3 py-4 sm:px-5">
        <ReadOnlySection isReadOnly={isReadOnly}>
          <PropertyMediaTab
            hotelId={selectedHotelId}
            rooms={rooms}
            isLoadingRooms={isLoadingRooms}
          />
        </ReadOnlySection>
      </div>
    </div>
  );
}
