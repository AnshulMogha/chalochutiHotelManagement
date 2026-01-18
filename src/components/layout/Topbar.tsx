import { Link, useLocation, useSearchParams } from "react-router";
import { useAuth } from "@/hooks";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Lock, LogOut, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import userApi from "@/services/api/user";
import type { User } from "@/types";
import { RiMenuUnfold3Line } from "react-icons/ri";
import { RiMenuFold3Line } from "react-icons/ri";
import { HotelSelector } from "@/components/ui/HotelSelector";
import { ROUTES } from "@/constants";

interface TopbarProps {
  onSidebarToggle?: () => void;
  isSidebarOpen?: boolean;
}

export function Topbar({ onSidebarToggle, isSidebarOpen = true }: TopbarProps) {
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const { logout } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const isBasicInfoPage = location.pathname === ROUTES.PROPERTY_INFO.BASIC_INFO;
  const selectedHotelId = searchParams.get("hotelId");

  useEffect(() => {
    async function getUserProfile() {
      const user = await userApi.getUser();
      setUser(user);
    }
    getUserProfile();
  }, []);

  const handleHotelChange = (hotelId: string) => {
    setSearchParams({ hotelId });
  };

  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  const getUsername = () => {
    return  user?.email.split("@")[0] || "User";
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left Side - Sidebar Toggle + Logo */}
          <div className="flex items-center gap-3">
            {/* Sidebar Toggle Button - All Screens */}
            <button
              onClick={onSidebarToggle}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#2f3d95] focus:ring-offset-2 focus:ring-offset-white"
              aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              aria-expanded={isSidebarOpen}
            >
              {isSidebarOpen ? (
                <RiMenuFold3Line className="w-5 h-5 text-gray-700" />
              ) : (
                <RiMenuUnfold3Line className="w-5 h-5 text-gray-700" />
              )}
            </button>

            {/* Company Logo Section */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-[#2f3d95] rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
                <span className="text-white font-bold text-lg drop-shadow-lg">
                  H
                </span>
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg font-bold text-gray-900 tracking-tight group-hover:text-[#2f3d95] transition-colors">
                  Hotel Onboard
                </h1>
                <p className="text-xs text-gray-500 font-medium">
                  Management System
                </p>
              </div>
            </Link>

            {/* Hotel Selector - Only show on Basic Info page */}
            {isBasicInfoPage && (
              <div className="ml-4">
                <HotelSelector
                  selectedHotelId={selectedHotelId}
                  onHotelChange={handleHotelChange}
                />
              </div>
            )}
          </div>

          {/* Profile Section - Right Side */}
          <div className="flex items-center gap-4">
            <DropdownMenu
              open={isUserDropdownOpen}
              onOpenChange={setIsUserDropdownOpen}
              modal={false}
            >
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-all duration-200 group focus:outline-none">
                  {/* Profile Avatar */}
                  <div className="relative">
                    <Avatar className="h-10 w-10 ring-2 ring-slate-300 group-hover:ring-[#2f3d95]/50 group-hover:shadow-[#2f3d95]/20 transition-all duration-300">
                      <AvatarFallback className="bg-[#2f3d95] text-white font-semibold">
                        {user?.email ? getInitials(user.email) : "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white shadow-lg">
                      <div className="w-full h-full rounded-full bg-green-400 animate-pulse"></div>
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="hidden sm:flex flex-col text-left min-w-0">
                    <p className="text-gray-500 text-xs font-medium">Hi,</p>
                    <p className="text-gray-900 font-semibold capitalize text-sm truncate max-w-[120px] group-hover:text-[#2f3d95] transition-colors">
                      {getUsername()}
                    </p>
                  </div>

                  {/* Dropdown Icon */}
                  <ChevronDown
                    className={`${
                      isUserDropdownOpen ? "rotate-180" : ""
                    } w-4 h-4 text-gray-400 group-hover:text-[#2f3d95] transition-all duration-200 shrink-0 group-hover:translate-y-0.5`}
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-60   absolute top-3  right-0  "
              >
                {/* Profile Header */}
                <DropdownMenuLabel className="px-4  py-3">
                  <div className="flex items-center gap-3 p-2">
                    <Avatar className="h-11 w-11 ring-2 ring-slate-200">
                      <AvatarFallback className="bg-[#2f3d95] text-white font-semibold">
                        {user?.email ? getInitials(user.email) : "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 font-semibold text-sm truncate">
                        {getUsername()}
                      </p>
                      <p className="text-gray-500 text-xs truncate mt-0.5">
                        {user?.email || "user@example.com"}
                      </p>
                    </div>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                {/* Change Password */}
                <DropdownMenuItem
                  className="px-4 py-2"
                  onClick={() => {
                    // Open change password modal
                    console.log("Change password");
                  }}
                >
                  <Lock className="w-4 h-4" />
                  <span className="font-medium">Change Password</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Logout */}
                <DropdownMenuItem
                  onClick={async () => {
                    await logout();
                    window.location.href = "/auth/login";
                  }}
                  variant="destructive"
                  className="text-red-600 px-4 py-2 focus:text-red-600 focus:bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="font-medium">Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
