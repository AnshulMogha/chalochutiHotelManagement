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
import { BasicInfoFormCard } from "../components/property-info/basicInfoFormUi";

const TABS = [
  {
    value: "property-details",
    label: "Property Details",
    icon: Building2,
    active: "bg-blue-600 text-white font-semibold shadow-sm",
    idle: "text-slate-700 hover:bg-blue-100 hover:text-blue-800",
    iconActive: "text-white",
    iconIdle: "text-slate-500 group-hover:text-blue-600",
  },
  {
    value: "property-contact",
    label: "Property Contact Details",
    icon: Phone,
    active: "bg-emerald-600 text-white font-semibold shadow-sm",
    idle: "text-slate-700 hover:bg-emerald-100 hover:text-emerald-800",
    iconActive: "text-white",
    iconIdle: "text-slate-500 group-hover:text-emerald-600",
  },
  {
    value: "how-to-reach",
    label: "How to Reach",
    icon: MapPin,
    active: "bg-violet-600 text-white font-semibold shadow-sm",
    idle: "text-slate-700 hover:bg-violet-100 hover:text-violet-800",
    iconActive: "text-white",
    iconIdle: "text-slate-500 group-hover:text-violet-600",
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
      <div className="container mx-auto px-4 py-4">
        <div className="mb-4">
          <h1 className="text-xl font-bold tracking-tight text-gray-900">
            Basic Information
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Please select a hotel from the dropdown above to view basic
            information
          </p>
        </div>
        <BasicInfoFormCard>
          <div className="flex min-h-[400px] items-center justify-center">
            <p className="text-gray-500">No hotel selected</p>
          </div>
        </BasicInfoFormCard>
      </div>
    );
  }

  if (!canViewBasicInfo) {
    return (
      <div className="container mx-auto px-4 py-4">
        <div className="mb-4">
          <h1 className="text-xl font-bold tracking-tight text-gray-900">
            Basic Information
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            You do not have permission to view this section.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 pb-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="sticky top-0 z-20 -mx-4 mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 bg-gray-50 px-4 py-3">
          <h1 className="shrink-0 text-xl font-bold tracking-tight text-gray-900">
            Basic Information
          </h1>
          <TabsList className="inline-flex h-auto w-full flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 sm:w-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.value;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    "group gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                    isActive ? tab.active : tab.idle,
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive ? tab.iconActive : tab.iconIdle,
                    )}
                    strokeWidth={2.25}
                  />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
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
  );
}
