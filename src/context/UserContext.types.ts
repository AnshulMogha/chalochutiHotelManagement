import type { User } from "@/types";

export interface UserContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  /** True while fetching `/auth/me` (or equivalent) after authentication. */
  isUserProfileLoading: boolean;
  user: User | null;
  login: (accessToken: string, accessTokenExpiry: string) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

