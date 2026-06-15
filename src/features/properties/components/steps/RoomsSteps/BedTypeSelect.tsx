import { BedDouble, Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import type { BedTypeOption } from "./constants/roomBedsOptions";

type BedTypeSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: BedTypeOption[];
  error?: string;
  className?: string;
  placeholder?: string;
};

export function BedTypeSelect({
  value,
  onChange,
  options,
  error,
  className,
  placeholder = "Select bed type",
}: BedTypeSelectProps) {
  const selected = options.find((option) => option.value === value);

  return (
    <div className={cn("w-full relative", error ? "mb-6" : "mb-0", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex w-full items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
              error && "border-red-500 focus:ring-red-500",
            )}
          >
            <span className="min-w-0 flex-1">
              {selected ? (
                <span className="block truncate font-medium text-gray-900">
                  {selected.label}
                  {selected.size ? (
                    <span className="ml-1 font-normal text-gray-500">
                      ({selected.size})
                    </span>
                  ) : null}
                </span>
              ) : (
                <span className="text-gray-500">{placeholder}</span>
              )}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-72 overflow-y-auto p-1"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onChange(option.value)}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-md px-3 py-2.5",
                  isSelected && "bg-blue-50 text-blue-700",
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-700">
                  <BedDouble className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {option.label}
                    </span>
                    {isSelected ? (
                      <Check className="h-4 w-4 shrink-0 text-blue-600" />
                    ) : null}
                  </div>
                  {option.size ? (
                    <p className="mt-0.5 text-xs text-gray-500">{option.size}</p>
                  ) : null}
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      {error ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
