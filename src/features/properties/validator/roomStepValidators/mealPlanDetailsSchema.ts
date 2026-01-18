import { z } from "zod";

const mealPlanDetailsSchema = z
  .object({
    mealPlan: z.string().min(1, "Meal plan is required"),
    baseRate: z.number().min(1, "Base rate is required"),
    extraAdultCharge: z.number().min(1, "Extra adult charge is required"),
    paidChildCharge: z.number().min(1, "Paid child charge is required"),
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
