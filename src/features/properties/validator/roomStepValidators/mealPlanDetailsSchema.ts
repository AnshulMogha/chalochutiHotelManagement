import { z } from "zod";

const requiredRate = (message: string, min = 1) =>
  z
    .union([z.literal(""), z.number()])
    .refine((value) => value !== "", { message })
    .refine((value) => value === "" || value >= min, {
      message: min > 0 ? message : "Value cannot be negative",
    });

const mealPlanDetailsSchema = z
  .object({
    mealPlan: z.string().min(1, "Meal plan is required"),
    baseRate: requiredRate("Base rate is required"),
    singleOccupancyRate: requiredRate("Single occupancy rate is required"),
    extraAdultCharge: requiredRate("Extra adult charge is required", 0),
    paidChildCharge: requiredRate("Paid child charge is required", 0),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
  })
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate) {
      if (new Date(data.startDate) > new Date(data.endDate)) {
        ctx.addIssue({
          path: ["endDate"],
          message: "End date must be after start date",
          code: "custom",
        });
      }
    }
  });

export default mealPlanDetailsSchema;
