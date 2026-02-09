import type { FormStateType, RoomStateType } from "../types";
import type { FormActionType, RoomInfoActionType } from "./actions";

const formReducer = (
  state: FormStateType,
  action: FormActionType
): FormStateType => {
  switch (action.type) {
    case "UPDATE_FORM_DATA":
      return { ...state, ...action.payload };
    case "HOTEL_NAME_CHANGE":
      return {
        ...state,
        basicInfo: { ...state.basicInfo, name: action.payload.name },
      };
    case "STAR_RATING_CHANGE":
      return {
        ...state,
        basicInfo: {
          ...state.basicInfo,
          starRating: action.payload.starRating,
        },
      };
    case "BUILT_YEAR_CHANGE":
      return {
        ...state,
        basicInfo: {
          ...state.basicInfo,
          builtYear: action.payload.builtYear,
        },
      };
    case "ACCEPTING_BOOKINGS_SINCE_CHANGE":
      return {
        ...state,
        basicInfo: {
          ...state.basicInfo,
          acceptingBookingsSince: action.payload.acceptingBookingsSince,
        },
      };
    case "EMAIL_CHANGE":
      return {
        ...state,
        basicInfo: {
          ...state.basicInfo,
          email: action.payload.email,
        },
      };
    case "MOBILE_NUMBER_CHANGE":
      return {
        ...state,
        basicInfo: {
          ...state.basicInfo,
          mobileNumber: action.payload.mobileNumber,
        },
      };
    case "LANDLINE_NUMBER_CHANGE":
      return {
        ...state,
        basicInfo: {
          ...state.basicInfo,
          landlineNumber: action.payload.landlineNumber,
        },
      };
    case "OWNER_EMAIL_CHANGE":
      return {
        ...state,
        basicInfo: {
          ...state.basicInfo,
          ownerEmail: action.payload.ownerEmail,
        },
      };
    case "OWNER_FIRST_NAME_CHANGE":
      return {
        ...state,
        basicInfo: {
          ...state.basicInfo,
          ownerFirstName: action.payload.ownerFirstName,
        },
      };
    case "OWNER_LAST_NAME_CHANGE":
      return {
        ...state,
        basicInfo: {
          ...state.basicInfo,
          ownerLastName: action.payload.ownerLastName,
        },
      };
    case "OWNER_PHONE_NUMBER_CHANGE":
      return {
        ...state,
        basicInfo: {
          ...state.basicInfo,
          ownerPhoneNumber: action.payload.ownerPhoneNumber,
        },
      };
    case "SET_META_INFO":
      return {
        ...state,
        metaInfo: action.payload.metaInfo,
      };
    case "SET_LOCATION_INFO":
      return {
        ...state,
        locationInfo: action.payload.locationInfo,
      };
    case "SET_COUNTRY":
      return {
        ...state,
        locationInfo: {
          ...state.locationInfo,
          country: action.payload.country,
        },
      };
    case "SET_STATE":
      return {
        ...state,
        locationInfo: { ...state.locationInfo, state: action.payload.state },
      };
    case "SET_CITY":
      return {
        ...state,
        locationInfo: { ...state.locationInfo, city: action.payload.city },
      };
    case "SET_PINCODE":
      return {
        ...state,
        locationInfo: {
          ...state.locationInfo,
          pincode: action.payload.pincode,
        },
      };
    case "SET_ADDRESS":
      return {
        ...state,
        locationInfo: {
          ...state.locationInfo,
          address: action.payload.address,
        },
      };
    case "SET_LOCALITY":
      return {
        ...state,
        locationInfo: {
          ...state.locationInfo,
          locality: action.payload.locality,
        },
      };
    case "SET_LATITUDE":
      return {
        ...state,
        locationInfo: {
          ...state.locationInfo,
          latitude: action.payload.latitude,
        },
      };
    case "SET_LONGITUDE":
      return {
        ...state,
        locationInfo: {
          ...state.locationInfo,
          longitude: action.payload.longitude,
        },
      };
    case "SET_TOGGLED_HOTEL_AMENITY": {
      const { amenityType, amenityId } = action.payload;

      const current = state.amenitiesInfo.selectedAmenities[amenityType] ?? [];

      const updated = current.includes(amenityId)
        ? current.filter((id) => id !== amenityId)
        : [...current, amenityId];

      return {
        ...state,
        amenitiesInfo: {
          ...state.amenitiesInfo,
          selectedAmenities: {
            ...state.amenitiesInfo.selectedAmenities,
            [amenityType]: updated,
          },
        },
      };
    }
    case "SET_SELECTED_HOTEL_AMENITIES":
      return {
        ...state,
        amenitiesInfo: {
          ...state.amenitiesInfo,
          selectedAmenities: action.payload.selectedAmenities,
        },
      };
    case "SET_AVAILABLE_HOTEL_AMENITIES":
      return {
        ...state,
        amenitiesInfo: {
          ...state.amenitiesInfo,
          availableAmenities: action.payload.availableAmenities,
          selectedAmenities: action.payload.selectedAmenities,
        },
      };
    case "SET_POLICIES_INFO":
      return {
        ...state,
        policiesInfo: action.payload.policiesInfo,
      };
    case "UPDATE_POLICY":
      return {
        ...state,
        policiesInfo: {
          ...state.policiesInfo,
          [action.payload.key]: action.payload.value,
        },
      };
    case "SET_FINANCE_AND_LEGAL_INFO":
      return {
        ...state,
        financeAndLegalInfo: action.payload.financeAndLegalInfo,
      };
    case "UPDATE_GSTIN":
      return {
        ...state,
        financeAndLegalInfo: {
          ...state.financeAndLegalInfo,
          gstin: action.payload.gstin,
        },
      };
    case "SET_BASIC_INFO":
      return {
        ...state,
        basicInfo: action.payload.basicInfo,
      };
    default:
      return state;
  }
};

