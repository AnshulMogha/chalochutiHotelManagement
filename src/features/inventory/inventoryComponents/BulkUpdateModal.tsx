import { useState,useMemo } from 'react';
import { format, startOfToday, addDays, isBefore, isSameDay } from 'date-fns';
import { X, Calendar as CalendarIcon } from 'lucide-react';

interface BulkUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (startDate: Date, endDate: Date, value: number | null, field?: 'baseRateAdult1' | 'baseRateAdult2') => void;
  section: 'room-types' | 'rate-plans';
}

export const BulkUpdateModal = ({
  isOpen,
  onClose,
  onApply,
  section,
}: BulkUpdateModalProps) => {
  const today = useMemo(() => startOfToday(), []);
  const defaultEndDate = useMemo(() => addDays(today, 6), [today]);

  // These will now reset automatically because of the 'key' in the parent
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [value, setValue] = useState<string>('');
  const [selectedField, setSelectedField] = useState<'baseRateAdult1' | 'baseRateAdult2'>('baseRateAdult1');

  // REMOVE THE USEEFFECT COMPLETELY
  
  if (!isOpen) return null;

  const handleStartDateChange = (date: Date) => {
    // Only allow if the date is today or in the future
    if (!isBefore(date, today) || isSameDay(date, today)) {
      setStartDate(date);
      // If start date is after end date, adjust end date to match
      if (isBefore(endDate, date)) {
        setEndDate(date);
      }
    }
  };

  const handleEndDateChange = (date: Date) => {
    if (!isBefore(date, today) || isSameDay(date, today)) {
      // Ensure end date is not before start date
      if (!isBefore(date, startDate) || isSameDay(date, startDate)) {
        setEndDate(date);
      }
    }
  };

  const handleApply = () => {
    const numValue = value === '' ? null : Number(value);
    if (numValue !== null && (isNaN(numValue) || numValue < 0)) {
      alert('Please enter a valid number (0 or greater)');
      return;
    }
    
    onApply(
      startDate, 
      endDate, 
      numValue, 
      section === 'rate-plans' ? selectedField : undefined
    );
    onClose();
  };

  const getFieldLabel = () => {
    return section === 'room-types' ? 'Total Inventory' : 'Rate Amount';
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Bulk Update</h2>
            <p className="text-xs text-slate-500 mt-0.5">Update multiple dates at once</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200/50 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Date Range Group */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Start Date
              </label>
              <div className="relative flex items-center">
                <CalendarIcon className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="date"
                  value={format(startDate, 'yyyy-MM-dd')}
                  min={format(today, 'yyyy-MM-dd')}
                  onChange={(e) => handleStartDateChange(new Date(e.target.value + 'T00:00:00'))}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                End Date
              </label>
              <div className="relative flex items-center">
                <CalendarIcon className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="date"
                  value={format(endDate, 'yyyy-MM-dd')}
                  min={format(startDate, 'yyyy-MM-dd')}
                  onChange={(e) => handleEndDateChange(new Date(e.target.value + 'T00:00:00'))}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Rate Plan Specific Fields */}
          {section === 'rate-plans' && (
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Select Rate Target
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['baseRateAdult1', 'baseRateAdult2'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setSelectedField(f)}
                    className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                      selectedField === f
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-1 ring-indigo-200'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {f === 'baseRateAdult1' ? '1 Adult' : '2 Adults'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Value Input */}
          <div className="space-y-1.5 pt-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              New {getFieldLabel()} Value
            </label>
            <input
              type="number"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. 25"
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
            />
            <p className="text-[10px] text-slate-400 italic">
              * This will overwrite existing values for all rooms in this date range.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 bg-slate-50/50 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all active:scale-95"
          >
            Update Range
          </button>
        </div>
      </div>
    </div>
  );
};