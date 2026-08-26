import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Building2, Plus, RefreshCw } from "lucide-react";
import { Toast, useToast } from "@/components/ui/Toast";
import { extractErrorMessage } from "@/features/reports/components/ReportJsonPanel";
import { getInclusionsCatalogue } from "../services/inclusionsService";
import type {
  InclusionCatalogueCategory,
  InclusionCatalogueItem,
  InclusionEditTarget,
} from "../services/inclusionsTypes";
import { OfferInclusionPicker } from "../components/property-info/OfferInclusionPicker";
import { EarlyCheckInInclusionForm } from "../components/property-info/EarlyCheckInInclusionForm";
import { LateCheckOutInclusionForm } from "../components/property-info/LateCheckOutInclusionForm";
import { EarlyLateComboInclusionForm } from "../components/property-info/EarlyLateComboInclusionForm";
import { RoomUpgradeInclusionForm } from "../components/property-info/RoomUpgradeInclusionForm";
import { MealPersonsInclusionForm } from "../components/property-info/MealPersonsInclusionForm";
import { TransferInclusionForm } from "../components/property-info/TransferInclusionForm";
import { SimpleFreeInclusionForm } from "../components/property-info/SimpleFreeInclusionForm";
import { PropertyInclusionsList } from "../components/property-info/PropertyInclusionsList";
import {
  catalogueItemFromRatePlanInclusion,
  MEAL_PERSONS_CODES,
  ROOM_UPGRADE_CODES,
  SIMPLE_FREE_CODES,
  TIME_OFFSET_CODES,
  TRANSFER_CODES,
} from "../components/property-info/inclusionFormShared";

type ViewMode = "home" | "offer" | "configure" | "edit";

function ConfigureInclusionForm({
  hotelId,
  inclusion,
  onBack,
  onSuccess,
  showToast,
  editTarget = null,
}: {
  hotelId: string;
  inclusion: InclusionCatalogueItem;
  onBack: () => void;
  onSuccess: () => void;
  showToast: (message: string, type: "success" | "error") => void;
  editTarget?: InclusionEditTarget | null;
}) {
  const code = inclusion.code.toUpperCase();
  const configType = String(inclusion.configurationType || "").toUpperCase();
  const formProps = {
    hotelId,
    inclusion,
    onBack,
    onSuccess,
    showToast,
    editTarget,
  };

  if (code === "LATE_CHECKOUT") {
    return <LateCheckOutInclusionForm {...formProps} />;
  }
  if (code === "GUARANTEED_EARLY_CHECKIN_LATE_CHECKOUT") {
    return <EarlyLateComboInclusionForm {...formProps} />;
  }
  if (code === "EARLY_CHECKIN" || TIME_OFFSET_CODES.has(code)) {
    return <EarlyCheckInInclusionForm {...formProps} />;
  }
  if (ROOM_UPGRADE_CODES.has(code) || configType === "ROOM_UPGRADE") {
    return <RoomUpgradeInclusionForm {...formProps} />;
  }
  if (MEAL_PERSONS_CODES.has(code) || configType === "MEAL") {
    return <MealPersonsInclusionForm {...formProps} />;
  }
  if (TRANSFER_CODES.has(code) || configType === "TRANSFER") {
    return <TransferInclusionForm {...formProps} />;
  }
  if (
    SIMPLE_FREE_CODES.has(code) ||
    configType === "NONE" ||
    configType === "GENERIC"
  ) {
    return <SimpleFreeInclusionForm {...formProps} />;
  }
  return <SimpleFreeInclusionForm {...formProps} />;
}

export default function InclusionsPage() {
  const [searchParams] = useSearchParams();
  const hotelId = searchParams.get("hotelId");
  const { toast, showToast, hideToast } = useToast();

  const [view, setView] = useState<ViewMode>("home");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<InclusionCatalogueCategory[]>(
    [],
  );

  const [selectedInclusion, setSelectedInclusion] =
    useState<InclusionCatalogueItem | null>(null);
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const [editTarget, setEditTarget] = useState<InclusionEditTarget | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getInclusionsCatalogue();
      setCategories(data.categories);
    } catch (err) {
      setCategories([]);
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openOffer = () => {
    setView("offer");
    if (categories.length === 0 && !loading) {
      void load();
    }
  };

  const handleSelect = (inclusion: InclusionCatalogueItem) => {
    setSelectedInclusion(inclusion);
    setView("configure");
  };

  if (!hotelId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900">Inclusions</h1>
        <p className="mt-1 text-sm text-slate-500">
          Select a hotel from the top bar to manage inclusions.
        </p>
        <div className="mt-8 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2f3d95]/10">
            <Building2 className="h-7 w-7 text-[#2f3d95]" />
          </div>
          <p className="font-medium text-slate-700">No hotel selected</p>
        </div>
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
      <div className="container mx-auto px-4 py-6">
        {view === "home" ? (
          <>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Inclusions</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Offer catalogue inclusions for this property
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void load();
                    setListRefreshKey((k) => k + 1);
                  }}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={openOffer}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#2f3d95] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#263578]"
                >
                  <Plus className="h-4 w-4" />
                  Create Inclusion
                </button>
              </div>
            </div>

            {error ? (
              <p className="mb-3 text-sm text-rose-600">{error}</p>
            ) : null}

            <PropertyInclusionsList
              hotelId={hotelId}
              refreshKey={listRefreshKey}
              onEditInclusion={({
                roomKey,
                ratePlanId,
                roomName,
                ratePlanName,
                item,
              }) => {
                setEditTarget({
                  inclusionId: item.id,
                  roomKey,
                  ratePlanId,
                  roomName,
                  ratePlanName,
                  item,
                });
                setSelectedInclusion(catalogueItemFromRatePlanInclusion(item));
                setView("edit");
              }}
            />
          </>
        ) : view === "offer" ? (
          <OfferInclusionPicker
            categories={categories}
            loading={loading}
            error={error}
            onBack={() => setView("home")}
            onSelect={handleSelect}
          />
        ) : view === "configure" && selectedInclusion ? (
          <ConfigureInclusionForm
            hotelId={hotelId}
            inclusion={selectedInclusion}
            onBack={() => setView("offer")}
            onSuccess={() => {
              setListRefreshKey((k) => k + 1);
              setView("home");
            }}
            showToast={showToast}
          />
        ) : view === "edit" && selectedInclusion && editTarget ? (
          <ConfigureInclusionForm
            hotelId={hotelId}
            inclusion={selectedInclusion}
            editTarget={editTarget}
            onBack={() => {
              setEditTarget(null);
              setView("home");
            }}
            onSuccess={() => {
              setEditTarget(null);
              setListRefreshKey((k) => k + 1);
              setView("home");
            }}
            showToast={showToast}
          />
        ) : null}
      </div>
    </>
  );
}
