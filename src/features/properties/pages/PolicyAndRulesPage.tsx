import { useSearchParams } from "react-router";
import { PolicyAndRulesTab } from "../components/property-info/PolicyAndRulesTab";
import { useAuth } from "@/hooks";
import { canEditModule } from "@/lib/permissions";
import { ReadOnlySection } from "@/components/ui/ReadOnlySection";

export default function PolicyAndRulesPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const selectedHotelId = searchParams.get("hotelId");
  const isReadOnly = !canEditModule(user, "PROPERTY_POLICY_RULES");

  if (!selectedHotelId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Policy and Rules</h1>
          <p className="text-gray-500 mt-2">Please select a hotel from the dropdown above to view policies and rules</p>
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
      <ReadOnlySection isReadOnly={isReadOnly}>
        <PolicyAndRulesTab hotelId={selectedHotelId} />
      </ReadOnlySection>
    </div>
  );
}

