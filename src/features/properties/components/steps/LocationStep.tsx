import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { Input, Button } from "@/components/ui";
import { MapPin, Navigation, X } from "lucide-react";
import { useFormContext } from "../../context/useFormContext";

import {
  setAddress,
  setCity,
  setCountry,
  setLocality,
  setPincode,
  setState,
  setLatitude,
  setLongitude,
  setLocationInfo,
} from "../../state/actionCreators";
import type { Errors, LocationInfo } from "../../types";
import { useOutletContext, useSearchParams } from "react-router";
import { propertyService } from "../../services/propertyService";

const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 };

export function LocationStep() {
  const { errors: errorsFromContext, resetFieldError } = useOutletContext<{
    errors: Errors;
    resetFieldError: (step: keyof Errors, field: keyof LocationInfo) => void;
  }>();
  const errors = errorsFromContext.locationInfo as Partial<LocationInfo>;
  const { formDataState, setFormDataState } = useFormContext();

  const geocodeTimeoutRef = useRef<number | null>(null);
  const searchTimeoutRef = useRef<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Search state
  const [searchValue, setSearchValue] = useState("");
  const [suggestions, setSuggestions] = useState<
    google.maps.places.AutocompletePrediction[]
  >([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const searchParams = useSearchParams();
  const draftId = searchParams[0].get("draftId");
  useEffect(() => {
    async function fetchLocationDetails() {
      const response = await propertyService.getLocationDetails(draftId!);
      setFormDataState(
        setLocationInfo({
          latitude: response.latitude,
          longitude: response.longitude,

          address: response.houseBuildingApartmentNo,
          locality: response.localityAreaStreetSector,
          pincode: response.pincode,
          city: response.city,
          state: response.state,
          country: response.country,
        })
      );
    }
    if (draftId) {
      fetchLocationDetails();
    }
  }, [draftId, setFormDataState]);
  /* ---------------- HELPERS ---------------- */

  const extractAddressComponents = useCallback(
    (components: readonly google.maps.GeocoderAddressComponent[]) => {
      components.forEach((comp) => {
        if (comp.types.includes("country"))
          setFormDataState(setCountry(comp.long_name ?? ""));

        if (comp.types.includes("administrative_area_level_1"))
          setFormDataState(setState(comp.long_name ?? ""));

        if (comp.types.includes("locality"))
          setFormDataState(setCity(comp.long_name ?? ""));

        if (comp.types.includes("postal_code"))
          setFormDataState(setPincode(comp.long_name ?? ""));
      });
    },
    [setFormDataState]
  );
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ["places"],
  });
  const handleAddressChange = (value: string) => {
    setFormDataState(setAddress(value));
    if (errors?.address) {
      resetFieldError("locationInfo", "address");
    }
  };

  const handleLocalityChange = (value: string) => {
    setFormDataState(setLocality(value));
    if (errors?.locality) {
      resetFieldError("locationInfo", "locality");
    }
  };

  const handlePincodeChange = (value: string) => {
    setFormDataState(setPincode(value));
    if (errors?.pincode) {
      resetFieldError("locationInfo", "pincode");
    }
  };

  /* ---------------- DEBOUNCED REVERSE GEOCODE ---------------- */

  const reverseGeocode = useCallback(
    (lat: number, lng: number) => {
      if (geocodeTimeoutRef.current) {
        window.clearTimeout(geocodeTimeoutRef.current);
      }

      geocodeTimeoutRef.current = window.setTimeout(() => {
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

  /* ---------------- DEBOUNCED AUTOCOMPLETE SEARCH ---------------- */

  const handleSearchInput = (value: string) => {
    setSearchValue(value);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }

    // If input is empty, clear suggestions
    if (!value.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    // Show loading state
    setIsLoading(true);

    // Debounce the search - wait 500ms after user stops typing
    searchTimeoutRef.current = window.setTimeout(() => {
      if (!window.google) return;

      const service = new google.maps.places.AutocompleteService();
      service.getPlacePredictions(
        {
          input: value,
          // Optional: restrict to specific country
          // componentRestrictions: { country: 'in' }
        },
        (predictions, status) => {
          setIsLoading(false);
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
    }, 500); // ✅ 500ms debounce delay
  };

  const handleSelectPlace = (
    prediction: google.maps.places.AutocompletePrediction
  ) => {
    if (!window.google) return;

    setSearchValue(prediction.description);
    setShowDropdown(false);
    setSuggestions([]);

    // Get detailed place information
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

          setFormDataState(setLatitude(lat));
          setFormDataState(setLongitude(lng));
          setFormDataState(setLocality(place.name ?? ""));

          // Clear errors
          resetFieldError("locationInfo", "city");
          resetFieldError("locationInfo", "state");
          resetFieldError("locationInfo", "country");
          resetFieldError("locationInfo", "locality");
          resetFieldError("locationInfo", "pincode");
          resetFieldError("locationInfo", "address");

          // Extract address components
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

  /* ---------------- CLICK OUTSIDE TO CLOSE DROPDOWN ---------------- */

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

  /* ---------------- CLEANUP TIMEOUTS ---------------- */

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

  /* ---------------- MAP INTERACTIONS ---------------- */

  const onMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;

    const lat = e.latLng.lat();
    const lng = e.latLng.lng();

    setFormDataState(setLatitude(lat));
    setFormDataState(setLongitude(lng));

    reverseGeocode(lat, lng);
  };

  const onMapClick = (e: google.maps.MapMouseEvent) => {
    if (errors?.city || errors?.state || errors?.country) {
      resetFieldError("locationInfo", "city");
      resetFieldError("locationInfo", "state");
      resetFieldError("locationInfo", "country");
      resetFieldError("locationInfo", "pincode");
    }
    if (!e.latLng) return;

    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setFormDataState(setAddress(""));
    setFormDataState(setLocality(""));
    setFormDataState(setPincode(""));
    setFormDataState(setLatitude(lat));
    setFormDataState(setLongitude(lng));

    reverseGeocode(lat, lng);
  };

  /* ---------------- CURRENT LOCATION ---------------- */

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;

    setFormDataState(setAddress(""));
    setFormDataState(setLocality(""));
    setFormDataState(setPincode(""));
    resetFieldError("locationInfo", "city");
    resetFieldError("locationInfo", "state");
    resetFieldError("locationInfo", "country");
    resetFieldError("locationInfo", "pincode");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setFormDataState(setLatitude(coords.latitude));
      setFormDataState(setLongitude(coords.longitude));
      reverseGeocode(coords.latitude, coords.longitude);
    });
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="space-y-6 w-3xl">
      {/* MAP SECTION */}
      <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <MapPin className="text-blue-600" />
            <span className="font-medium">Location on Map</span>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleUseCurrentLocation}
          >
            <Navigation className="w-4 h-4 mr-2" />
            Use Current Location
          </Button>
        </div>

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
                {isLoading ? (
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
              mapContainerStyle={{ height: "260px", width: "100%" }}
              zoom={14}
              center={{
                lat: formDataState.locationInfo.latitude || DEFAULT_CENTER.lat,
                lng: formDataState.locationInfo.longitude || DEFAULT_CENTER.lng,
              }}
              onClick={onMapClick}
            >
              {formDataState.locationInfo.latitude &&
                formDataState.locationInfo.longitude && (
                  <Marker
                    position={{
                      lat: formDataState.locationInfo.latitude,
                      lng: formDataState.locationInfo.longitude,
                    }}
                    draggable
                    onDragEnd={onMarkerDragEnd}
                  />
                )}
            </GoogleMap>
          )}
        </div>
      </div>

      {/* ADDRESS FIELDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="House / Building / Apartment No."
          value={formDataState.locationInfo.address || ""}
          onChange={(e) => handleAddressChange(e.target.value)}
          required
          error={errors?.address}
        />

        <Input
          label="Locality / Area / Street"
          value={formDataState.locationInfo.locality || ""}
          onChange={(e) => handleLocalityChange(e.target.value)}
          required
          error={errors?.locality}
        />

        <Input
          readOnly
          label="City"
          value={formDataState.locationInfo.city || ""}
          required
          error={errors?.city}
        />

        <Input
          readOnly
          label="State"
          value={formDataState.locationInfo.state || ""}
          required
          error={errors?.state}
        />

        <Input
          readOnly
          label="Country"
          value={formDataState.locationInfo.country || ""}
          required
          error={errors?.country}
        />

        <Input
          label="Pincode"
          value={formDataState.locationInfo.pincode || ""}
          onChange={(e) =>
            handlePincodeChange(e.target.value.replace(/\D/g, ""))
          }
          maxLength={6}
          required
          error={errors?.pincode}
        />
      </div>
    </div>
  );
}
