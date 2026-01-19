import type { TabOption } from "../type";

/**
 * Navigation Tabs Component
 * 
 * UI/UX ENHANCEMENTS:
 * - Premium styling matching RatePlansGrid and RoomTypesGrid
 * - Improved hover and focus states
 * - Better visual hierarchy and spacing
 * - Enhanced active state with subtle shadow
 * - Smooth transitions for professional feel
 */

interface NavigationTabsProps {
  tabs: TabOption[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const NavigationTabs = ({ tabs, activeTab, onTabChange }: NavigationTabsProps) => {
  return (
    // UI ENHANCEMENT: Improved shadow and border styling
    <div className="flex w-full bg-white rounded-lg border border-gray-200 shadow-md overflow-hidden">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            // UI ENHANCEMENT: Better spacing, transitions, focus states, and hover effects
            className={`
              relative flex-1 min-w-[140px] py-4 px-6 text-sm font-bold uppercase tracking-wide
              transition-all duration-200 ease-out
              border-r border-gray-200 last:border-r-0 outline-none
              focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2A3170] focus-visible:z-10
              ${isActive 
                ? 'bg-blue-600 text-white shadow-lg scale-[1.01]' 
                : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-800'
              }
            `}
          >
            {tab.label}
            
            {/* Bottom Arrow Indicator - UI ENHANCEMENT: Larger, more prominent arrow */}
            {isActive && (
              <div 
                className="absolute -bottom-[8px] left-1/2 -translate-x-1/2 w-0 h-0 
                           border-l-[8px] border-l-transparent 
                           border-r-[8px] border-r-transparent 
                           border-t-[8px] border-t-blue-600  
                           z-10 drop-shadow-md" 
              />
            )}
          </button>
        );
      })}
    </div>
  );
};