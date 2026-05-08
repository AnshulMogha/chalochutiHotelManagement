import { useState } from "react";
import { format, addDays } from "date-fns";
import { Calendar as CalendarIcon, Plus } from "lucide-react";
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
  const [selectedDateInput, setSelectedDateInput] = useState("");

  const today = new Date();
  const min = minDate || today;
  const minDateValue = format(min, "yyyy-MM-dd");
  const selectedDatesSet = new Set(selectedDates);

  const handleAddDate = () => {
    if (!selectedDateInput) return;
    if (selectedDatesSet.has(selectedDateInput)) return;
    onChange([...selectedDates, selectedDateInput].sort());
    setSelectedDateInput("");
  };

  const handleQuickAdd = (daysFromToday: number) => {
    const quickDate = format(addDays(today, daysFromToday), "yyyy-MM-dd");
    if (selectedDatesSet.has(quickDate)) return;
    onChange([...selectedDates, quickDate].sort());
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <CalendarIcon className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="date"
            value={selectedDateInput}
            min={minDateValue}
            onChange={(e) => setSelectedDateInput(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border-2 border-gray-300 rounded-lg bg-white focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>
        <button
          type="button"
          onClick={handleAddDate}
          disabled={!selectedDateInput}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-green-600 bg-green-600 text-white hover:bg-green-700 hover:border-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleQuickAdd(0)}
          className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => handleQuickAdd(1)}
          className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          Tomorrow
        </button>
      </div>

      {selectedDates.length > 0 && (
        <div className="pt-2 border-t border-gray-200">
          <p className="text-xs font-medium text-gray-600 mb-2">
            Selected Dates ({selectedDates.length}):
          </p>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
            {selectedDates.map((date) => (
              <span
                key={date}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md"
              >
                {format(new Date(date + "T00:00:00"), "MMM d")}
                <button
                  type="button"
                  onClick={() =>
                    onChange(
                      selectedDates.filter((selected) => selected !== date),
                    )
                  }
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
  );
}
