import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { isSameDay } from 'date-fns';
import type { RoomType, DailyData } from '@/types';
import { RatePlanRow } from './RatePlanRow';

interface RoomRowProps {
  room: RoomType;
  dates: Date[];
  activeDate: Date;
  onUpdate: (
    roomId: string,
    planId: string | null,
    dateIndex: number,
    field: keyof DailyData,
    value: number | null
  ) => void;
}


export const RoomRow = ({ room, dates, activeDate, onUpdate }: RoomRowProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Get the first rate plan's daily data for inventory (assuming all rate plans share inventory)
  const inventoryData = room.ratePlans[0]?.dailyData || [];

  return (
    <div className="border-t border-gray-200">

      {/* Main Room Row with Inventory */}
      <div className="grid grid-cols-[250px_repeat(7,1fr)] items-center bg-white">

        <div className="p-4 flex items-center gap-3 font-bold text-gray-700 border-r h-full bg-white">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          <span className="truncate">{room.name}</span>
        </div>
        

        {/* Inventory Inputs in the same row as room name */}
        {dates.map((date, dateIndex) => {
          const dailyData = inventoryData[dateIndex];
          const isColumnSelected = isSameDay(date, activeDate);
          const inventoryValue = dailyData?.inventory || 0;
          const hasInventory = inventoryValue > 0;

          return (
            <div
              key={dateIndex}
              className={`
                border-r last:border-r-0 p-3 flex flex-col items-center justify-center min-h-[80px]
                transition-all relative
                ${isColumnSelected 
                  ? 'bg-blue-100 border-l-4 border-l-[#2A3170] border-r-4 border-r-[#2A3170] shadow-sm' 
                  : ''
                }
              `}
            >
              <input
                type="number"
                value={inventoryValue}
                readOnly={!isColumnSelected}
                onChange={(e) => {
                  if (isColumnSelected) {
                    const value = Math.max(0, Number(e.target.value) || 0);
                    onUpdate(room.id, null, dateIndex, 'inventory', value);
                  }
                }}
                className={`
                  w-16 h-10 flex items-center justify-center border-2 rounded font-bold text-lg text-center
                  ${isColumnSelected 
                    ? 'focus:outline-none focus:ring-2 focus:ring-[#2A3170] focus:border-[#2A3170]' 
                    : 'cursor-not-allowed opacity-60'
                  }
                  ${hasInventory 
                    ? 'border-green-500 text-green-600 bg-green-50/50' 
                    : 'border-red-500 text-red-600 bg-red-50/50'
                  }
                `}
                min="0"
              />
              <span className="text-[10px] text-gray-400 font-bold uppercase mt-2">
                {hasInventory ? `${inventoryValue} available` : '0 sold'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Expanded Content: Rate Plans */}
      {isExpanded && (
        <>
          {/* Rate Plan Rows */}
          {room.ratePlans.map((plan) => (
            <RatePlanRow
              key={plan.id}
              ratePlan={plan}
              dates={dates}
              activeDate={activeDate}
              onUpdate={(planId, dateIndex, field, value) => {
                onUpdate(room.id, planId, dateIndex, field, value);
              }}
            />
          ))}
        </>
      )}
    </div>
  );
};

