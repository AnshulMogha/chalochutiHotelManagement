import { z } from "zod";

const basicInfoSchema = z
  .object({
    name: z
      .string({ required_error: "Property name is required", invalid_type_error: "Property name is required" })
      .min(1, { message: "Property name is required" })
      .min(5, {
        message: "Property name must be at least 5 characters",
      })
      .max(120, {
        message: "Property name must be at most 120 characters",
      })
      .regex(/^[A-Za-z0-9 ]+$/, {
        message:
          "Property name can contain only letters, numbers, and spaces",
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
      .regex(/^\d+$/, { message: "Mobile number must contain digits only" })
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
      .min(1, { message: "Owner first name is required" })
      .min(2, { message: "Owner first name must be at least 2 characters" })
      .max(50, { message: "Owner first name must be at most 50 characters" })
      .regex(/^[A-Za-z ]+$/, {
        message:
          "Owner first name can contain only letters and spaces",
      }),

    ownerLastName: z
      .string({ required_error: "Owner last name is required", invalid_type_error: "Owner last name is required" })
      .min(1, { message: "Owner last name is required" })
      .min(2, { message: "Owner last name must be at least 2 characters" })
      .max(50, { message: "Owner last name must be at most 50 characters" })
      .regex(/^[A-Za-z ]+$/, {
        message:
          "Owner last name can contain only letters and spaces",
      }),

    ownerPhoneNumber: z
      .string({ required_error: "Owner phone number is required", invalid_type_error: "Owner phone number is required" })
      .min(1, { message: "Owner phone number is required" })
      .regex(/^\d+$/, {
        message: "Owner phone number must contain digits only",
      })
      .length(10, { message: "Owner phone number must be exactly 10 digits" }),
  });

export default basicInfoSchema;
