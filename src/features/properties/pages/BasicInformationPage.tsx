import { useState } from "react";
import { useSearchParams } from "react-router";
import { Building2, MapPin, Phone } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PropertyDetailsTab } from "../components/property-info/PropertyDetailsTab";
import { PropertyContactDetailsTab } from "../components/property-info/PropertyContactDetailsTab";
import { HowToReachTab } from "../components/property-info/HowToReachTab";
import { useAuth } from "@/hooks";
import {
  canEditBasicInfoContactDetails,
  canEditBasicInfoPropertyDescription,
  canEditBasicInfoPropertyDetails,
  canEditBasicInfoHowToReach,
  canViewModule,
} from "@/lib/permissions";
import { ReadOnlySection } from "@/components/ui/ReadOnlySection";
import { cn } from "@/lib/utils";

const TABS = [
  {
    value: "property-details",
    label: "Property Details",
    icon: Building2,
  },
  {
    value: "property-contact",
    label: "Property Contact Details",
    icon: Phone,
  },
  {
    value: "how-to-reach",
    label: "How to Reach",
    icon: MapPin,
  },
] as const;

export default function BasicInformationPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const selectedHotelId = searchParams.get("hotelId");
  const [activeTab, setActiveTab] = useState("property-details");
  const canViewBasicInfo = canViewModule(user, "PROPERTY_BASIC_INFO");
  const readOnlyContact = !canEditBasicInfoContactDetails(user);
  const readOnlyPropertyDetails =
    !canEditBasicInfoPropertyDetails(user) &&
    !canEditBasicInfoPropertyDescription(user);
  const readOnlyHowToReach = !canEditBasicInfoHowToReach(user);

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
                Select a hotel from the top bar to view basic information
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!canViewBasicInfo) {
    return (
      <div className="min-h-full bg-slate-50">
        <div className="mx-auto max-w-350 px-3 py-4 sm:px-5">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center shadow-sm">
            <p className="text-sm font-medium text-slate-700">
              You do not have permission to view this section.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-350 px-3 py-4 sm:px-5">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="mb-3 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
              <TabsList className="inline-flex h-auto w-full flex-wrap gap-1 bg-transparent p-0 sm:w-auto">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.value;
                  return (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className={cn(
                        "group inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition",
                        isActive
                          ? "bg-[#2f3d95] text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-3.5 w-3.5 shrink-0",
                          isActive
                            ? "text-white"
                            : "text-slate-500 group-hover:text-slate-700",
                        )}
                        strokeWidth={2.25}
                      />
                      {tab.label}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>
          </div>

          <TabsContent value="property-details" className="mt-0">
            <ReadOnlySection isReadOnly={readOnlyPropertyDetails}>
              <PropertyDetailsTab hotelId={selectedHotelId} />
            </ReadOnlySection>
          </TabsContent>

          <TabsContent value="property-contact" className="mt-0">
            <ReadOnlySection isReadOnly={readOnlyContact}>
              <PropertyContactDetailsTab hotelId={selectedHotelId} />
            </ReadOnlySection>
          </TabsContent>

          <TabsContent value="how-to-reach" className="mt-0">
            <ReadOnlySection isReadOnly={readOnlyHowToReach}>
              <HowToReachTab hotelId={selectedHotelId} />
            </ReadOnlySection>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
