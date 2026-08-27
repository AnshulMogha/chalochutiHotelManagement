import { useSearchParams } from "react-router";
import { DocumentTab } from "../components/property-info/DocumentTab";
import { useAuth } from "@/hooks";
import { canEditModule } from "@/lib/permissions";
import { ReadOnlySection } from "@/components/ui/ReadOnlySection";

export default function DocumentPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const selectedHotelId = searchParams.get("hotelId");
  const isReadOnly = !canEditModule(user, "PROPERTY_DOCUMENT");

  if (!selectedHotelId) {
    return (
      <div className="container mx-auto px-4 py-4 sm:px-6">
        <div className="flex min-h-60 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
          <p className="text-sm text-slate-500">
            Select a hotel from the dropdown above to manage documents
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:px-6">
      <ReadOnlySection isReadOnly={isReadOnly}>
        <DocumentTab hotelId={selectedHotelId} />
      </ReadOnlySection>
    </div>
  );
}
