import { format, subDays, addDays, startOfToday, isBefore, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { ReactNode } from 'react';

/**
 * Date Selector Component
 * 
 * UI/UX ENHANCEMENTS:
 * - Premium styling matching RatePlansGrid and RoomTypesGrid
 * - Improved button states and hover effects
 * - Better visual hierarchy and spacing
 * - Enhanced date picker styling
 * - Clearer disabled state feedback
 * - Smooth transitions throughout
 */

interface DateSelectorProps {
  baseDate: Date;
  onBaseDateChange: (date: Date) => void;
  onActiveDateChange: (date: Date) => void;
  rightAction?: ReactNode;
}

export const DateSelector = ({
  baseDate,
  onBaseDateChange,
  onActiveDateChange,
  rightAction,
}: DateSelectorProps) => {
  const today = startOfToday();
  // Check if going back one week would result in a past date
  const prevWeekDate = subDays(baseDate, 7);
  const wouldGoToPast = isBefore(prevWeekDate, today) && !isSameDay(prevWeekDate, today);

  const handlePrevWeek = () => {
    // Move back by 7 days
    const newDate = subDays(baseDate, 7);
    // Only allow if the new date is today or in the future
    if (!isBefore(newDate, today) || isSameDay(newDate, today)) {
      onBaseDateChange(newDate);
      onActiveDateChange(newDate);
    }
  };

  const handleNextWeek = () => {
    // Next button: newFromDate = currentToDate + 1, newToDate = newFromDate + 6
    // currentToDate = baseDate + 6
    const currentToDate = addDays(baseDate, 6);
    const newFromDate = addDays(currentToDate, 1);
    onBaseDateChange(newFromDate);
    onActiveDateChange(newFromDate);
  };

  const handleDateChange = (picked: Date) => {
    // Only allow if the picked date is today or in the future
    if (!isBefore(picked, today) || isSameDay(picked, today)) {
      onBaseDateChange(picked);
      onActiveDateChange(picked);
    }
  };

  return (
    // UI ENHANCEMENT: Improved shadow and spacing
    <div className="mb-6 bg-white rounded-lg border border-gray-200 shadow-md overflow-hidden">
      {/* Top Control Bar - UI ENHANCEMENT: Better padding and spacing */}
      <div className="flex justify-between items-center px-6 py-5 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
            Channel Segment
          </span>
          <span className="text-[#2A3170] font-bold text-lg tracking-wide">
            {format(baseDate, 'MMMM yyyy').toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Week Navigation - UI ENHANCEMENT: Better button styling and hover effects */}
          <div className="flex items-center border border-gray-300 rounded-lg bg-white overflow-hidden shadow-sm">
            <button
              onClick={handlePrevWeek}
              disabled={wouldGoToPast}
              className={`p-2.5 border-r border-gray-300 transition-all duration-150
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2A3170]
                ${
                wouldGoToPast
                  ? 'opacity-40 cursor-not-allowed bg-gray-50'
                  : 'hover:bg-gray-100 active:bg-gray-200'
              }`}
            >
              <ChevronLeft className={`w-5 h-5 ${wouldGoToPast ? 'text-gray-400' : 'text-gray-700'}`} />
            </button>
            <button
              onClick={handleNextWeek}
              className="p-2.5 hover:bg-gray-100 active:bg-gray-200 transition-all duration-150
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2A3170]"
            >
              <ChevronRight className="w-5 h-5 text-gray-700" />
            </button>
          </div>

          {/* Date Picker - UI ENHANCEMENT: Premium styling with better visual hierarchy */}
          <div className="flex items-center gap-2.5 bg-white border border-gray-300 rounded-lg px-4 py-2.5 shadow-sm hover:shadow-md hover:border-[#2A3170] transition-all duration-150 group">
            <CalendarIcon className="w-4 h-4 text-gray-500 group-hover:text-[#2A3170] transition-colors" />
            <input
              type="date"
              value={format(baseDate, 'yyyy-MM-dd')}
              min={format(today, 'yyyy-MM-dd')}
              className="bg-transparent text-sm font-semibold text-gray-700 focus:outline-none cursor-pointer"
              onChange={(e) => {
                const picked = new Date(e.target.value);
                handleDateChange(picked);
              }}
            />
          </div>

          {rightAction && (
            <div className="flex-shrink-0">
              {rightAction}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};