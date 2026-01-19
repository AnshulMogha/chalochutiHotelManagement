import { useMemo } from 'react';
import {
  addDays,
  format,
  isSameDay,
  startOfToday,
  isBefore,
  isWeekend,
} from 'date-fns';
import type { InventoryRoom } from '../type';

/* ----------------------------------
   Helpers & Styling Logic
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

interface RoomTypesGridProps {
  rooms: InventoryRoom[];
  baseDate: Date;
  activeDate: Date;
  onUpdate: (roomId: number, dateStr: string, value: number) => void;
  onActiveDateChange: (date: Date) => void;
  isLocked: boolean;
  activeEdit: { roomId: number; date: string } | null;
  updatingCells: Set<string>;
}

export const RoomTypesGrid = ({
  rooms,
  baseDate,
  activeDate,
  onUpdate,
  onActiveDateChange,
  isLocked,
  activeEdit,
  updatingCells,
}: RoomTypesGridProps) => {
  
  const dates = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => addDays(baseDate, i));
  }, [baseDate]);

  const today = startOfToday();

  return (
    <div className="border border-slate-200/60 rounded-xl overflow-hidden shadow-sm bg-white">
      {/* Header Row */}
      <div className="grid grid-cols-[280px_repeat(7,1fr)] bg-slate-50/50 border-b border-slate-200/60">
        <div className="flex items-center px-6 py-4 font-medium text-xs text-slate-600 border-r border-slate-200/60 uppercase tracking-wide">
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

      {/* Room Rows */}
      {rooms.map((room, roomIndex) => (
        <div
          key={room.roomId}
          className={`grid grid-cols-[280px_repeat(7,1fr)] ${
            roomIndex > 0 ? 'border-t border-slate-200/60' : ''
          } bg-white hover:bg-slate-50/30 transition-colors duration-150`}
        >
          {/* Room Name Column */}
          <div className="flex items-center px-6 py-4 font-semibold text-sm text-slate-800 border-r border-slate-200/60 bg-slate-50/40">
            {room.roomName}
          </div>

          {/* Data Columns */}
          {dates.map((date) => {
            const dateStr = format(date, 'yyyy-MM-dd');
            const dayData = room.days.find((d: { date: string }) => d.date === dateStr);
            const isColumnSelected = isSameDay(date, activeDate);
            
            const isThisCellEdited = activeEdit?.roomId === room.roomId && activeEdit?.date === dateStr;
            const canEdit = isColumnSelected && (!isLocked || isThisCellEdited);
            
            const cellKey = `${room.roomId}-${dateStr}`;
            const isUpdating = updatingCells.has(cellKey);

            const availableValue = dayData?.available ?? 0;
            const hasInventory = availableValue > 0;
            const totalValue = dayData?.total ?? 0;

            return (
              <div
                key={dateStr}
                className={`
                  border-r border-slate-200/60 last:border-r-0 px-3 py-4 flex flex-col items-center justify-center
                  transition-colors duration-150
                  ${isColumnSelected ? getSelectedColumnBg(date) : ''}
                `}
              >
                <input
                  type="number"
                  value={totalValue}
                  readOnly={!canEdit || isUpdating}
                  disabled={isUpdating}
                  onChange={(e) => {
                    const val = Math.max(0, parseInt(e.target.value) || 0);
                    onUpdate(room.roomId, dateStr, val);
                  }}
                  onBlur={() => {
                    // Blur does NOT call API - only updates local state via onChange
                    // API is called ONLY when Save Changes button is clicked
                  }}
                  onKeyDown={(e) => {
                    // Enter key does NOT call API - only updates local state
                    // API is called ONLY when Save Changes button is clicked
                    if (canEdit && !isUpdating && isThisCellEdited && e.key === 'Enter') {
                      e.currentTarget.blur();
                    }
                  }}
                  className={`
                    w-20 h-11 border rounded-lg font-semibold text-lg text-center transition-all duration-150
                    tabular-nums
                    ${canEdit && !isUpdating
                      ? 'ring-2 ring-blue-600/40 border-blue-600/30 shadow-sm bg-white focus:ring-blue-600/60 focus:border-blue-600' 
                      : 'cursor-not-allowed bg-slate-50/80 border-slate-200/80 text-slate-400'}
                    ${isUpdating ? 'opacity-50' : ''}
                    ${hasInventory && canEdit && !isUpdating ? 'text-emerald-700' : ''}
                    ${!hasInventory && canEdit && !isUpdating ? 'text-rose-600' : ''}
                    focus:outline-none
                  `}
                />
                
                <div className="flex flex-col items-center mt-2.5 gap-0.5">
                  {isUpdating ? (
                    <span className="text-[10px] font-medium uppercase tracking-wide text-blue-600">
                      Updating...
                    </span>
                  ) : (
                    <span className={`
                      text-[10px] font-medium uppercase tracking-wide
                      ${hasInventory ? 'text-emerald-600' : 'text-rose-500'}
                    `}>
                      {hasInventory ? `${availableValue} Left` : 'Sold Out'}
                    </span>
                  )}
                  
                  {isLocked && !isThisCellEdited && isColumnSelected && !isUpdating && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] text-amber-700 font-medium uppercase tracking-wide bg-amber-50/80 border border-amber-200/60">
                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                      Locked
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};