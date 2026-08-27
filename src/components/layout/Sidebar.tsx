import { cn } from "@/lib/utils";
import { Link } from "react-router";
import logo from "@/assets/originallogo.webp";
import {
  canViewHelpdeskBookings,
  canViewHelpdeskTickets,
  canViewHotelBdPipeline,
  canViewHotelBookingFinancialMis,
  canViewHotelPayoutMis,
  canViewPaymentReport,
  canViewSalesManagerReports,
  canViewSupplierSettlement,
  canModerateReviews,
  canManageHotelReviews,
  isAuditorRole,
  isFinanceManagerRole,
  isHelpdeskAgentRole,
  isHotelBdRole,
  isReviewerPortalRole,
  isSalesManagerRole,
  isZonalManagerSalesRole,
} from "@/constants/roles";
import { useAuth } from "@/hooks/useAuth";
import { SidebarItem } from "./SidebarItem";
import { canViewModule, isHotelManagerStaffRole } from "@/lib/permissions";
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
  Ticket,
  Landmark,
  CheckCircle2,
  ClipboardList,
  RotateCcw,
  ListChecks,
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
  /** Extra pathnames that should keep this item highlighted (e.g. Payments → Payouts). */
  activePaths?: string[];
}

function getHelpdeskNavItems(userRoles: string[] | undefined): NavItem[] {
  const items: NavItem[] = [];
  if (canViewHelpdeskTickets(userRoles)) {
    items.push({
      label: "Tickets",
      path: ROUTES.HELPDESK.TICKETS,
      icon: Ticket,
    });
  }
  if (canViewHelpdeskBookings(userRoles)) {
    items.push({
      label: "Order Lookup",
      path: ROUTES.HELPDESK.LOOKUP,
      icon: Headphones,
    });
  }
  return items;
}

function getSettlementNavItem(): NavItem {
  return {
    label: "Settlements",
    path: ROUTES.SETTLEMENT.WORKBENCH,
    icon: Landmark,
    children: [
      {
        label: "Workbench",
        path: ROUTES.SETTLEMENT.WORKBENCH,
        icon: Landmark,
      },
      {
        label: "Pending",
        path: ROUTES.SETTLEMENT.PENDING,
        icon: ClipboardList,
      },
      {
        label: "Approved",
        path: ROUTES.SETTLEMENT.APPROVED,
        icon: CheckCircle2,
      },
      {
        label: "Rejected",
        path: ROUTES.SETTLEMENT.REJECTED,
        icon: RotateCcw,
      },
      {
        label: "Settlement MIS",
        path: ROUTES.SETTLEMENT.MIS,
        icon: BarChart3,
      },
    ],
  };
}

/** Auditor sidebar: Tickets, Order Lookup, and a single Reports group. */
function getAuditorNavItems(user: User | null): NavItem[] {
  const userRoles = user?.roles;
  const items = getHelpdeskNavItems(userRoles);
  const reportsNav = getReportsNavItem(user, {
    includeOnboardingPipeline: false,
    includeHotelFinancialMis: canViewHotelBookingFinancialMis(userRoles),
  });
  if (reportsNav) items.push(reportsNav);
  return items;
}

function getReviewModerationNavItem(): NavItem {
  return {
    label: "Ratings & Reviews",
    path: ROUTES.RATINGS_REVIEWS.LIST,
    icon: Star,
    children: [
      {
        label: "Review Moderation",
        path: ROUTES.RATINGS_REVIEWS.LIST,
        icon: Star,
      },
      {
        label: "Review MIS",
        path: ROUTES.RATINGS_REVIEWS.MIS,
        icon: BarChart3,
      },
    ],
  };
}

