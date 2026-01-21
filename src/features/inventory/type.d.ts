// TypeScript interfaces for Hotel Rates & Inventory Management

export interface DailyData {
  date: Date;
  inventory: number;
  baseRateAdult2: number | null;
  baseRateAdult1: number | null;
}

// Legacy RatePlan interface (for old RoomType structure)
export interface LegacyRatePlan {
  id: string;
  name: string; // e.g., "EP", "MAP", "CP"
  dailyData: DailyData[];
}


export type InventoryStatus = "OPEN" | "CLOSED";

export interface InventoryDay {
  date: string;          // "yyyy-MM-dd"
  total: number;
  sold: number;
  blocked: number;
  available: number;
  status: InventoryStatus;
  minStay: number;
  maxStay: number | null;
  cta: boolean;
  ctd: boolean;
}

export interface InventoryRoom {
  roomId: number;
  roomName: string;
  days: InventoryDay[];
}

export interface InventoryApiResponse {
  rooms: InventoryRoom[];
}

export interface RoomType {
  id: string;
  name: string; // e.g., "Deluxe Room"
  ratePlans: LegacyRatePlan[];
}


export interface TabOption {
  id: string;
  label: string;
}

export interface DateInfo {
  day: string; // e.g., "FRI"
  date: string; // e.g., "17"
  month: string; // e.g., "NOV"
  fullDate: Date;
}




//Rate
export interface RatesApiResponse {
  data: RatesData;
}

export interface RatesData {
  hotelId: string;
  customerType: 'RETAIL' | 'CORPORATE' | string;
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  ratePlans: RatePlan[];
}

export interface RatePlan {
  ratePlanId: number;
  ratePlanName: string;
  rooms: RatePlanRoom[];
}

export interface RatePlanRoom {
  roomId: number;
  roomName: string;
  days: RatePlanDay[];
}

export interface RatePlanDay {
  date: string; // YYYY-MM-DD
  baseRate: number; // Can be 0, which should be treated as empty/not set
  singleOccupancyRate?: number | null; // Optional single occupancy rate
  extraAdultCharge: number;
  paidChildCharge: number;
  minStay: number | null;
  maxStay: number | null;
  cutoffTime: string | null;
  currency: string | null;
}
