import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Toast, useToast } from "@/components/ui/Toast";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { propertyService } from "@/features/properties/services/propertyService";
import type { PoliciesInfo } from "@/features/properties/types";
// Note: transformPoliciesToRules is not exported, so we'll create rules inline

interface PolicyAndRulesTabProps {
  hotelId: string;
}

export function PolicyAndRulesTab({ hotelId }: PolicyAndRulesTabProps) {
  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [policies, setPolicies] = useState<Partial<PoliciesInfo>>({
    checkinTime: "12:00",
    checkoutTime: "12:00",
    cancellationPolicy: "free_till_checkin",
  });

  useEffect(() => {
    // For now, we'll use default values. In the future, you can add an API to fetch existing policies
    // const fetchPolicies = async () => {
    //   setLoading(true);
    //   try {
    //     const data = await adminService.getHotelPolicies(hotelId);
    //     setPolicies(data);
    //   } catch (error) {
    //     console.error("Error fetching policies:", error);
    //   } finally {
    //     setLoading(false);
    //   }
    // };
    // fetchPolicies();
  }, [hotelId]);

  const handleUpdatePolicy = (
    key: keyof PoliciesInfo,
    value: string | boolean | string[] | undefined
  ) => {
    setPolicies((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Create basic rules from policies
      const rules = [];
      
      if (policies.checkinTime) {
        rules.push({
          category: "CHECKIN_CHECKOUT",
          ruleCode: "CHECKIN_TIME",
          value: policies.checkinTime,
          active: true,
        });
      }
      
      if (policies.checkoutTime) {
        rules.push({
          category: "CHECKIN_CHECKOUT",
          ruleCode: "CHECKOUT_TIME",
          value: policies.checkoutTime,
          active: true,
        });
      }
      
      if (policies.cancellationPolicy) {
        const hours = policies.cancellationPolicy === "free_till_checkin" ? -1 : 
                     policies.cancellationPolicy === "non_refundable" ? 0 :
                     policies.cancellationPolicy === "refundable_24h" ? 24 :
                     policies.cancellationPolicy === "refundable_48h" ? 48 : -1;
        rules.push({
          category: "CANCELLATION",
          ruleCode: "FREE_CANCEL_BEFORE_HOURS",
          value: hours,
          active: true,
        });
      }

      await propertyService.submitPolicies(
        {
          draft: false,
          rules,
        },
        hotelId
      );
      showToast("Policies saved successfully", "success");
    } catch (error) {
      console.error("Error saving policies:", error);
      showToast("Failed to save policies", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Policy and Rules</h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage check-in/check-out times, cancellation policies, and property rules
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {/* Check-in & Check-out Time */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Check-in & Check-out Time
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Check-in Time
              </label>
              <Input
                type="time"
                value={policies.checkinTime || "12:00"}
                onChange={(e) => handleUpdatePolicy("checkinTime", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Check-out Time
              </label>
              <Input
                type="time"
                value={policies.checkoutTime || "12:00"}
                onChange={(e) => handleUpdatePolicy("checkoutTime", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Cancellation Policy */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Cancellation Policy
          </h3>
          <div>
            <Select
              value={policies.cancellationPolicy || "free_till_checkin"}
              onChange={(e) => handleUpdatePolicy("cancellationPolicy", e.target.value)}
              options={[
                { value: "free_till_checkin", label: "Free till check-in" },
                { value: "non_refundable", label: "Non-refundable" },
                { value: "refundable_24h", label: "Refundable (24 hours before)" },
                { value: "refundable_48h", label: "Refundable (48 hours before)" },
              ]}
            />
          </div>
        </div>

        {/* Note: Additional policy sections can be added here similar to PoliciesStep */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            Additional policy options (guest profile, property restrictions, pet policy, etc.) 
            can be added by extending this component with more sections.
          </p>
        </div>
      </div>
    </>
  );
}

