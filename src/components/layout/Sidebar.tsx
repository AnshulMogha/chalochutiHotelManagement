import { cn } from "@/lib/utils";
import { Link } from "react-router";
import logo from "@/assets/originallogo.webp";
import {
  canViewHelpdeskBookings,
  canViewHotelBdPipeline,
  canViewHotelBookingFinancialMis,
  canViewPaymentReport,
  canViewSalesManagerReports,
  isHelpdeskAgentRole,
  isHotelBdRole,
  isReviewerPortalRole,
  isSalesManagerRole,
  isZonalManagerSalesRole,
} from "@/constants/roles";
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
  Activity,
  Handshake,
  UserRoundCog,
  Bus,
  Package,
  Headphones,
  HeartPulse,
  Wallet,
  GitBranch,
  type LucideIcon,
} from "lucide-react";
import { ROUTES, hasAnyRole, ROLES } from "@/constants";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  badge?: string;
  children?: NavItem[];
  external?: boolean;
}

function getOnboardingPipelineNavItem(): NavItem {
  return {
    label: "Onboarding Pipeline",
    path: ROUTES.REPORTS.HOTEL_BD_PIPELINE,
    icon: GitBranch,
  };
}

function getSalesManagerDashboardNavItem(): NavItem {
  return {
    label: "Sales Manager Dashboard",
    path: ROUTES.REPORTS.SALES_MANAGER_DASHBOARD,
    icon: LayoutDashboard,
  };
}

function getSalesManagerAgentsNavItem(): NavItem {
  return {
    label: "Agent Portfolio",
    path: ROUTES.REPORTS.SALES_MANAGER_AGENTS,
    icon: UserRoundCog,
  };
}

function getHotelFinancialMisNavItem(): NavItem {
  return {
    label: "Hotel Financial MIS",
    path: ROUTES.REPORTS.HOTEL_BOOKING_FINANCIAL_MIS,
    icon: Wallet,
  };
}

