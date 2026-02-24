import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { Input, Button } from "@/components/ui";
import { MapPin, Navigation, X, Globe, Home, Hash } from "lucide-react";
import { Toast, useToast } from "@/components/ui/Toast";
import { adminService } from "@/features/admin/services/adminService";
import { useAuth } from "@/hooks";
import { isHotelOwner } from "@/constants/roles";

const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 };

interface HowToReachTabProps {
  hotelId: string;
}

export function HowToReachTab({ hotelId }: HowToReachTabProps) {
  const { user } = useAuth();
  const isHotelOwnerUser = isHotelOwner(user?.roles);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [locationData, setLocationData] = useState({
    country: "",
    state: "",
    city: "",
    pincode: "",
    latitude: 0,
    longitude: 0,
  });
  const [addressData, setAddressData] = useState({
    houseBuildingApartmentNo: "",
    localityAreaStreetSector: "",
    landmark: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast, showToast, hideToast } = useToast();

  const geocodeTimeoutRef = useRef<number | null>(null);
  const searchTimeoutRef = useRef<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Search state
  const [searchValue, setSearchValue] = useState("");
  const [suggestions, setSuggestions] = useState<
    google.maps.places.AutocompletePrediction[]
  >([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ["places"],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [location, address] = await Promise.all([
          isHotelOwnerUser
            ? adminService.getHotelAdminLocation(hotelId)
            : adminService.getHotelLocation(hotelId),
          isHotelOwnerUser
            ? adminService.getHotelAdminAddress(hotelId)
            : adminService.getHotelAddress(hotelId),
        ]);

        if (location) {
          setLocationData({
            country: location.country || "",
            state: location.state || "",
            city: location.city || "",
            pincode: location.pincode || "",
            latitude: location.latitude || 0,
            longitude: location.longitude || 0,
          });
        }

        if (address) {
          setAddressData({
            houseBuildingApartmentNo: address.houseBuildingApartmentNo || "",
            localityAreaStreetSector: address.localityAreaStreetSector || "",
            landmark: address.landmark || "",
          });
        }
      } catch (error) {
        console.error("Error fetching location data:", error);
        showToast("Failed to load location data. Please try again.", "error");
      } finally {
        setIsLoading(false);
      }
    };

    if (hotelId) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId, isHotelOwnerUser]);

  const extractAddressComponents = useCallback(
    (components: readonly google.maps.GeocoderAddressComponent[]) => {
      components.forEach((comp) => {
        if (comp.types.includes("country")) {
          setLocationData((prev) => ({ ...prev, country: comp.long_name ?? "" }));
        }
        if (comp.types.includes("administrative_area_level_1")) {
          setLocationData((prev) => ({ ...prev, state: comp.long_name ?? "" }));
        }
        if (comp.types.includes("locality")) {
          setLocationData((prev) => ({ ...prev, city: comp.long_name ?? "" }));
        }
        if (comp.types.includes("postal_code")) {
          setLocationData((prev) => ({ ...prev, pincode: comp.long_name ?? "" }));
        }
      });
    },
    []
  );

  const reverseGeocode = useCallback(
    (lat: number, lng: number) => {
      if (geocodeTimeoutRef.current) {
        window.clearTimeout(geocodeTimeoutRef.current);
      }

      geocodeTimeoutRef.current = window.setTimeout(() => {
        if (!window.google) return;
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (
            status === google.maps.GeocoderStatus.OK &&
            results &&
            results[0]
          ) {
            extractAddressComponents(results[0].address_components);
          }
        });
      }, 100);
    },
    [extractAddressComponents]
  );

  const handleSearchInput = (value: string) => {
    setSearchValue(value);

    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }

    if (!value.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setIsSearchLoading(true);

    searchTimeoutRef.current = window.setTimeout(() => {
      if (!window.google) return;

      const service = new google.maps.places.AutocompleteService();
      service.getPlacePredictions(
        {
          input: value,
        },
        (predictions, status) => {
          setIsSearchLoading(false);
          if (
            status === google.maps.places.PlacesServiceStatus.OK &&
            predictions
          ) {
            setSuggestions(predictions);
            setShowDropdown(true);
          } else {
            setSuggestions([]);
            setShowDropdown(false);
          }
        }
      );
    }, 500);
  };

  const handleSelectPlace = (
    prediction: google.maps.places.AutocompletePrediction
  ) => {
    if (!window.google) return;

    setSearchValue(prediction.description);
    setShowDropdown(false);
    setSuggestions([]);

    const service = new google.maps.places.PlacesService(
      document.createElement("div")
    );

    service.getDetails(
      {
        placeId: prediction.place_id,
        fields: ["geometry", "name", "address_components"],
      },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          const lat = place.geometry?.location?.lat() ?? 0;
          const lng = place.geometry?.location?.lng() ?? 0;

          setLocationData((prev) => ({
            ...prev,
            latitude: lat,
            longitude: lng,
            city: place.name ?? prev.city,
          }));

          if (place.address_components) {
            extractAddressComponents(place.address_components);
          }

          reverseGeocode(lat, lng);
        }
      }
    );
  };

  const clearSearch = () => {
    setSearchValue("");
    setSuggestions([]);
    setShowDropdown(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current);
      }
      if (geocodeTimeoutRef.current) {
        window.clearTimeout(geocodeTimeoutRef.current);
      }
    };
  }, []);

  const onMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (isHotelOwnerUser) return; // Disable for hotel owner
    if (!e.latLng) return;

    const lat = e.latLng.lat();
    const lng = e.latLng.lng();

    setLocationData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
    }));

    reverseGeocode(lat, lng);
  };

  const onMapClick = (e: google.maps.MapMouseEvent) => {
    if (isHotelOwnerUser) return; // Disable for hotel owner
    if (!e.latLng) return;

    const lat = e.latLng.lat();
    const lng = e.latLng.lng();

    setLocationData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
    }));

    reverseGeocode(lat, lng);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setLocationData((prev) => ({
        ...prev,
        latitude: coords.latitude,
        longitude: coords.longitude,
      }));
      reverseGeocode(coords.latitude, coords.longitude);
    });
  };

  const handleChange = (field: string, value: string) => {
    if (isHotelOwnerUser) return; // Disable for hotel owner
    if (field.startsWith("location_")) {
      const locationField = field.replace("location_", "");
      setLocationData((prev) => ({ ...prev, [locationField]: value }));
    } else {
      setAddressData((prev) => ({ ...prev, [field]: value }));
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!locationData.country.trim()) {
      newErrors.location_country = "Country is required";
    }
    if (!locationData.state.trim()) {
      newErrors.location_state = "State is required";
    }
    if (!locationData.city.trim()) {
      newErrors.location_city = "City is required";
    }
    if (!locationData.pincode.trim()) {
      newErrors.location_pincode = "Pincode is required";
    } else if (!/^\d{6}$/.test(locationData.pincode)) {
      newErrors.location_pincode = "Pincode must be 6 digits";
    }
    if (!locationData.latitude || !locationData.longitude) {
      newErrors.location_coords = "Please select a location on the map";
    }

    // Address validation
    if (!addressData.houseBuildingApartmentNo.trim()) {
      newErrors.houseBuildingApartmentNo = "Address is required";
    }
    if (!addressData.localityAreaStreetSector.trim()) {
      newErrors.localityAreaStreetSector = "Locality / Area / Street / Sector is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      await Promise.all([
        adminService.updateHotelLocation(hotelId, {
          country: locationData.country,
          state: locationData.state,
          city: locationData.city,
          pincode: locationData.pincode,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
        }),
        adminService.updateHotelAddress(hotelId, {
          houseBuildingApartmentNo: addressData.houseBuildingApartmentNo,
          localityAreaStreetSector: addressData.localityAreaStreetSector,
          landmark: addressData.landmark,
        }),
      ]);

      setErrors({});
      showToast("Location and address updated successfully!", "success");
    } catch (error) {
      console.error("Error saving location data:", error);
      showToast("Failed to update location data. Please try again.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-gray-500">Loading location information...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <form onSubmit={handleSubmit}>
          {/* MAP SECTION */}
          <div className="border rounded-lg p-4 bg-gray-50 space-y-4 mb-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <MapPin className="text-blue-600" />
                <span className="font-medium">Location on Map</span>
              </div>

              {!isHotelOwnerUser && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleUseCurrentLocation}
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Use Current Location
                </Button>
              )}
            </div>
            {errors.location_coords && (
              <p className="text-sm text-red-600 mt-1" role="alert">
                {errors.location_coords}
              </p>
            )}

            <div className="space-y-3">
              {/* DEBOUNCED ADDRESS SEARCH */}
              <div className="relative" ref={dropdownRef}>
                <div className="relative w-full rounded-md border bg-white px-3 py-2">
                  <input
                    type="text"
                    value={searchValue}
                    onChange={(e) => handleSearchInput(e.target.value)}
                  placeholder="Search for a location..."
                  className="w-full outline-none pr-8"
                  readOnly={isHotelOwnerUser}
                  disabled={isHotelOwnerUser}
                />
                  {searchValue && (
                    <button
                      onClick={clearSearch}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      type="button"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* DROPDOWN SUGGESTIONS */}
                {showDropdown && (
                  <div className="absolute z-50 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
                    {isSearchLoading ? (
                      <div className="px-4 py-3 text-gray-500 text-sm">
                        Searching...
                      </div>
                    ) : suggestions.length > 0 ? (
                      suggestions.map((suggestion) => (
                        <div
                          key={suggestion.place_id}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                          onClick={() => handleSelectPlace(suggestion)}
                        >
                          <div className="font-medium text-sm">
                            {suggestion.structured_formatting.main_text}
                          </div>
                          <div className="text-xs text-gray-500">
                            {suggestion.structured_formatting.secondary_text}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-gray-500 text-sm">
                        No results found
                      </div>
                    )}
                  </div>
                )}
              </div>

              {isLoaded && (
                <GoogleMap
                  mapContainerStyle={{ height: "400px", width: "100%" }}
                  zoom={locationData.latitude && locationData.longitude ? 14 : 10}
                  center={{
                    lat: locationData.latitude || DEFAULT_CENTER.lat,
                    lng: locationData.longitude || DEFAULT_CENTER.lng,
                  }}
                  onClick={onMapClick}
                  options={{
                    disableDefaultUI: false,
                    clickableIcons: !isHotelOwnerUser,
                  }}
                >
                  {locationData.latitude && locationData.longitude && (
                    <Marker
                      position={{
                        lat: locationData.latitude,
                        lng: locationData.longitude,
                      }}
                      draggable={!isHotelOwnerUser}
                      onDragEnd={onMarkerDragEnd}
                    />
                  )}
                </GoogleMap>
              )}
            </div>
          </div>

          {/* LOCATION FIELDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Input
              label="Country"
              value={locationData.country}
              onChange={(e) => handleChange("location_country", e.target.value)}
              error={errors.location_country}
              icon={<Globe className="w-4 h-4 text-cyan-500" />}
              readOnly={isHotelOwnerUser}
              className={isHotelOwnerUser ? "bg-gray-50" : ""}
              required={!isHotelOwnerUser}
            />

            <Input
              label="State"
              value={locationData.state}
              onChange={(e) => handleChange("location_state", e.target.value)}
              error={errors.location_state}
              icon={<MapPin className="w-4 h-4 text-red-500" />}
              readOnly={isHotelOwnerUser}
              className={isHotelOwnerUser ? "bg-gray-50" : ""}
              required={!isHotelOwnerUser}
            />

            <Input
              label="City"
              value={locationData.city}
              onChange={(e) => handleChange("location_city", e.target.value)}
              error={errors.location_city}
              icon={<MapPin className="w-4 h-4 text-red-500" />}
              readOnly={isHotelOwnerUser}
              className={isHotelOwnerUser ? "bg-gray-50" : ""}
              required={!isHotelOwnerUser}
            />

            <Input
              label="Pincode"
              value={locationData.pincode}
              onChange={(e) =>
                handleChange("location_pincode", e.target.value.replace(/\D/g, ""))
              }
              maxLength={6}
              error={errors.location_pincode}
              icon={<Hash className="w-4 h-4 text-indigo-500" />}
              readOnly={isHotelOwnerUser}
              className={isHotelOwnerUser ? "bg-gray-50" : ""}
              required={!isHotelOwnerUser}
            />
          </div>

          {/* ADDRESS FIELDS */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Address Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Address"
                value={addressData.houseBuildingApartmentNo}
                onChange={(e) =>
                  handleChange("houseBuildingApartmentNo", e.target.value)
                }
                error={errors.houseBuildingApartmentNo}
                icon={<Home className="w-4 h-4 text-amber-500" />}
                readOnly={isHotelOwnerUser}
                className={isHotelOwnerUser ? "bg-gray-50" : ""}
                required={!isHotelOwnerUser}
              />

              <Input
                label="Locality / Area / Street"
                value={addressData.localityAreaStreetSector}
                onChange={(e) =>
                  handleChange("localityAreaStreetSector", e.target.value)
                }
                error={errors.localityAreaStreetSector}
                icon={<MapPin className="w-4 h-4 text-red-500" />}
                readOnly={isHotelOwnerUser}
                className={isHotelOwnerUser ? "bg-gray-50" : ""}
                required={!isHotelOwnerUser}
              />

              <div className="md:col-span-2">
                <Input
                  label="Landmark"
                  value={addressData.landmark}
                  onChange={(e) => handleChange("landmark", e.target.value)}
                  icon={<MapPin className="w-4 h-4 text-orange-500" />}
                  readOnly={isHotelOwnerUser}
                  className={isHotelOwnerUser ? "bg-gray-50" : ""}
                />
              </div>
            </div>
          </div>

          {!isHotelOwnerUser && (
            <div className="flex justify-end mt-8">
              <Button type="submit" disabled={isSaving} className="bg-blue-500 hover:bg-blue-600">
                {isSaving ? "Saving..." : "SAVE"}
              </Button>
            </div>
          )}
        </form>
      </div>
    </>
  );
}
