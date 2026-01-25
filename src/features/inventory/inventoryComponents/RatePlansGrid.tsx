/**
 * Rate Plans Grid Component
 *
 * Displays rooms with rate plans in accordion format.
 * New API structure: rooms → ratePlans → days
 * 
 * UI Flow:
 * - Shows list of Rooms
 * - User clicks a Room to expand
 * - Expanded room shows Rate Plans
 * - Under each Rate Plan show day-wise rates data
 * - Only one room expanded at a time (accordion behavior)
 */

import { useMemo, useState, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { useNavigate } from 'react-router';
import {
  parseISO,
  format,
  isSameDay,
  startOfToday,
  isBefore,
  isWeekend,
  eachDayOfInterval,
} from 'date-fns';
import { ChevronDown, ChevronRight, AlertTriangle, X, User, Users } from 'lucide-react';
import type { RatesRoom, RoomRatePlan, RoomRateDay } from '../type';
import { getDayData, formatTimeForInput, formatRate } from '../utils/rateHelpers';

/* ----------------------------------
   Date Helpers
----------------------------------- */

const getDateType = (date: Date) => {
  if (isWeekend(date)) return 'WEEKEND';
  return 'NORMAL';
};

const getDateHeaderClasses = (date: Date, isSelected: boolean, isPastDate: boolean) => {
  if (isPastDate) return 'bg-slate-50 text-slate-300 cursor-not-allowed';
  const type = getDateType(date);

  switch (type) {
    case 'WEEKEND':
      return isSelected
        ? 'bg-blue-600 text-white shadow-sm'
        : 'bg-green-50/80 text-green-700 hover:bg-green-100/80';
    default:
      return isSelected
        ? 'bg-blue-600 text-white shadow-sm'
        : 'bg-white text-slate-600 hover:bg-slate-50 border-r border-slate-100';
  }
};

const getSelectedColumnBg = (date: Date) => {
  const type = getDateType(date);
  return type === 'WEEKEND' 
    ? 'bg-green-50/30' 
    : 'bg-slate-50/50';
};

/* ----------------------------------
   Component
----------------------------------- */

interface RatePlansGridProps {
  rooms: RatesRoom[];
  fromDate: string; // YYYY-MM-DD from API
  toDate: string; // YYYY-MM-DD from API
  activeDate: Date;
  customerType: string;
  onUpdate: (
    ratePlanId: number,
    roomId: number,
    date: string, // YYYY-MM-DD
    baseRate: number,
    singleOccupancyRate?: number | null,
    extraAdultCharge?: number,
    paidChildCharge?: number,
    minStay?: number | null | undefined,
    maxStay?: number | null | undefined,
    cutoffTime?: string | null | undefined
  ) => void;
  onActiveDateChange: (date: Date) => void;
  isLocked?: boolean;
  activeEdit?: { 
    ratePlanId: number; 
    roomId: number; 
    date: string;
    baseRate?: number;
    singleOccupancyRate?: number | null;
    extraAdultCharge?: number;
    paidChildCharge?: number;
    minStay?: number | null;
    maxStay?: number | null;
    cutoffTime?: string | null;
  } | null;
}

export const RatePlansGrid = ({
  rooms,
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
  // Accordion state: only one room expanded at a time
  const [expandedRoomId, setExpandedRoomId] = useState<number | null>(null);
  // Track local input values: key = `${ratePlanId}-${roomId}-${date}`
  const [localValues, setLocalValues] = useState<Map<string, string>>(new Map());
  // Track which room/rate plan has "Rate and Restrictions" expanded: key = `${ratePlanId}-${roomId}`
  const [expandedRateRestrictions, setExpandedRateRestrictions] = useState<Set<string>>(new Set());
  // Track selected option (Extra Rates or Restrictions): key = `${ratePlanId}-${roomId}`
  const [selectedOption, setSelectedOption] = useState<Map<string, 'extra-rates' | 'restrictions'>>(new Map());
  // Track dropdown positions for fixed positioning: key = `${ratePlanId}-${roomId}`
  const [dropdownPositions, setDropdownPositions] = useState<Map<string, { top: number; left: number }>>(new Map());

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

  // Toggle room expansion (accordion behavior)
  const toggleRoom = (roomId: number) => {
    setExpandedRoomId((prev) => {
      // If clicking the same room, close it
      if (prev === roomId) {
        return null;
      }
      // Otherwise, expand the new room (closes previous)
      return roomId;
    });
  };

  const toggleRateRestrictions = (ratePlanId: number, roomId: number, buttonElement?: HTMLElement) => {
    const key = `${ratePlanId}-${roomId}`;
    setExpandedRateRestrictions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        setSelectedOption((prevOpt) => {
          const nextOpt = new Map(prevOpt);
          nextOpt.delete(key);
          return nextOpt;
        });
        setDropdownPositions((prevPos) => {
          const nextPos = new Map(prevPos);
          nextPos.delete(key);
          return nextPos;
        });
      } else {
        next.add(key);
        if (buttonElement) {
          const rect = buttonElement.getBoundingClientRect();
          setDropdownPositions((prevPos) => {
            const nextPos = new Map(prevPos);
            nextPos.set(key, {
              top: rect.bottom + 4,
              left: rect.left,
            });
            return nextPos;
          });
        }
      }
      return next;
    });
  };

  const selectOption = (ratePlanId: number, roomId: number, option: 'extra-rates' | 'restrictions') => {
    const key = `${ratePlanId}-${roomId}`;
    setSelectedOption((prev) => {
      const next = new Map(prev);
      next.set(key, option);
      return next;
    });
    setExpandedRateRestrictions((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const closeRateRestrictions = (ratePlanId: number, roomId: number) => {
    const key = `${ratePlanId}-${roomId}`;
    setSelectedOption((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  };

  // Get base rate value for display (treat 0 as empty)
  const getBaseRateValue = (baseRate: number | null | undefined): string | number => {
    if (baseRate === null || baseRate === undefined || baseRate === 0) {
      return '';
    }
    return baseRate;
  };

  // Helper to get current value from activeEdit if available, otherwise from dayData
  const getCurrentValue = (
    ratePlanId: number,
    roomId: number,
    dateStr: string,
    field: 'baseRate' | 'singleOccupancyRate' | 'extraAdultCharge' | 'paidChildCharge' | 'minStay' | 'maxStay' | 'cutoffTime',
    dayData: RoomRateDay | null
  ): number | string | null => {
    if (activeEdit?.ratePlanId === ratePlanId && 
        activeEdit?.roomId === roomId && 
        activeEdit?.date === dateStr) {
      if (field === 'baseRate' && activeEdit.baseRate !== undefined) return activeEdit.baseRate;
      if (field === 'singleOccupancyRate' && activeEdit.singleOccupancyRate !== undefined) return activeEdit.singleOccupancyRate;
      if (field === 'extraAdultCharge' && activeEdit.extraAdultCharge !== undefined) return activeEdit.extraAdultCharge;
      if (field === 'paidChildCharge' && activeEdit.paidChildCharge !== undefined) return activeEdit.paidChildCharge;
      if (field === 'minStay' && activeEdit.minStay !== undefined) return activeEdit.minStay;
      if (field === 'maxStay' && activeEdit.maxStay !== undefined) return activeEdit.maxStay;
      if (field === 'cutoffTime' && activeEdit.cutoffTime !== undefined) return activeEdit.cutoffTime;
    }
    if (field === 'baseRate') return dayData?.baseRate ?? 0;
    if (field === 'singleOccupancyRate') return dayData?.singleOccupancyRate ?? null;
    if (field === 'extraAdultCharge') return dayData?.extraAdultCharge ?? 0;
    if (field === 'paidChildCharge') return dayData?.paidChildCharge ?? 0;
    if (field === 'minStay') return dayData?.minStay ?? null;
    if (field === 'maxStay') return dayData?.maxStay ?? null;
    if (field === 'cutoffTime') return dayData?.cutoffTime ?? null;
    return 0;
  };

  // Check if rate plan has any missing base rates
  const hasMissingBaseRates = (ratePlan: RoomRatePlan): boolean => {
    return ratePlan.days.some((day) => 
      day.baseRate === 0 || day.baseRate === null || day.baseRate === undefined
    );
  };

  const numColumns = dates.length;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-md bg-white">
      {/* Header Row */}
      <div className={`grid bg-slate-100/80 border-b border-slate-200`}
           style={{ gridTemplateColumns: `280px repeat(${numColumns}, 1fr)` }}>
        <div className="flex items-center px-6 py-4 font-bold text-xs text-slate-700 border-r border-slate-200 uppercase tracking-wider">
          Rooms
        </div>

        {dates.map((date, index) => {
          const isSelected = isSameDay(date, activeDate);
          const isPastDate = isBefore(date, today) && !isSameDay(date, today);

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

      {/* Rooms List */}
      {rooms.map((room, roomIndex) => {
        const isExpanded = expandedRoomId === room.roomId;

        return (
          <div 
            key={room.roomId} 
            className={`${roomIndex > 0 ? 'border-t border-slate-200' : ''}`}
            style={{ position: 'relative', overflow: 'visible' }}
          >
            {/* Room Header Row - Clickable */}
            <button
              onClick={() => toggleRoom(room.roomId)}
              className={`w-full bg-gray-100 hover:bg-gray-200 transition-all duration-150 group`}
              style={{ gridTemplateColumns: `280px repeat(${numColumns}, 1fr)`, display: 'grid' }}
            >
              <div className={`flex items-center px-6 py-4 font-bold text-sm text-slate-900 border-r border-slate-200 bg-slate-50/60`}>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 mr-3 text-slate-600 transition-transform group-hover:translate-y-0.5" />
                ) : (
                  <ChevronRight className="w-5 h-5 mr-3 text-slate-600 transition-transform group-hover:translate-x-0.5" />
                )}
                <span className="group-hover:text-blue-600 transition-colors">
                  {room.roomName}
                </span>
              </div>

              {dates.map((date, i) => (
                <div
                  key={i}
                  className={`border-r border-slate-200 last:border-r-0 transition-colors duration-150 ${
                    isSameDay(date, activeDate)
                      ? getSelectedColumnBg(date)
                      : ''
                  }`}
                />
              ))}
            </button>

            {/* Expanded Content - Rate Plans for this Room */}
            {isExpanded && room.ratePlans.map((ratePlan, ratePlanIndex) => {
              const hasMissingRates = hasMissingBaseRates(ratePlan);

              return (
                <div key={ratePlan.ratePlanId} className="border-t border-slate-200">
                  {/* Rate Plan Header */}
                  <div className="bg-blue-100/50 border-b border-slate-200 px-6 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-800">
                        {ratePlan.ratePlanName}
                      </span>
                      {hasMissingRates && (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      )}
                    </div>
                    {hasMissingRates && (
                      <p className="text-xs text-amber-700 mt-1">
                        Some dates have missing base rates
                      </p>
                    )}
                  </div>

                  {/* Base Rate Row */}
                  <div 
                    className="grid bg-white hover:bg-slate-50/30 transition-colors duration-150"
                    style={{ gridTemplateColumns: `280px repeat(${numColumns}, 1fr)` }}
                  >
                    <div className="flex items-center gap-3 px-6 py-4 border-r border-slate-200 bg-slate-50/60">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600">
                        <Users className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-900">
                          Base Rate
                        </span>
                        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                          Double Occupancy
                        </span>
                      </div>
                    </div>

                    {dates.map((date, i) => {
                      const isSelected = isSameDay(date, activeDate);
                      const dateStr = format(date, 'yyyy-MM-dd');
                      const dayData = getDayData(ratePlan.days, dateStr);
                      const baseRate = dayData?.baseRate ?? 0;
                      
                      const cellKey = `${ratePlan.ratePlanId}-${room.roomId}-${dateStr}`;
                      const localValue = localValues.get(cellKey);
                      const displayValue = localValue !== undefined 
                        ? localValue 
                        : getBaseRateValue(baseRate);
                      
                      const isThisCellEdited = activeEdit?.ratePlanId === ratePlan.ratePlanId && 
                                               activeEdit?.roomId === room.roomId && 
                                               activeEdit?.date === dateStr;
                      const canEdit = isSelected && (!isLocked || isThisCellEdited);

                      const hasRate = baseRate > 0;
                      const displayBaseRate = baseRate || 0;
                      const isNotSet = baseRate === 0 || baseRate === null || baseRate === undefined;

                      return (
                        <div
                          key={i}
                          className={`
                            border-r border-slate-200 last:border-r-0 px-3 py-4 flex flex-col items-center justify-center
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
                                const singleOccupancyRate = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'singleOccupancyRate', dayData) as number | null;
                                const extraAdultCharge = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'extraAdultCharge', dayData) as number;
                                const paidChildCharge = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'paidChildCharge', dayData) as number;
                                const minStay = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'minStay', dayData) as number | null;
                                const maxStay = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'maxStay', dayData) as number | null;
                                const cutoffTime = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'cutoffTime', dayData) as string | null;
                                onUpdate(ratePlan.ratePlanId, room.roomId, dateStr, inputValue, singleOccupancyRate, extraAdultCharge, paidChildCharge, minStay, maxStay, cutoffTime);
                                setLocalValues((prev) => {
                                  const next = new Map(prev);
                                  next.set(cellKey, e.target.value);
                                  return next;
                                });
                              }
                            }}
                            onBlur={() => {
                              if (isSelected) {
                                setLocalValues((prev) => {
                                  const next = new Map(prev);
                                  next.delete(cellKey);
                                  return next;
                                });
                              }
                            }}
                            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                              if (!isSelected || e.key !== 'Enter') return;
                              e.preventDefault();
                              e.currentTarget.blur();
                            }}
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
                            placeholder={isNotSet ? '-' : undefined}
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

                  {/* Single Occupancy Rate Row - Conditionally rendered */}
                  {ratePlan.days.some((day) => day.singleOccupancyRate !== undefined) && (
                    <div 
                      className="grid border-t border-slate-100 bg-slate-50/40 hover:bg-slate-50/50 transition-colors duration-150"
                      style={{ gridTemplateColumns: `280px repeat(${numColumns}, 1fr)` }}
                    >
                      <div className="flex items-center gap-3 px-6 py-3 border-r border-slate-200 bg-slate-50/70">
                        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-500">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-slate-700">
                            Single Occupancy
                          </span>
                          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                            Single Adult Rate
                          </span>
                        </div>
                      </div>

                      {dates.map((date, i) => {
                        const isSelected = isSameDay(date, activeDate);
                        const dateStr = format(date, 'yyyy-MM-dd');
                        const dayData = getDayData(ratePlan.days, dateStr);
                        const singleRate = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'singleOccupancyRate', dayData) as number | null;
                        
                        const cellKey = `${ratePlan.ratePlanId}-${room.roomId}-${dateStr}-singleOccupancy`;
                        const localValue = localValues.get(cellKey);
                        const displayValue = localValue !== undefined 
                          ? localValue 
                          : (singleRate !== null && singleRate !== undefined && singleRate > 0 ? singleRate.toString() : '');
                        
                        const isThisCellEdited = activeEdit?.ratePlanId === ratePlan.ratePlanId && 
                                                 activeEdit?.roomId === room.roomId && 
                                                 activeEdit?.date === dateStr;
                        const canEdit = isSelected && (!isLocked || isThisCellEdited);

                        const hasRate = singleRate !== null && singleRate !== undefined && singleRate > 0;
                        const displaySingleRate = singleRate || 0;
                        const isNotSet = singleRate === null || singleRate === undefined || singleRate === 0;

                        return (
                          <div
                            key={i}
                            className={`
                              border-r border-slate-200 last:border-r-0 px-3 py-3 flex flex-col items-center justify-center
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
                                  const inputValue = e.target.value === '' ? null : Number(e.target.value);
                                  const baseRate = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'baseRate', dayData) as number;
                                  const extraAdultCharge = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'extraAdultCharge', dayData) as number;
                                  const paidChildCharge = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'paidChildCharge', dayData) as number;
                                  const minStay = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'minStay', dayData) as number | null;
                                  const maxStay = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'maxStay', dayData) as number | null;
                                  const cutoffTime = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'cutoffTime', dayData) as string | null;
                                  onUpdate(ratePlan.ratePlanId, room.roomId, dateStr, baseRate, inputValue ?? undefined, extraAdultCharge, paidChildCharge, minStay ?? undefined, maxStay ?? undefined, cutoffTime ?? undefined);
                                  setLocalValues((prev) => {
                                    const next = new Map(prev);
                                    next.set(cellKey, e.target.value);
                                    return next;
                                  });
                                }
                              }}
                              onBlur={() => {
                                if (isSelected) {
                                  setLocalValues((prev) => {
                                    const next = new Map(prev);
                                    next.delete(cellKey);
                                    return next;
                                  });
                                }
                              }}
                              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                                if (!isSelected || e.key !== 'Enter') return;
                                e.preventDefault();
                                e.currentTarget.blur();
                              }}
                              className={`
                                w-20 h-10 border rounded-lg font-medium text-base text-center transition-all duration-150
                                tabular-nums
                                ${canEdit
                                  ? 'ring-2 ring-blue-500/30 border-blue-500/20 shadow-sm bg-white focus:ring-blue-500/50 focus:border-blue-500' 
                                  : 'cursor-not-allowed bg-slate-50/60 border-slate-200/60 text-slate-400'}
                                ${hasRate && canEdit ? 'text-emerald-600' : ''}
                                ${!hasRate && canEdit ? 'text-slate-500' : ''}
                                focus:outline-none
                              `}
                              placeholder={isNotSet ? '-' : undefined}
                            />
                            
                            <div className="flex flex-col items-center mt-2.5 gap-0.5">
                              <span className={`
                                text-[10px] font-medium uppercase tracking-wide
                                ${hasRate ? 'text-emerald-600' : 'text-rose-500'}
                              `}>
                                {hasRate ? `${displaySingleRate} Set` : 'Not Set'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Rate and Restrictions Button with Dropdown */}
                  <div className={`border-t border-slate-200 bg-slate-50/30`}
                       style={{ gridTemplateColumns: `280px repeat(${numColumns}, 1fr)`, display: 'grid', position: 'relative', zIndex: 1, overflow: 'visible' }}>
                    <div className="relative flex items-center gap-2 px-6 py-3 border-r border-slate-200" style={{ zIndex: 1000 }}>
                      <div className="relative" style={{ zIndex: 1001 }}>
                        <button
                          type="button"
                          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 hover:border-slate-400 transition-colors flex items-center gap-2"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleRateRestrictions(ratePlan.ratePlanId, room.roomId, e.currentTarget);
                          }}
                        >
                          Rate and Restrictions
                          <ChevronDown className={`w-4 h-4 transition-transform ${
                            expandedRateRestrictions.has(`${ratePlan.ratePlanId}-${room.roomId}`) ? 'rotate-180' : ''
                          }`} />
                        </button>
                        
                        {expandedRateRestrictions.has(`${ratePlan.ratePlanId}-${room.roomId}`) && (() => {
                          const key = `${ratePlan.ratePlanId}-${room.roomId}`;
                          const position = dropdownPositions.get(key);
                          return (
                            <div 
                              className="fixed bg-white border border-slate-300 rounded-md shadow-xl min-w-[180px]" 
                              style={{ 
                                zIndex: 9999,
                                top: position?.top ?? 0,
                                left: position?.left ?? 0,
                              }}
                            >
                              <button
                                type="button"
                                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors first:rounded-t-md"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  selectOption(ratePlan.ratePlanId, room.roomId, 'extra-rates');
                                }}
                              >
                                Extra Rates
                              </button>
                              <button
                                type="button"
                                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors last:rounded-b-md border-t border-slate-200"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  selectOption(ratePlan.ratePlanId, room.roomId, 'restrictions');
                                }}
                              >
                                Restrictions
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                      
                      {selectedOption.get(`${ratePlan.ratePlanId}-${room.roomId}`) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            closeRateRestrictions(ratePlan.ratePlanId, room.roomId);
                          }}
                          className="p-1.5 hover:bg-slate-200 rounded transition-colors flex items-center justify-center"
                          aria-label="Close Rate and Restrictions section"
                        >
                          <X className="w-4 h-4 text-slate-600" />
                        </button>
                      )}
                    </div>
                    {dates.map((date, i) => (
                      <div
                        key={i}
                        className="border-r border-slate-200 last:border-r-0"
                      />
                    ))}
                  </div>

                  {/* Extra Rates Rows */}
                  {selectedOption.get(`${ratePlan.ratePlanId}-${room.roomId}`) === 'extra-rates' && (
                    <>
                      {/* Extra Adult Charge Row */}
                      <div 
                        className="grid border-t border-slate-200 bg-white hover:bg-slate-50/30 transition-colors duration-150"
                        style={{ gridTemplateColumns: `280px repeat(${numColumns}, 1fr)` }}
                      >
                        <div className="flex items-center px-6 py-4 font-bold text-sm text-slate-900 border-r border-slate-200 bg-slate-50/60">
                          Extra Adult Charge
                        </div>

                        {dates.map((date, i) => {
                          const isSelected = isSameDay(date, activeDate);
                          const dateStr = format(date, 'yyyy-MM-dd');
                          const dayData = getDayData(ratePlan.days, dateStr);
                          const extraAdultCharge = dayData?.extraAdultCharge ?? 0;
                          
                          const cellKey = `${ratePlan.ratePlanId}-${room.roomId}-${dateStr}-extraAdult`;
                          const localValue = localValues.get(cellKey);
                          const displayValue = localValue !== undefined 
                            ? localValue 
                            : (extraAdultCharge > 0 ? extraAdultCharge.toString() : '');
                          
                          const isThisCellEdited = activeEdit?.ratePlanId === ratePlan.ratePlanId && 
                                                   activeEdit?.roomId === room.roomId && 
                                                   activeEdit?.date === dateStr;
                          const canEdit = isSelected && (!isLocked || isThisCellEdited);

                          return (
                            <div
                              key={i}
                              className={`
                                border-r border-slate-200 last:border-r-0 px-3 py-4 flex flex-col items-center justify-center
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
                                    const baseRate = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'baseRate', dayData) as number;
                                    const singleOccupancyRate = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'singleOccupancyRate', dayData) as number | null;
                                    const paidChildCharge = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'paidChildCharge', dayData) as number;
                                    const minStay = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'minStay', dayData) as number | null;
                                    const maxStay = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'maxStay', dayData) as number | null;
                                    const cutoffTime = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'cutoffTime', dayData) as string | null;
                                    onUpdate(ratePlan.ratePlanId, room.roomId, dateStr, baseRate, singleOccupancyRate ?? undefined, inputValue, paidChildCharge, minStay ?? undefined, maxStay ?? undefined, cutoffTime ?? undefined);
                                    setLocalValues((prev) => {
                                      const next = new Map(prev);
                                      next.set(cellKey, e.target.value);
                                      return next;
                                    });
                                  }
                                }}
                                onBlur={() => {
                                  if (isSelected) {
                                    setLocalValues((prev) => {
                                      const next = new Map(prev);
                                      next.delete(cellKey);
                                      return next;
                                    });
                                  }
                                }}
                                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                                  if (!isSelected || e.key !== 'Enter') return;
                                  e.preventDefault();
                                  e.currentTarget.blur();
                                }}
                                className={`
                                  w-20 h-11 border rounded-lg font-semibold text-lg text-center transition-all duration-150
                                  tabular-nums
                                  ${canEdit
                                    ? 'ring-2 ring-blue-600/40 border-blue-600/30 shadow-sm bg-white focus:ring-blue-600/60 focus:border-blue-600' 
                                    : 'cursor-not-allowed bg-slate-50/80 border-slate-200/80 text-slate-400'}
                                  ${extraAdultCharge > 0 && canEdit ? 'text-emerald-700' : ''}
                                  ${!extraAdultCharge && canEdit ? 'text-rose-600' : ''}
                                  focus:outline-none
                                `}
                                placeholder={canEdit ? '0' : '—'}
                              />
                              
                              <div className="flex flex-col items-center mt-2.5 gap-0.5">
                                <span className={`
                                  text-[10px] font-medium uppercase tracking-wide
                                  ${extraAdultCharge > 0 ? 'text-emerald-600' : 'text-rose-500'}
                                `}>
                                  {extraAdultCharge > 0 ? `${extraAdultCharge} Set` : 'Not Set'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Paid Child Charge Row */}
                      <div 
                        className="grid border-t border-slate-200 bg-white hover:bg-slate-50/30 transition-colors duration-150"
                        style={{ gridTemplateColumns: `280px repeat(${numColumns}, 1fr)` }}
                      >
                        <div className="flex items-center px-6 py-4 font-bold text-sm text-slate-900 border-r border-slate-200 bg-slate-50/60">
                          Paid Child Charge (6-12 years)
                        </div>

                        {dates.map((date, i) => {
                          const isSelected = isSameDay(date, activeDate);
                          const dateStr = format(date, 'yyyy-MM-dd');
                          const dayData = getDayData(ratePlan.days, dateStr);
                          const paidChildCharge = dayData?.paidChildCharge ?? 0;
                          
                          const cellKey = `${ratePlan.ratePlanId}-${room.roomId}-${dateStr}-paidChild`;
                          const localValue = localValues.get(cellKey);
                          const displayValue = localValue !== undefined 
                            ? localValue 
                            : (paidChildCharge > 0 ? paidChildCharge.toString() : '');
                          
                          const isThisCellEdited = activeEdit?.ratePlanId === ratePlan.ratePlanId && 
                                                   activeEdit?.roomId === room.roomId && 
                                                   activeEdit?.date === dateStr;
                          const canEdit = isSelected && (!isLocked || isThisCellEdited);

                          return (
                            <div
                              key={i}
                              className={`
                                border-r border-slate-200 last:border-r-0 px-3 py-4 flex flex-col items-center justify-center
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
                                    const baseRate = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'baseRate', dayData) as number;
                                    const singleOccupancyRate = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'singleOccupancyRate', dayData) as number | null;
                                    const extraAdultCharge = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'extraAdultCharge', dayData) as number;
                                    const minStay = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'minStay', dayData) as number | null;
                                    const maxStay = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'maxStay', dayData) as number | null;
                                    const cutoffTime = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'cutoffTime', dayData) as string | null;
                                    onUpdate(ratePlan.ratePlanId, room.roomId, dateStr, baseRate, singleOccupancyRate ?? undefined, extraAdultCharge, inputValue, minStay ?? undefined, maxStay ?? undefined, cutoffTime ?? undefined);
                                    setLocalValues((prev) => {
                                      const next = new Map(prev);
                                      next.set(cellKey, e.target.value);
                                      return next;
                                    });
                                  }
                                }}
                                onBlur={() => {
                                  if (isSelected) {
                                    setLocalValues((prev) => {
                                      const next = new Map(prev);
                                      next.delete(cellKey);
                                      return next;
                                    });
                                  }
                                }}
                                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                                  if (!isSelected || e.key !== 'Enter') return;
                                  e.preventDefault();
                                  e.currentTarget.blur();
                                }}
                                className={`
                                  w-20 h-11 border rounded-lg font-semibold text-lg text-center transition-all duration-150
                                  tabular-nums
                                  ${canEdit
                                    ? 'ring-2 ring-blue-600/40 border-blue-600/30 shadow-sm bg-white focus:ring-blue-600/60 focus:border-blue-600' 
                                    : 'cursor-not-allowed bg-slate-50/80 border-slate-200/80 text-slate-400'}
                                  ${paidChildCharge > 0 && canEdit ? 'text-emerald-700' : ''}
                                  ${!paidChildCharge && canEdit ? 'text-rose-600' : ''}
                                  focus:outline-none
                                `}
                                placeholder={canEdit ? '0' : '—'}
                              />
                              
                              <div className="flex flex-col items-center mt-2.5 gap-0.5">
                                <span className={`
                                  text-[10px] font-medium uppercase tracking-wide
                                  ${paidChildCharge > 0 ? 'text-emerald-600' : 'text-rose-500'}
                                `}>
                                  {paidChildCharge > 0 ? `${paidChildCharge} Set` : 'Not Set'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* Restrictions Rows */}
                  {selectedOption.get(`${ratePlan.ratePlanId}-${room.roomId}`) === 'restrictions' && (
                    <>
                      {/* Minimum Length of Stay Row */}
                      <div 
                        className="grid border-t border-slate-200 bg-white hover:bg-slate-50/30 transition-colors duration-150"
                        style={{ gridTemplateColumns: `280px repeat(${numColumns}, 1fr)` }}
                      >
                        <div className="flex items-center px-6 py-4 font-bold text-sm text-slate-900 border-r border-slate-200 bg-slate-50/60">
                          Minimum Length of Stay
                        </div>

                        {dates.map((date, i) => {
                          const isSelected = isSameDay(date, activeDate);
                          const dateStr = format(date, 'yyyy-MM-dd');
                          const dayData = getDayData(ratePlan.days, dateStr);
                          const minStay = dayData?.minStay ?? null;
                          
                          const cellKey = `${ratePlan.ratePlanId}-${room.roomId}-${dateStr}-minStay`;
                          const localValue = localValues.get(cellKey);
                          const displayValue = localValue !== undefined 
                            ? localValue 
                            : (minStay !== null && minStay !== undefined ? minStay.toString() : '');
                          
                          const isThisCellEdited = activeEdit?.ratePlanId === ratePlan.ratePlanId && 
                                                   activeEdit?.roomId === room.roomId && 
                                                   activeEdit?.date === dateStr;
                          const canEdit = isSelected && (!isLocked || isThisCellEdited);

                          return (
                            <div
                              key={i}
                              className={`
                                border-r border-slate-200 last:border-r-0 px-3 py-4 flex flex-col items-center justify-center
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
                                    const inputValue = e.target.value === '' ? null : Number(e.target.value);
                                    const baseRate = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'baseRate', dayData) as number;
                                    const singleOccupancyRate = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'singleOccupancyRate', dayData) as number | null;
                                    const extraAdultCharge = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'extraAdultCharge', dayData) as number;
                                    const paidChildCharge = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'paidChildCharge', dayData) as number;
                                    const maxStay = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'maxStay', dayData) as number | null;
                                    const cutoffTime = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'cutoffTime', dayData) as string | null;
                                    onUpdate(ratePlan.ratePlanId, room.roomId, dateStr, baseRate, singleOccupancyRate ?? undefined, extraAdultCharge, paidChildCharge, inputValue ?? undefined, maxStay ?? undefined, cutoffTime ?? undefined);
                                    setLocalValues((prev) => {
                                      const next = new Map(prev);
                                      next.set(cellKey, e.target.value);
                                      return next;
                                    });
                                  }
                                }}
                                onBlur={() => {
                                  if (isSelected) {
                                    setLocalValues((prev) => {
                                      const next = new Map(prev);
                                      next.delete(cellKey);
                                      return next;
                                    });
                                  }
                                }}
                                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                                  if (!isSelected || e.key !== 'Enter') return;
                                  e.preventDefault();
                                  e.currentTarget.blur();
                                }}
                                className={`
                                  w-20 h-11 border rounded-lg font-semibold text-lg text-center transition-all duration-150
                                  tabular-nums
                                  ${canEdit
                                    ? 'ring-2 ring-blue-600/40 border-blue-600/30 shadow-sm bg-white focus:ring-blue-600/60 focus:border-blue-600' 
                                    : 'cursor-not-allowed bg-slate-50/80 border-slate-200/80 text-slate-400'}
                                  ${minStay !== null && minStay !== undefined && canEdit ? 'text-emerald-700' : ''}
                                  ${(minStay === null || minStay === undefined) && canEdit ? 'text-rose-600' : ''}
                                  focus:outline-none
                                `}
                                placeholder={canEdit ? '0' : '—'}
                                min="0"
                              />
                              
                              <div className="flex flex-col items-center mt-2.5 gap-0.5">
                                <span className={`
                                  text-[10px] font-medium uppercase tracking-wide
                                  ${minStay !== null && minStay !== undefined ? 'text-emerald-600' : 'text-rose-500'}
                                `}>
                                  {minStay !== null && minStay !== undefined ? `${minStay} Set` : 'Not Set'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Maximum Length of Stay Row */}
                      <div 
                        className="grid border-t border-slate-200 bg-white hover:bg-slate-50/30 transition-colors duration-150"
                        style={{ gridTemplateColumns: `280px repeat(${numColumns}, 1fr)` }}
                      >
                        <div className="flex items-center px-6 py-4 font-bold text-sm text-slate-900 border-r border-slate-200 bg-slate-50/60">
                          Maximum Length of Stay
                        </div>

                        {dates.map((date, i) => {
                          const isSelected = isSameDay(date, activeDate);
                          const dateStr = format(date, 'yyyy-MM-dd');
                          const dayData = getDayData(ratePlan.days, dateStr);
                          const maxStay = dayData?.maxStay ?? null;
                          
                          const cellKey = `${ratePlan.ratePlanId}-${room.roomId}-${dateStr}-maxStay`;
                          const localValue = localValues.get(cellKey);
                          const displayValue = localValue !== undefined 
                            ? localValue 
                            : (maxStay !== null && maxStay !== undefined ? maxStay.toString() : '');
                          
                          const isThisCellEdited = activeEdit?.ratePlanId === ratePlan.ratePlanId && 
                                                   activeEdit?.roomId === room.roomId && 
                                                   activeEdit?.date === dateStr;
                          const canEdit = isSelected && (!isLocked || isThisCellEdited);

                          return (
                            <div
                              key={i}
                              className={`
                                border-r border-slate-200 last:border-r-0 px-3 py-4 flex flex-col items-center justify-center
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
                                    const inputValue = e.target.value === '' ? null : Number(e.target.value);
                                    const baseRate = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'baseRate', dayData) as number;
                                    const singleOccupancyRate = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'singleOccupancyRate', dayData) as number | null;
                                    const extraAdultCharge = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'extraAdultCharge', dayData) as number;
                                    const paidChildCharge = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'paidChildCharge', dayData) as number;
                                    const minStay = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'minStay', dayData) as number | null;
                                    const cutoffTime = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'cutoffTime', dayData) as string | null;
                                    onUpdate(ratePlan.ratePlanId, room.roomId, dateStr, baseRate, singleOccupancyRate ?? undefined, extraAdultCharge, paidChildCharge, minStay ?? undefined, inputValue ?? undefined, cutoffTime ?? undefined);
                                    setLocalValues((prev) => {
                                      const next = new Map(prev);
                                      next.set(cellKey, e.target.value);
                                      return next;
                                    });
                                  }
                                }}
                                onBlur={() => {
                                  if (isSelected) {
                                    setLocalValues((prev) => {
                                      const next = new Map(prev);
                                      next.delete(cellKey);
                                      return next;
                                    });
                                  }
                                }}
                                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                                  if (!isSelected || e.key !== 'Enter') return;
                                  e.preventDefault();
                                  e.currentTarget.blur();
                                }}
                                className={`
                                  w-20 h-11 border rounded-lg font-semibold text-lg text-center transition-all duration-150
                                  tabular-nums
                                  ${canEdit
                                    ? 'ring-2 ring-blue-600/40 border-blue-600/30 shadow-sm bg-white focus:ring-blue-600/60 focus:border-blue-600' 
                                    : 'cursor-not-allowed bg-slate-50/80 border-slate-200/80 text-slate-400'}
                                  ${maxStay !== null && maxStay !== undefined && canEdit ? 'text-emerald-700' : ''}
                                  ${(maxStay === null || maxStay === undefined) && canEdit ? 'text-rose-600' : ''}
                                  focus:outline-none
                                `}
                                placeholder={canEdit ? '0' : '—'}
                                min="0"
                              />
                              
                              <div className="flex flex-col items-center mt-2.5 gap-0.5">
                                <span className={`
                                  text-[10px] font-medium uppercase tracking-wide
                                  ${maxStay !== null && maxStay !== undefined ? 'text-emerald-600' : 'text-rose-500'}
                                `}>
                                  {maxStay !== null && maxStay !== undefined ? `${maxStay} Set` : 'Not Set'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Cutoff Time Row */}
                      <div 
                        className="grid border-t border-slate-200 bg-white hover:bg-slate-50/30 transition-colors duration-150"
                        style={{ gridTemplateColumns: `280px repeat(${numColumns}, 1fr)` }}
                      >
                        <div className="flex items-center px-6 py-4 font-bold text-sm text-slate-900 border-r border-slate-200 bg-slate-50/60">
                          Cutoff Time
                        </div>

                        {dates.map((date, i) => {
                          const isSelected = isSameDay(date, activeDate);
                          const dateStr = format(date, 'yyyy-MM-dd');
                          const dayData = getDayData(ratePlan.days, dateStr);
                          const cutoffTime = dayData?.cutoffTime ?? null;
                          
                          const cellKey = `${ratePlan.ratePlanId}-${room.roomId}-${dateStr}-cutoffTime`;
                          const localValue = localValues.get(cellKey);
                          const displayValue = localValue !== undefined 
                            ? localValue 
                            : formatTimeForInput(cutoffTime);
                          
                          const isThisCellEdited = activeEdit?.ratePlanId === ratePlan.ratePlanId && 
                                                   activeEdit?.roomId === room.roomId && 
                                                   activeEdit?.date === dateStr;
                          const canEdit = isSelected && (!isLocked || isThisCellEdited);

                          return (
                            <div
                              key={i}
                              className={`
                                border-r border-slate-200 last:border-r-0 px-3 py-4 flex flex-col items-center justify-center
                                transition-colors duration-150
                                ${isSelected ? getSelectedColumnBg(date) : ''}
                              `}
                            >
                              <input
                                type="time"
                                value={displayValue}
                                readOnly={!canEdit}
                                onChange={(e) => {
                                  if (canEdit) {
                                    const inputValue = e.target.value === '' ? null : e.target.value;
                                    const baseRate = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'baseRate', dayData) as number;
                                    const singleOccupancyRate = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'singleOccupancyRate', dayData) as number | null;
                                    const extraAdultCharge = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'extraAdultCharge', dayData) as number;
                                    const paidChildCharge = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'paidChildCharge', dayData) as number;
                                    const minStay = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'minStay', dayData) as number | null;
                                    const maxStay = getCurrentValue(ratePlan.ratePlanId, room.roomId, dateStr, 'maxStay', dayData) as number | null;
                                    onUpdate(ratePlan.ratePlanId, room.roomId, dateStr, baseRate, singleOccupancyRate ?? undefined, extraAdultCharge, paidChildCharge, minStay ?? undefined, maxStay ?? undefined, inputValue ?? undefined);
                                    setLocalValues((prev) => {
                                      const next = new Map(prev);
                                      next.set(cellKey, e.target.value);
                                      return next;
                                    });
                                  }
                                }}
                                onBlur={() => {
                                  if (isSelected) {
                                    setLocalValues((prev) => {
                                      const next = new Map(prev);
                                      next.delete(cellKey);
                                      return next;
                                    });
                                  }
                                }}
                                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                                  if (!isSelected || e.key !== 'Enter') return;
                                  e.preventDefault();
                                  e.currentTarget.blur();
                                }}
                                className={`
                                  w-24 h-11 border rounded-lg font-semibold text-sm text-center transition-all duration-150
                                  tabular-nums
                                  ${canEdit
                                    ? 'ring-2 ring-blue-600/40 border-blue-600/30 shadow-sm bg-white focus:ring-blue-600/60 focus:border-blue-600' 
                                    : 'cursor-not-allowed bg-slate-50/80 border-slate-200/80 text-slate-400'}
                                  ${cutoffTime !== null && cutoffTime !== undefined && canEdit ? 'text-emerald-700' : ''}
                                  ${(cutoffTime === null || cutoffTime === undefined) && canEdit ? 'text-rose-600' : ''}
                                  focus:outline-none
                                `}
                                placeholder={canEdit ? 'HH:mm' : '—'}
                              />
                              
                              <div className="flex flex-col items-center mt-2.5 gap-0.5">
                                <span className={`
                                  text-[10px] font-medium uppercase tracking-wide
                                  ${cutoffTime !== null && cutoffTime !== undefined ? 'text-emerald-600' : 'text-rose-500'}
                                `}>
                                  {cutoffTime !== null && cutoffTime !== undefined ? formatTimeForInput(cutoffTime) + ' Set' : 'Not Set'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
