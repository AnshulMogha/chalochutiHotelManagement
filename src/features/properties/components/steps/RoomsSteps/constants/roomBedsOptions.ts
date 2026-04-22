export const bedTypeOptions = [
    { value: "SINGLE", label: "Single Bed" },
    { value: "DOUBLE", label: "Double Bed" },
    { value: "QUEEN", label: "Queen Size Bed" },
    { value: "KING", label: "King Size Bed" },
    { value: "TWIN", label: "Twin Beds (2 Single Beds)" },
    { value: "TRIPLE", label: "Triple Beds (3 Single Beds)" },
    { value: "SOFA_BED", label: "Sofa Bed" },
    { value: "BUNK_BED", label: "Bunk Bed" },
    { value: "FUTON", label: "Futon / Floor Mattress" },
    { value: "MURPHY_BED", label: "Murphy Bed (Wall Bed)" },
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
      maxOccupancy: 3, // 2 adults + 1 child OR 1 adult + 2 children
    },
    // QUEEN, KING, TWIN have same occupancy as DOUBLE
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
    // TRIPLE = 1 double + 1 single = 3+1 = 4 occupancy, 2+1 = 3 max adults
    TRIPLE: {
      baseAdults: 1,
      maxAdults: 3,
      baseChildren: 0,
      maxChildren: 3,
      maxOccupancy: 4,
    },
    // SOFA_BED, BUNK_BED, FUTON, MURPHY_BED have same occupancy as SINGLE
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
    // OTHER bed type is fully customizable - no fixed rules
    OTHER: {
      baseAdults: 1,
      maxAdults: 1,
      baseChildren: 0,
      maxChildren: 0,
      maxOccupancy: 1,
    },
  } ;
  