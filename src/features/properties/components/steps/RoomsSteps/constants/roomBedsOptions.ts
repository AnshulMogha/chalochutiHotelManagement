export type BedTypeOption = {
  value: string;
  label: string;
  size?: string;
};

export const bedTypeOptions: BedTypeOption[] = [
  { value: "SINGLE", label: "Single Bed", size: "3 feet by 6 feet" },
  { value: "DOUBLE", label: "Double Bed", size: "5 feet by 6 feet" },
  { value: "QUEEN", label: "Queen Bed", size: "6 feet by 6 feet" },
  { value: "KING", label: "King Bed", size: ">6 feet by 6 feet" },
  {
    value: "TWIN",
    label: "Twin Beds (2 Single Beds)",
    size: "3 feet by 6 feet each",
  },
  {
    value: "TRIPLE",
    label: "Triple Beds (3 Single Beds)",
    size: "3 feet by 6 feet each",
  },
  { value: "SOFA_BED", label: "Sofa Bed", size: "Variable size" },
  { value: "BUNK_BED", label: "Bunk Bed", size: "3 feet by 6 feet each" },
  { value: "FUTON", label: "Futon / Floor Mattress", size: "Variable size" },
  { value: "MURPHY_BED", label: "Murphy Bed (Wall Bed)", size: "Variable size" },
  { value: "OTHER", label: "Other Bed Type" },
];

export const roomCapacityOptions = {
  SINGLE: {
    baseAdults: 1,
    maxAdults: 1,
    baseChildren: 0,
    maxChildren: 0,
    maxOccupancy: 1,
  },
  DOUBLE: {
    baseAdults: 1,
    maxAdults: 2,
    baseChildren: 0,
    maxChildren: 2,
    maxOccupancy: 3,
  },
  QUEEN: {
    baseAdults: 1,
    maxAdults: 2,
    baseChildren: 0,
    maxChildren: 2,
    maxOccupancy: 3,
  },
  KING: {
    baseAdults: 1,
    maxAdults: 2,
    baseChildren: 0,
    maxChildren: 2,
    maxOccupancy: 3,
  },
  TWIN: {
    baseAdults: 1,
    maxAdults: 2,
    baseChildren: 0,
    maxChildren: 2,
    maxOccupancy: 3,
  },
  TRIPLE: {
    baseAdults: 1,
    maxAdults: 3,
    baseChildren: 0,
    maxChildren: 3,
    maxOccupancy: 4,
  },
  SOFA_BED: {
    baseAdults: 1,
    maxAdults: 1,
    baseChildren: 0,
    maxChildren: 0,
    maxOccupancy: 1,
  },
  BUNK_BED: {
    baseAdults: 1,
    maxAdults: 1,
    baseChildren: 0,
    maxChildren: 0,
    maxOccupancy: 1,
  },
  FUTON: {
    baseAdults: 1,
    maxAdults: 1,
    baseChildren: 0,
    maxChildren: 0,
    maxOccupancy: 1,
  },
  MURPHY_BED: {
    baseAdults: 1,
    maxAdults: 1,
    baseChildren: 0,
    maxChildren: 0,
    maxOccupancy: 1,
  },
  OTHER: {
    baseAdults: 1,
    maxAdults: 1,
    baseChildren: 0,
    maxChildren: 0,
    maxOccupancy: 1,
  },
};
