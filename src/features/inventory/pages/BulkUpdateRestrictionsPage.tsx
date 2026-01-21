import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { format, addDays, startOfToday, isBefore, isSameDay, differenceInDays } from "date-fns";
import { ArrowLeft, Calendar, Plus } from "lucide-react";
import { inventoryService } from "../services/inventoryService";
import { Toast, useToast } from "@/components/ui/Toast";

const CUTOFF_TIME_OPTIONS = [
  { value: "00:00:00", label: "At Midnight" },
  { value: "23:59:59", label: "Before Midnight" },
  { value: "00:01:00", label: "After Midnight" },
  { value: "14:00:00", label: "2:00 PM" },
  { value: "15:00:00", label: "3:00 PM" },
  { value: "16:00:00", label: "4:00 PM" },
  { value: "18:00:00", label: "6:00 PM" },
];

export default function BulkUpdateRestrictionsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast, showToast, hideToast } = useToast();

  const hotelId = searchParams.get("hotelId");

  const today = useMemo(() => startOfToday(), []);
  const defaultEndDate = useMemo(() => addDays(today, 6), [today]);

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(defaultEndDate);

  const [blockInventory, setBlockInventory] = useState(false);
  const [unblockInventory, setUnblockInventory] = useState(false);

  const [cta, setCta] = useState(false);
  const [inactivateCta, setInactivateCta] = useState(false);

  const [ctd, setCtd] = useState(false);
  const [inactivateCtd, setInactivateCtd] = useState(false);

  const [minStay, setMinStay] = useState<string>("");
  const [cutoffTime, setCutoffTime] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!hotelId) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="text-sm text-gray-600">Missing hotel ID</span>
      </div>
    );
  }

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

  const daysCount = differenceInDays(endDate, startDate) + 1;
  const dateRangeText = `${format(startDate, "d MMM")} - ${format(
    endDate,
    "d MMM"
  )} '${format(endDate, "yy")}, ${daysCount} ${daysCount === 1 ? "Day" : "Days"}`;

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

  const handleSubmit = async () => {
    const status: "OPEN" | "CLOSED" = blockInventory ? "CLOSED" : "OPEN";

    const payload = {
      from: format(startDate, "yyyy-MM-dd"),
      to: format(endDate, "yyyy-MM-dd"),
      status,
      cta,
      ctd,
      minStay: minStay ? parseInt(minStay) : null,
      cutoffTime: cutoffTime || null,
    };

    try {
      setIsSubmitting(true);
      await inventoryService.bulkUpdateRestrictions(hotelId, payload);
      showToast("Inventory restrictions bulk updated successfully.", "success");
      navigate(`/inventory/room-types?hotelId=${hotelId}`);
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to update restrictions";
      showToast(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="w-full h-full bg-gray-50 pb-24 overflow-x-auto">
      <div className="max-w-5xl mx-auto px-6 pt-6">
        <button
          onClick={handleCancel}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Bulk Restrictions</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Update restrictions for entire hotel
              </p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Stay Dates */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-900">Stay Dates</label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    value={format(startDate, "yyyy-MM-dd")}
                    min={format(today, "yyyy-MM-dd")}
                    onChange={(e) =>
                      handleStartDateChange(new Date(e.target.value + "T00:00:00"))
                    }
                    className="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
                <span className="text-gray-500 font-medium">to</span>
                <div className="relative flex-1">
                  <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    value={format(endDate, "yyyy-MM-dd")}
                    min={format(startDate, "yyyy-MM-dd")}
                    onChange={(e) =>
                      handleEndDateChange(new Date(e.target.value + "T00:00:00"))
                    }
                    className="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
              </div>
              <div className="text-sm text-gray-600 font-medium">{dateRangeText}</div>
              <button
                type="button"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add Another Stay Date
              </button>
            </div>

            {/* Info text */}
            <div className="pt-4 border-t border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900 mb-1">
                UPDATE RESTRICTIONS FOR ENTIRE HOTEL
              </h2>
              <p className="text-xs text-gray-500">
                Please note, any restrictions you apply from here will be applied on all rooms
                and rates.
              </p>
            </div>

            {/* Restrictions groups in a row */}
            <div className="flex flex-col gap-8 md:flex-row md:gap-12">
              {/* Inventory Restrictions */}
              <div className="flex-1 space-y-3">
                <label className="text-sm font-semibold text-gray-900">
                  Inventory Restrictions
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={blockInventory}
                      onChange={(e) => handleBlockInventoryChange(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">
                      Block Inventory
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={unblockInventory}
                      onChange={(e) => handleUnblockInventoryChange(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">
                      Unblock Inventory
                    </span>
                  </label>
                </div>
              </div>

              {/* Arrival Restrictions */}
              <div className="flex-1 space-y-3">
                <label className="text-sm font-semibold text-gray-900">
                  Arrival Restrictions
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={cta}
                      onChange={(e) => handleCtaChange(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">
                      Close to Arrival (CTA)
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={inactivateCta}
                      onChange={(e) => handleInactivateCtaChange(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">
                      Inactivate CTA
                    </span>
                  </label>
                </div>
              </div>

              {/* Departure Restrictions */}
              <div className="flex-1 space-y-3">
                <label className="text-sm font-semibold text-gray-900">
                  Departure Restrictions
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={ctd}
                      onChange={(e) => handleCtdChange(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">
                      Close to Departure (CTD)
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={inactivateCtd}
                      onChange={(e) => handleInactivateCtdChange(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">
                      Inactivate CTD
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Minimum Length of Stay */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">
                Set Minimum length of stay.
              </label>
              <input
                type="number"
                min="0"
                value={minStay}
                onChange={(e) => setMinStay(e.target.value)}
                placeholder="e.g. 2"
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 placeholder:text-gray-400"
              />
            </div>

            {/* Cutoff */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">Set Cutoff</label>
              <select
                value={cutoffTime}
                onChange={(e) => setCutoffTime(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 cursor-pointer"
              >
                <option value="">Select</option>
                {CUTOFF_TIME_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  );
}


