import {
  useState,
  useEffect,
  useLayoutEffect,
  type ReactNode,
  useRef,
  useCallback,
} from "react";
import { authService } from "@/features/auth/services/authService";
import { UserContext } from "./UserContext.context";
import { ApiClient } from "@/services/api/client";
import userApi from "@/services/api/user";
import type { User } from "@/types";
import { setStoredUserProfile } from "@/lib/userProfileStorage";

export function UserProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [accessTokenExpiration, setAccessTokenExpiration] =
    useState<Date | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isUserProfileLoading, setIsUserProfileLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Initialize user from localStorage and verify token
  const fetchAccessToken = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await authService.refreshAccessToken();
      setAccessToken(response.accessToken);
      setAccessTokenExpiration(new Date(response.accessTokenExpiry));
    } catch (error) {
      console.error("Unauthorized", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      if (
        accessToken &&
        accessTokenExpiration &&
        accessTokenExpiration > new Date()
      ) {
        timer.current = setTimeout(() => {
          fetchAccessToken();
        }, accessTokenExpiration.getTime() - Date.now() - 30000); // 30 seconds before expiration
      } else {
        fetchAccessToken();
      }
    };

    initializeAuth();
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, [accessToken, accessTokenExpiration, fetchAccessToken]);

  const login = (accessToken: string, accessTokenExpiry: string) => {
    setIsUserProfileLoading(true);
    setAccessToken(accessToken);
    setAccessTokenExpiration(new Date(accessTokenExpiry));
    ApiClient.setAccessToken(accessToken);
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      // Even if API call fails, clear local state
      console.error("Logout error:", error);
    } finally {
      setAccessToken(null);
      setAccessTokenExpiration(null);
      setUser(null);
      setStoredUserProfile(null);
      setIsUserProfileLoading(false);
      ApiClient.setAccessToken("");
    }
  };

  const refreshUser = useCallback(async () => {
    setIsUserProfileLoading(true);
    try {
      const userData = await userApi.getUser();
      setUser(userData);
      setStoredUserProfile(userData);
    } catch (error) {
      console.error("Error fetching user:", error);
      setUser(null);
      setStoredUserProfile(null);
    } finally {
      setIsUserProfileLoading(false);
    }
  }, []);

  const isAuthenticated =
    !!accessToken &&
    !!accessTokenExpiration &&
    accessTokenExpiration > new Date();

  useLayoutEffect(() => {
    if (isAuthenticated) {
      void refreshUser();
    }
  }, [isAuthenticated, refreshUser]);

  return (
    <UserContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        isUserProfileLoading,
        user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
