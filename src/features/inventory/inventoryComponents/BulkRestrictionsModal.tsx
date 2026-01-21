import { useState, useMemo } from 'react';
import { format, startOfToday, addDays, isBefore, isSameDay, differenceInDays } from 'date-fns';
import { X, Calendar as CalendarIcon, Plus } from 'lucide-react';

interface BulkRestrictionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (data: {
    from: string;
    to: string;
    status: 'OPEN' | 'CLOSED';
    cta: boolean;
    ctd: boolean;
    minStay: number | null;
    cutoffTime: string | null;
  }) => void;
}

const CUTOFF_TIME_OPTIONS = [
  { value: '00:00:00', label: 'At Midnight' },
  { value: '23:59:59', label: 'Before Midnight' },
  { value: '00:01:00', label: 'After Midnight' },
  // Add more common cutoff times
  { value: '14:00:00', label: '2:00 PM' },
  { value: '15:00:00', label: '3:00 PM' },
  { value: '16:00:00', label: '4:00 PM' },
  { value: '18:00:00', label: '6:00 PM' },
];

export const BulkRestrictionsModal = ({
  isOpen,
  onClose,
  onApply,
}: BulkRestrictionsModalProps) => {
  const today = useMemo(() => startOfToday(), []);
  const defaultEndDate = useMemo(() => addDays(today, 6), [today]);

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(defaultEndDate);
  
  // Inventory Restrictions
  const [blockInventory, setBlockInventory] = useState(false);
  const [unblockInventory, setUnblockInventory] = useState(false);
  
  // Arrival Restrictions
  const [cta, setCta] = useState(false);
  const [inactivateCta, setInactivateCta] = useState(false);
  
  // Departure Restrictions
  const [ctd, setCtd] = useState(false);
  const [inactivateCtd, setInactivateCtd] = useState(false);
  
  // Minimum Length of Stay
  const [minStay, setMinStay] = useState<string>('');
  
  // Cutoff Time
  const [cutoffTime, setCutoffTime] = useState<string>('');

  if (!isOpen) return null;

  const handleStartDateChange = (date: Date) => {
    if (!isBefore(date, today) || isSameDay(date, today)) {
      setStartDate(date);
      if (isBefore(endDate, date)) {
        setEndDate(date);
      }
    }
  };

  const handleEndDateChange = (date: Date) => {
    if (!isBefore(date, today) || isSameDay(date, today)) {
      if (!isBefore(date, startDate) || isSameDay(date, startDate)) {
        setEndDate(date);
      }
    }
  };

  const handleBlockInventoryChange = (checked: boolean) => {
    setBlockInventory(checked);
    if (checked) {
      setUnblockInventory(false);
    }
  };

  const handleUnblockInventoryChange = (checked: boolean) => {
    setUnblockInventory(checked);
    if (checked) {
      setBlockInventory(false);
    }
  };

  const handleCtaChange = (checked: boolean) => {
    setCta(checked);
    if (checked) {
      setInactivateCta(false);
    }
  };

  const handleInactivateCtaChange = (checked: boolean) => {
    setInactivateCta(checked);
    if (checked) {
      setCta(false);
    }
  };

  const handleCtdChange = (checked: boolean) => {
    setCtd(checked);
    if (checked) {
      setInactivateCtd(false);
    }
  };

  const handleInactivateCtdChange = (checked: boolean) => {
    setInactivateCtd(checked);
    if (checked) {
      setCtd(false);
    }
  };

  const handleSave = () => {
    // Determine status: CLOSED if block, OPEN if unblock, default to OPEN
    const status: 'OPEN' | 'CLOSED' = blockInventory ? 'CLOSED' : unblockInventory ? 'OPEN' : 'OPEN';
    
    // Build payload - all fields are required in the API
    const payload = {
      from: format(startDate, 'yyyy-MM-dd'),
      to: format(endDate, 'yyyy-MM-dd'),
      status,
      cta: cta,
      ctd: ctd,
      minStay: minStay ? parseInt(minStay) : null,
      cutoffTime: cutoffTime || null,
    };

    onApply(payload);
    onClose();
  };

  const daysCount = differenceInDays(endDate, startDate) + 1;
  const dateRangeText = `${format(startDate, 'd MMM')} - ${format(endDate, 'd MMM')} '${format(endDate, 'yy')}, ${daysCount} ${daysCount === 1 ? 'Day' : 'Days'}`;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Bulk Restrictions</h2>
            <p className="text-xs text-slate-500 mt-0.5">Update restrictions for entire hotel</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200/50 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Stay Dates Section */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-700">Stay Dates</label>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <CalendarIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  value={format(startDate, 'yyyy-MM-dd')}
                  min={format(today, 'yyyy-MM-dd')}
                  onChange={(e) => handleStartDateChange(new Date(e.target.value + 'T00:00:00'))}
                  className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <span className="text-slate-500 font-medium">to</span>
              <div className="relative flex-1">
                <CalendarIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  value={format(endDate, 'yyyy-MM-dd')}
                  min={format(startDate, 'yyyy-MM-dd')}
                  onChange={(e) => handleEndDateChange(new Date(e.target.value + 'T00:00:00'))}
                  className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>
            <div className="text-sm text-slate-600 font-medium">
              {dateRangeText}
            </div>
            <button
              type="button"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add Another Stay Date
            </button>
          </div>

          {/* Main Heading */}
          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-base font-bold text-slate-800 mb-1">
              UPDATE RESTRICTIONS FOR ENTIRE HOTEL
            </h3>
            <p className="text-xs text-slate-500">
              Please note, any restrictions you apply from here will be applied on all rooms and rates.
            </p>
          </div>

          {/* Inventory Restrictions */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-700">Inventory Restrictions</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={blockInventory}
                  onChange={(e) => handleBlockInventoryChange(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-sm text-slate-700 group-hover:text-slate-900">Block Inventory</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={unblockInventory}
                  onChange={(e) => handleUnblockInventoryChange(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-sm text-slate-700 group-hover:text-slate-900">Unblock Inventory</span>
              </label>
            </div>
          </div>

          {/* Arrival Restrictions */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-700">Arrival Restrictions</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={cta}
                  onChange={(e) => handleCtaChange(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-sm text-slate-700 group-hover:text-slate-900">Close to Arrival (CTA)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={inactivateCta}
                  onChange={(e) => handleInactivateCtaChange(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-sm text-slate-700 group-hover:text-slate-900">Inactivate CTA</span>
              </label>
            </div>
          </div>

          {/* Departure Restrictions */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-700">Departure Restrictions</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={ctd}
                  onChange={(e) => handleCtdChange(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-sm text-slate-700 group-hover:text-slate-900">Close to Departure (CTD)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={inactivateCtd}
                  onChange={(e) => handleInactivateCtdChange(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-sm text-slate-700 group-hover:text-slate-900">Inactivate CTD</span>
              </label>
            </div>
          </div>

          {/* Minimum Length of Stay */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              Set Minimum length of stay.
            </label>
            <input
              type="number"
              min="0"
              value={minStay}
              onChange={(e) => setMinStay(e.target.value)}
              placeholder="e.g. 2"
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Cutoff Time */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Set Cutoff</label>
            <select
              value={cutoffTime}
              onChange={(e) => setCutoffTime(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="">Select</option>
              {CUTOFF_TIME_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {cutoffTime && (
              <p className="text-xs text-slate-500 mt-1">
                which means your check-in Bookable till {cutoffTime === '00:00:00' ? 'Midnight' : cutoffTime === '23:59:59' ? 'Before Midnight' : cutoffTime === '00:01:00' ? 'After Midnight' : format(new Date(`2000-01-01T${cutoffTime}`), 'h:mm a')}.
              </p>
            )}
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
            onClick={handleSave}
            className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all active:scale-95"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

