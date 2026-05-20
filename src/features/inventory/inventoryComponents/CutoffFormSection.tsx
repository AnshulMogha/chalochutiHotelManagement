import { Clock } from 'lucide-react';
import {
  clampCutoffHoursInput,
  CUTOFF_PRESET_OPTIONS,
  getCutoffHelperMessage,
  getCutoffHoursMax,
  type CutoffPreset,
} from '../utils/rateHelpers';

type CutoffFormSectionProps = {
  cutoffPreset: CutoffPreset;
  cutoffHours: string;
  fixedCutoffTime: string;
  onPresetChange: (value: CutoffPreset) => void;
  onHoursChange: (value: string) => void;
  onFixedTimeChange: (value: string) => void;
  disabled?: boolean;
  errorMessage?: string | null;
  labelClassName?: string;
};

export function CutoffFormSection({
  cutoffPreset,
  cutoffHours,
  fixedCutoffTime,
  onPresetChange,
  onHoursChange,
  onFixedTimeChange,
  disabled = false,
  errorMessage = null,
  labelClassName = 'text-sm font-semibold text-gray-900',
}: CutoffFormSectionProps) {
  const needsCutoffHours =
    cutoffPreset === 'BEFORE_MIDNIGHT' || cutoffPreset === 'AFTER_MIDNIGHT';
  const needsFixedTime = cutoffPreset === 'FIXED_TIME';

  const helperMessage = getCutoffHelperMessage(
    cutoffPreset,
    needsCutoffHours ? parseInt(cutoffHours, 10) : 0,
    fixedCutoffTime,
  );

  const handlePresetChange = (value: CutoffPreset) => {
    onPresetChange(value);
    if (value !== 'BEFORE_MIDNIGHT' && value !== 'AFTER_MIDNIGHT') {
      onHoursChange('');
    } else if (cutoffHours) {
      onHoursChange(clampCutoffHoursInput(value, cutoffHours));
    }
    if (value !== 'FIXED_TIME') {
      onFixedTimeChange('');
    }
  };

  const hoursMax = getCutoffHoursMax(cutoffPreset) ?? 23;

  const handleHoursChange = (raw: string) => {
    onHoursChange(clampCutoffHoursInput(cutoffPreset, raw));
  };

  const selectClassName =
    'w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed';

  return (
    <div className="space-y-3">
      <label className={labelClassName}>Set Cutoff</label>
      <p className="text-xs text-gray-500 -mt-1">
        Controls until when guests can book for each stay date. Applies on the check-in day.
      </p>
      <select
        value={cutoffPreset}
        onChange={(e) => handlePresetChange(e.target.value as CutoffPreset)}
        disabled={disabled}
        className={selectClassName}
      >
        <option value="">No cutoff change</option>
        {CUTOFF_PRESET_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {needsCutoffHours && (
        <div className="space-y-2 rounded-lg border border-blue-100 bg-blue-50/50 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-semibold text-gray-900 shrink-0">
              {cutoffPreset === 'BEFORE_MIDNIGHT'
                ? 'Hours before midnight'
                : 'Hours after midnight'}
            </label>
            <input
              type="number"
              min={1}
              max={hoursMax}
              step={1}
              value={cutoffHours}
              onChange={(e) => handleHoursChange(e.target.value)}
              placeholder={
                cutoffPreset === 'BEFORE_MIDNIGHT' ? '1–23' : '1–6'
              }
              disabled={disabled}
              className="w-40 min-w-[10rem] px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 placeholder:text-gray-400 disabled:opacity-60"
            />
          </div>
          <p className="text-xs text-gray-500">
            {cutoffPreset === 'BEFORE_MIDNIGHT'
              ? 'You can enter 1 to 23 hours only.'
              : 'You can enter 1 to 6 hours only.'}
          </p>
          {helperMessage && (
            <p className="text-xs text-gray-600 leading-relaxed">{helperMessage}</p>
          )}
        </div>
      )}

      {needsFixedTime && (
        <div className="space-y-2 rounded-lg border border-violet-100 bg-violet-50/50 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-semibold text-gray-900 shrink-0 flex items-center gap-2">
              <Clock className="w-4 h-4 text-violet-600" aria-hidden />
              Booking closes at
            </label>
            <input
              type="time"
              value={fixedCutoffTime}
              onChange={(e) => onFixedTimeChange(e.target.value)}
              disabled={disabled}
              className="min-w-[10rem] px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 disabled:opacity-60"
            />
          </div>
          {helperMessage && (
            <p className="text-xs text-gray-600 leading-relaxed">{helperMessage}</p>
          )}
        </div>
      )}

      {cutoffPreset === 'MIDNIGHT' && helperMessage && (
        <p className="text-xs text-gray-600 leading-relaxed rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
          {helperMessage}
        </p>
      )}

      {errorMessage && (
        <p className="text-xs text-red-600 font-medium" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
