import { useState } from "react";
import { useSearchParams } from "react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PropertyDetailsTab } from "../components/property-info/PropertyDetailsTab";
import { PropertyContactDetailsTab } from "../components/property-info/PropertyContactDetailsTab";
import { HowToReachTab } from "../components/property-info/HowToReachTab";

export default function BasicInformationPage() {
  const [searchParams] = useSearchParams();
  const selectedHotelId = searchParams.get("hotelId");
  const [activeTab, setActiveTab] = useState("property-details");

  if (!selectedHotelId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Basic Information</h1>
          <p className="text-gray-500 mt-2">Please select a hotel from the dropdown above to view basic information</p>
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
        <h1 className="text-3xl font-bold text-gray-900">Basic Information</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="inline-flex w-auto mb-6">
          <TabsTrigger value="property-details">Property Details</TabsTrigger>
          <TabsTrigger value="property-contact">Property Contact Details</TabsTrigger>
          <TabsTrigger value="how-to-reach">How to Reach</TabsTrigger>
        </TabsList>

        <TabsContent value="property-details">
          <PropertyDetailsTab hotelId={selectedHotelId} />
        </TabsContent>

        <TabsContent value="property-contact">
          <PropertyContactDetailsTab hotelId={selectedHotelId} />
        </TabsContent>

        <TabsContent value="how-to-reach">
          <HowToReachTab hotelId={selectedHotelId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

