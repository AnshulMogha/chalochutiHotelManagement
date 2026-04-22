// shared/validation/email.schema.ts
import { z } from "zod";

export const emailSchema = z.email("Invalid email address");
