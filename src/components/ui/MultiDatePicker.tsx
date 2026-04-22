import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MultiDatePickerProps {
  selectedDates: string[];
  onChange: (dates: string[]) => void;
  minDate?: Date;
  className?: string;
}

export function MultiDatePicker({
  selectedDates,
  onChange,
  minDate,
  className,
}: MultiDatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isOpen, setIsOpen] = useState(false);

  const today = new Date();
  const min = minDate || today;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const daysInMonth = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const selectedDatesSet = new Set(selectedDates);

  const handleDateClick = (date: Date) => {
    if (date < min) return;

    const dateString = format(date, "yyyy-MM-dd");
    const newSelectedDates = [...selectedDates];

    if (selectedDatesSet.has(dateString)) {
      // Remove date if already selected
      onChange(newSelectedDates.filter((d) => d !== dateString));
    } else {
      // Add date if not selected
      onChange([...newSelectedDates, dateString].sort());
    }
  };

  const isDateSelected = (date: Date) => {
    const dateString = format(date, "yyyy-MM-dd");
    return selectedDatesSet.has(dateString);
  };

  const isDateDisabled = (date: Date) => {
    return date < min;
  };

  const previousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className={cn("relative", className)}>
      {/* Input Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-4 py-2 border-2 border-gray-300 rounded-lg bg-white hover:border-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
      >
        <CalendarIcon className="w-5 h-5 text-gray-500" />
        <span className="flex-1 text-left text-sm text-gray-700">
          {selectedDates.length > 0
            ? `${selectedDates.length} date${selectedDates.length > 1 ? "s" : ""} selected`
            : "Select dates"}
        </span>
      </button>

      {/* Calendar Popup */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 z-20 bg-white border-2 border-gray-200 rounded-xl shadow-lg p-4 w-[320px]">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={previousMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h3 className="text-base font-semibold text-gray-900">
                {format(currentMonth, "MMMM yyyy")}
              </h3>
              <button
                type="button"
                onClick={nextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Week Days Header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-semibold text-gray-500 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {daysInMonth.map((day, dayIdx) => {
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = isDateSelected(day);
                const isDisabled = isDateDisabled(day);
                const isToday = isSameDay(day, today);

                return (
                  <button
                    key={dayIdx}
                    type="button"
                    onClick={() => handleDateClick(day)}
                    disabled={isDisabled}
                    className={cn(
                      "h-9 w-9 rounded-lg text-sm font-medium transition-all",
                      {
                        "text-gray-400": !isCurrentMonth || isDisabled,
                        "text-gray-900": isCurrentMonth && !isDisabled,
                        "bg-blue-600 text-white": isSelected,
                        "hover:bg-blue-50": isCurrentMonth && !isDisabled && !isSelected,
                        "border-2 border-blue-500": isToday && !isSelected,
                        "cursor-not-allowed": isDisabled,
                        "cursor-pointer": !isDisabled,
                      }
                    )}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>

            {/* Selected Dates Summary */}
            {selectedDates.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-600 mb-2">
                  Selected Dates ({selectedDates.length}):
                </p>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                  {selectedDates.map((date) => (
                    <span
                      key={date}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md"
                    >
                      {format(new Date(date + "T00:00:00"), "MMM d")}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onChange(selectedDates.filter((d) => d !== date));
                        }}
                        className="hover:text-blue-900"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

