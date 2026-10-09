import {
  useState,
  useEffect,
  useLayoutEffect,
  type ReactNode,
  useRef,
  useCallback,
} from "react";
import { UserContext } from "./UserContext.context";
import {
  ApiClient,
  apiClient,
  bindAuthSessionHandlers,
} from "@/services/api/client";
import userApi from "@/services/api/user";
import { authService } from "@/features/auth/services/authService";
import type { User } from "@/types";
import { setStoredUserProfile } from "@/lib/userProfileStorage";

const REFRESH_SKEW_MS = 30_000;

export function UserProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [accessTokenExpiration, setAccessTokenExpiration] =
    useState<Date | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isUserProfileLoading, setIsUserProfileLoading] = useState(false);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expiryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didBootstrap = useRef(false);
  const accessTokenExpirationRef = useRef<Date | null>(null);
  accessTokenExpirationRef.current = accessTokenExpiration;

  const clearTimers = useCallback(() => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
    if (expiryTimer.current) {
      clearTimeout(expiryTimer.current);
      expiryTimer.current = null;
    }
  }, []);

  const clearSession = useCallback(() => {
    clearTimers();
    setAccessToken(null);
    setAccessTokenExpiration(null);
    setUser(null);
    setStoredUserProfile(null);
    setIsUserProfileLoading(false);
    setIsLoading(false);
    ApiClient.setAccessToken("");
  }, [clearTimers]);

  const applyAccessToken = useCallback(
    (nextAccessToken: string, nextExpiry: string) => {
      const expiry = new Date(nextExpiry);
      ApiClient.setAccessToken(nextAccessToken);
      setAccessToken(nextAccessToken);
      setAccessTokenExpiration(expiry);
    },
    [],
  );

  const fetchAccessToken = useCallback(async () => {
    try {
      const payload = await apiClient.refreshAccessToken();
      applyAccessToken(payload.accessToken, payload.accessTokenExpiry);
    } catch (error) {
      console.error("Unauthorized", error);
      clearSession();
    } finally {
      setIsLoading(false);
    }
  }, [applyAccessToken, clearSession]);

  useEffect(() => {
    bindAuthSessionHandlers({
      onAccessToken: applyAccessToken,
      onSessionExpired: clearSession,
    });
    return () => bindAuthSessionHandlers(null);
  }, [applyAccessToken, clearSession]);

  useEffect(() => {
    if (didBootstrap.current) return;
    didBootstrap.current = true;
    void fetchAccessToken();
  }, [fetchAccessToken]);

  useEffect(() => {
    clearTimers();
    if (!accessToken || !accessTokenExpiration) return undefined;

    const now = Date.now();
    const expiresAt = accessTokenExpiration.getTime();
    const refreshIn = expiresAt - now - REFRESH_SKEW_MS;

    if (refreshIn <= 0) {
      void fetchAccessToken();
    } else {
      refreshTimer.current = setTimeout(() => {
        void fetchAccessToken();
      }, refreshIn);
    }

    expiryTimer.current = setTimeout(() => {
      void fetchAccessToken();
    }, Math.max(0, expiresAt - now + 250));

    return clearTimers;
  }, [accessToken, accessTokenExpiration, fetchAccessToken, clearTimers]);

  useEffect(() => {
    const syncSessionIfStale = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      const expiry = accessTokenExpirationRef.current;
      if (!expiry) return;
      if (expiry.getTime() - Date.now() <= REFRESH_SKEW_MS) {
        void fetchAccessToken();
      }
    };

    document.addEventListener("visibilitychange", syncSessionIfStale);
    window.addEventListener("focus", syncSessionIfStale);
    window.addEventListener("online", syncSessionIfStale);
    return () => {
      document.removeEventListener("visibilitychange", syncSessionIfStale);
      window.removeEventListener("focus", syncSessionIfStale);
      window.removeEventListener("online", syncSessionIfStale);
    };
  }, [fetchAccessToken]);

  const login = (nextAccessToken: string, accessTokenExpiry: string) => {
    setIsUserProfileLoading(true);
    applyAccessToken(nextAccessToken, accessTokenExpiry);
    setIsLoading(false);
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      clearSession();
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
    accessTokenExpiration.getTime() > Date.now();

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
