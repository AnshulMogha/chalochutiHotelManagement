import { useState, useEffect } from "react";
import { Building2, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { Button } from "./Button";
import { propertyService } from "@/features/properties/services/propertyService";
import { adminService } from "@/features/admin/services/adminService";
import type { HotelListResponse } from "@/features/properties/services/api.types";
import type { ApprovedHotelItem } from "@/features/admin/services/adminService";
import { useLocation } from "react-router";
import { ROUTES } from "@/constants";

interface HotelSelectorProps {
  selectedHotelId: string | null;
  onHotelChange: (hotelId: string) => void;
  className?: string;
}

export function HotelSelector({
  selectedHotelId,
  onHotelChange,
  className = "",
}: HotelSelectorProps) {
  const [hotels, setHotels] = useState<(HotelListResponse | ApprovedHotelItem)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const isPropertyInfoPage = location.pathname === ROUTES.PROPERTY_INFO.BASIC_INFO;

  useEffect(() => {
    const fetchHotels = async () => {
      try {
        setIsLoading(true);
        let data: (HotelListResponse | ApprovedHotelItem)[] = [];
        
        // Use approved hotels API when on property info page
        if (isPropertyInfoPage) {
          const approvedHotels = await adminService.getApprovedHotels();
          // Convert ApprovedHotelItem to HotelListResponse format
          data = approvedHotels.map((hotel) => ({
            hotelId: hotel.hotelId,
            hotelName: hotel.hotelName,
            hotelCode: hotel.hotelCode,
          }));
        } else {
          data = await propertyService.getAllHotels();
        }
        
        setHotels(data);
        // Auto-select first hotel if none selected
        if (!selectedHotelId && data.length > 0) {
          onHotelChange(data[0].hotelId);
        }
      } catch (error) {
        console.error("Error fetching hotels:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHotels();
  }, [selectedHotelId, onHotelChange, isPropertyInfoPage]);

  const selectedHotel = hotels.find((h) => h.hotelId === selectedHotelId);

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 ${className}`}>
        <Building2 className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-500">Loading hotels...</span>
      </div>
    );
  }

  if (hotels.length === 0) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 ${className}`}>
        <Building2 className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-500">No hotels available</span>
      </div>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={`gap-2 ${className}`}
        >
          <Building2 className="w-4 h-4" />
          <span className="max-w-[200px] truncate">
            {selectedHotel?.hotelName || "Select Hotel"}
          </span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 max-h-[300px] overflow-y-auto">
        {hotels.map((hotel) => (
          <DropdownMenuItem
            key={hotel.hotelId}
            onClick={() => {
              onHotelChange(hotel.hotelId);
              setIsOpen(false);
            }}
            className={cn(
              "flex items-center gap-2 cursor-pointer",
              selectedHotelId === hotel.hotelId && "bg-[#2f3d95]/10"
            )}
          >
            <Building2 className="w-4 h-4 text-[#2f3d95]" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{hotel.hotelName}</div>
              <div className="text-xs text-gray-500 truncate">{hotel.hotelCode || ""}</div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function cn(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

