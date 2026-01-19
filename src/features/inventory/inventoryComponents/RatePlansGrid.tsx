/**
 * Rate Plans Grid Component
 *
 * Displays rate plans with rooms and base rates.
 * New API structure: ratePlans → rooms → days
 * 
 * UI/UX ENHANCEMENTS:
 * - Improved visual hierarchy with better spacing and typography
 * - Enhanced selected column visibility with subtle borders
 * - Better hover and focus states for all interactive elements
 * - Clearer separation between rate plans and rooms
 * - Premium input styling with improved accessibility
 * - Subtle shadows and transitions for modern polish
 * 
 * LAYOUT FIX:
 * - Fixed horizontal overflow issue on accordion expansion
 * - Consistent grid template across all rows
 * - Proper box-sizing and overflow control
 * - Removed layout-affecting scale transforms
 */

import { useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  parseISO,
  format,
  isSameDay,
  startOfToday,
  isBefore,
  isWeekend,
  eachDayOfInterval,
} from 'date-fns';
import { ChevronDown, ChevronRight, DollarSign, AlertTriangle } from 'lucide-react';
import type { RatePlan, RatePlanRoom, RatePlanDay } from '../../type';

/* ----------------------------------
   Date Helpers
----------------------------------- */

const getDateType = (date: Date) => {
  if (isWeekend(date)) return 'WEEKEND';
  return 'NORMAL';
};

// Match RoomTypesGrid styling
const getDateHeaderClasses = (date: Date, isSelected: boolean, isPastDate: boolean) => {
  if (isPastDate) return 'bg-slate-50 text-slate-300 cursor-not-allowed';
  const type = getDateType(date);

  switch (type) {
    case 'WEEKEND':
      return isSelected
        ? 'bg-blue-600 text-white shadow-sm'
        : 'bg-blue-50/80 text-blue-700 hover:bg-blue-100/80';
    default:
      return isSelected
        ? 'bg-blue-600 text-white shadow-sm'
        : 'bg-white text-slate-600 hover:bg-slate-50 border-r border-slate-100';
  }
};

const getSelectedColumnBg = (date: Date) => {
  const type = getDateType(date);
  return type === 'WEEKEND' 
    ? 'bg-blue-50/30' 
    : 'bg-slate-50/50';
};

/* ----------------------------------
   Component
----------------------------------- */

interface RatePlansGridProps {
  ratePlans: RatePlan[];
  fromDate: string; // YYYY-MM-DD from API
  toDate: string; // YYYY-MM-DD from API
  activeDate: Date;
  customerType: string;
  onUpdate: (
    ratePlanId: number,
    roomId: number,
    date: string, // YYYY-MM-DD
    baseRate: number
  ) => void;
  // onSingleRateUpdate removed - API is now called only from Save button
  onActiveDateChange: (date: Date) => void;
  isLocked?: boolean;
  activeEdit?: { ratePlanId: number; roomId: number; date: string } | null;
}

