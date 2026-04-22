type InventorySection = "room-types" | "rate-plans";

const INVENTORY_SECTIONS: {
  key: InventorySection;
  label: string;
}[] = [
  { key: "room-types", label: "Room Types" },
  { key: "rate-plans", label: "Rate Plans" },
];

interface InventorySidebarProps {
  activeSection: InventorySection;
  onSectionChange: (section: InventorySection) => void;
}
 
export const InventorySidebar = ({
  activeSection,
  onSectionChange,
}: InventorySidebarProps) => {
  return (
    <aside className="w-64 h-screen bg-white border-r border-gray-200 shadow-sm flex flex-col">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
          Inventory
        </h2>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1">

        {INVENTORY_SECTIONS.map((section) => {
          const isActive = activeSection === section.key;

          return (
            <button
              key={section.key}
              onClick={() => onSectionChange(section.key)}
              className={`
                group relative w-full flex items-center px-6 py-3 text-sm font-medium
                transition-all duration-200
                ${
                  isActive
                    ? "bg-[#2A3170]/10 text-[#2A3170]"
                    : "text-gray-600 hover:bg-gray-50"
                }
              `}
            >
              {/* Active Indicator */}
              <span
                className={`
                  absolute left-0 top-0 h-full w-1 rounded-r-md
                  transition-opacity
                  ${
                    isActive
                      ? "bg-[#FF6610] opacity-100"
                      : "opacity-0 group-hover:opacity-40 bg-gray-300"
                  }
                `}
              />

              {section.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
