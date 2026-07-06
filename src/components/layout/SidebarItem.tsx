import { Link, useLocation, useSearchParams } from "react-router";
import { ChevronDown, ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { ROUTES } from "@/constants";
import { getStoredSelectedHotelId } from "@/lib/selectedHotelStorage";
import { getNavIconTheme } from "./sidebarNavTheme";

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  badge?: string;
  children?: NavItem[];
  external?: boolean;
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
  const theme = getNavIconTheme(item.path);

  const isPropertyInfoRoute = (path: string) => {
    return Object.values(ROUTES.PROPERTY_INFO).includes(path as any);
  };

  const isInventoryRoute = (path: string) => {
    return (
      path === ROUTES.ROOM_INVENTORY.LIST ||
      path === ROUTES.RATE_INVENTORY.LIST
    );
  };

  const isHotelScopedNavPath = (path: string) => {
    return (
      isPropertyInfoRoute(path) ||
      isInventoryRoute(path) ||
      path === ROUTES.BOOKINGS.LIST ||
      path === ROUTES.TEAM.LIST ||
      path === ROUTES.PROMOTIONS.LIST ||
      path === ROUTES.ADMIN.DOCUMENT_REVIEW
    );
  };

  const buildUrl = (path: string) => {
    const hotelId = searchParams.get("hotelId") ?? getStoredSelectedHotelId();
    if (hotelId && isHotelScopedNavPath(path)) {
      return `${path}?hotelId=${encodeURIComponent(hotelId)}`;
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
  const hasActiveChild =
    hasChildren && item.children?.some((child) => isActive(child.path));
  const isHighlighted = itemActive || hasActiveChild;

  useEffect(() => {
    if (hasActiveChild) {
      setIsExpanded(true);
    }
  }, [hasActiveChild, location.pathname]);

  const handleClick = (e: React.MouseEvent) => {
    if (hasChildren) {
      e.preventDefault();
      setIsExpanded(!isExpanded);
    } else if (window.innerWidth < 1024) {
      onToggle();
    }
  };

  const linkClassName = cn(
    "group/link relative flex min-w-0 w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#283585]",
    isOpen ? "justify-start" : "justify-center",
    isHighlighted
      ? cn(theme.row, "text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]")
      : cn("text-white/92 hover:text-white", theme.rowHover),
  );

  const linkContent = (
    <>
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200",
          isHighlighted ? theme.chipActive : theme.chip,
          !isHighlighted && "group-hover/link:scale-105",
        )}
      >
        <item.icon
          className={cn(
            "h-[18px] w-[18px] transition-colors duration-200",
            isHighlighted ? theme.iconActive : theme.icon,
          )}
          strokeWidth={2.25}
        />
      </span>

      <span
        className={cn(
          "min-w-0 flex-1 overflow-hidden whitespace-nowrap text-sm font-medium transition-all duration-200",
          isOpen ? "block" : "hidden",
        )}
      >
        {item.label}
      </span>

      {item.badge && isOpen && (
        <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/90">
          {item.badge}
        </span>
      )}

      {hasChildren && isOpen && (
        <span className="ml-auto shrink-0 rounded-md bg-white/8 p-0.5">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-white/75" />
          ) : (
            <ChevronRight className="h-4 w-4 text-white/75" />
          )}
        </span>
      )}

      {isHighlighted && (
        <span
          className={cn(
            "absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full shadow-[0_0_10px_currentColor]",
            theme.accent,
            !isOpen && "lg:hidden",
          )}
        />
      )}
    </>
  );

  return (
    <li className="min-w-0">
      <div className="group/item relative min-w-0">
        {item.external && !hasChildren ? (
          <a
            href={item.path}
            onClick={() => {
              if (window.innerWidth < 1024) {
                onToggle();
              }
            }}
            className={linkClassName}
          >
            {linkContent}
          </a>
        ) : (
          <Link
            to={hasChildren ? "#" : buildUrl(item.path)}
            onClick={handleClick}
            className={linkClassName}
            aria-current={itemActive ? "page" : undefined}
            aria-expanded={hasChildren ? isExpanded : undefined}
          >
            {linkContent}
          </Link>
        )}

        {hasChildren && isExpanded && isOpen && (
          <ul className="mt-1.5 min-w-0 space-y-1 rounded-xl border border-white/10 bg-black/12 py-1.5 pl-2 pr-1.5 backdrop-blur-sm">
            {item.children?.map((child) => {
              const childActive = isActive(child.path);
              const ChildIcon = child.icon;
              const childTheme = getNavIconTheme(child.path);

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
                      "flex min-w-0 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all duration-200",
                      childActive
                        ? cn(
                            childTheme.row,
                            "font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]",
                          )
                        : cn("text-white/88 hover:text-white", childTheme.rowHover),
                    )}
                    aria-current={childActive ? "page" : undefined}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
                        childActive ? childTheme.chipActive : childTheme.chip,
                      )}
                    >
                      <ChildIcon
                        className={cn(
                          "h-3.5 w-3.5",
                          childActive ? childTheme.iconActive : childTheme.icon,
                        )}
                        strokeWidth={2.25}
                      />
                    </span>
                    <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                      {child.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {!isOpen && (
          <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-lg border border-white/10 bg-[#1f2a72] px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-2xl transition-all duration-200 group-hover/item:pointer-events-auto group-hover/item:opacity-100 lg:flex">
            <span className={cn("h-2 w-2 shrink-0 rounded-full", theme.accent)} />
            {item.label}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#1f2a72]" />
          </div>
        )}
      </div>
    </li>
  );
}