const RoomDetailsReducer = (
  state: RoomStateType,
  action: RoomInfoActionType
): RoomStateType => {
  switch (action.type) {
    case "SET_ROOM_DETAILS": {
      const incoming = action.payload.roomDetails.roomAmenities;
      // When editing, transformRoomResponseToState sets availableAmenities to [];
      // preserve existing availableAmenities so Room Amenities step does not stay in loading
      const mergedRoomAmenities =
        incoming && (incoming.availableAmenities?.length ?? 0) > 0
          ? incoming
          : {
              ...(incoming || state.roomAmenities),
              availableAmenities:
                (incoming?.availableAmenities?.length ?? 0) > 0
                  ? incoming.availableAmenities
                  : state.roomAmenities.availableAmenities,
            };
      return {
        ...state,
        roomDetails:
          action.payload.roomDetails.roomDetails || state.roomDetails,
        sleepingArrangement:
          action.payload.roomDetails.sleepingArrangement ||
          state.sleepingArrangement,
        bathroomDetails:
          action.payload.roomDetails.bathroomDetails || state.bathroomDetails,
        mealPlanDetails:
          action.payload.roomDetails.mealPlanDetails || state.mealPlanDetails,
        roomAmenities: mergedRoomAmenities,
      };
    }
    case "SET_ROOM_TYPE":
      return {
        ...state,
        roomDetails: {
          ...state.roomDetails,
          roomType: action.payload.roomType,
        },
      };
    case "SET_ROOM_VIEW":
      return {
        ...state,
        roomDetails: {
          ...state.roomDetails,
          roomView: action.payload.roomView,
        },
      };
    case "SET_ROOM_SIZE":
      return {
        ...state,
        roomDetails: {
          ...state.roomDetails,
          roomSize: action.payload.roomSize,
        },
      };
    case "SET_ROOM_SIZE_UNIT":
      return {
        ...state,
        roomDetails: {
          ...state.roomDetails,
          roomSizeUnit: action.payload.roomSizeUnit,
        },
      };
    case "SET_ROOM_NAME":
      return {
        ...state,
        roomDetails: {
          ...state.roomDetails,
          roomName: action.payload.roomName,
        },
      };
    case "SET_TOTAL_ROOMS":
      return {
        ...state,
        roomDetails: {
          ...state.roomDetails,
          totalRooms: action.payload.totalRooms,
        },
      };
    case "SET_DESCRIPTION":
      return {
        ...state,
        roomDetails: {
          ...state.roomDetails,
          description: action.payload.description,
        },
      };

    case "SET_STANDARD_BEDS_TYPE": {
      const { bedType, index } = action.payload;
      const updatedStandardBeds = [...state.sleepingArrangement.standardBeds];
      updatedStandardBeds[index] = {
        ...updatedStandardBeds[index],
        bedType: bedType,
      };
      return {
        ...state,
        sleepingArrangement: {
          ...state.sleepingArrangement,
          standardBeds: updatedStandardBeds,
        },
      };
    }
    case "SET_NUMBER_OF_STANDARD_BEDS": {
      const { numberOfBeds, index } = action.payload;
      const updatedStandardBeds = [...state.sleepingArrangement.standardBeds];
      updatedStandardBeds[index] = {
        ...updatedStandardBeds[index],
        numberOfBeds: numberOfBeds,
      };
      return {
        ...state,
        sleepingArrangement: {
          ...state.sleepingArrangement,
          standardBeds: updatedStandardBeds,
        },
      };
    }
    case "ADD_STANDARD_BED":
      return {
        ...state,
        sleepingArrangement: {
          ...state.sleepingArrangement,
          standardBeds: [
            ...state.sleepingArrangement.standardBeds,
            { bedType: "", numberOfBeds: 1 },
          ],
        },
      };
    case "REMOVE_STANDARD_BED":
      return {
        ...state,
        sleepingArrangement: {
          ...state.sleepingArrangement,
          standardBeds: state.sleepingArrangement.standardBeds.filter(
            (_, index) => index !== action.payload.index
          ),
        },
      };
    case "SET_CAN_ACCOMMODATE_EXTRA_BED":
      return {
        ...state,
        sleepingArrangement: {
          ...state.sleepingArrangement,
          canAccommodateExtraBed: action.payload.canAccommodateExtraBed,
          numberOfExtraBeds: action.payload.canAccommodateExtraBed ? 1 : 0,
        },
      };
    case "SET_NUMBER_OF_EXTRA_BEDS":
      return {
        ...state,
        sleepingArrangement: {
          ...state.sleepingArrangement,
          numberOfExtraBeds: action.payload.numberOfExtraBeds,
        },
      };
    case "SET_HAS_ALTERNATE_ARRANGEMENT":
      return {
        ...state,
        sleepingArrangement: {
          ...state.sleepingArrangement,
          hasAlternateArrangement: action.payload.hasAlternateArrangement,
          alternateBeds: action.payload.hasAlternateArrangement
            ? [
                ...state.sleepingArrangement.alternateBeds,
                { bedType: "", numberOfBeds: 1 },
              ]
            : [],
        },
      };
    case "SET_ALTERNATE_BEDS_TYPE": {
      const { bedType, index } = action.payload;
      const updatedAlternateBeds = [...state.sleepingArrangement.alternateBeds];
      updatedAlternateBeds[index] = {
        ...updatedAlternateBeds[index],
        bedType: bedType,
      };
      return {
        ...state,
        sleepingArrangement: {
          ...state.sleepingArrangement,
          alternateBeds: updatedAlternateBeds,
        },
      };
    }
    case "SET_NUMBER_OF_ALTERNATE_BEDS": {
      const { numberOfBeds, index } = action.payload;
      const updatedAlternateBeds = [...state.sleepingArrangement.alternateBeds];
      updatedAlternateBeds[index] = {
        ...updatedAlternateBeds[index],
        numberOfBeds: numberOfBeds,
      };
      return {
        ...state,
        sleepingArrangement: {
          ...state.sleepingArrangement,
          alternateBeds: updatedAlternateBeds,
        },
      };
    }
    case "ADD_ALTERNATE_BED":
      return {
        ...state,
        sleepingArrangement: {
          ...state.sleepingArrangement,
          alternateBeds: [
            ...state.sleepingArrangement.alternateBeds,
            { bedType: "", numberOfBeds: 1 },
          ],
        },
      };
    case "REMOVE_ALTERNATE_BED":
      return {
        ...state,
        sleepingArrangement: {
          ...state.sleepingArrangement,
          alternateBeds: state.sleepingArrangement.alternateBeds.filter(
            (_, index) => index !== action.payload.index
          ),
        },
      };
    case "SET_BASE_ADULTS":
      return {
        ...state,
        sleepingArrangement: {
          ...state.sleepingArrangement,
          baseAdults: action.payload.baseAdults,
        },
      };
    case "SET_MAX_ADULTS":
      return {
        ...state,
        sleepingArrangement: {
          ...state.sleepingArrangement,
          maxAdults: action.payload.maxAdults,
        },
      };
    case "SET_BASE_CHILDREN":
      return {
        ...state,
        sleepingArrangement: {
          ...state.sleepingArrangement,
          baseChildren: action.payload.baseChildren,
        },
      };
    case "SET_MAX_CHILDREN":
      return {
        ...state,
        sleepingArrangement: {
          ...state.sleepingArrangement,
          maxChildren: action.payload.maxChildren,
        },
      };
    case "SET_MAX_OCCUPANCY":
      return {
        ...state,
        sleepingArrangement: {
          ...state.sleepingArrangement,
          maxOccupancy: action.payload.maxOccupancy,
        },
      };
    case "SET_NUMBER_OF_BATHROOMS":
      return {
        ...state,
        roomDetails: {
          ...state.roomDetails,
          numberOfBathrooms: action.payload.numberOfBathrooms,
        },
      };
    case "SET_MEAL_PLAN":
      return {
        ...state,
        mealPlanDetails: {
          ...state.mealPlanDetails,
          mealPlan: action.payload.mealPlan,
        },
      };
    case "SET_BASE_RATE":
      return {
        ...state,
        mealPlanDetails: {
          ...state.mealPlanDetails,
          baseRate: action.payload.baseRate,
        },
      };
    case "SET_EXTRA_ADULT_CHARGE":
      return {
        ...state,
        mealPlanDetails: {
          ...state.mealPlanDetails,
          extraAdultCharge: action.payload.extraAdultCharge,
        },
      };
    case "SET_PAID_CHILD_CHARGE":
      return {
        ...state,
        mealPlanDetails: {
          ...state.mealPlanDetails,
          paidChildCharge: action.payload.paidChildCharge,
        },
      };
    case "SET_START_DATE":
      return {
        ...state,
        mealPlanDetails: {
          ...state.mealPlanDetails,
          startDate: action.payload.startDate,
          endDate: "",
        },
      };
    case "SET_END_DATE":
      return {
        ...state,
        mealPlanDetails: {
          ...state.mealPlanDetails,
          endDate: action.payload.endDate,
        },
      };
    case "SET_AVAILABLE_ROOM_AMENITIES": {
      const availableAmenities = action.payload.availableAmenities;
      const codes = state.roomAmenities.selectedAmenityCodes;
      const codeSet =
        codes && codes.length > 0
          ? new Set(codes.map((c) => c.toLowerCase()))
          : null;
      // When room details API returns flat amenities (only amenityCode), map them to categories
      const selectedAmenities =
        codeSet && codeSet.size > 0
          ? availableAmenities.reduce<Record<string, string[]>>(
              (acc, category) => {
                const selected = (category.items || []).filter((item) =>
                  codeSet.has(item.id.toLowerCase())
                );
                if (selected.length > 0) {
                  acc[category.categoryCode] = selected.map((item) => item.id);
                }
                return acc;
              },
              {}
            )
          : state.roomAmenities.selectedAmenities;
      return {
        ...state,
        roomAmenities: {
          ...state.roomAmenities,
          availableAmenities,
          selectedAmenities,
          ...(codes?.length ? { selectedAmenityCodes: undefined } : {}),
        },
      };
    }
    case "SET_TOGGLED_ROOM_AMENITY": {
      {
        const { categoryCode, amenityId } = action.payload;
        const current =
          state.roomAmenities.selectedAmenities[categoryCode] ?? [];
        const updated = current.includes(amenityId)
          ? current.filter((id) => id !== amenityId)
          : [...current, amenityId];
        return {
          ...state,
          roomAmenities: {
            ...state.roomAmenities,
            selectedAmenities: {
              ...state.roomAmenities.selectedAmenities,
              [categoryCode]: updated,
            },
          },
        };
      }
    }
    default:
      return state;
  }
};
export { formReducer, RoomDetailsReducer };
