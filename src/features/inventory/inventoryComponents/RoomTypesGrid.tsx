import { Fragment, useMemo, useState, type MouseEvent } from 'react';
import {
  addDays,
  format,
  isSameDay,
  startOfToday,
  isBefore,
  isWeekend,
} from 'date-fns';
import type { InventoryDay, InventoryRoom } from '../type';
import type { RatesRoom } from '../type';
import {
  formatInventoryCutoffDisplay,
  formatTimeForDisplay,
  isInventoryCutoffConfigured,
  blockNegativeNumberKey,
  parseNonNegativeInventoryInput,
  sanitizeNonNegativeDisplayInput,
  getReadOnlyGridCellCursor,
} from '../utils/rateHelpers';
import type { ChildAgePolicyResponse } from '@/features/admin/services/adminService';
import { RatePlansGrid, type OpenLinkRatePlansContext } from './RatePlansGrid';
import { ChevronDown, ChevronRight } from 'lucide-react';

/* ----------------------------------
   Helpers & Styling Logic
----------------------------------- */

/**
 * Per-room-type colour themes. Each room type (cycled by index) gets a distinct
 * accent bar, name-column tint, label colour and a matching tint for its nested
 * meal plans so the groups are easy to tell apart.
 * Full class strings are used so Tailwind can detect them at build time.
 */
