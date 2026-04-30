import { z } from "zod";

/** Indian GSTIN: 2 state digits + 10-char PAN-like core + entity + Z + checksum */
const GSTIN_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const financeAndLegalSchema = z.object({
  gstin: z.string().trim().superRefine((val, ctx) => {
    if (!val) {
      ctx.addIssue({
        code: "custom",
        message: "GSTIN is required",
        path: ["gstin"],
      });
      return;
    }
    if (val.length !== 15) {
      ctx.addIssue({
        code: "custom",
        message: "GSTIN must be exactly 15 characters",
        path: ["gstin"],
      });
      return;
    }
    if (!/^[A-Za-z0-9]{15}$/.test(val)) {
      ctx.addIssue({
        code: "custom",
        message: "GSTIN must be 15 alphanumeric characters",
        path: ["gstin"],
      });
      return;
    }
    const upper = val.toUpperCase();
    if (!GSTIN_REGEX.test(upper)) {
      ctx.addIssue({
        code: "custom",
        message:
          "GSTIN format is invalid. Use: 2 digits + 5 letters + 4 digits + 1 letter + entity code + Z + checksum (e.g. 29ABCDE1234F1Z5)",
        path: ["gstin"],
      });
    }
  }),
});

export type FinanceAndLegalSchema = z.infer<typeof financeAndLegalSchema>;
