const STORAGE_KEY = "hotelOnboard.selectedHotelId";

export function getStoredSelectedHotelId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredSelectedHotelId(hotelId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, hotelId);
  } catch {
    // ignore quota / private mode
  }
}
