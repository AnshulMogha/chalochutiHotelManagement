import { useNavigate } from "react-router";
import { Button } from "@/components/ui";
import {  Edit } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants";
import type { HotelList, HotelStatus } from "../types";

interface PropertyRowProps {
  hotel: HotelList;
}

const statusConfig: Record<HotelStatus, { label: string; className: string }> =
  {
    LIVE: {
      label: "Active",
      className: "bg-green-100 text-green-700 border-green-200",
    },
    UNDER_REVIEW: {
      label: "In Review",
      className: "bg-yellow-100 text-yellow-700 border-yellow-200",
    },
    DRAFT: {
      label: "Draft",
      className: "bg-slate-100 text-slate-700 border-slate-200",
    },
    REJECTED: {
      label: "Rejected",
      className: "bg-red-100 text-red-700 border-red-200",
    },
    SUSPENDED: {
      label: "Suspended",
      className: "bg-gray-100 text-gray-700 border-gray-200",
    },
  };

export function PropertyRow({ hotel }: PropertyRowProps) {
  const navigate = useNavigate();
  const status = hotel.status || "LIVE";
  const statusInfo = statusConfig[status];

  return (
    <div className="group bg-slate-50 border border-slate-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between gap-4">
        {/* Left Section - Property Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-slate-900 truncate">
                  {hotel.hotelName}
                </h3>
                {status !== "LIVE" && (
                  <span
                    className={cn(
                      "px-2.5 py-0.5 text-xs font-medium rounded-full border",
                      statusInfo.className
                    )}
                  >
                    {statusInfo.label}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-2 shrink-0">
          
          {!hotel.locked && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(ROUTES.PROPERTIES.EDIT(hotel.hotelId))}
              className="flex items-center gap-1.5"
            >
              <Edit className="w-4 h-4" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
