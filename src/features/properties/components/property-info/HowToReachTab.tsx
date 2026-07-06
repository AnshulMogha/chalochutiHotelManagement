import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { Input, Button } from "@/components/ui";
import { MapPin, Navigation, X, Globe, Home, Hash, Search } from "lucide-react";
import { Toast, useToast } from "@/components/ui/Toast";
import { adminService } from "@/features/admin/services/adminService";
import { useAuth } from "@/hooks";
import { isSuperAdmin } from "@/constants/roles";
import { canEditBasicInfoHowToReach } from "@/lib/permissions";
import { FormFieldLabel } from "@/components/ui/FormFieldLabel";
import {
  BasicInfoFormCard,
  BasicInfoFormDivider,
  BasicInfoFormLoading,
  BasicInfoFormPanel,
} from "./basicInfoFormUi";

const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 };

interface HowToReachTabProps {
  hotelId: string;
}

export function HowToReachTab({ hotelId }: HowToReachTabProps) {
  const { user } = useAuth();
  const isSuperAdminUser = isSuperAdmin(user?.roles);
  const canEditHowToReach = canEditBasicInfoHowToReach(user);
  /** Super Admin uses admin APIs; hotel users use hotel-scoped GETs. */
  const useHotelAdminLocationApis = !isSuperAdminUser;
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
  // City is auto-filled from the map/address lookup; require an explicit opt-in
  // before allowing manual edits.
  const [isCityEditable, setIsCityEditable] = useState(false);

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
          useHotelAdminLocationApis
            ? adminService.getHotelAdminLocation(hotelId)
            : adminService.getHotelLocation(hotelId),
          useHotelAdminLocationApis
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
  }, [hotelId, useHotelAdminLocationApis]);

  const extractAddressComponents = useCallback(
    (components: readonly google.maps.GeocoderAddressComponent[]) => {
      components.forEach((comp) => {
        if (comp.types.includes("country")) {
          setLocationData((prev) => ({
            ...prev,
            country: comp.long_name ?? "",
          }));
        }
        if (comp.types.includes("administrative_area_level_1")) {
          setLocationData((prev) => ({ ...prev, state: comp.long_name ?? "" }));
        }
        if (comp.types.includes("locality")) {
          setLocationData((prev) => ({ ...prev, city: comp.long_name ?? "" }));
        }
        if (comp.types.includes("postal_code")) {
          setLocationData((prev) => ({
            ...prev,
            pincode: comp.long_name ?? "",
          }));
        }
      });
    },
    [],
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
    [extractAddressComponents],
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
        },
      );
    }, 500);
  };

  const handleSelectPlace = (
    prediction: google.maps.places.AutocompletePrediction,
  ) => {
    if (!window.google) return;

    setSearchValue(prediction.description);
    setShowDropdown(false);
    setSuggestions([]);

    const service = new google.maps.places.PlacesService(
      document.createElement("div"),
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
      },
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
    if (!canEditHowToReach) return;
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
    if (!canEditHowToReach) return;
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
    if (!canEditHowToReach) return;
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
      newErrors.localityAreaStreetSector =
        "Locality / Area / Street / Sector is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canEditHowToReach) {
      return;
    }

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
    return <BasicInfoFormLoading message="Loading location information..." />;
  }

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      <BasicInfoFormCard>
        <form onSubmit={handleSubmit}>
          <BasicInfoFormPanel className="border-cyan-100 bg-cyan-50/20">
            <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
              {canEditHowToReach && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleUseCurrentLocation}
                  className="border-cyan-200 text-cyan-700 hover:bg-cyan-50"
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Use Current Location
                </Button>
              )}
            </div>
            {errors.location_coords && (
              <p className="mb-3 text-sm text-red-600" role="alert">
                {errors.location_coords}
              </p>
            )}

            <div className="space-y-3">
              <FormFieldLabel icon={Search} theme="cyan">
                Search Location
              </FormFieldLabel>
              <div className="relative" ref={dropdownRef}>
                <div className="relative w-full rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
                  <input
                    type="text"
                    value={searchValue}
                    onChange={(e) => handleSearchInput(e.target.value)}
                    placeholder="Search for a location..."
                    className="w-full outline-none pr-8"
                    readOnly={!canEditHowToReach}
                    disabled={!canEditHowToReach}
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
                <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
                <GoogleMap
                  mapContainerStyle={{ height: "400px", width: "100%" }}
                  zoom={
                    locationData.latitude && locationData.longitude ? 14 : 10
                  }
                  center={{
                    lat: locationData.latitude || DEFAULT_CENTER.lat,
                    lng: locationData.longitude || DEFAULT_CENTER.lng,
                  }}
                  onClick={onMapClick}
                  options={{
                    disableDefaultUI: false,
                    clickableIcons: canEditHowToReach,
                  }}
                >
                  {locationData.latitude && locationData.longitude && (
                    <Marker
                      position={{
                        lat: locationData.latitude,
                        lng: locationData.longitude,
                      }}
                      draggable={canEditHowToReach}
                      onDragEnd={onMarkerDragEnd}
                    />
                  )}
                </GoogleMap>
                </div>
              )}
            </div>
          </BasicInfoFormPanel>

          <BasicInfoFormDivider />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Country"
              labelIcon={Globe}
              labelIconTheme="cyan"
              value={locationData.country}
              onChange={(e) => handleChange("location_country", e.target.value)}
              error={errors.location_country}
              readOnly={!canEditHowToReach}
              className={!canEditHowToReach ? "bg-gray-50" : ""}
              required={canEditHowToReach}
            />

            <Input
              label="State"
              labelIcon={MapPin}
              labelIconTheme="rose"
              value={locationData.state}
              onChange={(e) => handleChange("location_state", e.target.value)}
              error={errors.location_state}
              readOnly={!canEditHowToReach}
              className={!canEditHowToReach ? "bg-gray-50" : ""}
              required={canEditHowToReach}
            />

            <div>
              <div className="mb-1 flex items-center justify-between">
                <FormFieldLabel
                  icon={MapPin}
                  theme="rose"
                  required={canEditHowToReach}
                  className="mb-0"
                >
                  City
                </FormFieldLabel>
                {canEditHowToReach && (
                  <label className="flex w-fit items-center gap-2 text-sm text-gray-600 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isCityEditable}
                      onChange={(e) => setIsCityEditable(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-[#2f3d95] focus:ring-[#2f3d95]"
                    />
                    Edit city manually
                  </label>
                )}
              </div>
              <Input
                value={locationData.city}
                onChange={(e) => handleChange("location_city", e.target.value)}
                error={errors.location_city}
                readOnly={!canEditHowToReach || !isCityEditable}
                className={
                  !canEditHowToReach || !isCityEditable ? "bg-gray-50" : ""
                }
              />
            </div>

            <Input
              label="Pincode"
              labelIcon={Hash}
              labelIconTheme="indigo"
              value={locationData.pincode}
              onChange={(e) =>
                handleChange(
                  "location_pincode",
                  e.target.value.replace(/\D/g, ""),
                )
              }
              maxLength={6}
              error={errors.location_pincode}
              readOnly={!canEditHowToReach}
              className={!canEditHowToReach ? "bg-gray-50" : ""}
              required={canEditHowToReach}
            />
          </div>

          <BasicInfoFormDivider />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Address"
                labelIcon={Home}
                labelIconTheme="amber"
                value={addressData.houseBuildingApartmentNo}
                onChange={(e) =>
                  handleChange("houseBuildingApartmentNo", e.target.value)
                }
                error={errors.houseBuildingApartmentNo}
                readOnly={!canEditHowToReach}
                className={!canEditHowToReach ? "bg-gray-50" : ""}
                required={canEditHowToReach}
              />

              <Input
                label="Locality / Area / Street"
                labelIcon={MapPin}
                labelIconTheme="violet"
                value={addressData.localityAreaStreetSector}
                onChange={(e) =>
                  handleChange("localityAreaStreetSector", e.target.value)
                }
                error={errors.localityAreaStreetSector}
                readOnly={!canEditHowToReach}
                className={!canEditHowToReach ? "bg-gray-50" : ""}
                required={canEditHowToReach}
              />

              <div className="md:col-span-2">
                <Input
                  label="Landmark"
                  labelIcon={MapPin}
                  labelIconTheme="orange"
                  value={addressData.landmark}
                  onChange={(e) => handleChange("landmark", e.target.value)}
                  readOnly={!canEditHowToReach}
                  className={!canEditHowToReach ? "bg-gray-50" : ""}
                />
              </div>
          </div>

          {canEditHowToReach && (
            <div className="mt-8 flex justify-end border-t border-slate-100 pt-6">
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-blue-500 hover:bg-blue-600"
              >
                {isSaving ? "Saving..." : "SAVE"}
              </Button>
            </div>
          )}
        </form>
      </BasicInfoFormCard>
    </>
  );
}
