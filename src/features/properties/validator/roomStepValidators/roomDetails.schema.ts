import { z } from "zod";

const roomDetailsSchema = z.object({
  roomName: z.string().min(1, "Room name is required"),
  roomType: z.string().min(1, "Room type is required"),
  roomView: z.string().min(1, "Room view is required"),
  roomSize: z.number().min(1, "Room size is required"),
  roomSizeUnit: z.enum(["SQFT", "SQM"], {
    message: "Room size unit is required",
  }),
  totalRooms: z.number().min(1, "Total rooms is required"),
  numberOfBathrooms: z.number().min(1, "Number of bathrooms must be at least 1"),
  description: z.string().optional(),
});

export default roomDetailsSchema;
