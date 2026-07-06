import { useSearchParams } from "react-router";
import { PolicyAndRulesTab } from "../components/property-info/PolicyAndRulesTab";
import { useAuth } from "@/hooks";
import { canEditModule } from "@/lib/permissions";
import { ReadOnlySection } from "@/components/ui/ReadOnlySection";
import { PolicySectionCard } from "../components/property-info/policyRulesUi";

export default function PolicyAndRulesPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const selectedHotelId = searchParams.get("hotelId");
  const isReadOnly = !canEditModule(user, "PROPERTY_POLICY_RULES");

  if (!selectedHotelId) {
    return (
      <div className="container mx-auto px-4 py-4">
        <div className="mb-4">
          <h1 className="text-xl font-bold tracking-tight text-gray-900">
            Policy and Rules
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Please select a hotel from the dropdown above to view policies and
            rules
          </p>
        </div>
        <PolicySectionCard>
          <div className="flex min-h-[400px] items-center justify-center">
            <p className="text-gray-500">No hotel selected</p>
          </div>
        </PolicySectionCard>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 pb-4">
      <ReadOnlySection isReadOnly={isReadOnly}>
        <PolicyAndRulesTab hotelId={selectedHotelId} />
      </ReadOnlySection>
    </div>
  );
}
