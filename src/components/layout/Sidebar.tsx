import { cn } from "@/lib/utils";
import { ROUTES, hasAnyRole, ROLES } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { SidebarItem } from "./SidebarItem";
import { 
  Hotel, 
  ClipboardCheck, 
  Users, 
  Info,
  IndianRupee,
  BookOpen,
  Star,
  BarChart3,
  MoreHorizontal,
  BedDouble,
  Package,
  Tag,
  Image as ImageIcon,
  UtensilsCrossed,
  FileText,
  CreditCard,
  type LucideIcon 
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}
export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  badge?: string;
  children?: NavItem[];
}

const getNavItems = (userRoles: string[] | undefined): NavItem[] => {
  const items: NavItem[] = [
    {
      label: "My Properties",
      path: ROUTES.PROPERTIES.LIST,
      icon: Hotel,
    },
  ];

  // Items visible to SUPER_ADMIN and HOTEL_OWNER/HOTEL_MANAGER
  const isAdminOrOwner = hasAnyRole(userRoles, [
    ROLES.SUPER_ADMIN,
    ROLES.HOTEL_OWNER,
    ROLES.HOTEL_MANAGER,
  ]);

  if (isAdminOrOwner) {
    items.push(
      {
        label: "Property Information",
        path: ROUTES.PROPERTY_INFO.LIST,
        icon: Info,
        children: [
          {
            label: "Basic Information",
            path: ROUTES.PROPERTY_INFO.BASIC_INFO,
            icon: Info,
          },
          {
            label: "Rooms & Rate Plans",
            path: ROUTES.PROPERTY_INFO.ROOMS_RATEPLANS,
            icon: BedDouble,
          },
          {
            label: "Photos and Videos",
            path: ROUTES.PROPERTY_INFO.PHOTOS_VIDEOS,
            icon: ImageIcon,
          },
          {
            label: "Amenities and Restaurants",
            path: ROUTES.PROPERTY_INFO.AMENITIES_RESTAURANTS,
            icon: UtensilsCrossed,
          },
          {
            label: "Policy and Rules",
            path: ROUTES.PROPERTY_INFO.POLICY_RULES,
            icon: FileText,
          },
          {
            label: "Finance",
            path: ROUTES.PROPERTY_INFO.FINANCE,
            icon: CreditCard,
          },
        ],
      },
      {
        label: "Rate and Inventory",
        path: ROUTES.RATE_INVENTORY.LIST,
        icon: IndianRupee,
        children: [
          {
            label: "Room Inventory",
            path: ROUTES.ROOM_INVENTORY.LIST,
            icon: Package,
          },
          {
            label: "Rate Plans",
            path: ROUTES.RATE_INVENTORY.LIST,
            icon: Tag,
          },
        ],
      },
      {
        label: "Bookings",
        path: ROUTES.BOOKINGS.LIST,
        icon: BookOpen,
      },
      {
        label: "Rating and Review",
        path: ROUTES.RATINGS_REVIEWS.LIST,
        icon: Star,
      },
      {
        label: "Analytics",
        path: ROUTES.ANALYTICS.DASHBOARD,
        icon: BarChart3,
      }
    );
  }

  // Items visible only to HOTEL_OWNER
  const isHotelOwner = hasAnyRole(userRoles, [ROLES.HOTEL_OWNER]);
  if (isHotelOwner) {
    items.push({
      label: "My Team",
      path: ROUTES.TEAM.LIST,
      icon: Users,
    });
  }

  // Items visible only to SUPER_ADMIN
  const isSuperAdmin = hasAnyRole(userRoles, [ROLES.SUPER_ADMIN]);
  if (isSuperAdmin) {
    items.push(
      {
        label: "Hotel Review",
        path: ROUTES.ADMIN.HOTEL_REVIEW,
        icon: ClipboardCheck,
      },
      {
        label: "Users",
        path: ROUTES.ADMIN.USERS,
        icon: Users,
      }
    );
  }

  // "More" item at the end - visible to SUPER_ADMIN, HOTEL_OWNER, HOTEL_MANAGER
  if (isAdminOrOwner) {
    items.push({
      label: "More",
      path: ROUTES.MORE.LIST,
      icon: MoreHorizontal,
    });
  }

  return items;
};

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const { user } = useAuth();
  const navItems = getNavItems(user?.roles);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-16 bottom-4 h-[calc(100vh-4rem-1rem)] z-50 bg-[#2f3d95] border-r border-[#253075] transition-all duration-300 ease-in-out shadow-xl",
          "lg:top-20 lg:h-[calc(100vh-5rem-1rem)] lg:z-40 lg:left-4 lg:rounded-xl",
          "overflow-x-hidden overflow-y-auto",
          isOpen
            ? "translate-x-0 w-64 rounded-r-xl"
            : "-translate-x-full lg:translate-x-0 lg:w-20"
        )}
      >
        <div className="flex flex-col h-full min-w-0">
          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2 bg-transparent relative lg:px-3">
            <ul className="space-y-1 min-w-0">
              {navItems.map((item) => (
                <SidebarItem
                  key={item.path}
                  item={item}
                  isOpen={isOpen}
                  onToggle={onToggle}
                />
              ))}
            </ul>
          </nav>
        </div>
      </aside>
    </>
  );
}