function getReportsNavItem(
  user: User | null,
  options?: {
    includeOnboardingPipeline?: boolean;
    includeSalesManagerDashboard?: boolean;
    includeSalesManagerPortfolio?: boolean;
    includeHotelFinancialMis?: boolean;
  },
): NavItem | null {
  const includeOnboardingPipeline = !!options?.includeOnboardingPipeline;
  const includeSalesManagerDashboard = !!options?.includeSalesManagerDashboard;
  const includeSalesManagerPortfolio = !!options?.includeSalesManagerPortfolio;
  const includeHotelFinancialMis =
    options?.includeHotelFinancialMis ??
    canViewHotelBookingFinancialMis(user?.roles);
  const includeBookingReports = canViewModule(user, "BOOKINGS");
  const showPaymentReport = canViewPaymentReport(user?.roles);

  if (
    !includeOnboardingPipeline &&
    !includeBookingReports &&
    !includeSalesManagerDashboard &&
    !includeSalesManagerPortfolio &&
    !includeHotelFinancialMis &&
    !showPaymentReport
  ) {
    return null;
  }

  const children: NavItem[] = [
    ...(includeSalesManagerDashboard ? [getSalesManagerDashboardNavItem()] : []),
    ...(includeSalesManagerPortfolio ? [getSalesManagerAgentsNavItem()] : []),
    ...(includeHotelFinancialMis ? [getHotelFinancialMisNavItem()] : []),
    ...(includeOnboardingPipeline ? [getOnboardingPipelineNavItem()] : []),
    ...(includeBookingReports
      ? [
          {
            label: "Booking Summary",
            path: ROUTES.REPORTS.BOOKING_SUMMARY,
            icon: BookOpen,
          },
          {
            label: "Promotion Report",
            path: ROUTES.REPORTS.PROMOTIONS,
            icon: Percent,
          },
          {
            label: "Rate Disparity",
            path: ROUTES.REPORTS.RATE_HEALTH,
            icon: HeartPulse,
          },
          {
            label: "Inventory Allocation",
            path: ROUTES.REPORTS.INVENTORY_ALLOCATION,
            icon: Package,
          },
        ]
      : []),
    ...(showPaymentReport
      ? [
          {
            label: "Payment Report",
            path: ROUTES.REPORTS.NET_EARNINGS,
            icon: Wallet,
          },
        ]
      : []),
  ];

  return {
    label: "Reports",
    path: ROUTES.REPORTS.LIST,
    icon: BarChart3,
    children,
  };
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const getNavItems = (user: User | null): NavItem[] => {
  const userRoles = user?.roles;
  const items: NavItem[] = [];
  const isReviewer = isReviewerPortalRole(userRoles);
  const isZonalSales = isZonalManagerSalesRole(userRoles);
  const isSalesManager = isSalesManagerRole(userRoles);
  const isHelpdeskAgent = isHelpdeskAgentRole(userRoles);
  const isSuperAdmin = hasAnyRole(userRoles, [ROLES.SUPER_ADMIN]);
  const isHotelBd = isHotelBdRole(userRoles);
  const dashboardPath = isHelpdeskAgent
    ? ROUTES.HELPDESK.LOOKUP
    : isHotelBd
    ? ROUTES.REPORTS.HOTEL_BD_DASHBOARD
    : isSalesManager
      ? ROUTES.REPORTS.SALES_MANAGER_DASHBOARD
      : ROUTES.PROPERTIES.LIST;
  items.push({
    label: "Dashboard",
    path: dashboardPath,
    icon: LayoutDashboard,
  });
  if (isZonalSales) {
    const reportsNav = getReportsNavItem(user, {
      includeOnboardingPipeline: canViewHotelBdPipeline(userRoles),
      includeSalesManagerDashboard: canViewSalesManagerReports(userRoles),
      includeSalesManagerPortfolio: canViewSalesManagerReports(userRoles),
    });
    if (reportsNav) items.push(reportsNav);
    items.push({
      label: "Travel Partners",
      path: ROUTES.ADMIN.TRAVEL_PARTNERS,
      icon: Handshake,
    });
    items.push({
      label: "Transport Partner",
      path: ROUTES.ADMIN.TRANSPORT,
      icon: Bus,
      external: true,
    });
    return items;
  }
  if (isHelpdeskAgent && !isSuperAdmin) {
    items.push({
      label: "Order Lookup",
      path: ROUTES.HELPDESK.LOOKUP,
      icon: Headphones,
    });
    return items;
  }
  if (isSalesManager) {
    const reportsNav = getReportsNavItem(user, {
      includeOnboardingPipeline: false,
      includeSalesManagerPortfolio: canViewSalesManagerReports(userRoles),
    });
    if (reportsNav) items.push(reportsNav);
    items.push({
      label: "Agents",
      path: ROUTES.AGENTS.LIST,
      icon: UserRoundCog,
    });
    return items;
  }
  const isScopedPropertyViewer =
    !!userRoles?.includes("HOTEL_MANAGER") ||
    !!userRoles?.includes("FRONT_DESK_EXEC") ||
    !!userRoles?.includes("ACCOUNTANT");

  if (isReviewer) {
    const reportsNav = getReportsNavItem(user, {
      includeOnboardingPipeline: canViewHotelBdPipeline(userRoles),
    });
    if (reportsNav) items.push(reportsNav);
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
      // {
      //   label: "Document Review",
      //   path: ROUTES.ADMIN.DOCUMENT_REVIEW,
      //   icon: FileText,
      // },
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
        label: "Amenities",
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
      ...(() => {
        const reportsNav = getReportsNavItem(user, {
          includeOnboardingPipeline: canViewHotelBdPipeline(userRoles),
          includeSalesManagerDashboard: canViewSalesManagerReports(userRoles),
          includeSalesManagerPortfolio: canViewSalesManagerReports(userRoles),
        });
        return reportsNav ? [reportsNav] : [];
      })(),
      {
        label: "Rating and Review",
        path: ROUTES.RATINGS_REVIEWS.LIST,
        icon: Star,
      },
      ...(canViewModule(user, "ANALYTICS") || canViewModule(user, "BOOKINGS")
        ? [
            {
              label: "Analytics",
              path: ROUTES.ANALYTICS.DASHBOARD,
              icon: Activity,
            },
          ]
        : []),
    );
  } else if (isHotelBd) {
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
        label: "Amenities",
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
      ...(canViewModule(user, "OFFERS")
        ? [
            {
              label: "Promotions",
              path: ROUTES.PROMOTIONS.LIST,
              icon: Sparkles,
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
      ...(() => {
        const reportsNav = getReportsNavItem(user, {
          includeOnboardingPipeline: true,
          includeSalesManagerDashboard: canViewSalesManagerReports(userRoles),
          includeSalesManagerPortfolio: canViewSalesManagerReports(userRoles),
        });
        return reportsNav ? [reportsNav] : [];
      })(),
      ...(canViewModule(user, "ANALYTICS") || canViewModule(user, "BOOKINGS")
        ? [
            {
              label: "Analytics",
              path: ROUTES.ANALYTICS.DASHBOARD,
              icon: Activity,
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
      ...(canViewHelpdeskBookings(userRoles)
        ? [
            {
              label: "Order Lookup",
              path: ROUTES.HELPDESK.LOOKUP,
              icon: Headphones,
            },
          ]
        : []),
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
      // {
      //   label: "Document Review",
      //   path: ROUTES.ADMIN.DOCUMENT_REVIEW,
      //   icon: FileText,
      // },
      {
        label: "Travel Partners",
        path: ROUTES.ADMIN.TRAVEL_PARTNERS,
        icon: Handshake,
      },
      {
        label: "Transport Partner",
        path: ROUTES.ADMIN.TRANSPORT,
        icon: Bus,
        external: true,
      },
      {
        label: "Packages",
        path: ROUTES.ADMIN.PACKAGES,
        icon: Package,
        external: true,
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
  if (canViewHotelBookingFinancialMis(userRoles)) {
    const hasReportsNav = items.some((item) => item.path === ROUTES.REPORTS.LIST);
    if (!hasReportsNav) {
      const reportsNav = getReportsNavItem(user, {
        includeHotelFinancialMis: true,
      });
      if (reportsNav) items.push(reportsNav);
    }
  }

  if (
    canViewHotelBdPipeline(userRoles) &&
    !isHotelBd &&
    !isSuperAdmin &&
    !isReviewer &&
    !isZonalSales &&
    !isSalesManager
  ) {
    const reportsNav = getReportsNavItem(user, {
      includeOnboardingPipeline: true,
      includeSalesManagerDashboard: canViewSalesManagerReports(userRoles),
      includeSalesManagerPortfolio: canViewSalesManagerReports(userRoles),
    });
    if (reportsNav) items.push(reportsNav);
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
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen flex-col overflow-x-hidden transition-all duration-300 ease-in-out",
          "border-r border-white/10 bg-linear-to-b from-[#2f3d95] via-[#283585] to-[#1f2a72]",
          "shadow-[0_20px_50px_-12px_rgba(15,23,42,0.55)]",
          isOpen
            ? "w-64 translate-x-0"
            : "-translate-x-full w-64 lg:w-20 lg:translate-x-0",
        )}
      >
        <div className="relative flex h-full min-w-0 flex-col">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_42%)]"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -left-8 top-24 h-28 w-28 rounded-full bg-cyan-400/10 blur-2xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -right-6 bottom-20 h-32 w-32 rounded-full bg-fuchsia-400/10 blur-2xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute right-4 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-sky-400/8 blur-2xl"
            aria-hidden="true"
          />

          <div className="relative z-10 border-b border-white/10 px-3 py-3">
            <Link
              to={ROUTES.PROPERTIES.LIST}
              className="flex items-center justify-center"
            >
              <div className="rounded-lg bg-white px-2.5 py-2 shadow-sm">
                <img
                  src={logo}
                  alt="Chalochutti"
                  className={cn(
                    "object-contain",
                    isOpen ? "h-8 w-auto" : "h-7 w-7",
                  )}
                />
              </div>
            </Link>
          </div>

          <nav className="relative flex-1 overflow-y-auto overflow-x-hidden px-2 py-4 lg:px-3">
            <ul className="min-w-0 space-y-1.5">
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

          {isOpen && (
            <div className="relative border-t border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-sky-300 shadow-[0_0_8px_rgba(125,211,252,0.8)]" />
                <p className="text-[11px] text-white/45">
                  Hotel Management Portal
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
