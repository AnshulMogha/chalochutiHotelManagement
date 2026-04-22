 const roomTypeOptions = [
    // Basic
    { value: "STANDARD", label: "Standard Room" },
    { value: "DELUXE", label: "Deluxe Room" },
    { value: "SUPER_DELUXE", label: "Super Deluxe Room" },
    { value: "PREMIUM", label: "Premium Room" },
    { value: "EXECUTIVE", label: "Executive Room" },
    { value: "CLUB", label: "Club Room" },
  
    // Suites
    { value: "SUITE", label: "Suite" },
    { value: "JUNIOR_SUITE", label: "Junior Suite" },
    { value: "FAMILY_SUITE", label: "Family Suite" },
    { value: "PRESIDENTIAL_SUITE", label: "Presidential Suite" },
  
    // Special stay types
    { value: "STUDIO", label: "Studio Room" },
    { value: "VILLA", label: "Villa" },
    { value: "COTTAGE", label: "Cottage" },
    { value: "BUNGALOW", label: "Bungalow" },
  
    // Shared
    { value: "DORMITORY", label: "Dormitory" },
    { value: "SHARED_ROOM", label: "Shared Room" },
  ];
  

const roomViewOptions = [
    // Urban / General
    { value: "CITY", label: "City View" },
    { value: "STREET", label: "Street View" },
    { value: "SKYLINE", label: "City Skyline View" },
    { value: "LANDMARK", label: "Landmark View" },
  
    // Water
    { value: "SEA", label: "Sea View" },
    { value: "OCEAN", label: "Ocean View" },
    { value: "BEACH", label: "Beach View" },
    { value: "RIVER", label: "River View" },
    { value: "LAKE", label: "Lake View" },
  
    // Nature
    { value: "GARDEN", label: "Garden View" },
    { value: "POOL", label: "Pool View" },
    { value: "FOREST", label: "Forest View" },
    { value: "MOUNTAIN", label: "Mountain View" },
    { value: "HILL", label: "Hill View" },
    { value: "VALLEY", label: "Valley View" },
  
    // Property internal
    { value: "COURTYARD", label: "Courtyard View" },
  
    // Fallback
    { value: "NO_VIEW", label: "No View" },
  ];
  
export { roomTypeOptions, roomViewOptions };