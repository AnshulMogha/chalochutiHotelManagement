import type { User } from "@/types";

const USER_PROFILE_STORAGE_KEY = "hotelOnboard.userProfile";

export function setStoredUserProfile(user: User | null): void {
  try {
    if (!user) {
      localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
      return;
    }
    localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(user));
  } catch {
    // ignore storage failures
  }
}

export function getStoredUserProfile(): User | null {
  try {
    const raw = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