export const RatePlansGrid = ({
  ratePlans,
  fromDate,
  toDate,
  activeDate,
  customerType,
  onUpdate,
  onActiveDateChange,
  isLocked = false,
  activeEdit = null,
}: RatePlansGridProps) => {
  const navigate = useNavigate();
  const [expandedRatePlans, setExpandedRatePlans] = useState<Set<number>>(new Set());
  // Track local input values: key = `${ratePlanId}-${roomId}-${date}`
  const [localValues, setLocalValues] = useState<Map<string, string>>(new Map());

  // Generate dates array from API's from/to dates
  const dates = useMemo(() => {
    try {
      const start = parseISO(fromDate);
      const end = parseISO(toDate);
      return eachDayOfInterval({ start, end });
    } catch (error) {
      console.error('Error parsing dates:', error);
      return [];
    }
  }, [fromDate, toDate]);

  const today = startOfToday();

  const toggleRatePlan = (ratePlanId: number) => {
    setExpandedRatePlans((prev) => {
      const next = new Set(prev);
      next.has(ratePlanId) ? next.delete(ratePlanId) : next.add(ratePlanId);
      return next;
    });
  };

  // Helper to get day data for a specific date
  const getDayData = (days: RatePlanDay[], dateStr: string): RatePlanDay | null => {
    return days.find((d) => d.date === dateStr) || null;
  };

  // Check if rate plan has any missing base rates (0 or null)
  const hasMissingBaseRates = (ratePlan: RatePlan): boolean => {
    return ratePlan.rooms.some((room) =>
      room.days.some((day) => day.baseRate === 0 || day.baseRate === null || day.baseRate === undefined)
    );
  };

  // Get base rate value for display (treat 0 as empty)
  const getBaseRateValue = (baseRate: number | null | undefined): string | number => {
    if (baseRate === null || baseRate === undefined || baseRate === 0) {
      return '';
    }
    return baseRate;
  };

  const numColumns = dates.length;

  return (
    <div className="border border-slate-200/60 rounded-xl overflow-hidden shadow-sm bg-white">
      {/* Header Row */}
      <div className={`grid bg-slate-50/50 border-b border-slate-200/60`}
           style={{ gridTemplateColumns: `280px repeat(${numColumns}, 1fr)` }}>
        <div className="flex items-center px-6 py-4 font-medium text-xs text-slate-600 border-r border-slate-200/60 uppercase tracking-wide">
          Rate Plans
        </div>

        {dates.map((date, index) => {
          const isSelected = isSameDay(date, activeDate);
          const isPastDate =
            isBefore(date, today) && !isSameDay(date, today);

          return (
            <button
              key={index}
              disabled={isPastDate}
              onClick={() => !isPastDate && onActiveDateChange(date)}
              className={`
                flex flex-col items-center justify-center py-3.5 last:border-r-0
                transition-all duration-150 outline-none
                ${getDateHeaderClasses(date, isSelected, isPastDate)}
              `}
            >
              <span className="text-[9px] font-semibold uppercase mb-1 tracking-wider opacity-75">
                {format(date, 'EEE')}
              </span>
              <span className="text-2xl font-bold tabular-nums">
                {format(date, 'd')}
              </span>
              <span className="text-[9px] font-semibold uppercase mt-0.5 opacity-75">
                {format(date, 'MMM')}
              </span>
            </button>
          );
        })}
      </div>

      {/* Rate Plans */}
      {ratePlans.map((ratePlan, ratePlanIndex) => {
        const isExpanded = expandedRatePlans.has(ratePlan.ratePlanId);
        const hasMissingRates = hasMissingBaseRates(ratePlan);

        return (
          <div 
            key={ratePlan.ratePlanId} 
            className={`${ratePlanIndex > 0 ? 'border-t border-slate-200/60' : ''}`}
          >
            {/* 
              LAYOUT FIX: Rate plan header uses EXACT same grid template as header
              This prevents width misalignment
            */}
            <button
              onClick={() => toggleRatePlan(ratePlan.ratePlanId)}
              className={`w-full bg-white hover:bg-slate-50/30 transition-all duration-150 group`}
              style={{ gridTemplateColumns: `280px repeat(${numColumns}, 1fr)`, display: 'grid' }}
            >
              <div className={`flex items-center px-6 py-4 font-semibold text-sm text-slate-800 border-r border-slate-200/60 bg-slate-50/40 ${
                ratePlanIndex > 0 ? 'border-t border-slate-200/60' : ''
              }`}>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 mr-3 text-slate-600 transition-transform group-hover:translate-y-0.5" />
                ) : (
                  <ChevronRight className="w-5 h-5 mr-3 text-slate-600 transition-transform group-hover:translate-x-0.5" />
                )}
                <span className="group-hover:text-blue-600 transition-colors">
                  {ratePlan.ratePlanName}
                </span>
              </div>

              {dates.map((date, i) => (
                <div
                  key={i}
                  className={`border-r border-slate-200/60 last:border-r-0 transition-colors duration-150 ${
                    isSameDay(date, activeDate)
                      ? getSelectedColumnBg(date)
                      : ''
                  }`}
                />
              ))}
            </button>

            {/* Validation Message - Show if rate plan has missing base rates */}
            {isExpanded && hasMissingRates && (
              <div className="bg-amber-50/80 border-l-4 border-amber-400/60 p-3 mx-0">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <p className="text-sm text-amber-800">
                    Please note, you have not added your Base Adult Rate for some dates. Your rate plan will not show for a search of 2 or more adults.
                  </p>
                </div>
              </div>
            )}

            {/* Rooms under this rate plan */}
            {isExpanded &&
              ratePlan.rooms.map((room, roomIndex) => (
                <div key={room.roomId}>
                  {/* Base Rate Row */}
                  <div 
                    className={`grid ${roomIndex > 0 ? 'border-t border-slate-200/60' : ''} bg-white hover:bg-slate-50/30 transition-colors duration-150`}
                    style={{ gridTemplateColumns: `280px repeat(${numColumns}, 1fr)` }}
                  >
                    {/* Room Name Column */}
                    <div className="flex items-center px-6 py-4 font-semibold text-sm text-slate-800 border-r border-slate-200/60 bg-slate-50/40">
                      {room.roomName}
                    </div>

                    {dates.map((date, i) => {
                      const isSelected = isSameDay(date, activeDate);
                      const dateStr = format(date, 'yyyy-MM-dd');
                      const dayData = getDayData(room.days, dateStr);
                      const baseRate = dayData?.baseRate ?? 0;
                      
                      // Use local value if exists, otherwise use display value from day data
                      const cellKey = `${ratePlan.ratePlanId}-${room.roomId}-${dateStr}`;
                      const localValue = localValues.get(cellKey);
                      const displayValue = localValue !== undefined 
                        ? localValue 
                        : getBaseRateValue(baseRate);
                      
                      const isThisCellEdited = activeEdit?.ratePlanId === ratePlan.ratePlanId && 
                                               activeEdit?.roomId === room.roomId && 
                                               activeEdit?.date === dateStr;
                      const canEdit = isSelected && (!isLocked || isThisCellEdited);

                      const handleBlur = () => {
                        if (!isSelected) return;
                        
                        // Clear local value - state is already updated via onChange
                        setLocalValues((prev) => {
                          const next = new Map(prev);
                          next.delete(cellKey);
                          return next;
                        });
                        // No need to call onUpdate here - it's already called in onChange
                      };

                      const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
                        if (!isSelected || e.key !== 'Enter') return;
                        e.preventDefault();
                        e.currentTarget.blur(); // Trigger blur which updates local state
                      };

                      const hasRate = baseRate > 0;
                      const displayBaseRate = baseRate || 0;

                      return (
                        <div
                          key={i}
                          className={`
                            border-r border-slate-200/60 last:border-r-0 px-3 py-4 flex flex-col items-center justify-center
                            transition-colors duration-150
                            ${isSelected ? getSelectedColumnBg(date) : ''}
                          `}
                        >
                          <input
                            type="number"
                            value={displayValue}
                            readOnly={!canEdit}
                            onChange={(e) => {
                              if (canEdit) {
                                const inputValue = e.target.value === '' ? 0 : Number(e.target.value);
                                // Update local state immediately to show Save/Cancel buttons
                                onUpdate(ratePlan.ratePlanId, room.roomId, dateStr, inputValue);
                                // Also store in localValues for display
                                setLocalValues((prev) => {
                                  const next = new Map(prev);
                                  next.set(cellKey, e.target.value);
                                  return next;
                                });
                              }
                            }}
                            onBlur={handleBlur}
                            onKeyDown={handleKeyDown}
                            className={`
                              w-20 h-11 border rounded-lg font-semibold text-lg text-center transition-all duration-150
                              tabular-nums
                              ${canEdit
                                ? 'ring-2 ring-blue-600/40 border-blue-600/30 shadow-sm bg-white focus:ring-blue-600/60 focus:border-blue-600' 
                                : 'cursor-not-allowed bg-slate-50/80 border-slate-200/80 text-slate-400'}
                              ${hasRate && canEdit ? 'text-emerald-700' : ''}
                              ${!hasRate && canEdit ? 'text-rose-600' : ''}
                              focus:outline-none
                            `}
                            placeholder={canEdit ? '0' : '—'}
                          />
                          
                          <div className="flex flex-col items-center mt-2.5 gap-0.5">
                            <span className={`
                              text-[10px] font-medium uppercase tracking-wide
                              ${hasRate ? 'text-emerald-600' : 'text-rose-500'}
                            `}>
                              {hasRate ? `${displayBaseRate} Set` : 'Not Set'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Extra Rates & Inventory Button */}
                  <div className={`border-t border-slate-200/60 bg-slate-50/30`}
                       style={{ gridTemplateColumns: `280px repeat(${numColumns}, 1fr)`, display: 'grid' }}>
                    <div className="flex items-center px-6 py-3 border-r border-slate-200/60">
                      <button
                        type="button"
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 hover:border-slate-400 transition-colors"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // No handler - button is for UI only as per requirements
                        }}
                      >
                        Extra Rates & Inventory
                      </button>
                    </div>
                    {dates.map((date, i) => (
                      <div
                        key={i}
                        className="border-r border-slate-200/60 last:border-r-0"
                      />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        );
      })}
    </div>
  );
};
