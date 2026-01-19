import { startOfToday, addDays } from 'date-fns';
import type { InventoryRoom, RoomType, TabOption } from '@/types';



// Navigation tabs
export const TAB_OPTIONS: TabOption[] = [
  { id: 'b2c', label: 'B2C' },
  { id: 'mybiz', label: 'MYBIZ' },
  { id: 'b2b', label: 'B2B' },
];


// Generate initial daily data for 7 days
const generateDailyData = (startDate: Date = startOfToday()) => {
  return Array.from({ length: 7 }).map((_, i) => ({
    date: addDays(startDate, i),
    inventory: i === 0 ? 2 : 100, // First day has low inventory for demo
    baseRateAdult2: i < 4 ? 740 + (i * 10) : null, // Some dates missing rates
    baseRateAdult1: i < 4 ? 650 + (i * 10) : null,
  }));
};


export const INVENTORY_API_DUMMY_DATA: { rooms: InventoryRoom[] } = {
  rooms: [
    {
      roomId: 5,
      roomName: "Deluxe Room",
      days: [
        {
          date: "2026-01-20",
          total: 20,
          sold: 0,
          blocked: 0,
          available: 20,
          status: "OPEN",
          minStay: 2,
          maxStay: null,
          cta: true,
          ctd: false,
        },
        {
          date: "2026-01-21",
          total: 20,
          sold: 2,
          blocked: 0,
          available: 18,
          status: "OPEN",
          minStay: 2,
          maxStay: null,
          cta: true,
          ctd: false,
        },
        {
          date: "2026-01-22",
          total: 20,
          sold: 0,
          blocked: 3,
          available: 17,
          status: "OPEN",
          minStay: 2,
          maxStay: null,
          cta: true,
          ctd: false,
        },
        {
          date: "2026-01-23",
          total: 20,
          sold: 5,
          blocked: 0,
          available: 15,
          status: "OPEN",
          minStay: 2,
          maxStay: null,
          cta: true,
          ctd: false,
        },
        {
          date: "2026-01-24",
          total: 20,
          sold: 20,
          blocked: 0,
          available: 0,
          status: "CLOSED",
          minStay: 2,
          maxStay: null,
          cta: false,
          ctd: false,
        },
        {
          date: "2026-01-25",
          total: 20,
          sold: 1,
          blocked: 1,
          available: 18,
          status: "OPEN",
          minStay: 2,
          maxStay: null,
          cta: true,
          ctd: false,
        },
        {
          date: "2026-01-26",
          total: 20,
          sold: 0,
          blocked: 0,
          available: 20,
          status: "OPEN",
          minStay: 2,
          maxStay: null,
          cta: true,
          ctd: false,
        },
      ],
    },
    {
      roomId: 6,
      roomName: "Gold Room",
      days: [
        {
          date: "2026-01-20",
          total: 20,
          sold: 0,
          blocked: 0,
          available: 20,
          status: "OPEN",
          minStay: 2,
          maxStay: null,
          cta: true,
          ctd: false,
        },
        {
          date: "2026-01-21",
          total: 20,
          sold: 2,
          blocked: 0,
          available: 18,
          status: "OPEN",
          minStay: 2,
          maxStay: null,
          cta: true,
          ctd: false,
        },
        {
          date: "2026-01-22",
          total: 20,
          sold: 0,
          blocked: 3,
          available: 17,
          status: "OPEN",
          minStay: 2,
          maxStay: null,
          cta: true,
          ctd: false,
        },
        {
          date: "2026-01-23",
          total: 20,
          sold: 5,
          blocked: 0,
          available: 15,
          status: "OPEN",
          minStay: 2,
          maxStay: null,
          cta: true,
          ctd: false,
        },
        {
          date: "2026-01-24",
          total: 20,
          sold: 20,
          blocked: 0,
          available: 0,
          status: "CLOSED",
          minStay: 2,
          maxStay: null,
          cta: false,
          ctd: false,
        },
        {
          date: "2026-01-25",
          total: 20,
          sold: 1,
          blocked: 1,
          available: 18,
          status: "OPEN",
          minStay: 2,
          maxStay: null,
          cta: true,
          ctd: false,
        },
        {
          date: "2026-01-26",
          total: 20,
          sold: 0,
          blocked: 0,
          available: 20,
          status: "OPEN",
          minStay: 2,
          maxStay: null,
          cta: true,
          ctd: false,
        },
      ],
    },
  ],
} as const;

