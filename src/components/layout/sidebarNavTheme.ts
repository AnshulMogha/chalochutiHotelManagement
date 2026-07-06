import { ROUTES } from "@/constants";

export type NavIconTheme = {
  chip: string;
  chipActive: string;
  icon: string;
  iconActive: string;
  accent: string;
  row: string;
  rowHover: string;
};

const DEFAULT_THEME: NavIconTheme = {
  chip: "bg-white/14",
  chipActive: "bg-white/26 ring-1 ring-white/35",
  icon: "text-white/90",
  iconActive: "text-white",
  accent: "bg-white",
  row: "bg-white/20",
  rowHover: "hover:bg-white/14",
};

/** Distinct icon colors per nav route — full class strings for Tailwind. */
const NAV_ICON_THEMES: Record<string, NavIconTheme> = {
  [ROUTES.PROPERTIES.LIST]: {
    chip: "bg-sky-500/35",
    chipActive: "bg-sky-500/52 ring-1 ring-sky-400/65",
    icon: "text-sky-100",
    iconActive: "text-sky-50",
    accent: "bg-sky-400",
    row: "bg-sky-500/28",
    rowHover: "hover:bg-sky-500/18",
  },
  [ROUTES.PROPERTIES.MY_PROPERTY]: {
    chip: "bg-indigo-500/35",
    chipActive: "bg-indigo-500/52 ring-1 ring-indigo-400/65",
    icon: "text-indigo-100",
    iconActive: "text-indigo-50",
    accent: "bg-indigo-400",
    row: "bg-indigo-500/28",
    rowHover: "hover:bg-indigo-500/18",
  },
  [ROUTES.PROPERTY_INFO.LIST]: {
    chip: "bg-blue-500/35",
    chipActive: "bg-blue-500/52 ring-1 ring-blue-400/65",
    icon: "text-blue-100",
    iconActive: "text-blue-50",
    accent: "bg-blue-400",
    row: "bg-blue-500/28",
    rowHover: "hover:bg-blue-500/18",
  },
  [ROUTES.PROPERTY_INFO.BASIC_INFO]: {
    chip: "bg-cyan-500/35",
    chipActive: "bg-cyan-500/52 ring-1 ring-cyan-400/65",
    icon: "text-cyan-100",
    iconActive: "text-cyan-50",
    accent: "bg-cyan-400",
    row: "bg-cyan-500/28",
    rowHover: "hover:bg-cyan-500/18",
  },
  [ROUTES.PROPERTY_INFO.ROOMS_RATEPLANS]: {
    chip: "bg-violet-500/35",
    chipActive: "bg-violet-500/52 ring-1 ring-violet-400/65",
    icon: "text-violet-100",
    iconActive: "text-violet-50",
    accent: "bg-violet-400",
    row: "bg-violet-500/28",
    rowHover: "hover:bg-violet-500/18",
  },
  [ROUTES.PROPERTY_INFO.PHOTOS_VIDEOS]: {
    chip: "bg-fuchsia-500/35",
    chipActive: "bg-fuchsia-500/52 ring-1 ring-fuchsia-400/65",
    icon: "text-fuchsia-100",
    iconActive: "text-fuchsia-50",
    accent: "bg-fuchsia-400",
    row: "bg-fuchsia-500/28",
    rowHover: "hover:bg-fuchsia-500/18",
  },
  [ROUTES.PROPERTY_INFO.AMENITIES_RESTAURANTS]: {
    chip: "bg-orange-500/35",
    chipActive: "bg-orange-500/52 ring-1 ring-orange-400/65",
    icon: "text-orange-100",
    iconActive: "text-orange-50",
    accent: "bg-orange-400",
    row: "bg-orange-500/28",
    rowHover: "hover:bg-orange-500/18",
  },
  [ROUTES.PROPERTY_INFO.POLICY_RULES]: {
    chip: "bg-amber-500/35",
    chipActive: "bg-amber-500/52 ring-1 ring-amber-400/65",
    icon: "text-amber-100",
    iconActive: "text-amber-50",
    accent: "bg-amber-400",
    row: "bg-amber-500/28",
    rowHover: "hover:bg-amber-500/18",
  },
  [ROUTES.PROPERTY_INFO.FINANCE]: {
    chip: "bg-emerald-500/35",
    chipActive: "bg-emerald-500/52 ring-1 ring-emerald-400/65",
    icon: "text-emerald-100",
    iconActive: "text-emerald-50",
    accent: "bg-emerald-400",
    row: "bg-emerald-500/28",
    rowHover: "hover:bg-emerald-500/18",
  },
  [ROUTES.PROPERTY_INFO.DOCUMENT]: {
    chip: "bg-slate-400/35",
    chipActive: "bg-slate-400/52 ring-1 ring-slate-300/65",
    icon: "text-slate-100",
    iconActive: "text-slate-50",
    accent: "bg-slate-300",
    row: "bg-slate-400/28",
    rowHover: "hover:bg-slate-400/18",
  },
  [ROUTES.ROOM_INVENTORY.LIST]: {
    chip: "bg-teal-500/35",
    chipActive: "bg-teal-500/52 ring-1 ring-teal-400/65",
    icon: "text-teal-100",
    iconActive: "text-teal-50",
    accent: "bg-teal-400",
    row: "bg-teal-500/28",
    rowHover: "hover:bg-teal-500/18",
  },
  [ROUTES.BOOKINGS.LIST]: {
    chip: "bg-purple-500/35",
    chipActive: "bg-purple-500/52 ring-1 ring-purple-400/65",
    icon: "text-purple-100",
    iconActive: "text-purple-50",
    accent: "bg-purple-400",
    row: "bg-purple-500/28",
    rowHover: "hover:bg-purple-500/18",
  },
  [ROUTES.RATINGS_REVIEWS.LIST]: {
    chip: "bg-yellow-500/35",
    chipActive: "bg-yellow-500/52 ring-1 ring-yellow-400/65",
    icon: "text-yellow-100",
    iconActive: "text-yellow-50",
    accent: "bg-yellow-400",
    row: "bg-yellow-500/28",
    rowHover: "hover:bg-yellow-500/18",
  },
  [ROUTES.ANALYTICS.DASHBOARD]: {
    chip: "bg-rose-500/35",
    chipActive: "bg-rose-500/52 ring-1 ring-rose-400/65",
    icon: "text-rose-100",
    iconActive: "text-rose-50",
    accent: "bg-rose-400",
    row: "bg-rose-500/28",
    rowHover: "hover:bg-rose-500/18",
  },
  [ROUTES.PROMOTIONS.LIST]: {
    chip: "bg-pink-500/35",
    chipActive: "bg-pink-500/52 ring-1 ring-pink-400/65",
    icon: "text-pink-100",
    iconActive: "text-pink-50",
    accent: "bg-pink-400",
    row: "bg-pink-500/28",
    rowHover: "hover:bg-pink-500/18",
  },
  [ROUTES.TEAM.LIST]: {
    chip: "bg-lime-500/35",
    chipActive: "bg-lime-500/52 ring-1 ring-lime-400/65",
    icon: "text-lime-100",
    iconActive: "text-lime-50",
    accent: "bg-lime-400",
    row: "bg-lime-500/28",
    rowHover: "hover:bg-lime-500/18",
  },
  [ROUTES.ADMIN.HOTEL_REVIEW]: {
    chip: "bg-orange-500/35",
    chipActive: "bg-orange-500/52 ring-1 ring-orange-400/65",
    icon: "text-orange-100",
    iconActive: "text-orange-50",
    accent: "bg-orange-400",
    row: "bg-orange-500/28",
    rowHover: "hover:bg-orange-500/18",
  },
  [ROUTES.ADMIN.USERS]: {
    chip: "bg-cyan-500/35",
    chipActive: "bg-cyan-500/52 ring-1 ring-cyan-400/65",
    icon: "text-cyan-100",
    iconActive: "text-cyan-50",
    accent: "bg-cyan-400",
    row: "bg-cyan-500/28",
    rowHover: "hover:bg-cyan-500/18",
  },
  [ROUTES.ADMIN.COMMISSION_AND_TAX]: {
    chip: "bg-green-500/35",
    chipActive: "bg-green-500/52 ring-1 ring-green-400/65",
    icon: "text-green-100",
    iconActive: "text-green-50",
    accent: "bg-green-400",
    row: "bg-green-500/28",
    rowHover: "hover:bg-green-500/18",
  },
  [ROUTES.ADMIN.DOCUMENT_REVIEW]: {
    chip: "bg-slate-400/35",
    chipActive: "bg-slate-400/52 ring-1 ring-slate-300/65",
    icon: "text-slate-100",
    iconActive: "text-slate-50",
    accent: "bg-slate-300",
    row: "bg-slate-400/28",
    rowHover: "hover:bg-slate-400/18",
  },
  [ROUTES.ADMIN.TRAVEL_PARTNERS]: {
    chip: "bg-pink-500/35",
    chipActive: "bg-pink-500/52 ring-1 ring-pink-400/65",
    icon: "text-pink-100",
    iconActive: "text-pink-50",
    accent: "bg-pink-400",
    row: "bg-pink-500/28",
    rowHover: "hover:bg-pink-500/18",
  },
  [ROUTES.ADMIN.TRANSPORT]: {
    chip: "bg-amber-500/35",
    chipActive: "bg-amber-500/52 ring-1 ring-amber-400/65",
    icon: "text-amber-100",
    iconActive: "text-amber-50",
    accent: "bg-amber-400",
    row: "bg-amber-500/28",
    rowHover: "hover:bg-amber-500/18",
  },
  [ROUTES.ADMIN.PACKAGES]: {
    chip: "bg-violet-500/35",
    chipActive: "bg-violet-500/52 ring-1 ring-violet-400/65",
    icon: "text-violet-100",
    iconActive: "text-violet-50",
    accent: "bg-violet-400",
    row: "bg-violet-500/28",
    rowHover: "hover:bg-violet-500/18",
  },
  [ROUTES.MORE.LIST]: {
    chip: "bg-zinc-400/32",
    chipActive: "bg-zinc-400/48 ring-1 ring-zinc-300/60",
    icon: "text-zinc-100",
    iconActive: "text-zinc-50",
    accent: "bg-zinc-300",
    row: "bg-zinc-400/24",
    rowHover: "hover:bg-zinc-400/16",
  },
  [ROUTES.AGENTS.LIST]: {
    chip: "bg-emerald-500/35",
    chipActive: "bg-emerald-500/52 ring-1 ring-emerald-400/65",
    icon: "text-emerald-100",
    iconActive: "text-emerald-50",
    accent: "bg-emerald-400",
    row: "bg-emerald-500/28",
    rowHover: "hover:bg-emerald-500/18",
  },
};

export function getNavIconTheme(path: string): NavIconTheme {
  if (NAV_ICON_THEMES[path]) {
    return NAV_ICON_THEMES[path];
  }

  const prefixMatch = Object.keys(NAV_ICON_THEMES)
    .filter((key) => key !== "/" && path.startsWith(key))
    .sort((a, b) => b.length - a.length)[0];

  if (prefixMatch) {
    return NAV_ICON_THEMES[prefixMatch];
  }

  return DEFAULT_THEME;
}
