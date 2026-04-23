import { useState, useEffect, useRef } from "react";
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
import { useAuth } from "@/hooks";
import { isHotelOwner, isSuperAdmin } from "@/constants/roles";
import { getStoredSelectedHotelId } from "@/lib/selectedHotelStorage";

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
  const { user } = useAuth();
  const isHotelOwnerUser = isHotelOwner(user?.roles);
  const isSuperAdminUser = isSuperAdmin(user?.roles);
  // If parent hasn't provided a hotelId yet, fall back to persisted selection.
  // This prevents auto-selecting the first hotel by default.
  const effectiveSelectedHotelId =
    selectedHotelId ?? getStoredSelectedHotelId();
  const [hotels, setHotels] = useState<
    (HotelListResponse | ApprovedHotelItem)[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const isBasicInfoPage = location.pathname === ROUTES.PROPERTY_INFO.BASIC_INFO;
  const isRoomsRatePlansPage =
    location.pathname === ROUTES.PROPERTY_INFO.ROOMS_RATEPLANS;
  const isPhotosVideosPage =
    location.pathname === ROUTES.PROPERTY_INFO.PHOTOS_VIDEOS;
  const isAmenitiesRestaurantsPage =
    location.pathname === ROUTES.PROPERTY_INFO.AMENITIES_RESTAURANTS;
  const isPolicyRulesPage =
    location.pathname === ROUTES.PROPERTY_INFO.POLICY_RULES;
  const isFinancePage = location.pathname === ROUTES.PROPERTY_INFO.FINANCE;
  const isDocumentPage = location.pathname === ROUTES.PROPERTY_INFO.DOCUMENT;
  const isDocumentReviewPage =
    location.pathname === ROUTES.ADMIN.DOCUMENT_REVIEW;
  const isPropertyInfoPage =
    isBasicInfoPage ||
    isRoomsRatePlansPage ||
    isPhotosVideosPage ||
    isAmenitiesRestaurantsPage ||
    isPolicyRulesPage ||
    isFinancePage ||
    isDocumentPage;

  // Check inventory/rate-plans pages
  const isInventoryRoomTypesPage =
    location.pathname === ROUTES.ROOM_INVENTORY.LIST;
  const isInventoryRatePlansPage =
    location.pathname === ROUTES.RATE_INVENTORY.LIST;
  const isBulkUpdateInventoryPage =
    location.pathname === ROUTES.ROOM_INVENTORY.BULK_UPDATE;
  const isBulkUpdateRatesPage = location.pathname === "/rates/bulk-update";
  const isBulkUpdateRestrictionsPage =
    location.pathname === "/restrictions/bulk-update";
  const isInventoryPage =
    isInventoryRoomTypesPage ||
    isInventoryRatePlansPage ||
    isBulkUpdateInventoryPage ||
    isBulkUpdateRatesPage ||
    isBulkUpdateRestrictionsPage;

  // Check promotions pages
  const isPromotionsListPage = location.pathname === ROUTES.PROMOTIONS.LIST;
  const isPromotionsCreatePage = location.pathname.startsWith(
    ROUTES.PROMOTIONS.CREATE,
  );
  const isPromotionsMyPromotionsPage =
    location.pathname === ROUTES.PROMOTIONS.MY_PROMOTIONS;
  const isPromotionsPage =
    isPromotionsListPage ||
    isPromotionsCreatePage ||
    isPromotionsMyPromotionsPage;

  // Check team page
  const isTeamPage = location.pathname === ROUTES.TEAM.LIST;
  // Check bookings page
  const isBookingsPage = location.pathname === ROUTES.BOOKINGS.LIST;

  // Combined check for pages that need hotel filtering (property info + inventory + promotions + document review + team + bookings)
  const isHotelFilterPage =
    isPropertyInfoPage ||
    isInventoryPage ||
    isPromotionsPage ||
    isDocumentReviewPage ||
    isTeamPage ||
    isBookingsPage;

  const hasAutoSelectedRef = useRef(false);

  useEffect(() => {
    const fetchHotels = async () => {
      try {
        setIsLoading(true);
        let data: (HotelListResponse | ApprovedHotelItem)[] = [];

        // Super admin gets approved hotels list.
        // Other roles (owner/manager/team users) use accessible hotels list.
        if (isHotelFilterPage && isSuperAdminUser) {
          const approvedHotels = await adminService.getApprovedHotels();
          // Convert ApprovedHotelItem to HotelListResponse format
          data = approvedHotels.map((hotel) => ({
            hotelId: hotel.hotelId,
            hotelName: hotel.hotelName,
            hotelCode: hotel.hotelCode,
          }));
        } else {
          // For non-superadmin users, backend should return hotels they can access.
          const allHotels = await propertyService.getAllHotels();
          if (isHotelFilterPage && isHotelOwnerUser) {
            // Filter to show only LIVE hotels for hotel owners on property info/promotions pages
            data = allHotels.filter((hotel) => hotel.status === "LIVE");
          } else {
            data = allHotels;
          }
        }

        // Filter the final list to show only LIVE hotels
        data = data.filter((hotel) => {
          // Check if hotel has status field and it's LIVE
          if ("status" in hotel && hotel.status) {
            return hotel.status === "LIVE";
          }
          // For approved hotels (which don't have status field but are LIVE by definition), include them
          return true;
        });

        setHotels(data);
        // Auto-select first hotel if none selected (but not on document review page)
        // Always auto-select if no hotelId is in URL params (selectedHotelId is null)
        if (
          !effectiveSelectedHotelId &&
          data.length > 0 &&
          data[0].hotelId &&
          !isDocumentReviewPage
        ) {
          hasAutoSelectedRef.current = true;
          onHotelChange(data[0].hotelId);
        }
      } catch (error) {
        console.error("Error fetching hotels:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHotels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHotelFilterPage, isHotelOwnerUser, selectedHotelId]);

  // Reset auto-select ref when selectedHotelId is cleared (allows re-auto-selection)
  useEffect(() => {
    if (!selectedHotelId) {
      hasAutoSelectedRef.current = false;
    }
  }, [selectedHotelId]);

  const selectedHotel = hotels.find((h) => h.hotelId === effectiveSelectedHotelId);

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
        <Button variant="outline" className={`gap-2 ${className}`}>
          <Building2 className="w-4 h-4" />
          <span className="max-w-[200px] truncate">
            {selectedHotel?.hotelName || "Select Hotel"}
          </span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-64 max-h-[300px] overflow-y-auto"
      >
        {hotels.map((hotel) => (
          <DropdownMenuItem
            key={hotel.hotelId}
            onClick={() => {
              onHotelChange(hotel.hotelId);
              setIsOpen(false);
            }}
            className={cn(
              "flex items-center gap-2 cursor-pointer",
                  effectiveSelectedHotelId === hotel.hotelId &&
                    "bg-[#2f3d95]/10",
            )}
          >
            <Building2 className="w-4 h-4 text-[#2f3d95]" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">
                {hotel.hotelName}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {hotel.hotelCode || ""}
              </div>
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
