import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string | number; label: string }>;
  icon?: React.ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, icon, ...props }, ref) => {
    return (
      <div className={cn("w-full relative", error ? "mb-6" : "mb-0")}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
              {icon}
            </div>
          )}
          <select
            ref={ref}
            className={cn(
              "w-full px-3 py-2 border border-gray-300 rounded-md relative",
              icon && "pl-10",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
              "disabled:bg-gray-100 disabled:cursor-not-allowed",
              "bg-white appearance-none",
              error && "border-red-500 focus:ring-red-500",
              className
            )}
            {...props}
          >
            <option value="">Select {label}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {error && (
          <p
            className="mt-2 text-sm text-red-600"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
