import { cn } from "@/lib/utils";
import { ROUTES, hasAnyRole, ROLES } from "@/constants";
import { isHotelBdRole, isReviewerPortalRole } from "@/constants/roles";
import { useAuth } from "@/hooks/useAuth";
import { SidebarItem } from "./SidebarItem";
import { canViewModule } from "@/lib/permissions";
import type { User } from "@/types";
import {
  Hotel,
  ClipboardCheck,
  Users,
  Info,
  IndianRupee,
  BookOpen,
  Star,
  BarChart3,
  LayoutDashboard,
  MoreHorizontal,
  BedDouble,
  Image as ImageIcon,
  UtensilsCrossed,
  FileText,
  CreditCard,
  Sparkles,
  Percent,
  Handshake,
  type LucideIcon,
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

const getNavItems = (user: User | null): NavItem[] => {
  const userRoles = user?.roles;
  const items: NavItem[] = [];
  const isReviewer = isReviewerPortalRole(userRoles);
  const isSuperAdmin = hasAnyRole(userRoles, [ROLES.SUPER_ADMIN]);
  const dashboardPath = ROUTES.PROPERTIES.LIST;
  items.push({
    label: "Dashboard",
    path: dashboardPath,
    icon: LayoutDashboard,
  });
  const isScopedPropertyViewer =
    !!userRoles?.includes("HOTEL_MANAGER") ||
    !!userRoles?.includes("FRONT_DESK_EXEC") ||
    !!userRoles?.includes("ACCOUNTANT");

  if (isReviewer) {
    items.push({
      label: "Hotel Review",
      path: ROUTES.ADMIN.HOTEL_REVIEW,
      icon: ClipboardCheck,
    });
    if (hasAnyRole(userRoles, [ROLES.HOTEL_OWNER, ROLES.HOTEL_MANAGER])) {
      items.push({
        label: "My Properties",
        path: ROUTES.PROPERTIES.MY_PROPERTY,
        icon: Hotel,
      });
    }
    return items;
  }

  if (userRoles?.includes("ONBOARDING_REVIEWER")) {
    items.push(
      {
        label: "Hotel Review",
        path: ROUTES.ADMIN.HOTEL_REVIEW,
        icon: ClipboardCheck,
      },
      {
        label: "Document Review",
        path: ROUTES.ADMIN.DOCUMENT_REVIEW,
        icon: FileText,
      },
    );
    return items;
  }

  // Regular items for other roles
  if (!isSuperAdmin) {
    items.push({
      label: isScopedPropertyViewer ? "Properties" : "My Properties",
      path: ROUTES.PROPERTIES.MY_PROPERTY,
      icon: Hotel,
    });
  }

  // Items visible to SUPER_ADMIN and HOTEL_OWNER/HOTEL_MANAGER
  const isAdminOrOwner = hasAnyRole(userRoles, [
    ROLES.SUPER_ADMIN,
    ROLES.HOTEL_OWNER,
    ROLES.HOTEL_MANAGER,
  ]);

  if (isAdminOrOwner) {
    const propertyChildren: NavItem[] = [
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
      {
        label: "Document",
        path: ROUTES.PROPERTY_INFO.DOCUMENT,
        icon: FileText,
      },
    ].filter((item) => {
      const moduleByPath: Record<string, Parameters<typeof canViewModule>[1]> =
        {
          [ROUTES.PROPERTY_INFO.BASIC_INFO]: "PROPERTY_BASIC_INFO",
          [ROUTES.PROPERTY_INFO.ROOMS_RATEPLANS]: "PROPERTY_ROOMS_RATEPLANS",
          [ROUTES.PROPERTY_INFO.PHOTOS_VIDEOS]: "PROPERTY_PHOTOS_VIDEOS",
          [ROUTES.PROPERTY_INFO.AMENITIES_RESTAURANTS]:
            "PROPERTY_AMENITIES_RESTAURANTS",
          [ROUTES.PROPERTY_INFO.POLICY_RULES]: "PROPERTY_POLICY_RULES",
          [ROUTES.PROPERTY_INFO.FINANCE]: "PROPERTY_FINANCE",
          [ROUTES.PROPERTY_INFO.DOCUMENT]: "PROPERTY_DOCUMENT",
        };
      return canViewModule(user, moduleByPath[item.path]);
    });

    items.push(
      ...(propertyChildren.length
        ? [
            {
              label: "Property Information",
              path: ROUTES.PROPERTY_INFO.LIST,
              icon: Info,
              children: propertyChildren,
            },
          ]
        : []),
      ...(canViewModule(user, "RATES_INVENTORY")
        ? [
            {
              label: "Rate and Inventory",
              path: ROUTES.ROOM_INVENTORY.LIST,
              icon: IndianRupee,
            },
          ]
        : []),
      ...(canViewModule(user, "BOOKINGS")
        ? [
            {
              label: "Bookings",
              path: ROUTES.BOOKINGS.LIST,
              icon: BookOpen,
            },
          ]
        : []),
      {
        label: "Rating and Review",
        path: ROUTES.RATINGS_REVIEWS.LIST,
        icon: Star,
      },
      ...(canViewModule(user, "ANALYTICS")
        ? [
            {
              label: "Analytics",
              path: ROUTES.ANALYTICS.DASHBOARD,
              icon: BarChart3,
            },
          ]
        : []),
    );
  } else if (isHotelBdRole(userRoles)) {
    const propertyChildrenBd: NavItem[] = [
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
        label: "Document",
        path: ROUTES.PROPERTY_INFO.DOCUMENT,
        icon: FileText,
      },
    ].filter((item) => {
      const moduleByPath: Record<string, Parameters<typeof canViewModule>[1]> =
        {
          [ROUTES.PROPERTY_INFO.BASIC_INFO]: "PROPERTY_BASIC_INFO",
          [ROUTES.PROPERTY_INFO.ROOMS_RATEPLANS]: "PROPERTY_ROOMS_RATEPLANS",
          [ROUTES.PROPERTY_INFO.PHOTOS_VIDEOS]: "PROPERTY_PHOTOS_VIDEOS",
          [ROUTES.PROPERTY_INFO.AMENITIES_RESTAURANTS]:
            "PROPERTY_AMENITIES_RESTAURANTS",
          [ROUTES.PROPERTY_INFO.POLICY_RULES]: "PROPERTY_POLICY_RULES",
          [ROUTES.PROPERTY_INFO.DOCUMENT]: "PROPERTY_DOCUMENT",
        };
      return canViewModule(user, moduleByPath[item.path]);
    });

    items.push(
      ...(propertyChildrenBd.length
        ? [
            {
              label: "Property Information",
              path: ROUTES.PROPERTY_INFO.LIST,
              icon: Info,
              children: propertyChildrenBd,
            },
          ]
        : []),
      ...(canViewModule(user, "RATES_INVENTORY")
        ? [
            {
              label: "Rate and Inventory",
              path: ROUTES.ROOM_INVENTORY.LIST,
              icon: IndianRupee,
            },
          ]
        : []),
    );
  }

  // Items visible to HOTEL_OWNER / HOTEL_MANAGER based on permissions
  const isHotelOwner = hasAnyRole(userRoles, [ROLES.HOTEL_OWNER]);
  const isHotelManager = hasAnyRole(userRoles, [ROLES.HOTEL_MANAGER]);
  if (isHotelOwner) {
    items.push(
      ...(canViewModule(user, "OFFERS")
        ? [
            {
              label: "Promotions",
              path: ROUTES.PROMOTIONS.LIST,
              icon: Sparkles,
            },
          ]
        : []),
      ...(canViewModule(user, "MY_TEAM")
        ? [
            {
              label: "My Team",
              path: ROUTES.TEAM.LIST,
              icon: Users,
            },
          ]
        : []),
    );
  }

  if (isHotelManager && canViewModule(user, "MY_TEAM")) {
    items.push({
      label: "My Team",
      path: ROUTES.TEAM.LIST,
      icon: Users,
    });
  }

  // Items visible only to SUPER_ADMIN
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
      },
      {
        label: "Commission and Tax",
        path: ROUTES.ADMIN.COMMISSION_AND_TAX,
        icon: Percent,
      },
      {
        label: "Document Review",
        path: ROUTES.ADMIN.DOCUMENT_REVIEW,
        icon: FileText,
      },
      {
        label: "Travel Partners",
        path: ROUTES.ADMIN.TRAVEL_PARTNERS,
        icon: Handshake,
      },
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

  // Staff roles (e.g. Front Desk / Accountant) still need permission-driven booking access.
  const isStaffRole = !!userRoles?.some((role) =>
    ["FRONT_DESK_EXEC", "ACCOUNTANT"].includes(role),
  );
  if (isStaffRole && canViewModule(user, "BOOKINGS")) {
    items.push({
      label: "Bookings",
      path: ROUTES.BOOKINGS.LIST,
      icon: BookOpen,
    });
  }
  const isAccountant = !!userRoles?.includes("ACCOUNTANT");
  if (isAccountant && canViewModule(user, "PROPERTY_FINANCE")) {
    items.push({
      label: "Finance",
      path: ROUTES.PROPERTY_INFO.FINANCE,
      icon: CreditCard,
    });
  }

  return items;
};

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const { user } = useAuth();
  const navItems = getNavItems(user);

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
          // Above main content (rates/inventory grids use low z-index); below topbar (z-50)
          "lg:top-20 lg:h-[calc(100vh-5rem-1rem)] lg:z-45 lg:left-4 lg:rounded-xl",
          "overflow-x-hidden overflow-y-auto",
          isOpen
            ? "translate-x-0 w-64 rounded-r-xl"
            : "-translate-x-full lg:translate-x-0 lg:w-20",
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
