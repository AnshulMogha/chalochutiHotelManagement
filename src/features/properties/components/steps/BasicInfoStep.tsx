import { Input, Select } from "@/components/ui";
import {
  Building2,
  Star,
  Calendar,
  Mail,
  Phone,
  PhoneCall,
  User,
} from "lucide-react";

import { useFormContext } from "../../context/useFormContext";
import type {
  BasicInfo,
  Errors,
  starRatingOptions as starRatingOptionsType,
} from "../../types";
import {
  changeBuiltYear,
  changeEmail,
  changeHotelName,
  changeLandlineNumber,
  changeMobileNumber,
  changeStarRating,
  changeOwnerEmail,
  changeOwnerFirstName,
  changeOwnerLastName,
  changeOwnerPhoneNumber,
  setBasicInfo,
} from "../../state/actionCreators";
import { propertyService } from "../../services/propertyService";
import { useEffect } from "react";
import { starRatingOptions } from "../../constant/Form";
import { useOutletContext, useSearchParams } from "react-router";
export function BasicInfoStep() {
 
const { errors: errorsFromContext, resetFieldError } = useOutletContext<{
  errors: Errors;
  resetFieldError: (step: keyof Errors, field: keyof BasicInfo) => void;
}>();
const errors = errorsFromContext.basicInfo ;

  const searchParams = useSearchParams();
  const draftId = searchParams[0].get("draftId");
  const { formDataState, setFormDataState } = useFormContext();
  const {
    name,
    starRating,
    builtYear,
    email,
    mobileNumber,
    landlineNumber,
    ownerEmail,
    ownerFirstName,
    ownerLastName,
    ownerPhoneNumber,
  } = formDataState.basicInfo;
  useEffect(() => {
    async function fetchBasicInfo() {
      try {
        const response = await propertyService.getAllBasicInfo(draftId!);
        setFormDataState(
          setBasicInfo({
            name: response.propertyName,
            starRating: response.starRating as starRatingOptionsType,
            builtYear: response.yearBuilt.toString(),
            email: response.contactEmail,
            mobileNumber: response.mobileNumber,
            landlineNumber: response.landlineNumber,
            ownerEmail: response.ownerEmail || "",
            ownerFirstName: response.ownerFirstName || "",
            ownerLastName: response.ownerLastName || "",
            ownerPhoneNumber: response.ownerPhoneNumber || response.ownerPhone || "",
          })
        );
      } catch (error) {
        console.error(error);
      }
    }
    fetchBasicInfo();
  }, [draftId, setFormDataState]);
  const handleNameChange = (value: string) => {
    setFormDataState(changeHotelName(value));
    if (errors?.name) {
      resetFieldError("basicInfo", "name");
    }
  };
  const handleStarRatingChange = (value: number | null) => {
    setFormDataState(changeStarRating(value as typeof starRating));
    if (errors?.starRating) {
      resetFieldError("basicInfo", "starRating");
    }
  };
  const handleBuiltYearChange = (value: string) => {
    setFormDataState(changeBuiltYear(value));
    if (errors?.builtYear) {
      resetFieldError("basicInfo", "builtYear");
    }
  };
  const handleEmailChange = (value: string) => {
    setFormDataState(changeEmail(value));
    if (errors?.email) {
      resetFieldError("basicInfo", "email");
    }
  };
  const handleMobileNumberChange = (value: string) => {
    setFormDataState(changeMobileNumber(value));
    if (errors?.mobileNumber) {
      resetFieldError("basicInfo", "mobileNumber");
    }
  };
  const handleLandlineNumberChange = (value: string) => {
    setFormDataState(changeLandlineNumber(value));
    if (errors?.landlineNumber) {
      resetFieldError("basicInfo", "landlineNumber");
    }
  };
  const handleOwnerEmailChange = (value: string) => {
    setFormDataState(changeOwnerEmail(value));
    if (errors?.ownerEmail) {
      resetFieldError("basicInfo", "ownerEmail");
    }
  };
  const handleOwnerFirstNameChange = (value: string) => {
    setFormDataState(changeOwnerFirstName(value));
    if (errors?.ownerFirstName) {
      resetFieldError("basicInfo", "ownerFirstName");
    }
  };
  const handleOwnerLastNameChange = (value: string) => {
    setFormDataState(changeOwnerLastName(value));
    if (errors?.ownerLastName) {
      resetFieldError("basicInfo", "ownerLastName");
    }
  };
  const handleOwnerPhoneNumberChange = (value: string) => {
    setFormDataState(changeOwnerPhoneNumber(value));
    if (errors?.ownerPhoneNumber) {
      resetFieldError("basicInfo", "ownerPhoneNumber");
    }
  };
  // Generate year options (from 1900 to current year)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: currentYear - 1899 }, (_, i) => ({
    value: currentYear - i,
    label: String(currentYear - i),
  }));

  return (
    <div className="space-y-6">
      {/* Property Details Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden">
        <div className="bg-linear-to-r from-slate-50 via-gray-50 to-slate-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                Property Details
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Enter your property's basic information
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Property Name */}
            <div className="md:col-span-2">
              <Input
                label="Name of Property (as per document)"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                error={errors?.name}
                placeholder="Enter property name as per legal documents"
                required
                icon={<Building2 className="w-4 h-4 text-gray-400" />}
                className="pl-10"
              />
            </div>

            {/* Star Rating */}

            <Select
              label="Hotel Star Rating"
              value={starRating || ""}
              onChange={(e) => handleStarRatingChange(Number(e.target.value))}
              options={starRatingOptions}
              error={errors?.starRating}
              required
              icon={
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              }
              className="pl-10"
            />

            {/* Built Year */}

            <Select
              label="When was property built?"
              value={builtYear}
              onChange={(e) => handleBuiltYearChange(e.target.value)}
              options={yearOptions}
              error={errors?.builtYear}
              required
              icon={<Calendar className="w-4 h-4 text-gray-400" />}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Contact Information Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden">
        <div className="bg-linear-to-r from-emerald-50 via-teal-50 to-cyan-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-emerald-500 via-teal-600 to-cyan-600 flex items-center justify-center shadow-sm">
              <Phone className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                Contact Information
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Enter your contact details
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email */}
            <div className="md:col-span-2">
              <div className="relative">
                <div className="absolute left-3 top-[38px] z-10 pointer-events-none">
                  <Mail className="w-4 h-4 text-gray-400" />
                </div>
                <Input
                  label="Email ID"
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  error={errors?.email}
                  placeholder="example@email.com"
                  required
                  className="pl-10"
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div className="md:col-span-2">
              <div className="relative">
                <div className="absolute left-3 top-[38px] z-10 pointer-events-none">
                  <Phone className="w-4 h-4 text-gray-400" />
                </div>
                <Input
                  label="Mobile Number (Indian)"
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => handleMobileNumberChange(e.target.value)}
                  error={errors?.mobileNumber}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  required
                  className="pl-10"
                />
              </div>
            </div>

            {/* Landline Number (Optional) */}
            <div className="md:col-span-2">
              <div className="relative">
                <div className="absolute left-3 top-[38px] z-10 pointer-events-none">
                  <PhoneCall className="w-4 h-4 text-gray-400" />
                </div>
                <Input
                  label="Landline Number (Optional)"
                  type="tel"
                  value={landlineNumber}
                  onChange={(e) => handleLandlineNumberChange(e.target.value)}
                  error={errors?.landlineNumber}
                  placeholder="Landline number with STD code"
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Owner Information Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden">
        <div className="bg-linear-to-r from-purple-50 via-indigo-50 to-blue-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-purple-500 via-indigo-600 to-blue-600 flex items-center justify-center shadow-sm">
              <User className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                Owner Information
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Enter the property owner's details
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Owner Email */}
            <div className="md:col-span-2">
              <div className="relative">
                <div className="absolute left-3 top-[38px] z-10 pointer-events-none">
                  <Mail className="w-4 h-4 text-gray-400" />
                </div>
                <Input
                  label="Owner Email ID"
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => handleOwnerEmailChange(e.target.value)}
                  error={errors?.ownerEmail}
                  placeholder="owner@example.com"
                  required
                  className="pl-10"
                />
              </div>
            </div>

            {/* Owner First Name */}
            <div>
              <div className="relative">
                <div className="absolute left-3 top-[38px] z-10 pointer-events-none">
                  <User className="w-4 h-4 text-gray-400" />
                </div>
                <Input
                  label="Owner First Name"
                  value={ownerFirstName}
                  onChange={(e) => handleOwnerFirstNameChange(e.target.value)}
                  error={errors?.ownerFirstName}
                  placeholder="Enter first name"
                  required
                  className="pl-10"
                />
              </div>
            </div>

            {/* Owner Last Name */}
            <div>
              <div className="relative">
                <div className="absolute left-3 top-[38px] z-10 pointer-events-none">
                  <User className="w-4 h-4 text-gray-400" />
                </div>
                <Input
                  label="Owner Last Name"
                  value={ownerLastName}
                  onChange={(e) => handleOwnerLastNameChange(e.target.value)}
                  error={errors?.ownerLastName}
                  placeholder="Enter last name"
                  required
                  className="pl-10"
                />
              </div>
            </div>

            {/* Owner Phone Number */}
            <div className="md:col-span-2">
              <div className="relative">
                <div className="absolute left-3 top-[38px] z-10 pointer-events-none">
                  <Phone className="w-4 h-4 text-gray-400" />
                </div>
                <Input
                  label="Owner Phone Number (Indian)"
                  type="tel"
                  value={ownerPhoneNumber}
                  onChange={(e) => handleOwnerPhoneNumberChange(e.target.value)}
                  error={errors?.ownerPhoneNumber}
                  placeholder="10-digit phone number"
                  maxLength={10}
                  required
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
