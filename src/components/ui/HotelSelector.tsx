import { useState, useEffect, useRef } from "react";
import { Building2, ChevronDown, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { Button } from "./Button";
import {
  adminService,
  type HotelLookupItem,
} from "@/features/admin/services/adminService";
import { useLocation } from "react-router";
import { ROUTES } from "@/constants";
import { getStoredSelectedHotelId } from "@/lib/selectedHotelStorage";

interface HotelSelectorProps {
  selectedHotelId: string | null;
  onHotelChange: (hotelId: string) => void;
  className?: string;
  /** Auto-select the first hotel when nothing is selected. Defaults to true. */
  autoSelectFirst?: boolean;
}

export function HotelSelector({
  selectedHotelId,
  onHotelChange,
  className = "",
  autoSelectFirst = true,
}: HotelSelectorProps) {
  const effectiveSelectedHotelId =
    selectedHotelId ?? getStoredSelectedHotelId();
  const [hotels, setHotels] = useState<HotelLookupItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const location = useLocation();
  const isDocumentReviewPage =
    location.pathname === ROUTES.ADMIN.DOCUMENT_REVIEW;

  const hasAutoSelectedRef = useRef(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    const fetchHotels = async () => {
      try {
        setIsLoading(true);
        const data = await adminService.getSuperAdminHotelLookup(debouncedSearch);
        setHotels(data);

        if (
          autoSelectFirst &&
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
        setHotels([]);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchHotels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHotelId, debouncedSearch]);

  useEffect(() => {
    if (!selectedHotelId) {
      hasAutoSelectedRef.current = false;
    }
  }, [selectedHotelId]);

  const selectedHotel = hotels.find(
    (h) => h.hotelId === effectiveSelectedHotelId,
  );

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={`gap-2 ${className}`}>
          <Building2 className="w-4 h-4" />
          <span className="max-w-[200px] truncate">
            {selectedHotel
              ? `${selectedHotel.hotelName} (${selectedHotel.hotelId})`
              : "Select Hotel"}
          </span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-64 max-h-[300px] overflow-y-auto"
      >
        <div className="sticky top-0 z-10 border-b border-gray-100 bg-white p-2">
          <div className="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1.5">
            <Search className="h-3.5 w-3.5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Search by name or city..."
              className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
            />
          </div>
        </div>
        {isLoading ? (
          <div className="px-3 py-2 text-sm text-gray-500">
            Loading hotels...
          </div>
        ) : hotels.length === 0 ? (
          <div className="px-3 py-2 text-sm text-gray-500">
            {debouncedSearch
              ? "No hotels found. Try another search."
              : "No hotels available"}
          </div>
        ) : (
          hotels.map((hotel) => (
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
                <div className="truncate text-sm font-medium">
                  {hotel.hotelName} ({hotel.hotelId})
                </div>
                {hotel.city ? (
                  <div className="truncate text-xs text-gray-500">
                    {hotel.city}
                  </div>
                ) : null}
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function cn(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
