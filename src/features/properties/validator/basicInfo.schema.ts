import { z } from "zod";

const basicInfoSchema = z
  .object({
    name: z
      .string({ required_error: "Property name is required", invalid_type_error: "Property name is required" })
      .min(1, { message: "Property name is required" })
      .min(5, {
        message: "Property name must be at least 5 characters",
      }),

    starRating: z
      .number({ required_error: "Star rating is required", invalid_type_error: "Star rating is required" })
      .min(1, { message: "Star rating must be between 1 and 5" })
      .max(5, { message: "Star rating must be between 1 and 5" }),

    builtYear: z
      .string({ required_error: "Built year is required", invalid_type_error: "Built year is required" })
      .min(1, {
        message: "Built year is required",
      }),

    email: z
      .string({ required_error: "Email is required", invalid_type_error: "Email is required" })
      .min(1, { message: "Email is required" })
      .email({ message: "Please enter a valid email address" }),

    mobileNumber: z
      .string({ required_error: "Mobile number is required", invalid_type_error: "Mobile number is required" })
      .min(1, { message: "Mobile number is required" })
      .length(10, { message: "Mobile number must be exactly 10 digits" }),

    landlineNumber: z
      .string()
      .optional()
      .refine((val) => !val || /^\d{10}$/.test(val), {
        message: "Landline number must be 10 digits",
      }),

    ownerEmail: z
      .string({ required_error: "Owner email is required", invalid_type_error: "Owner email is required" })
      .min(1, { message: "Owner email is required" })
      .email({ message: "Please enter a valid owner email address" }),

    ownerFirstName: z
      .string({ required_error: "Owner first name is required", invalid_type_error: "Owner first name is required" })
      .min(1, { message: "Owner first name is required" }),

    ownerLastName: z
      .string({ required_error: "Owner last name is required", invalid_type_error: "Owner last name is required" })
      .min(1, { message: "Owner last name is required" }),

    ownerPhoneNumber: z
      .string({ required_error: "Owner phone number is required", invalid_type_error: "Owner phone number is required" })
      .min(1, { message: "Owner phone number is required" })
      .length(10, { message: "Owner phone number must be exactly 10 digits" }),
  });

export default basicInfoSchema;
