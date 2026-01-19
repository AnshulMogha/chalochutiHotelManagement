import { Info } from 'lucide-react';
import type { RoomType } from '@/types';

interface ValidationAlertProps {
  rooms: RoomType[];
}

export const ValidationAlert = ({ rooms }: ValidationAlertProps) => {
  // Check if any rate plan has missing base rates
  const hasMissingRates = rooms.some((room) =>
    room.ratePlans.some((plan) =>
      plan.dailyData.some((data) => data.baseRateAdult2 === null)
    )
  );

  if (!hasMissingRates) {
    return null;
  }

  return (
    <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-sm">
      <div className="flex items-center gap-2">
        <Info className="w-5 h-5 text-red-600 flex-shrink-0" />
        <p className="text-sm font-semibold text-red-800">
          Please note, you have not added your Base Adult Rate for some dates. 
          Please add the rates to avoid any booking issues.
        </p>
      </div>
    </div>
  );
};

