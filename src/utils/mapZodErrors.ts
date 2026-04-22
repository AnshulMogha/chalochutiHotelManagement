import { ZodError } from "zod";

export function mapZodErrorsFlat(
  error: ZodError
): Record<string, string> {
  const errors: Record<string, string> = {};

  error.issues.forEach((issue) => {
    const field = issue.path[0] as string;
    if (!field) return;

    
    if (!errors[field]) {
      errors[field] = issue.message;
    }
  });
  console.log(errors);

  return errors;
}
