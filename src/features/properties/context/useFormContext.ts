import { useContext } from "react";
import { FormContext } from "./FormContextProvider";
export function useFormContext() {
  const context = useContext(FormContext);
  if (context === undefined) {
    throw new Error("useFormContext must be used within a FormContextProvider");
  }
  return context;
}
