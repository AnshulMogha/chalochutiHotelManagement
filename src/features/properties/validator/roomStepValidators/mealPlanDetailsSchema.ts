import { z } from "zod";

const mealPlanDetailsSchema = z
  .object({
    mealPlan: z.string().min(1, "Meal plan is required"),
    baseRate: z.number().min(1, "Base rate is required"),
    singleOccupancyRate: z.number().min(1, "Single occupancy rate is required"),
    extraAdultCharge: z.number().min(0, "Extra adult charge cannot be negative"),
    paidChildCharge: z.number().min(0, "Paid child charge cannot be negative"),
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
