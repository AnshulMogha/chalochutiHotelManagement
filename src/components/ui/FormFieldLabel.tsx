import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const FIELD_ICON_THEMES = {
  blue: {
    chip: "bg-blue-50 ring-blue-100/80",
    icon: "text-blue-600",
  },
  purple: {
    chip: "bg-purple-50 ring-purple-100/80",
    icon: "text-purple-600",
  },
  indigo: {
    chip: "bg-indigo-50 ring-indigo-100/80",
    icon: "text-indigo-600",
  },
  emerald: {
    chip: "bg-emerald-50 ring-emerald-100/80",
    icon: "text-emerald-600",
  },
  cyan: {
    chip: "bg-cyan-50 ring-cyan-100/80",
    icon: "text-cyan-600",
  },
  amber: {
    chip: "bg-amber-50 ring-amber-100/80",
    icon: "text-amber-600",
  },
  orange: {
    chip: "bg-orange-50 ring-orange-100/80",
    icon: "text-orange-600",
  },
  rose: {
    chip: "bg-rose-50 ring-rose-100/80",
    icon: "text-rose-600",
  },
  green: {
    chip: "bg-green-50 ring-green-100/80",
    icon: "text-green-600",
  },
  violet: {
    chip: "bg-violet-50 ring-violet-100/80",
    icon: "text-violet-600",
  },
} as const;

export type FieldIconTheme = keyof typeof FIELD_ICON_THEMES;

interface FormFieldLabelProps {
  icon: LucideIcon;
  theme?: FieldIconTheme;
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormFieldLabel({
  icon: Icon,
  theme = "blue",
  htmlFor,
  required,
  children,
  className,
}: FormFieldLabelProps) {
  const styles = FIELD_ICON_THEMES[theme];

  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700",
        className,
      )}
    >
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-1",
          styles.chip,
        )}
      >
        <Icon className={cn("h-3.5 w-3.5", styles.icon)} strokeWidth={2.25} />
      </span>
      <span>
        {children}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </span>
    </label>
  );
}
