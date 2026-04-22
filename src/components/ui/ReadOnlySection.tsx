import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ReadOnlySectionProps {
  isReadOnly: boolean;
  message?: string;
  className?: string;
  children: ReactNode;
}

export function ReadOnlySection({
  isReadOnly,
  message = "You have view-only access for this section.",
  className,
  children,
}: ReadOnlySectionProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {isReadOnly && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {message}
        </div>
      )}
      <div
        className={cn(
          isReadOnly &&
            "[&_input]:pointer-events-none [&_input]:cursor-not-allowed [&_input]:bg-gray-100 [&_input]:text-gray-600 [&_input]:opacity-90 [&_select]:pointer-events-none [&_select]:cursor-not-allowed [&_select]:bg-gray-100 [&_select]:text-gray-600 [&_textarea]:pointer-events-none [&_textarea]:cursor-not-allowed [&_textarea]:bg-gray-100 [&_textarea]:text-gray-600 [&_input[type='file']]:pointer-events-none [&_input[type='file']]:opacity-60 [&_button]:pointer-events-none [&_button]:cursor-not-allowed [&_button]:opacity-60 [&_button[type='submit']]:hidden [&_button[role='tab']]:pointer-events-auto [&_button[role='tab']]:cursor-pointer [&_button[role='tab']]:opacity-100 [&_button[data-readonly-allow='true']]:pointer-events-auto [&_button[data-readonly-allow='true']]:cursor-pointer [&_button[data-readonly-allow='true']]:opacity-100",
        )}
      >
        {children}
      </div>
    </div>
  );
}
