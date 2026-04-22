import { useState } from 'react';
import { Plus, Minus, Users } from 'lucide-react';
import type { RatePlan, DailyData } from '@/types';
import { isSameDay } from 'date-fns';

interface RatePlanRowProps {
  ratePlan: RatePlan;
  dates: Date[];
  activeDate: Date;
  onUpdate: (planId: string, dateIndex: number, field: keyof DailyData, value: number | null) => void;
}

export const RatePlanRow = ({ ratePlan, dates, activeDate, onUpdate }: RatePlanRowProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      {/* Rate Plan Header Row (Collapsible) */}
      <div className="grid grid-cols-[250px_repeat(7,1fr)] border-t border-gray-200 bg-gray-50/30">
        <div className="flex items-center px-4 py-1 font-semibold text-sm text-gray-700 border-t bg-gray-300/50">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-5 h-5 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors mr-3"
          >
            {isExpanded ? (
              <Minus className="w-3 h-3" />
            ) : (
              <Plus className="w-3 h-3" />
            )}
          </button>
          <span>{ratePlan.name}</span>
        </div>

        {/* Empty cells for header row */}
        {dates.map((date, index) => {
          const isColumnSelected = isSameDay(date, activeDate);
          return (
            <div 
              key={index} 
              className={`
                border-t last:border-r-0 min-h-[60px] bg-gray-300/50
                ${isColumnSelected 
                  ? 'bg-blue-100 border-l-4 border-l-[#2A3170] border-r-4 border-r-[#2A3170]' 
                  : ''
                }
              `} 
            />
          );
        })}
      </div>

      {/* Expanded Content: Rate Input Rows */}
      {isExpanded && (
        <>
          {/* UPDATE RATE Button Row */}
          <div className="grid grid-cols-[250px_repeat(7,1fr)] border-t border-gray-200 bg-white">
            <div className="flex items-center px-4 py-2 border-r bg-white">
              <button className="text-sm font-semibold text-[#2A3170] hover:text-[#1a2040] transition-colors">
                UPDATE RATE
              </button>
            </div>
            {dates.map((date, index) => {
              const isColumnSelected = isSameDay(date, activeDate);
              return (
                <div 
                  key={index} 
                  className={`
                    border-r last:border-r-0 min-h-[40px]
                    ${isColumnSelected 
                      ? 'bg-blue-100 border-l-4 border-l-[#2A3170] border-r-4 border-r-[#2A3170]' 
                      : ''
                    }
                  `} 
                />
              );
            })}
          </div>

          {/* Base Rate (2 Adults) Row */}
          <div className="grid grid-cols-[250px_repeat(7,1fr)] border-t border-gray-200 bg-white">
            <div className="flex items-center gap-2 px-4 py-3 font-semibold text-sm text-gray-700 border-r bg-gray-50/50">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="ml-6">2</span>
            </div>

            {dates.map((date, dateIndex) => {
              const dailyData = ratePlan.dailyData[dateIndex];
              const isColumnSelected = isSameDay(date, activeDate);
              const hasBaseRate = dailyData.baseRateAdult2 !== null;

              return (
                <div
                  key={dateIndex}
                  className={`
                    border-r last:border-r-0 p-3 flex items-center justify-center min-h-[80px]
                    transition-all relative
                    ${isColumnSelected 
                      ? 'bg-blue-100 border-l-4 border-l-[#2A3170] border-r-4 border-r-[#2A3170] shadow-sm' 
                      : ''
                    }
                  `}
                >
                  <input
                    type="number"
                    value={dailyData.baseRateAdult2 ?? ''}
                    readOnly={!isColumnSelected}
                    onChange={(e) => {
                      if (isColumnSelected) {
                        const value = e.target.value === '' ? null : Number(e.target.value);
                        onUpdate(ratePlan.id, dateIndex, 'baseRateAdult2', value);
                      }
                    }}
                    className={`
                      w-full max-w-[100px] px-2 py-1.5 text-sm font-semibold border-2 rounded text-center
                      ${isColumnSelected 
                        ? 'focus:outline-none focus:ring-2 focus:ring-[#2A3170] focus:border-[#2A3170]' 
                        : 'cursor-not-allowed opacity-60'
                      }
                      ${hasBaseRate 
                        ? 'border-green-500 bg-green-50/50 text-green-700' 
                        : 'border-red-500 bg-red-50/50 text-red-700'
                      }
                    `}
                    placeholder="0"
                  />
                </div>
              );
            })}
          </div>

          {/* Adult 1 Rate Row */}
          <div className="grid grid-cols-[250px_repeat(7,1fr)] border-t border-gray-200 bg-white">
            <div className="flex items-center gap-2 px-4 py-3 font-semibold text-sm text-gray-700 border-r bg-gray-50/50">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="ml-6">1</span>
            </div>

            {dates.map((date, dateIndex) => {
              const dailyData = ratePlan.dailyData[dateIndex];
              const isColumnSelected = isSameDay(date, activeDate);

              return (
                <div
                  key={dateIndex}
                  className={`
                    border-r last:border-r-0 p-3 flex items-center justify-center min-h-[80px]
                    transition-all relative
                    ${isColumnSelected 
                      ? 'bg-blue-100 border-l-4 border-l-[#2A3170] border-r-4 border-r-[#2A3170] shadow-sm' 
                      : ''
                    }
                  `}
                >
                  <input
                    type="number"
                    value={dailyData.baseRateAdult1 ?? ''}
                    readOnly={!isColumnSelected}
                    onChange={(e) => {
                      if (isColumnSelected) {
                        const value = e.target.value === '' ? null : Number(e.target.value);
                        onUpdate(ratePlan.id, dateIndex, 'baseRateAdult1', value);
                      }
                    }}
                    className={`
                      w-full max-w-[100px] px-2 py-1.5 text-sm font-semibold border-2 border-gray-300 rounded text-center
                      bg-white text-gray-700
                      ${isColumnSelected 
                        ? 'focus:outline-none focus:ring-2 focus:ring-[#2A3170] focus:border-[#2A3170]' 
                        : 'cursor-not-allowed opacity-60'
                      }
                    `}
                    placeholder="0"
                  />
                </div>
              );
            })}
          </div>

          {/* Extra Rates & Restrictions Link */}
          <div className="grid grid-cols-[250px_repeat(7,1fr)] border-t border-gray-200 bg-white">
            <div className="flex items-center px-4 py-2 border-r bg-white">
              <button className="text-sm font-semibold text-[#2A3170] hover:text-[#1a2040] transition-colors">
                Extra Rates & Restrictions
              </button>
            </div>
            {dates.map((date, index) => {
              const isColumnSelected = isSameDay(date, activeDate);
              return (
                <div 
                  key={index} 
                  className={`
                    border-r last:border-r-0 min-h-[40px]
                    ${isColumnSelected 
                      ? 'bg-blue-100 border-l-4 border-l-[#2A3170] border-r-4 border-r-[#2A3170]' 
                      : ''
                    }
                  `} 
                />
              );
            })}
          </div>

          {/* Validation Alert for Missing Rates */}
          {/* {ratePlan.dailyData.some((data) => data.baseRateAdult2 === null) && (
            <div className="grid grid-cols-[250px_repeat(7,1fr)] border-t border-gray-200 bg-red-50">
              <div className="col-span-full px-4 py-3 border-l-4 border-red-500">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 flex items-center justify-center rounded-full bg-red-600 text-white text-xs font-bold flex-shrink-0">
                    i
                  </div>
                  <p className="text-sm font-semibold text-red-800">
                    Please note, you have not added your Base Adult Rate for some dates. Your rate plan will not show for a search of 2 or more adults on MakeMyTrip & Goibibo.
                  </p>
                </div>
              </div>
            </div>
          )} */}
        </>
      )}
    </>
  );
};

