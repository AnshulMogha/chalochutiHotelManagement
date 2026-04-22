import { z } from "zod";
const locationInfoSchema = z.object({
  address: z.string().min(1, { message: "Address is required" }),
  locality: z.string().min(1, { message: "Locality is required" }),
  pincode: z
    .string()
    .min(1, { message: "Pincode is required" })
    .max(6, { message: "Pincode must be 6 digits" }),
  city: z.string().min(1, { message: "Select a location to get city" }),
  state: z.string().min(1, { message: "Select a location to get state" }),
  country: z.string().min(1, { message: "Select a location to get country" }),
});
export default locationInfoSchema;
