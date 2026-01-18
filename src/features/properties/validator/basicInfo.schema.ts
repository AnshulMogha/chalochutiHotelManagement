import { z } from "zod";

const basicInfoSchema = z
  .object({
    name: z.string().min(5, {
      message: "Name must be at least 5 characters",
    }),

    starRating: z
      .number("Star rating is required")
      .min(1, "Star rating must be between 1 and 5")
      .max(5, "Star rating must be between 1 and 5"),

    builtYear: z.string().min(1, {
      message: "Built year is required",
    }),

    acceptingBookingsSince: z.string().min(1, {
      message: "Accepting bookings since is required",
    }),

    email: z.email("Invalid email address"),

    mobileNumber: z
      .string()
      .nonempty("Mobile number is required")
      .length(10, { message: "Mobile number must be 10 digits" }),

    landlineNumber: z
      .string()
      .optional()
      .refine((val) => !val || /^\d{10}$/.test(val), {
        message: "Landline number must be 10 digits",
      }),
  })
  .superRefine((data, ctx) => {
    console.log(data.builtYear, data.acceptingBookingsSince);
    if (data.builtYear && data.acceptingBookingsSince) {
        
      if (data.builtYear > data.acceptingBookingsSince) {
        ctx.addIssue({
          path: ["builtYear"], // 👈 attach error to field
          message: "Built year must be before accepting bookings since",
          code: "custom",
        });
      }
    }
  });

export default basicInfoSchema;
