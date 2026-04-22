import { useMemo } from 'react';
import { addDays, format, isSameDay } from 'date-fns';
import type { RoomType } from '@/types';
import { RoomRow } from './RoomRow';

interface InventoryGridProps {
  rooms: RoomType[];
  baseDate: Date;
  activeDate: Date;
  onUpdate: (
    roomId: string,
    planId: string | null,
    dateIndex: number,
    field: keyof import('@/types').DailyData,
    value: number | null
  ) => void;
  onActiveDateChange: (date: Date) => void;
}

export const InventoryGrid = ({ rooms, baseDate, activeDate, onUpdate, onActiveDateChange }: InventoryGridProps) => {
  const dates = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => addDays(baseDate, i));
  }, [baseDate]);

  return (
    <div className="border border-gray-200 rounded-sm overflow-hidden shadow-sm bg-white">
      {/* Header Row with Dates */}
      <div className="grid grid-cols-[250px_repeat(7,1fr)] bg-gray-50 border-b-2 border-gray-300">
        <div className="flex items-center px-4 py-4 font-bold text-gray-700 border-r">
          Rooms & Rates
        </div>
        
        {dates.map((date, index) => {
          const isSelected = isSameDay(date, activeDate);
          const day = format(date, 'EEE').toUpperCase();
          const dateNum = format(date, 'd');
          const month = format(date, 'MMM').toUpperCase();
          
          return (
            <button
              key={index}
              onClick={() => onActiveDateChange(date)}
              className={`
                flex flex-col items-center justify-center py-3 px-2 border-r last:border-r-0
                transition-all cursor-pointer outline-none relative
                ${isSelected 
                  ? 'bg-[#2A3170] text-white shadow-inner border-l-4 border-l-[#FF6610] border-r-4 border-r-[#FF6610]' 
                  : 'text-gray-500 hover:bg-gray-100 bg-white'
                }
              `}
            >
              <span className={`text-[10px] font-bold ${isSelected ? 'opacity-90' : 'opacity-60'}`}>
                {day}
              </span>
              <span className="text-xl font-black leading-tight">{dateNum}</span>
              <span className={`text-[10px] font-bold uppercase ${isSelected ? 'opacity-90' : 'opacity-60'}`}>
                {month}
              </span>
            </button>
          );
        })}
      </div>

      {/* Room Rows */}
      {rooms.map((room) => (
        <RoomRow
          key={room.id}
          room={room}
          dates={dates}
          activeDate={activeDate}
          onUpdate={onUpdate}
        />
      ))}
    </div>
  );
};