export const RATE_PLANS_API_DUMMY_RESPONSE = {
  data: {
    hotelId: "8effdb2f-98ec-40c7-b37c-2541d47cc1ec",
    customerType: "RETAIL",
    from: "2026-01-19",
    to: "2026-01-25",
    ratePlans: [
      {
        ratePlanId: 1,
        ratePlanName: "Room Only",
        rooms: [
          {
            roomId: 10,
            roomName: "Deluxe",
            days: [
              {
                date: "2026-01-19",
                baseRate: 3200,
                extraAdultCharge: 800,
                paidChildCharge: 400,
                minStay: null,
                maxStay: null,
                cutoffTime: null,
                currency: "INR"
              },
              {
                date: "2026-01-20",
                baseRate: 3300,
                extraAdultCharge: 800,
                paidChildCharge: 400,
                minStay: null,
                maxStay: null,
                cutoffTime: null,
                currency: "INR"
              },
              {
                date: "2026-01-21",
                baseRate: 3400,
                extraAdultCharge: 900,
                paidChildCharge: 450,
                minStay: null,
                maxStay: null,
                cutoffTime: null,
                currency: "INR"
              },
              {
                date: "2026-01-22",
                baseRate: 3600,
                extraAdultCharge: 900,
                paidChildCharge: 450,
                minStay: null,
                maxStay: null,
                cutoffTime: null,
                currency: "INR"
              },
              {
                date: "2026-01-23",
                baseRate: 3800,
                extraAdultCharge: 1000,
                paidChildCharge: 500,
                minStay: null,
                maxStay: null,
                cutoffTime: null,
                currency: "INR"
              },
              {
                date: "2026-01-24",
                baseRate: 4200,
                extraAdultCharge: 1200,
                paidChildCharge: 600,
                minStay: null,
                maxStay: null,
                cutoffTime: null,
                currency: "INR"
              },
              {
                date: "2026-01-25",
                baseRate: 4000,
                extraAdultCharge: 1100,
                paidChildCharge: 550,
                minStay: null,
                maxStay: null,
                cutoffTime: null,
                currency: "INR"
              }
            ]
          }
        ]
      },
      {
        ratePlanId: 2,
        ratePlanName: "Breakfast Included",
        rooms: [
          {
            roomId: 10,
            roomName: "Deluxe",
            days: [
              {
                date: "2026-01-19",
                baseRate: 3700,
                extraAdultCharge: 900,
                paidChildCharge: 450,
                minStay: null,
                maxStay: null,
                cutoffTime: null,
                currency: "INR"
              },
              {
                date: "2026-01-20",
                baseRate: 3800,
                extraAdultCharge: 900,
                paidChildCharge: 450,
                minStay: null,
                maxStay: null,
                cutoffTime: null,
                currency: "INR"
              },
              {
                date: "2026-01-21",
                baseRate: 3900,
                extraAdultCharge: 1000,
                paidChildCharge: 500,
                minStay: null,
                maxStay: null,
                cutoffTime: null,
                currency: "INR"
              },
              {
                date: "2026-01-22",
                baseRate: 4100,
                extraAdultCharge: 1000,
                paidChildCharge: 500,
                minStay: null,
                maxStay: null,
                cutoffTime: null,
                currency: "INR"
              },
              {
                date: "2026-01-23",
                baseRate: 4300,
                extraAdultCharge: 1100,
                paidChildCharge: 550,
                minStay: null,
                maxStay: null,
                cutoffTime: null,
                currency: "INR"
              },
              {
                date: "2026-01-24",
                baseRate: 4700,
                extraAdultCharge: 1300,
                paidChildCharge: 650,
                minStay: null,
                maxStay: null,
                cutoffTime: null,
                currency: "INR"
              },
              {
                date: "2026-01-25",
                baseRate: 4500,
                extraAdultCharge: 1200,
                paidChildCharge: 600,
                minStay: null,
                maxStay: null,
                cutoffTime: null,
                currency: "INR"
              }
            ]
          }
        ]
      }
    ]
  }
};

// Initial room types with rate plans
export const INITIAL_ROOM_DATA: RoomType[] = [
  {
    id: 'deluxe',
    name: 'Deluxe Room',
    ratePlans: [
      {
        id: 'ep',
        name: 'EP',
        dailyData: generateDailyData(),
      },
      {
        id: 'map',
        name: 'MAP',
        dailyData: generateDailyData(),
      },
      {
        id: 'cp',
        name: 'CP',
        dailyData: generateDailyData(),
      },
    ],
  },
  
  {
    id: 'suite',
    name: 'Suite Room',
    ratePlans: [
      {
        id: 'ep',
        name: 'EP',
        dailyData: generateDailyData(),
      },
      {
        id: 'map',
        name: 'MAP',
        dailyData: generateDailyData(),
      },
    ],
  },
];

