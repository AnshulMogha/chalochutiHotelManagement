import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { Input, Button } from "@/components/ui";
import { MapPin, Navigation, X, Check } from "lucide-react";
import { useFormContext } from "../../context/useFormContext";
import { cn } from "@/lib/utils";

import {
  setAddress,
  setCity,
  setCountry,
  setLocality,
  setLandmark,
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
const GOOGLE_MAP_LIBRARIES: ("places")[] = ["places"];

type ParsedAddressFields = Pick<
  LocationInfo,
  "address" | "locality" | "landmark" | "pincode" | "city" | "state" | "country"
>;

function findAddressComponent(
  components: readonly google.maps.GeocoderAddressComponent[],
  ...types: string[]
): string {
  for (const type of types) {
    const match = components.find((component) => component.types.includes(type));
    if (match?.long_name) return match.long_name;
  }
  return "";
}

function parseAddressFromGeocoderResult(
  result: google.maps.GeocoderResult,
): ParsedAddressFields {
  const components = result.address_components ?? [];
  const streetNumber = findAddressComponent(components, "street_number");
  const route = findAddressComponent(components, "route");
  const premise = findAddressComponent(components, "premise", "establishment");
  const plusCode = findAddressComponent(components, "plus_code");

  let address = [streetNumber, route].filter(Boolean).join(" ").trim();
  if (!address) {
    const area = findAddressComponent(
      components,
      "neighborhood",
      "sublocality",
      "sublocality_level_1",
    );
    if (area && route) address = `${area} ${route}`.trim();
  }
  if (!address) address = premise || plusCode;
  if (!address && result.formatted_address) {
    address = result.formatted_address.split(",")[0]?.trim() ?? "";
  }

  const locality = findAddressComponent(
    components,
    "sublocality_level_1",
    "sublocality",
    "sublocality_level_2",
    "neighborhood",
    "administrative_area_level_3",
  );
  const city =
    findAddressComponent(components, "locality") ||
    findAddressComponent(components, "postal_town") ||
    findAddressComponent(components, "administrative_area_level_2");
  const landmark = findAddressComponent(
    components,
    "administrative_area_level_2",
    "administrative_area_level_3",
  );
  const state = findAddressComponent(components, "administrative_area_level_1");
  const country = findAddressComponent(components, "country");
  const pincode = findAddressComponent(components, "postal_code");

  return { address, locality, landmark, pincode, city, state, country };
}

function formatAddressOptionLine(parsed: ParsedAddressFields): string {
  const order: (keyof ParsedAddressFields)[] = [
    "address",
    "locality",
    "landmark",
    "city",
    "state",
    "country",
    "pincode",
  ];
  return order
    .map((key) => parsed[key]?.trim())
    .filter(Boolean)
    .join(", ");
}

function AddressOptionDetails({ parsed }: { parsed: ParsedAddressFields }) {
  return (
    <p className="min-w-0 flex-1 text-sm font-medium leading-relaxed break-words text-gray-900">
      {formatAddressOptionLine(parsed) || "—"}
    </p>
  );
}

function dedupeGeocoderResults(
  results: google.maps.GeocoderResult[],
): google.maps.GeocoderResult[] {
  const seen = new Set<string>();
  return results.filter((result) => {
    const key = result.formatted_address ?? result.place_id ?? "";
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function hasRequiredAddressFields(parsed: ParsedAddressFields): boolean {
  return Boolean(
    parsed.city?.trim() &&
      parsed.state?.trim() &&
      parsed.country?.trim() &&
      parsed.pincode?.trim(),
  );
}

function filterGeocoderResultsWithRequiredFields(
  results: google.maps.GeocoderResult[],
): google.maps.GeocoderResult[] {
  return dedupeGeocoderResults(results).filter((result) =>
    hasRequiredAddressFields(parseAddressFromGeocoderResult(result)),
  );
}

export function LocationStep() {
  const {
    errors: errorsFromContext,
    resetFieldError,
    readOnly,
  } = useOutletContext<{
    errors: Errors;
    resetFieldError: (step: keyof Errors, field: keyof LocationInfo) => void;
    readOnly?: boolean;
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
  const [addressOptions, setAddressOptions] = useState<
    google.maps.GeocoderResult[]
  >([]);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState<
    number | null
  >(null);

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
          landmark: response.locality || "",
          pincode: response.pincode,
          city: response.city,
          state: response.state,
          country: response.country,
        }),
      );
    }
    if (draftId) {
      fetchLocationDetails();
    }
  }, [draftId, setFormDataState]);
  /* ---------------- HELPERS ---------------- */

  const applyParsedAddress = useCallback(
    (parsed: ParsedAddressFields) => {
      setFormDataState(setAddress(parsed.address));
      setFormDataState(setLocality(parsed.locality));
      setFormDataState(setLandmark(parsed.landmark));
      setFormDataState(setPincode(parsed.pincode));
      setFormDataState(setCity(parsed.city));
      setFormDataState(setState(parsed.state));
      setFormDataState(setCountry(parsed.country));
    },
    [setFormDataState],
  );

  const applyGeocoderResult = useCallback(
    (result: google.maps.GeocoderResult, index: number) => {
      applyParsedAddress(parseAddressFromGeocoderResult(result));
      setSelectedAddressIndex(index);
    },
    [applyParsedAddress],
  );

  const clearLocationFieldErrors = useCallback(() => {
    resetFieldError("locationInfo", "city");
    resetFieldError("locationInfo", "state");
    resetFieldError("locationInfo", "country");
    resetFieldError("locationInfo", "locality");
    resetFieldError("locationInfo", "landmark");
    resetFieldError("locationInfo", "pincode");
    resetFieldError("locationInfo", "address");
  }, [resetFieldError]);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAP_LIBRARIES,
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

  const handleLandmarkChange = (value: string) => {
    setFormDataState(setLandmark(value));
    if (errors?.landmark) {
      resetFieldError("locationInfo", "landmark");
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
            results.length > 0
          ) {
            const uniqueResults = dedupeGeocoderResults(results);
            const completeResults = filterGeocoderResultsWithRequiredFields(results);
            const resultToApply = completeResults[0] ?? uniqueResults[0];

            if (completeResults.length >= 2) {
              setAddressOptions(completeResults);
              applyGeocoderResult(completeResults[0], 0);
            } else {
              setAddressOptions([]);
              setSelectedAddressIndex(null);
              if (resultToApply) {
                applyGeocoderResult(resultToApply, 0);
              }
            }
          } else {
            setAddressOptions([]);
            setSelectedAddressIndex(null);
          }
        });
      }, 100);
    },
    [applyGeocoderResult],
  );

  /* ---------------- DEBOUNCED AUTOCOMPLETE SEARCH ---------------- */

  const handleSearchInput = (value: string) => {
    if (readOnly) return;
    setSearchValue(value);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }

    // If input is empty, clear suggestions
    if (!value.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      setAddressOptions([]);
      setSelectedAddressIndex(null);
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
        },
      );
    }, 500); // ✅ 500ms debounce delay
  };

  const handleSelectPlace = (
    prediction: google.maps.places.AutocompletePrediction,
  ) => {
    if (readOnly) return;
    if (!window.google) return;

    setSearchValue(prediction.description);
    setShowDropdown(false);
    setSuggestions([]);

    // Get detailed place information
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

          setFormDataState(setLatitude(lat));
          setFormDataState(setLongitude(lng));
          clearLocationFieldErrors();
          setAddressOptions([]);
          setSelectedAddressIndex(null);
          reverseGeocode(lat, lng);
        }
      },
    );
  };

  const clearSearch = () => {
    if (readOnly) return;
    setSearchValue("");
    setSuggestions([]);
    setShowDropdown(false);
    setAddressOptions([]);
    setSelectedAddressIndex(null);
  };

  const handleSelectAddressOption = (
    result: google.maps.GeocoderResult,
    index: number,
  ) => {
    if (readOnly) return;
    clearLocationFieldErrors();
    applyGeocoderResult(result, index);
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
    if (readOnly) return;
    if (!e.latLng) return;

    const lat = e.latLng.lat();
    const lng = e.latLng.lng();

    setFormDataState(setLatitude(lat));
    setFormDataState(setLongitude(lng));
    setAddressOptions([]);
    setSelectedAddressIndex(null);

    reverseGeocode(lat, lng);
  };

  const onMapClick = (e: google.maps.MapMouseEvent) => {
    if (readOnly) return;
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
    setFormDataState(setLandmark(""));
    setFormDataState(setPincode(""));
    setFormDataState(setLatitude(lat));
    setFormDataState(setLongitude(lng));
    setAddressOptions([]);
    setSelectedAddressIndex(null);

    reverseGeocode(lat, lng);
  };

  /* ---------------- CURRENT LOCATION ---------------- */

  const handleUseCurrentLocation = () => {
    if (readOnly) return;
    if (!navigator.geolocation) return;

    setFormDataState(setAddress(""));
    setFormDataState(setLocality(""));
    setFormDataState(setLandmark(""));
    setFormDataState(setPincode(""));
    resetFieldError("locationInfo", "city");
    resetFieldError("locationInfo", "state");
    resetFieldError("locationInfo", "country");
    resetFieldError("locationInfo", "pincode");
    setAddressOptions([]);
    setSelectedAddressIndex(null);
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
            disabled={!!readOnly}
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
                disabled={!!readOnly}
              />
              {searchValue && (
                <button
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  type="button"
                  disabled={!!readOnly}
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
                    draggable={!readOnly}
                    onDragEnd={onMarkerDragEnd}
                  />
                )}
            </GoogleMap>
          )}
        </div>

        {addressOptions.length >= 2 && (
          <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-sm overflow-hidden">
            <div className="px-4 pt-4 pb-3 border-b border-blue-100/80 bg-white/60">
              <p className="text-sm font-semibold text-gray-900">Select address</p>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                Multiple addresses were found for this location. Choose the one
                that best matches your property.
              </p>
            </div>
            <div className="max-h-[min(360px,55vh)] overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
              <ul className="flex flex-col gap-2 p-3">
                {addressOptions.map((result, index) => {
                  const parsed = parseAddressFromGeocoderResult(result);
                  const isSelected = selectedAddressIndex === index;
                  return (
                    <li key={`${result.place_id ?? result.formatted_address}-${index}`}>
                      <button
                        type="button"
                        disabled={!!readOnly}
                        onClick={() => handleSelectAddressOption(result, index)}
                        className={cn(
                          "w-full text-left rounded-lg border px-3 py-3 transition-all flex items-start gap-3",
                          isSelected
                            ? "border-blue-600 bg-white shadow-sm"
                            : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm",
                          readOnly && "cursor-not-allowed opacity-60",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                            isSelected
                              ? "border-blue-600 bg-blue-600"
                              : "border-gray-300 bg-white",
                          )}
                          aria-hidden
                        >
                          {isSelected && (
                            <Check className="h-3 w-3 text-white stroke-[3]" />
                          )}
                        </span>
                        <AddressOptionDetails parsed={parsed} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* ADDRESS FIELDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Address"
          value={formDataState.locationInfo.address || ""}
          onChange={(e) => handleAddressChange(e.target.value)}
          required
          error={errors?.address}
          disabled={!!readOnly}
        />

        <Input
          label="Locality / Area / Street"
          value={formDataState.locationInfo.locality || ""}
          onChange={(e) => handleLocalityChange(e.target.value)}
          required
          error={errors?.locality}
          disabled={!!readOnly}
        />

        <Input
          label="Landmark"
          value={formDataState.locationInfo.landmark || ""}
          onChange={(e) => handleLandmarkChange(e.target.value)}
          error={errors?.landmark}
          disabled={!!readOnly}
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
          disabled={!!readOnly}
        />
      </div>
    </div>
  );
}
