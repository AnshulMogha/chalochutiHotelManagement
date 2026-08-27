import { useSearchParams } from "react-router";
import { Layers } from "lucide-react";
import { RoomsAndRatePlansTab } from "../components/property-info/RoomsAndRatePlansTab";
import { useAuth } from "@/hooks";
import { canEditModule } from "@/lib/permissions";
import { ReadOnlySection } from "@/components/ui/ReadOnlySection";

export default function RoomsAndRatePlansPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const selectedHotelId = searchParams.get("hotelId");
  const isReadOnly = !canEditModule(user, "PROPERTY_ROOMS_RATEPLANS");

  if (!selectedHotelId) {
    return (
      <div className="container mx-auto px-4 py-4 sm:px-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef2ff] text-[#2f3d95]">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              Rooms & Rate Plans
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
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef2ff] text-[#2f3d95]">
          <Layers className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Rooms & Rate Plans
          </h1>
          <p className="text-sm text-slate-500">
            Add room types, then attach rate plans with meal and payment
            options.
          </p>
        </div>
      </div>
      <ReadOnlySection isReadOnly={isReadOnly}>
        <RoomsAndRatePlansTab hotelId={selectedHotelId} />
      </ReadOnlySection>
    </div>
  );
}