const ROOM_THEMES = [
  {
    accent: 'border-l-indigo-500',
    nameBg: 'bg-indigo-50/70',
    nameText: 'text-indigo-900',
    dot: 'bg-indigo-500',
    divider: 'border-t-indigo-600',
    expandedBg: 'bg-indigo-50/30',
    chip: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  },
  {
    accent: 'border-l-emerald-500',
    nameBg: 'bg-emerald-50/70',
    nameText: 'text-emerald-900',
    dot: 'bg-emerald-500',
    divider: 'border-t-emerald-600',
    expandedBg: 'bg-emerald-50/30',
    chip: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  {
    accent: 'border-l-amber-500',
    nameBg: 'bg-amber-50/70',
    nameText: 'text-amber-900',
    dot: 'bg-amber-500',
    divider: 'border-t-amber-600',
    expandedBg: 'bg-amber-50/40',
    chip: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  {
    accent: 'border-l-rose-500',
    nameBg: 'bg-rose-50/70',
    nameText: 'text-rose-900',
    dot: 'bg-rose-500',
    divider: 'border-t-rose-600',
    expandedBg: 'bg-rose-50/30',
    chip: 'bg-rose-100 text-rose-700 border-rose-200',
  },
  {
    accent: 'border-l-violet-500',
    nameBg: 'bg-violet-50/70',
    nameText: 'text-violet-900',
    dot: 'bg-violet-500',
    divider: 'border-t-violet-600',
    expandedBg: 'bg-violet-50/30',
    chip: 'bg-violet-100 text-violet-700 border-violet-200',
  },
  {
    accent: 'border-l-cyan-500',
    nameBg: 'bg-cyan-50/70',
    nameText: 'text-cyan-900',
    dot: 'bg-cyan-500',
    divider: 'border-t-cyan-600',
    expandedBg: 'bg-cyan-50/30',
    chip: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  },
] as const;

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
        : 'bg-green-50/80 text-green-700 hover:bg-green-100/80 cursor-pointer';
    default:
      return isSelected
        ? 'bg-blue-600 text-white shadow-sm'
        : 'bg-white text-slate-600 hover:bg-slate-50 border-r border-slate-100 cursor-pointer';
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

interface RoomTypesGridProps {
  rooms: InventoryRoom[];
  baseDate: Date;
  activeDate: Date;
  onUpdate: (roomId: number, dateStr: string, value: number) => void;
  onActiveDateChange: (date: Date) => void;
  isLocked: boolean;
  isRateLocked?: boolean;
  isReadOnly?: boolean;
  activeEdit: { roomId: number; date: string } | null;
  updatingCells: Set<string>;
  blockingDates?: Set<string>;
  onToggleInventoryBlock?: (
    dateStr: string,
    nextStatus: 'OPEN' | 'CLOSED',
    dayData: InventoryDay,
  ) => void;
  onOpenWalkIn?: (ctx: {
    roomId: number;
    roomName: string;
    inventoryDate: string;
  }) => void;
  // Expand/collapse integration for the existing Rate Plans component
  expandedRoomIds: Set<number>;
  onToggleExpand: (roomId: number) => void;
  rateRoomsByRoomId: Record<number, RatesRoom>;
  loadingRatePlansByRoomId: Record<number, boolean>;
  fromDate: string; // YYYY-MM-DD
  toDate: string; // YYYY-MM-DD
  customerType: string;
  onRatePlanUpdate: (
    ratePlanId: number,
    roomId: number,
    date: string,
    baseRate: number,
    singleOccupancyRate?: number | null | undefined,
    extraAdultCharge?: number | undefined,
    paidChildCharge?: number | undefined,
    minStay?: number | null | undefined,
    maxStay?: number | null | undefined,
    cutoffTime?: string | null | undefined
  ) => void;
  onCommonRestrictionUpdate?: (
    roomId: number,
    date: string,
    patch: {
      minStay?: number | null;
      maxStay?: number | null;
      cta?: boolean;
      ctd?: boolean;
    },
  ) => void;
  activeRestrictionEdit?: {
    roomId: number;
    date: string;
    minStay?: number | null;
    maxStay?: number | null;
    cta?: boolean;
    ctd?: boolean;
  } | null;
  activeRateEdit: {
    ratePlanId: number;
    roomId: number;
    date: string;
    baseRate: number;
    singleOccupancyRate?: number | null;
    extraAdultCharge?: number;
    paidChildCharge?: number;
    minStay?: number | null;
    maxStay?: number | null;
    cutoffTime?: string | null;
  } | null;
  hidePaidChildCharge?: boolean;
  childPolicy?: ChildAgePolicyResponse | null;
  onOpenLinkRatePlans?: (ctx: OpenLinkRatePlansContext) => void;
  calendarIsLinkEnable?: boolean;
  hotelId?: string | null;
  showCommonRestrictions?: boolean;
}

export const RoomTypesGrid = ({
  rooms,
  baseDate,
  activeDate,
  onUpdate,
  onActiveDateChange,
  isLocked,
  isRateLocked = false,
  isReadOnly = false,
  activeEdit,
  updatingCells,
  blockingDates,
  onToggleInventoryBlock,
  onOpenWalkIn,
  expandedRoomIds,
  onToggleExpand,
  rateRoomsByRoomId,
  loadingRatePlansByRoomId,
  fromDate,
  toDate,
  customerType,
  onRatePlanUpdate,
  activeRateEdit,
  onCommonRestrictionUpdate,
  activeRestrictionEdit = null,
  hidePaidChildCharge = false,
  childPolicy = null,
  onOpenLinkRatePlans,
  calendarIsLinkEnable,
  hotelId = null,
  showCommonRestrictions = false,
}: RoomTypesGridProps) => {
  // Track local input values as strings: key = `${roomId}-${dateStr}`
  const [localValues, setLocalValues] = useState<Map<string, string>>(new Map());
  const [commonRestrictionLocalValues, setCommonRestrictionLocalValues] = useState<
    Map<string, string>
  >(new Map());
  
  const dates = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => addDays(baseDate, i));
  }, [baseDate]);

  const today = startOfToday();

  const isPastDateCell = (date: Date) =>
    isBefore(date, today) && !isSameDay(date, today);

  const activateDateForCell = (date: Date) => {
    if (isPastDateCell(date)) return;
    if (!isSameDay(date, activeDate)) {
      onActiveDateChange(date);
    }
  };

  const handleCellMouseDown = (
    e: MouseEvent<HTMLInputElement>,
    date: Date,
  ) => {
    if (isPastDateCell(date) || isSameDay(date, activeDate)) return;
    e.preventDefault();
    onActiveDateChange(date);
    window.setTimeout(() => e.currentTarget.focus(), 0);
  };

  const handleCellWrapperMouseDown = (date: Date) => {
    activateDateForCell(date);
  };

  const handleInventoryInputChange = (
    rawValue: string,
    cellKey: string,
    roomId: number,
    dateStr: string,
    canEdit: boolean,
    isUpdating: boolean,
  ) => {
    if (!canEdit || isUpdating) return;

    const sanitizedDisplay = sanitizeNonNegativeDisplayInput(rawValue);
    if (sanitizedDisplay === null) return;

    setLocalValues((prev) => {
      const next = new Map(prev);
      next.set(cellKey, sanitizedDisplay);
      return next;
    });

    onUpdate(
      roomId,
      dateStr,
      parseNonNegativeInventoryInput(sanitizedDisplay),
    );
  };

  const primeInventoryCellEdit = (
    roomId: number,
    dateStr: string,
    totalValue: number,
    isClosed: boolean,
    isThisCellEdited: boolean,
  ) => {
    if (isClosed) return;
    if (!isLocked || isThisCellEdited) return;
    onUpdate(roomId, dateStr, totalValue);
  };

  const handleInventoryCellMouseDown = (
    e: MouseEvent<HTMLInputElement>,
    date: Date,
    roomId: number,
    dateStr: string,
    totalValue: number,
    isClosed: boolean,
    isThisCellEdited: boolean,
  ) => {
    if (isPastDateCell(date)) return;
    if (!isSameDay(date, activeDate)) {
      e.preventDefault();
      onActiveDateChange(date);
      window.setTimeout(() => {
        e.currentTarget.focus();
        primeInventoryCellEdit(
          roomId,
          dateStr,
          totalValue,
          isClosed,
          isThisCellEdited,
        );
      }, 0);
      return;
    }
    primeInventoryCellEdit(
      roomId,
      dateStr,
      totalValue,
      isClosed,
      isThisCellEdited,
    );
  };

  const handleInventoryCellFocus = (
    date: Date,
    roomId: number,
    dateStr: string,
    totalValue: number,
    isClosed: boolean,
    isThisCellEdited: boolean,
  ) => {
    activateDateForCell(date);
    primeInventoryCellEdit(
      roomId,
      dateStr,
      totalValue,
      isClosed,
      isThisCellEdited,
    );
  };

  const canToggleInventoryBlock =
    !isReadOnly && !isLocked && !!onToggleInventoryBlock;

  const canManageWalkIn =
    !isReadOnly && !isLocked && !!onOpenWalkIn;

  const renderWalkInButton = (
    roomId: number,
    roomName: string,
    dateStr: string,
    isColumnSelected: boolean,
    isClosed: boolean,
  ) => {
    // Temporarily hidden; remove this line to restore the Walk-in button.
    return null;
    if (!canManageWalkIn || !isColumnSelected || isClosed) return null;

    return (
      <button
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onOpenWalkIn!({
            roomId,
            roomName,
            inventoryDate: dateStr,
          });
        }}
        className="text-[10px] font-bold uppercase tracking-wide text-blue-700 hover:text-blue-800 hover:bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5"
        title="Add or cancel walk-in inventory"
      >
        Walk-in
      </button>
    );
  };

  const renderInventoryBlockButton = (
    dateStr: string,
    dayData: InventoryDay | undefined,
    isColumnSelected: boolean,
    isClosed: boolean,
  ) => {
    if (!canToggleInventoryBlock || !dayData) return null;
    if (!isClosed && !isColumnSelected) return null;

    const isBlocking = blockingDates?.has(dateStr) ?? false;

    if (isClosed) {
      return (
        <button
          type="button"
          disabled={isBlocking}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleInventoryBlock!(dateStr, 'OPEN', dayData);
          }}
          className="text-[10px] font-bold uppercase tracking-wide text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Click to unblock inventory"
        >
          {isBlocking ? 'Unblocking…' : 'BLOCKED'}
        </button>
      );
    }

    return (
      <button
        type="button"
        disabled={isBlocking}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onToggleInventoryBlock!(dateStr, 'CLOSED', dayData);
        }}
        className="text-[10px] font-bold uppercase tracking-wide text-slate-600 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Click to block inventory"
      >
        {isBlocking ? 'Blocking…' : 'BLOCK'}
      </button>
    );
  };

  const firstRoom = rooms[0] ?? null;
  const firstRoomRateData = firstRoom ? rateRoomsByRoomId[firstRoom.roomId] : undefined;
  const firstRoomFirstRatePlan = firstRoomRateData?.ratePlans?.[0];

  const getCommonRatePlanDay = (dateStr: string) => {
    return firstRoomFirstRatePlan?.days.find((day) => day.date === dateStr);
  };

  const getCommonRestrictionValue = (
    dateStr: string,
    field: "minStay" | "maxStay",
  ): number | null => {
    const inventoryDay = firstRoom?.days.find((day) => day.date === dateStr);
    return inventoryDay?.[field] ?? null;
  };

  const getCommonBooleanRestrictionValue = (
    dateStr: string,
    field: "cta" | "ctd",
  ): boolean | null => {
    const inventoryDay = firstRoom?.days.find((day) => day.date === dateStr) as
      | ({ cta?: boolean; ctd?: boolean } & Record<string, unknown>)
      | undefined;
    const value = inventoryDay?.[field];
    return typeof value === "boolean" ? value : null;
  };

  const getCommonInventoryDay = (dateStr: string): InventoryDay | undefined =>
    firstRoom?.days.find((day) => day.date === dateStr);

  const formatCutoffDetailLine = (day: InventoryDay): string | null => {
    if (!day.cutoffType) return null;

    const parts: string[] = [];
    switch (day.cutoffType) {
      case 'BEFORE_MIDNIGHT':
        parts.push('Before midnight');
        break;
      case 'AFTER_MIDNIGHT':
        parts.push('After midnight');
        break;
      case 'MIDNIGHT':
        parts.push('At midnight');
        break;
      case 'FIXED_TIME':
        parts.push('Fixed time');
        break;
      default:
        parts.push(day.cutoffType);
    }

    if (
      (day.cutoffType === 'BEFORE_MIDNIGHT' ||
        day.cutoffType === 'AFTER_MIDNIGHT') &&
      day.cutoffHours != null
    ) {
      parts.push(`${day.cutoffHours} hr`);
    }

    if (day.cutoffType === 'FIXED_TIME' && day.bookingCutoffTime) {
      parts.push(formatTimeForDisplay(day.bookingCutoffTime));
    }

    return parts.join(' · ');
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-visible shadow-md bg-white">
      {/* Header Row */}
      <div className="grid grid-cols-[280px_repeat(7,1fr)] bg-slate-100/80 border-b border-slate-200">
        <div className="flex items-center px-6 py-4 font-bold text-xs text-slate-700 border-r border-slate-200 uppercase tracking-wider">
          Room Types
        </div>

        {dates.map((date, index) => {
          const isSelected = isSameDay(date, activeDate);
          const isPastDate = isBefore(date, today) && !isSameDay(date, today);

          return (
            <button
              key={index}
              onClick={() => !isPastDate && onActiveDateChange(date)}
              disabled={isPastDate}
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

      {/* Common Restrictions (based on first room) */}
      {showCommonRestrictions && (
        <>
          <div
            className="grid border-t border-b border-slate-200 bg-blue-50/50 hover:bg-blue-50/70 transition-colors duration-150"
            style={{ gridTemplateColumns: `280px repeat(${dates.length}, 1fr)` }}
          >
            <div className="flex items-center gap-3 px-6 py-4 border-r border-slate-300 bg-blue-100/50">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-50 text-amber-600">
                <span className="text-xs font-bold">M</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-900">
                  Minimum Length of Stay
                </span>
              </div>
            </div>

            {dates.map((date, i) => {
              const isSelected = isSameDay(date, activeDate);
              const dateStr = format(date, "yyyy-MM-dd");
              const minStay = getCommonRestrictionValue(dateStr, "minStay");
              const dayData = getCommonRatePlanDay(dateStr);

              const cellKey = `${dateStr}-common-minStay`;
              const localValue = commonRestrictionLocalValues.get(cellKey);
              const displayValue =
                localValue !== undefined
                  ? localValue
                  : minStay !== null && minStay !== undefined
                    ? minStay.toString()
                    : "";

              const isThisCellEdited =
                activeRestrictionEdit?.roomId === firstRoom?.roomId &&
                activeRestrictionEdit?.date === dateStr;
              const canEdit =
                Boolean(firstRoom && firstRoomFirstRatePlan) &&
                isSelected &&
                (!isLocked || isThisCellEdited);

              return (
                <div
                  key={i}
                  onMouseDown={() => handleCellWrapperMouseDown(date)}
                  className={`
                    border-r border-slate-200 last:border-r-0 px-3 py-4 flex flex-col items-center justify-center
                    transition-colors duration-150
                    ${isSelected ? getSelectedColumnBg(date) : ""}
                  `}
                >
                  <input
                    type="number"
                    value={displayValue}
                    readOnly={!canEdit}
                    onMouseDown={(e) => handleCellMouseDown(e, date)}
                    onFocus={() => activateDateForCell(date)}
                    onChange={(e) => {
                      if (!canEdit || !firstRoom || !firstRoomFirstRatePlan) return;
                      const inputValue =
                        e.target.value === "" ? null : Number(e.target.value);
                      onCommonRestrictionUpdate?.(firstRoom.roomId, dateStr, {
                        minStay: inputValue,
                      });
                      setCommonRestrictionLocalValues((prev) => {
                        const next = new Map(prev);
                        next.set(cellKey, e.target.value);
                        return next;
                      });
                    }}
                    onBlur={() => {
                      if (!isSelected) return;
                      setCommonRestrictionLocalValues((prev) => {
                        const next = new Map(prev);
                        next.delete(cellKey);
                        return next;
                      });
                    }}
                    className={`
                      w-20 h-11 border rounded-lg font-semibold text-lg text-center transition-all duration-150
                      tabular-nums
                      ${canEdit
                        ? "ring-2 ring-blue-600/40 border-blue-600/30 shadow-sm bg-white focus:ring-blue-600/60 focus:border-blue-600"
                        : `${getReadOnlyGridCellCursor(isPastDateCell(date), isSelected)} bg-slate-50/80 border-slate-200/80 text-slate-400`}
                      ${minStay !== null && minStay !== undefined && canEdit ? "text-emerald-700" : ""}
                      ${(minStay === null || minStay === undefined) && canEdit ? "text-rose-600" : ""}
                      focus:outline-none
                    `}
                    placeholder={canEdit ? "0" : "—"}
                    min="0"
                  />
                  <div className="flex flex-col items-center mt-2.5 gap-0.5">
                    <span
                      className={`text-[10px] font-medium uppercase tracking-wide ${
                        minStay !== null && minStay !== undefined
                          ? "text-emerald-600"
                          : "text-rose-500"
                      }`}
                    >
                      {minStay !== null && minStay !== undefined
                        ? `${minStay} Set`
                        : "Not Set"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            className="grid border-t border-slate-300 bg-blue-50/50 hover:bg-blue-50/70 transition-colors duration-150"
            style={{ gridTemplateColumns: `280px repeat(${dates.length}, 1fr)` }}
          >
            <div className="flex items-center gap-3 px-6 py-4 border-r border-slate-300 bg-blue-100/50">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-50 text-purple-600">
                <span className="text-xs font-bold">M</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-900">
                  Maximum Length of Stay
                </span>
              </div>
            </div>

            {dates.map((date, i) => {
              const isSelected = isSameDay(date, activeDate);
              const dateStr = format(date, "yyyy-MM-dd");
              const maxStay = getCommonRestrictionValue(dateStr, "maxStay");
              const dayData = getCommonRatePlanDay(dateStr);

              const cellKey = `${dateStr}-common-maxStay`;
              const localValue = commonRestrictionLocalValues.get(cellKey);
              const displayValue =
                localValue !== undefined
                  ? localValue
                  : maxStay !== null && maxStay !== undefined
                    ? maxStay.toString()
                    : "";

              const isThisCellEdited =
                activeRestrictionEdit?.roomId === firstRoom?.roomId &&
                activeRestrictionEdit?.date === dateStr;
              const canEdit =
                Boolean(firstRoom && firstRoomFirstRatePlan) &&
                isSelected &&
                (!isLocked || isThisCellEdited);

              return (
                <div
                  key={i}
                  onMouseDown={() => handleCellWrapperMouseDown(date)}
                  className={`
                    border-r border-slate-200 last:border-r-0 px-3 py-4 flex flex-col items-center justify-center
                    transition-colors duration-150
                    ${isSelected ? getSelectedColumnBg(date) : ""}
                  `}
                >
                  <input
                    type="number"
                    value={displayValue}
                    readOnly={!canEdit}
                    onMouseDown={(e) => handleCellMouseDown(e, date)}
                    onFocus={() => activateDateForCell(date)}
                    onChange={(e) => {
                      if (!canEdit || !firstRoom || !firstRoomFirstRatePlan) return;
                      const inputValue =
                        e.target.value === "" ? null : Number(e.target.value);
                      onCommonRestrictionUpdate?.(firstRoom.roomId, dateStr, {
                        maxStay: inputValue,
                      });
                      setCommonRestrictionLocalValues((prev) => {
                        const next = new Map(prev);
                        next.set(cellKey, e.target.value);
                        return next;
                      });
                    }}
                    onBlur={() => {
                      if (!isSelected) return;
                      setCommonRestrictionLocalValues((prev) => {
                        const next = new Map(prev);
                        next.delete(cellKey);
                        return next;
                      });
                    }}
                    className={`
                      w-20 h-11 border rounded-lg font-semibold text-lg text-center transition-all duration-150
                      tabular-nums
                      ${canEdit
                        ? "ring-2 ring-blue-600/40 border-blue-600/30 shadow-sm bg-white focus:ring-blue-600/60 focus:border-blue-600"
                        : `${getReadOnlyGridCellCursor(isPastDateCell(date), isSelected)} bg-slate-50/80 border-slate-200/80 text-slate-400`}
                      ${maxStay !== null && maxStay !== undefined && canEdit ? "text-emerald-700" : ""}
                      ${(maxStay === null || maxStay === undefined) && canEdit ? "text-rose-600" : ""}
                      focus:outline-none
                    `}
                    placeholder={canEdit ? "0" : "—"}
                    min="0"
                  />
                  <div className="flex flex-col items-center mt-2.5 gap-0.5">
                    <span
                      className={`text-[10px] font-medium uppercase tracking-wide ${
                        maxStay !== null && maxStay !== undefined
                          ? "text-emerald-600"
                          : "text-rose-500"
                      }`}
                    >
                      {maxStay !== null && maxStay !== undefined
                        ? `${maxStay} Set`
                        : "Not Set"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Booking cutoff (from inventory calendar API) */}
          <div
            className="grid border-t border-slate-300 bg-blue-50/50 hover:bg-blue-50/70 transition-colors duration-150"
            style={{ gridTemplateColumns: `280px repeat(${dates.length}, 1fr)` }}
          >
            <div className="flex items-center gap-3 px-6 py-4 border-r border-slate-300 bg-blue-100/50">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 text-indigo-600">
                <span className="text-xs font-bold">T</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-900">
                  Booking Cutoff
                </span>
              </div>
            </div>

            {dates.map((date, i) => {
              const isSelected = isSameDay(date, activeDate);
              const dateStr = format(date, "yyyy-MM-dd");
              const inventoryDay = getCommonInventoryDay(dateStr);
              const cutoffConfigured = inventoryDay
                ? isInventoryCutoffConfigured(inventoryDay.cutoffType)
                : false;
              const cutoffLabel = inventoryDay
                ? formatInventoryCutoffDisplay(
                    inventoryDay.cutoffType,
                    inventoryDay.cutoffHours,
                    inventoryDay.bookingCutoffTime,
                  )
                : "--";
              const cutoffDetail = inventoryDay
                ? formatCutoffDetailLine(inventoryDay)
                : null;

              return (
                <div
                  key={i}
                  className={`
                    border-r border-slate-200 last:border-r-0 px-2 py-4 flex flex-col items-center justify-center
                    transition-colors duration-150
                    ${isSelected ? getSelectedColumnBg(date) : ""}
                  `}
                >
                  <div
                    className="w-full min-h-[2.75rem] max-w-[8.5rem] border rounded-lg font-medium text-xs text-center flex flex-col items-center justify-center px-2 py-2 tabular-nums bg-slate-50/80 border-slate-200/80 text-slate-600"
                    title={cutoffDetail ?? cutoffLabel}
                  >
                    <span className="leading-snug">{cutoffLabel}</span>
                    {cutoffDetail ? (
                      <span className="mt-1 text-[9px] font-medium uppercase tracking-wide text-slate-500">
                        {cutoffDetail}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-center mt-2.5 gap-0.5">
                    <span
                      className={`text-[10px] font-medium uppercase tracking-wide ${
                        cutoffConfigured ? "text-emerald-600" : "text-rose-500"
                      }`}
                    >
                      {cutoffConfigured ? "Set" : "Not Set"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA Row */}
          <div
            className="grid border-t border-slate-300 bg-blue-50/50 hover:bg-blue-50/70 transition-colors duration-150"
            style={{ gridTemplateColumns: `280px repeat(${dates.length}, 1fr)` }}
          >
            <div className="flex items-center gap-3 px-6 py-4 border-r border-slate-300 bg-blue-100/50">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-50 text-cyan-600">
                <span className="text-xs font-bold">C</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-900">
                  Closed to Arrival (CTA)
                </span>
              </div>
            </div>

            {dates.map((date, i) => {
              const isSelected = isSameDay(date, activeDate);
              const dateStr = format(date, "yyyy-MM-dd");
              const ctaValue = getCommonBooleanRestrictionValue(dateStr, "cta");
              const isThisCellEdited =
                activeRestrictionEdit?.roomId === firstRoom?.roomId &&
                activeRestrictionEdit?.date === dateStr;
              const canEdit =
                Boolean(firstRoom) && isSelected && (!isLocked || isThisCellEdited);
              const displayValue =
                ctaValue ?? false;

              return (
                <div
                  key={i}
                  onMouseDown={() => handleCellWrapperMouseDown(date)}
                  className={`
                    border-r border-slate-200 last:border-r-0 px-3 py-4 flex flex-col items-center justify-center
                    transition-colors duration-150
                    ${isSelected ? getSelectedColumnBg(date) : ""}
                  `}
                >
                  <button
                    type="button"
                    disabled={!canEdit}
                    onMouseDown={() => handleCellWrapperMouseDown(date)}
                    onClick={() => {
                      if (!canEdit || !firstRoom) return;
                      onCommonRestrictionUpdate?.(firstRoom.roomId, dateStr, {
                        cta: !displayValue,
                      });
                    }}
                    className={`w-20 h-11 border rounded-lg font-semibold text-sm text-center flex items-center justify-center transition-colors ${
                      canEdit
                        ? "cursor-pointer bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                        : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    {displayValue ? "Yes" : "No"}
                  </button>
                  <div className="mt-2.5 h-[14px]" aria-hidden="true" />
                </div>
              );
            })}
          </div>

          {/* CTD Row */}
          <div
            className="grid border-t border-slate-300 bg-blue-50/50 hover:bg-blue-50/70 transition-colors duration-150"
            style={{ gridTemplateColumns: `280px repeat(${dates.length}, 1fr)` }}
          >
            <div className="flex items-center gap-3 px-6 py-4 border-r border-slate-300 bg-blue-100/50">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-50 text-teal-600">
                <span className="text-xs font-bold">C</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-900">
                  Closed to Departure (CTD)
                </span>
              </div>
            </div>

            {dates.map((date, i) => {
              const isSelected = isSameDay(date, activeDate);
              const dateStr = format(date, "yyyy-MM-dd");
              const ctdValue = getCommonBooleanRestrictionValue(dateStr, "ctd");
              const isThisCellEdited =
                activeRestrictionEdit?.roomId === firstRoom?.roomId &&
                activeRestrictionEdit?.date === dateStr;
              const canEdit =
                Boolean(firstRoom) && isSelected && (!isLocked || isThisCellEdited);
              const displayValue =
                ctdValue ?? false;

              return (
                <div
                  key={i}
                  onMouseDown={() => handleCellWrapperMouseDown(date)}
                  className={`
                    border-r border-slate-200 last:border-r-0 px-3 py-4 flex flex-col items-center justify-center
                    transition-colors duration-150
                    ${isSelected ? getSelectedColumnBg(date) : ""}
                  `}
                >
                  <button
                    type="button"
                    disabled={!canEdit}
                    onMouseDown={() => handleCellWrapperMouseDown(date)}
                    onClick={() => {
                      if (!canEdit || !firstRoom) return;
                      onCommonRestrictionUpdate?.(firstRoom.roomId, dateStr, {
                        ctd: !displayValue,
                      });
                    }}
                    className={`w-20 h-11 border rounded-lg font-semibold text-sm text-center flex items-center justify-center transition-colors ${
                      canEdit
                        ? "cursor-pointer bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                        : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    {displayValue ? "Yes" : "No"}
                  </button>
                  <div className="mt-2.5 h-[14px]" aria-hidden="true" />
                </div>
              );
            })}
          </div>

          {/* Explicit divider between common restrictions and room rows */}
          <div className="w-full border-b border-slate-300" />
        </>
      )}

      {/* Room Rows */}
      {rooms.map((room, roomIndex) => {
        const theme = ROOM_THEMES[roomIndex % ROOM_THEMES.length];
        const inventoryDaysByDate = room.days.reduce<
          Record<string, { minStay: number | null; maxStay: number | null }>
        >((acc, day) => {
          acc[day.date] = {
            minStay: day.minStay ?? null,
            maxStay: day.maxStay ?? null,
          };
          return acc;
        }, {});

        return (
        <Fragment key={room.roomId}>
        <div
          className={`grid grid-cols-[280px_repeat(7,1fr)] ${
            roomIndex > 0 ? `border-t-8 ${theme.divider}` : ''
          } bg-white hover:bg-slate-50/50 transition-colors duration-150`}
        >
          {/* Room Name Column */}
          <div
            className={`flex items-start gap-2 px-5 py-4 font-bold text-sm border-r border-slate-200 border-l-4 ${theme.accent} ${theme.nameBg} ${theme.nameText}`}
          >
            <button
              type="button"
              onClick={() => onToggleExpand(room.roomId)}
              className="mt-0.5 shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
              aria-label={expandedRoomIds.has(room.roomId) ? "Collapse rate plans" : "Expand rate plans"}
            >
              {expandedRoomIds.has(room.roomId) ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
            <span className={`mt-1 shrink-0 w-2.5 h-2.5 rounded-full ${theme.dot}`} aria-hidden="true" />
            <span className="min-w-0 flex-1 break-words text-left leading-snug">
              {room.roomName}
            </span>
          </div>

          {/* Data Columns */}
          {dates.map((date) => {
            const dateStr = format(date, 'yyyy-MM-dd');
            const dayData = room.days.find((d: { date: string }) => d.date === dateStr);
            const isColumnSelected = isSameDay(date, activeDate);
            const isClosed = dayData?.status === 'CLOSED';
            
            const isThisCellEdited = activeEdit?.roomId === room.roomId && activeEdit?.date === dateStr;
            const canEdit =
              !isClosed &&
              isColumnSelected &&
              (!isLocked || isThisCellEdited);
            
            const cellKey = `${room.roomId}-${dateStr}`;
            const isUpdating = updatingCells.has(cellKey);

            const availableValue = dayData?.available ?? 0;
            const totalValue = dayData?.total ?? 0;
            const soldValue = dayData?.sold ?? 0;
            
            // Display priority logic (evaluate in exact order)
            const isNotSet = totalValue === 0;
            const isSoldOut = totalValue > 0 && availableValue === 0;
            
            // Get display value: use local string value if editing, otherwise show available
            const localValue = localValues.get(cellKey);
            const displayValue = localValue !== undefined 
              ? localValue 
              : availableValue.toString();

            return (
              <div
                key={dateStr}
                onMouseDown={() => handleCellWrapperMouseDown(date)}
                className={`
                  border-r border-slate-200 last:border-r-0 px-3 py-4 flex flex-col items-center justify-center
                  transition-colors duration-150
                  ${isColumnSelected ? getSelectedColumnBg(date) : ''}
                `}
              >
                {isUpdating ? (
                  <>
                    <input
                      type="number"
                      value={displayValue}
                      readOnly={!canEdit || isUpdating}
                      disabled={isUpdating}
                      className={`
                        w-20 h-11 border rounded-lg font-semibold text-lg text-center transition-all duration-150
                        tabular-nums
                        cursor-not-allowed bg-slate-50/80 border-slate-200/80 text-slate-400 opacity-50
                        focus:outline-none
                      `}
                    />
                    <span className="text-[10px] font-medium uppercase tracking-wide text-blue-600 mt-2.5">
                      Updating...
                    </span>
                  </>
                ) : isClosed ? (
                  <>
                    <input
                      type="number"
                      value={displayValue}
                      readOnly
                      disabled
                      className="
                        w-20 h-11 border rounded-lg font-semibold text-lg text-center transition-all duration-150
                        tabular-nums cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400
                        focus:outline-none
                      "
                    />
                    <div className="flex flex-col items-center mt-2.5 gap-0.5">
                      {renderInventoryBlockButton(
                        dateStr,
                        dayData,
                        isColumnSelected,
                        true,
                      ) ?? (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-rose-600">
                          BLOCKED
                        </span>
                      )}
                      <span className="text-[10px] font-bold uppercase tracking-wide text-rose-500">
                        {soldValue} SOLD
                      </span>
                    </div>
                  </>
                ) : isNotSet ? (
                  // Not Set: total === 0 - show input field so user can update value
                  <>
                    <input
                      type="number"
                      value={canEdit ? (localValue !== undefined ? localValue : '0') : ''}
                      placeholder={canEdit ? undefined : '-'}
                      readOnly={!canEdit || isUpdating}
                      disabled={isUpdating}
                      onMouseDown={(e) =>
                        handleInventoryCellMouseDown(
                          e,
                          date,
                          room.roomId,
                          dateStr,
                          totalValue,
                          isClosed,
                          isThisCellEdited,
                        )
                      }
                      onFocus={() =>
                        handleInventoryCellFocus(
                          date,
                          room.roomId,
                          dateStr,
                          totalValue,
                          isClosed,
                          isThisCellEdited,
                        )
                      }
                      onChange={(e) => {
                        handleInventoryInputChange(
                          e.target.value,
                          cellKey,
                          room.roomId,
                          dateStr,
                          canEdit,
                          isUpdating,
                        );
                      }}
                      onBlur={() => {
                        if (isColumnSelected) {
                          // Clear local value on blur to show actual stored value
                          setLocalValues((prev) => {
                            const next = new Map(prev);
                            next.delete(cellKey);
                            return next;
                          });
                        }
                      }}
                      onKeyDown={(e) => {
                        blockNegativeNumberKey(e);
                        // Enter key does NOT call API - only updates local state
                        // API is called ONLY when Save Changes button is clicked
                        if (canEdit && !isUpdating && isThisCellEdited && e.key === 'Enter') {
                          e.currentTarget.blur();
                        }
                      }}
                      min={0}
                      className={`
                        w-20 h-11 border rounded-lg font-semibold text-lg text-center transition-all duration-150
                        tabular-nums
                        ${canEdit && !isUpdating
                          ? 'ring-2 ring-blue-600/40 border-blue-600/30 shadow-sm bg-white focus:ring-blue-600/60 focus:border-blue-600 text-rose-600' 
                          : `${getReadOnlyGridCellCursor(isPastDateCell(date), isColumnSelected)} bg-slate-50/80 border-slate-200/80 text-slate-400`}
                        ${isUpdating ? 'opacity-50' : ''}
                        focus:outline-none
                      `}
                    />
                    <div className="flex flex-col items-center mt-2.5 gap-0.5">
                      <span className="text-[10px] font-medium uppercase tracking-wide text-rose-500">
                        NOT SET
                      </span>
                      {isLocked &&
                        !isThisCellEdited &&
                        isColumnSelected &&
                        !isUpdating && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] text-amber-700 font-medium uppercase tracking-wide bg-amber-50/80 border border-amber-200/60">
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                          Locked
                        </span>
                      )}
                      {renderInventoryBlockButton(
                        dateStr,
                        dayData,
                        isColumnSelected,
                        false,
                      )}
                      {renderWalkInButton(
                        room.roomId,
                        room.roomName,
                        dateStr,
                        isColumnSelected,
                        isClosed,
                      )}
                    </div>
                  </>
                ) : isSoldOut ? (
                  // Sold Out: total > 0 && available === 0 — keep input visible so inventory/rates stay editable
                  <>
                    <input
                      type="number"
                      value={displayValue}
                      readOnly={!canEdit || isUpdating}
                      disabled={isUpdating}
                      onMouseDown={(e) =>
                        handleInventoryCellMouseDown(
                          e,
                          date,
                          room.roomId,
                          dateStr,
                          totalValue,
                          isClosed,
                          isThisCellEdited,
                        )
                      }
                      onFocus={() =>
                        handleInventoryCellFocus(
                          date,
                          room.roomId,
                          dateStr,
                          totalValue,
                          isClosed,
                          isThisCellEdited,
                        )
                      }
                      onChange={(e) => {
                        handleInventoryInputChange(
                          e.target.value,
                          cellKey,
                          room.roomId,
                          dateStr,
                          canEdit,
                          isUpdating,
                        );
                      }}
                      onBlur={() => {
                        if (isColumnSelected) {
                          setLocalValues((prev) => {
                            const next = new Map(prev);
                            next.delete(cellKey);
                            return next;
                          });
                        }
                      }}
                      onKeyDown={(e) => {
                        blockNegativeNumberKey(e);
                        if (canEdit && !isUpdating && isThisCellEdited && e.key === 'Enter') {
                          e.currentTarget.blur();
                        }
                      }}
                      min={0}
                      className={`
                        w-20 h-11 border rounded-lg font-semibold text-lg text-center transition-all duration-150
                        tabular-nums
                        ${canEdit && !isUpdating
                          ? 'ring-2 ring-blue-600/40 border-blue-600/30 shadow-sm bg-white focus:ring-blue-600/60 focus:border-blue-600 text-rose-600'
                          : `${getReadOnlyGridCellCursor(isPastDateCell(date), isColumnSelected)} bg-slate-50/80 border-slate-200/80 text-slate-400`}
                        ${isUpdating ? 'opacity-50' : ''}
                        focus:outline-none
                      `}
                    />
                    <div className="flex flex-col items-center mt-2.5 gap-0.5">
                      <span className="text-[10px] font-medium uppercase tracking-wide text-rose-500">
                        SOLD OUT
                      </span>
                      {isLocked &&
                        !isThisCellEdited &&
                        isColumnSelected &&
                        !isUpdating && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] text-amber-700 font-medium uppercase tracking-wide bg-amber-50/80 border border-amber-200/60">
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                          Locked
                        </span>
                      )}
                      {renderInventoryBlockButton(
                        dateStr,
                        dayData,
                        isColumnSelected,
                        false,
                      )}
                      {renderWalkInButton(
                        room.roomId,
                        room.roomName,
                        dateStr,
                        isColumnSelected,
                        isClosed,
                      )}
                    </div>
                  </>
                ) : (
                  // Normal: show input with total and label with available LEFT
                  <>
                    <input
                      type="number"
                      value={displayValue}
                      readOnly={!canEdit || isUpdating}
                      disabled={isUpdating}
                      onMouseDown={(e) =>
                        handleInventoryCellMouseDown(
                          e,
                          date,
                          room.roomId,
                          dateStr,
                          totalValue,
                          isClosed,
                          isThisCellEdited,
                        )
                      }
                      onFocus={() =>
                        handleInventoryCellFocus(
                          date,
                          room.roomId,
                          dateStr,
                          totalValue,
                          isClosed,
                          isThisCellEdited,
                        )
                      }
                      onChange={(e) => {
                        handleInventoryInputChange(
                          e.target.value,
                          cellKey,
                          room.roomId,
                          dateStr,
                          canEdit,
                          isUpdating,
                        );
                      }}
                      onBlur={() => {
                        if (isColumnSelected) {
                          // Clear local value on blur to show actual stored value
                          setLocalValues((prev) => {
                            const next = new Map(prev);
                            next.delete(cellKey);
                            return next;
                          });
                        }
                      }}
                      onKeyDown={(e) => {
                        blockNegativeNumberKey(e);
                        // Enter key does NOT call API - only updates local state
                        // API is called ONLY when Save Changes button is clicked
                        if (canEdit && !isUpdating && isThisCellEdited && e.key === 'Enter') {
                          e.currentTarget.blur();
                        }
                      }}
                      min={0}
                      className={`
                        w-20 h-11 border rounded-lg font-semibold text-lg text-center transition-all duration-150
                        tabular-nums
                        ${canEdit && !isUpdating
                          ? 'ring-2 ring-blue-600/40 border-blue-600/30 shadow-sm bg-white focus:ring-blue-600/60 focus:border-blue-600' 
                          : `${getReadOnlyGridCellCursor(isPastDateCell(date), isColumnSelected)} bg-slate-50/80 border-slate-200/80 text-slate-400`}
                        ${canEdit && !isUpdating ? 'text-emerald-700' : ''}
                        focus:outline-none
                      `}
                    />
                    <div className="flex flex-col items-center mt-2.5 gap-0.5">
                      {/* Temporarily hidden; unhide to restore the "LEFT" label.
                      <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                        {availableValue} LEFT
                      </span>
                      */}
                      <span className="text-[10px] font-bold uppercase tracking-wide text-rose-500">
                        {soldValue} SOLD
                      </span>
                      {isLocked &&
                        !isThisCellEdited &&
                        isColumnSelected &&
                        !isUpdating && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] text-amber-700 font-medium uppercase tracking-wide bg-amber-50/80 border border-amber-200/60">
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                          Locked
                        </span>
                      )}
                      {renderInventoryBlockButton(
                        dateStr,
                        dayData,
                        isColumnSelected,
                        false,
                      )}
                      {renderWalkInButton(
                        room.roomId,
                        room.roomName,
                        dateStr,
                        isColumnSelected,
                        isClosed,
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Expanded Content: render existing Rate Plans component (unchanged) */}
        {expandedRoomIds.has(room.roomId) && (
          <div className={`border-t border-slate-200 border-l-4 ${theme.accent} ${theme.expandedBg} relative z-0`}>
            <div className="flex items-center gap-2 px-5 pt-3 pb-1">
              <span className={`shrink-0 w-2 h-2 rounded-full ${theme.dot}`} aria-hidden="true" />
              <span className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${theme.chip}`}>
                Meal plans · {room.roomName}
              </span>
            </div>
            {loadingRatePlansByRoomId[room.roomId] ? (
              <div className="px-6 py-4 text-sm font-medium text-slate-500">
                Loading rate plans...
              </div>
            ) : rateRoomsByRoomId[room.roomId] ? (
              <RatePlansGrid
                variant="embedded"
                rooms={[rateRoomsByRoomId[room.roomId]]}
                fromDate={fromDate}
                toDate={toDate}
                activeDate={activeDate}
                customerType={customerType}
                hideDateHeader
                hideRoomHeader
                forcedExpandedRoomId={room.roomId}
                onUpdate={onRatePlanUpdate}
                onActiveDateChange={onActiveDateChange}
                isLocked={isRateLocked}
                activeEdit={activeRateEdit}
                hidePaidChildCharge={hidePaidChildCharge}
                childPolicy={childPolicy}
                onOpenLinkRatePlans={onOpenLinkRatePlans}
                calendarIsLinkEnable={calendarIsLinkEnable}
                hotelId={hotelId}
                inventorySection="room-types"
                inventoryDaysByDate={inventoryDaysByDate}
                hideRestrictions
              />
            ) : (
              <div className="px-6 py-4 text-sm font-medium text-slate-500">
                No rate plans available
              </div>
            )}
          </div>
        )}
        </Fragment>
      )})}
    </div>
  );
};