/** Finance Manager sidebar: settlements + hotel MIS only. */
function getFinanceManagerNavItems(userRoles: string[] | undefined): NavItem[] {
  const items: NavItem[] = [];
  if (canViewSupplierSettlement(userRoles)) {
    items.push(getSettlementNavItem());
  }
  items.push(
    {
      label: "Hotel MIS",
      path: ROUTES.REPORTS.HOTEL_BOOKING_FINANCIAL_MIS,
      icon: Wallet,
    },
    {
      label: "Finance",
      path: ROUTES.PROPERTY_INFO.FINANCE,
      icon: CreditCard,
    },
  );
  return items;
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
    /** When false, skip booking-related report children. */
    includeBookingReports?: boolean;
    /** When true, only show Payments under Reports. */
    paymentsOnly?: boolean;
  },
): NavItem | null {
  const paymentsOnly = !!options?.paymentsOnly;
  const includeOnboardingPipeline =
    !paymentsOnly && !!options?.includeOnboardingPipeline;
  const includeSalesManagerDashboard =
    !paymentsOnly && !!options?.includeSalesManagerDashboard;
  const includeSalesManagerPortfolio =
    !paymentsOnly && !!options?.includeSalesManagerPortfolio;
  const includeHotelFinancialMis = paymentsOnly
    ? false
    : (options?.includeHotelFinancialMis ??
      canViewHotelBookingFinancialMis(user?.roles));
  const includeBookingReports = paymentsOnly
    ? false
    : (options?.includeBookingReports ?? canViewModule(user, "BOOKINGS"));
  const isManagerStaff = isHotelManagerStaffRole(user?.roles);
  const showBookingSummary = paymentsOnly
    ? false
    : isManagerStaff
      ? canViewModule(user, "REPORT_BOOKING_SUMMARY")
      : includeBookingReports;
  const showPromotionReport = paymentsOnly
    ? false
    : isManagerStaff
      ? canViewModule(user, "REPORT_PROMOTIONS")
      : includeBookingReports;
  const showRateDisparity = paymentsOnly
    ? false
    : isManagerStaff
      ? canViewModule(user, "REPORT_RATE_HEALTH")
      : includeBookingReports;
  const showInventoryAllocation = paymentsOnly
    ? false
    : isManagerStaff
      ? canViewModule(user, "REPORT_INVENTORY_ALLOCATION")
      : includeBookingReports;
  const showPaymentReport = paymentsOnly
    ? canViewModule(user, "PAYMENTS")
    : isManagerStaff
      ? canViewModule(user, "PAYMENTS")
      : canViewPaymentReport(user?.roles);
  const showHotelPayouts = paymentsOnly
    ? false
    : isManagerStaff
      ? canViewModule(user, "PAYMENTS")
      : canViewHotelPayoutMis(user?.roles);
  const showHotelPayments = showPaymentReport || showHotelPayouts;

  if (
    !includeOnboardingPipeline &&
    !showBookingSummary &&
    !showPromotionReport &&
    !showRateDisparity &&
    !showInventoryAllocation &&
    !includeSalesManagerDashboard &&
    !includeSalesManagerPortfolio &&
    !includeHotelFinancialMis &&
    !showHotelPayments
  ) {
    return null;
  }

  const children: NavItem[] = [
    ...(includeSalesManagerDashboard ? [getSalesManagerDashboardNavItem()] : []),
    ...(includeSalesManagerPortfolio ? [getSalesManagerAgentsNavItem()] : []),
    ...(includeHotelFinancialMis ? [getHotelFinancialMisNavItem()] : []),
    ...(includeOnboardingPipeline ? [getOnboardingPipelineNavItem()] : []),
    ...(showBookingSummary
      ? [
          {
            label: "Booking Summary",
            path: ROUTES.REPORTS.BOOKING_SUMMARY,
            icon: BookOpen,
          },
        ]
      : []),
    ...(showPromotionReport
      ? [
          {
            label: "Promotion Report",
            path: ROUTES.REPORTS.PROMOTIONS,
            icon: Percent,
          },
        ]
      : []),
    ...(showRateDisparity
      ? [
          {
            label: "Rate Disparity",
            path: ROUTES.REPORTS.RATE_HEALTH,
            icon: HeartPulse,
          },
        ]
      : []),
    ...(showInventoryAllocation
      ? [
          {
            label: "Inventory Allocation",
            path: ROUTES.REPORTS.INVENTORY_ALLOCATION,
            icon: Package,
          },
        ]
      : []),
    ...(showHotelPayments
      ? [
          {
            label: "Payments",
            // Prefer Super Admin Payment Report (net earnings) whenever the
            // role/module can see it; other roles without it keep Payouts.
            path:
              showPaymentReport || canViewPaymentReport(user?.roles)
                ? ROUTES.REPORTS.NET_EARNINGS
                : ROUTES.REPORTS.HOTEL_PAYOUTS,
            activePaths: [
              ROUTES.REPORTS.NET_EARNINGS,
              ROUTES.REPORTS.HOTEL_PAYOUTS,
            ],
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
  const isAuditor = isAuditorRole(userRoles);
  const isSuperAdmin = hasAnyRole(userRoles, [ROLES.SUPER_ADMIN]);
  const isHotelBd = isHotelBdRole(userRoles);

  if (isHelpdeskAgent && !isSuperAdmin) {
    return getHelpdeskNavItems(userRoles);
  }

  if (isAuditor && !isSuperAdmin) {
    return getAuditorNavItems(user);
  }

  if (isFinanceManagerRole(userRoles)) {
    return getFinanceManagerNavItems(userRoles);
  }

  const dashboardPath = isHotelBd
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
      includeOnboardingPipeline: false,
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
    !!userRoles?.includes("HOTEL_ACCOUNTANT") ||
    !!userRoles?.includes("ACCOUNTANT");

  if (isReviewer) {
    const reportsNav = getReportsNavItem(user, {
      includeOnboardingPipeline: canViewHotelBdPipeline(userRoles),
    });
    if (reportsNav) items.push(reportsNav);
    if (canModerateReviews(userRoles)) {
      items.push(getReviewModerationNavItem());
    }
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
        label: "Inclusions",
        path: ROUTES.PROPERTY_INFO.INCLUSIONS,
        icon: ListChecks,
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
          [ROUTES.PROPERTY_INFO.INCLUSIONS]: "PROPERTY_BASIC_INFO",
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
      ...(canManageHotelReviews(userRoles) &&
      hasAnyRole(userRoles, [ROLES.HOTEL_OWNER, ROLES.HOTEL_MANAGER]) &&
      (hasAnyRole(userRoles, [ROLES.HOTEL_OWNER]) ||
        canViewModule(user, "GUEST_REVIEWS"))
        ? [
            {
              label: "Guest Reviews",
              path: ROUTES.HOTEL_REVIEWS.LIST,
              icon: Star,
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
      ...(canModerateReviews(userRoles)
        ? [getReviewModerationNavItem()]
        : []),
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
        label: "Inclusions",
        path: ROUTES.PROPERTY_INFO.INCLUSIONS,
        icon: ListChecks,
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
          [ROUTES.PROPERTY_INFO.INCLUSIONS]: "PROPERTY_BASIC_INFO",
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
      ...(canModerateReviews(userRoles)
        ? [getReviewModerationNavItem()]
        : []),
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
  if (isHotelOwner || isHotelManager) {
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
    );
  }
  if (isHotelOwner) {
    items.push(
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
      ...getHelpdeskNavItems(userRoles),
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

  // Finance / auditor roles that are not super admin still need tickets.
  if (
    !isSuperAdmin &&
    !isHelpdeskAgent &&
    canViewHelpdeskTickets(userRoles)
  ) {
    items.push(...getHelpdeskNavItems(userRoles));
  }

  if (canViewSupplierSettlement(userRoles)) {
    items.push(getSettlementNavItem());
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
    ["FRONT_DESK_EXEC", "HOTEL_ACCOUNTANT", "ACCOUNTANT"].includes(role),
  );
  if (isStaffRole && canViewModule(user, "BOOKINGS")) {
    items.push({
      label: "Bookings",
      path: ROUTES.BOOKINGS.LIST,
      icon: BookOpen,
    });
  }
  const isAccountant =
    !!userRoles?.includes("HOTEL_ACCOUNTANT") ||
    !!userRoles?.includes("ACCOUNTANT");
  if (isAccountant && canViewModule(user, "PROPERTY_FINANCE")) {
    items.push({
      label: "Finance",
      path: ROUTES.PROPERTY_INFO.FINANCE,
      icon: CreditCard,
    });
  }
  if (
    isAccountant &&
    canViewModule(user, "PAYMENTS")
  ) {
    const existingReports = items.find((item) => item.path === ROUTES.REPORTS.LIST);
    if (!existingReports) {
      const reportsNav = getReportsNavItem(user, {
        includeHotelFinancialMis: false,
        paymentsOnly: true,
      });
      if (reportsNav) items.push(reportsNav);
    }
  }
  if (canViewHotelBookingFinancialMis(userRoles)) {
    const existingReports = items.find((item) => item.path === ROUTES.REPORTS.LIST);
    if (!existingReports) {
      const reportsNav = getReportsNavItem(user, {
        includeHotelFinancialMis: true,
      });
      if (reportsNav) items.push(reportsNav);
    } else if (
      canViewHotelBookingFinancialMis(userRoles) &&
      !(existingReports.children ?? []).some(
        (child) => child.path === ROUTES.REPORTS.HOTEL_BOOKING_FINANCIAL_MIS,
      )
    ) {
      existingReports.children = [
        ...(existingReports.children ?? []),
        getHotelFinancialMisNavItem(),
      ];
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
    const existingReports = items.find((item) => item.path === ROUTES.REPORTS.LIST);
    if (!existingReports) {
      const reportsNav = getReportsNavItem(user, {
        includeOnboardingPipeline: true,
        includeSalesManagerDashboard: canViewSalesManagerReports(userRoles),
        includeSalesManagerPortfolio: canViewSalesManagerReports(userRoles),
      });
      if (reportsNav) items.push(reportsNav);
    } else if (
      !(existingReports.children ?? []).some(
        (child) => child.path === ROUTES.REPORTS.HOTEL_BD_PIPELINE,
      )
    ) {
      existingReports.children = [
        ...(existingReports.children ?? []),
        getOnboardingPipelineNavItem(),
      ];
    }
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

          <nav className="sidebar-scroll relative flex-1 overflow-y-auto overflow-x-hidden px-2 py-4 lg:px-3">
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
