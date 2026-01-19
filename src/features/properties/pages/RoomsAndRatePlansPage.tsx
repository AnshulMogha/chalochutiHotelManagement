import { useSearchParams } from "react-router";
import { RoomsAndRatePlansTab } from "../components/property-info/RoomsAndRatePlansTab";

export default function RoomsAndRatePlansPage() {
  const [searchParams] = useSearchParams();
  const selectedHotelId = searchParams.get("hotelId");

  if (!selectedHotelId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Rooms & Rate Plans</h1>
          <p className="text-gray-500 mt-2">Please select a hotel from the dropdown above to view rooms and rate plans</p>
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
        <h1 className="text-3xl font-bold text-gray-900">Rooms & Rate Plans</h1>
      </div>
      <RoomsAndRatePlansTab hotelId={selectedHotelId} />
    </div>
  );
}

