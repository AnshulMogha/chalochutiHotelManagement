import { useMemo, useState, useRef, useEffect } from "react";
import { Search, MapPin, Building2 } from "lucide-react"; // Optional: npm i lucide-react
import { HOTELS } from "@/data/constants";

export default function HotelSearchList() {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter logic
  const filteredHotels = useMemo(() => {
    if (!search) return []; // Hide list if no search query (optional)
    return HOTELS.filter((hotel) =>
      hotel.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedHotelName = HOTELS.find(h => h.id === selectedHotelId)?.name;

  return (
    <div className="relative w-full max-w-md" ref={containerRef}>
      {/* Search Input Group */}
      <div className="group relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
        </div>
        <input
          type="text"
          placeholder="Where are you going?"
          value={search}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm shadow-sm transition-all 
                     placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
        />
      </div>

      {/* Modern Dropdown */}
      {isOpen && search.length > 0 && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-72 overflow-y-auto p-2">
            <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Suggested Hotels
            </div>
            
            {filteredHotels.length > 0 ? (
              filteredHotels.map((hotel) => (
                <button
                  key={hotel.id}
                  onClick={() => {
                    setSelectedHotelId(hotel.id);
                    setSearch(hotel.name);
                    setIsOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-blue-50 group"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-50 group-hover:bg-blue-100 transition-colors">
                    <Building2 className="h-4 w-4 text-gray-500 group-hover:text-blue-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-700 group-hover:text-blue-900">
                      {hotel.name}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Location Tag
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                <p>No results for "{search}"</p>
              </div>
            )}
          </div>
          
          <div className="bg-gray-50 px-4 py-2 border-t border-gray-100 flex justify-between items-center">
            <span className="text-[10px] text-gray-400 uppercase font-medium">Search Results</span>
            <kbd className="text-[10px] bg-white border px-1.5 py-0.5 rounded text-gray-400">ESC</kbd>
          </div>
        </div>
      )}

      {/* Selection Display */}
      {selectedHotelId && (
        <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-between">
          <p className="text-sm text-blue-800 font-medium">
            Selected: <span className="text-blue-600">{selectedHotelName}</span>
          </p>
          <button 
            onClick={() => setSelectedHotelId(null)}
            className="text-xs text-blue-400 hover:text-blue-600"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}