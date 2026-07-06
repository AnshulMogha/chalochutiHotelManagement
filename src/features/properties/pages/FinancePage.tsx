import { useSearchParams } from "react-router";
import { FinanceTab } from "../components/property-info/FinanceTab";
import { useAuth } from "@/hooks";
import { canEditModule } from "@/lib/permissions";
import { ReadOnlySection } from "@/components/ui/ReadOnlySection";
import { FinanceSectionCard } from "../components/property-info/financeTabUi";

export default function FinancePage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const selectedHotelId = searchParams.get("hotelId");
  const isReadOnly = !canEditModule(user, "PROPERTY_FINANCE");

  if (!selectedHotelId) {
    return (
      <div className="container mx-auto px-4 py-4">
        <div className="mb-4">
          <h1 className="text-xl font-bold tracking-tight text-gray-900">
            Finance
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Please select a hotel from the dropdown above to view finance
            information
          </p>
        </div>
        <FinanceSectionCard theme="emerald">
          <div className="flex min-h-[400px] items-center justify-center">
            <p className="text-gray-500">No hotel selected</p>
          </div>
        </FinanceSectionCard>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 pb-4">
      <ReadOnlySection isReadOnly={isReadOnly}>
        <FinanceTab hotelId={selectedHotelId} />
      </ReadOnlySection>
    </div>
  );
}
