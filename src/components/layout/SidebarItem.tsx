import { Link, useLocation, useSearchParams } from "react-router";
import { ChevronDown, ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { ROUTES } from "@/constants";

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  badge?: string;
  children?: NavItem[];
}

interface SidebarItemProps {
  item: NavItem;
  isOpen: boolean;
  onToggle: () => void;
}

export function SidebarItem({ item, isOpen, onToggle }: SidebarItemProps) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  
  // Helper function to check if a path is a property info route
  const isPropertyInfoRoute = (path: string) => {
    return Object.values(ROUTES.PROPERTY_INFO).includes(path as any);
  };
  
  // Helper function to build URL with preserved hotelId for property info routes
  const buildUrl = (path: string) => {
    const hotelId = searchParams.get("hotelId");
    if (isPropertyInfoRoute(path) && hotelId) {
      return `${path}?hotelId=${hotelId}`;
    }
    return path;
  };
  
  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const itemActive = isActive(item.path);
  const hasActiveChild = hasChildren && item.children?.some(child => isActive(child.path));

  const handleClick = (e: React.MouseEvent) => {
    if (hasChildren) {
      e.preventDefault();
      setIsExpanded(!isExpanded);
    } else {
      if (window.innerWidth < 1024) {
        onToggle();
      }
    }
  };

  return (
    <li className="min-w-0">
      <div className="relative group/item min-w-0">
        <Link
          to={hasChildren ? "#" : buildUrl(item.path)}
          onClick={handleClick}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-[#2f3d95]",
            "group relative min-w-0 w-full",
            isOpen ? "justify-start" : "justify-center",
            itemActive || hasActiveChild
              ? "bg-white/35 text-white font-semibold"
              : "text-white hover:bg-white/30"
          )}
          aria-current={itemActive ? "page" : undefined}
        >
          <item.icon
            className={cn(
              "text-xl shrink-0 transition-colors",
              itemActive || hasActiveChild ? "text-white" : "text-white/80"
            )}
          />
          <span
            className={cn(
              "transition-all duration-200 whitespace-nowrap flex-1 min-w-0 overflow-hidden",
              isOpen ? "block" : "hidden"
            )}
          >
            {item.label}
          </span>
          
          {hasChildren && isOpen && (
            <span className="ml-auto shrink-0">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-white/80" />
              ) : (
                <ChevronRight className="w-4 h-4 text-white/80" />
              )}
            </span>
          )}

          {(itemActive || hasActiveChild) && (
            <span
              className={cn(
                "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full",
                !isOpen && "lg:hidden"
              )}
            />
          )}
        </Link>

        {/* Submenu */}
        {hasChildren && isExpanded && isOpen && (
          <ul className="ml-4 mt-1 space-y-1 border-l border-white/20 pl-2 min-w-0">
            {item.children?.map((child) => {
              const childActive = isActive(child.path);
              const ChildIcon = child.icon;
              
              return (
                <li key={child.path} className="min-w-0">
                  <Link
                    to={buildUrl(child.path)}
                    onClick={() => {
                      if (window.innerWidth < 1024) {
                        onToggle();
                      }
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200 text-sm min-w-0 w-full",
                      childActive
                        ? "bg-white/25 text-white font-medium"
                        : "text-white/80 hover:bg-white/20 hover:text-white"
                    )}
                    aria-current={childActive ? "page" : undefined}
                  >
                    <ChildIcon className="w-4 h-4 shrink-0" />
                    <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{child.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {/* Tooltip for collapsed state */}
        {!isOpen && (
          <div className="hidden lg:block absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#1a2f4a] text-white text-xs font-semibold rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover/item:opacity-100 group-hover/item:pointer-events-auto transition-opacity duration-200 z-50 shadow-2xl border border-[#2d4a6b]">
            {item.label}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#1a2f4a]"></div>
          </div>
        )}
      </div>
    </li>
  );
}

