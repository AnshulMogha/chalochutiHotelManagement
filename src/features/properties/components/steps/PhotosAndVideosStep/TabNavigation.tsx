import { Folder, Building2, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActiveTab } from "./types";

interface TabNavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => onTabChange("inventory")}
          className={cn(
            "flex-1 px-6 py-4 text-center font-semibold transition-colors relative",
            activeTab === "inventory"
              ? "text-blue-600 bg-blue-50"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          )}
        >
          <div className="flex items-center justify-center gap-2">
            <Folder className="w-5 h-5" />
            <span>Media Inventory</span>
          </div>
          {activeTab === "inventory" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
          )}
        </button>
        <button
          type="button"
          onClick={() => onTabChange("hotel")}
          className={cn(
            "flex-1 px-6 py-4 text-center font-semibold transition-colors relative",
            activeTab === "hotel"
              ? "text-blue-600 bg-blue-50"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          )}
        >
          <div className="flex items-center justify-center gap-2">
            <Building2 className="w-5 h-5" />
            <span>Hotel Media</span>
          </div>
          {activeTab === "hotel" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
          )}
        </button>
        <button
          type="button"
          onClick={() => onTabChange("rooms")}
          className={cn(
            "flex-1 px-6 py-4 text-center font-semibold transition-colors relative",
            activeTab === "rooms"
              ? "text-blue-600 bg-blue-50"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          )}
        >
          <div className="flex items-center justify-center gap-2">
            <ImageIcon className="w-5 h-5" />
            <span>Room Media</span>
          </div>
          {activeTab === "rooms" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
          )}
        </button>
      </div>
    </div>
  );
}

