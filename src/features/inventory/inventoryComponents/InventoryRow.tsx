import type { DailyData } from '@/types';
import { isSameDay } from 'date-fns';

interface InventoryRowProps {
  dailyDataArray: DailyData[];
  dates: Date[];
  activeDate: Date;
  onUpdate: (dateIndex: number, value: number) => void;
}

export const InventoryRow = ({ dailyDataArray, dates, activeDate, onUpdate }: InventoryRowProps) => {
  return (
    <div className="grid grid-cols-[250px_repeat(7,1fr)] border-t border-gray-200 bg-white">
      {/* Inventory Label */}
      <div className="flex items-center px-4 py-3 font-semibold text-sm text-gray-700 border-r bg-gray-50/50">
        <span className="ml-8">Inventory</span>
      </div>

      {/* Inventory Inputs for each date */}
      {dates.map((date, dateIndex) => {
        const dailyData = dailyDataArray[dateIndex];
        const isColumnSelected = isSameDay(date, activeDate);
        const inventoryValue = dailyData.inventory;
        const hasInventory = inventoryValue > 0;

        return (
          <div
            key={dateIndex}
            className={`
              border-r last:border-r-0 p-3 flex flex-col items-center justify-center min-h-[100px]
              transition-colors
              ${isColumnSelected ? 'bg-blue-50/30' : ''}
            `}
          >
            <input
              type="number"
              value={inventoryValue}
              onChange={(e) => {
                const value = Math.max(0, Number(e.target.value) || 0);
                onUpdate(dateIndex, value);
              }}
              className={`
                w-16 h-10 flex items-center justify-center border-2 rounded font-bold text-lg text-center
                focus:outline-none focus:ring-2 focus:ring-[#2A3170] focus:border-[#2A3170]
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
  );
};

