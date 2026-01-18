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
      baseAdults: 2,
      maxAdults: 2,
      baseChildren: 1,
      maxChildren: 1,
      maxOccupancy: 3, // 2 + 1
    },
    QUEEN: {
      baseAdults: 2,
      maxAdults: 2,
      baseChildren: 1,
      maxChildren: 2,
      maxOccupancy: 4,
    },
    KING: {
      baseAdults: 2,
      maxAdults: 2,
      baseChildren: 1,
      maxChildren: 2,
      maxOccupancy: 4,
    },
    TWIN: {
      baseAdults: 2,
      maxAdults: 2,
      baseChildren: 1,
      maxChildren: 2,
      maxOccupancy: 4,
    },
    TRIPLE: {
      baseAdults: 3,
      maxAdults: 3,
      baseChildren: 1,
      maxChildren: 2,
      maxOccupancy: 5,
    },
    SOFA_BED: {
      baseAdults: 1,
      maxAdults: 1,
      baseChildren: 0,
      maxChildren: 1,
      maxOccupancy: 2,
    },
    BUNK_BED: {
      baseAdults: 2,
      maxAdults: 2,
      baseChildren: 0,
      maxChildren: 2,
      maxOccupancy: 4,
    },
    FUTON: {
      baseAdults: 1,
      maxAdults: 1,
      baseChildren: 0,
      maxChildren: 1,
      maxOccupancy: 2,
    },
    MURPHY_BED: {
      baseAdults: 2,
      maxAdults: 2,
      baseChildren: 1,
      maxChildren: 1,
      maxOccupancy: 3,
    },
    OTHER: {
      baseAdults: 1,
      maxAdults: 2,
      baseChildren: 0,
      maxChildren: 1,
      maxOccupancy: 3,
    },
  } ;
  