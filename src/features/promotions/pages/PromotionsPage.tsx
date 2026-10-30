import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui";
import { Input } from "@/components/ui/Input";
import type { GridColDef } from "@mui/x-data-grid";
import {
  adminService,
  type PromotionListItem,
} from "@/features/admin/services/adminService";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import {
  Percent,
  Clock,
  Bird,
  Calendar,
  Crown,
  Eye,
  Search,
  ArrowLeft,
  Tag,
  Plus,
} from "lucide-react";

const PROMO_STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "expired", label: "Expired" },
] as const;

interface PromotionType {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  iconColor?: string;
  iconBg?: string;
}

const promotionTypes: PromotionType[] = [
  {
    id: "basic",
    title: "Basic Promotion",
    description: "Offer recurring discounts to improve occupancy.",
    icon: <Percent className="w-6 h-6" />,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
  },
  {
    id: "last-minute",
    title: "Last Minute Promotion",
    description:
      "Offer last-minute discounts to guests who book 0, 1, or 2 days before check-in.",
    icon: <Clock className="w-6 h-6" />,
    iconColor: "text-purple-600",
    iconBg: "bg-purple-50",
  },
  {
    id: "early-bird",
    title: "Early Bird Promotion",
    description:
      "Offer exclusive discounts to those who reserve their stays well in advance.",
    icon: <Bird className="w-6 h-6" />,
    iconColor: "text-green-600",
    iconBg: "bg-green-50",
  },
  {
    id: "long-stay",
    title: "Long Stay Promotion",
    description:
      "Offer guests free nights or discounted prices to promote longer stays.",
    icon: <Calendar className="w-6 h-6" />,
    iconColor: "text-orange-600",
    iconBg: "bg-orange-50",
  },
];

export default function PromotionsPage() {
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromUrl || "my-promotions");
  const [myPromotionsSubTab, setMyPromotionsSubTab] = useState<
    "all" | "draft" | "active" | "paused" | "expired"
  >("all");
  const [loading, setLoading] = useState(false);
  const [promotions, setPromotions] = useState<PromotionListItem[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [promotionSearch, setPromotionSearch] = useState("");
  const navigate = useNavigate();
  const hotelId = searchParams.get("hotelId");
  const { showToast } = useToast();

  // Update active tab when URL param changes
  useEffect(() => {
    if (
      tabFromUrl &&
      (tabFromUrl === "create" || tabFromUrl === "my-promotions")
    ) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  useEffect(() => {
    if (activeTab === "my-promotions" && hotelId) {
      loadPromotions();
    }
  }, [activeTab, hotelId, myPromotionsSubTab, page, pageSize]);

  useEffect(() => {
    setPage(0);
    setPromotionSearch("");
  }, [myPromotionsSubTab]);

  const loadPromotions = async () => {
    if (!hotelId) return;
    setLoading(true);
    try {
      const statusParamMap: Record<
        "all" | "draft" | "active" | "paused" | "expired",
        "DRAFT" | "ACTIVE" | "PAUSED" | "EXPIRED" | undefined
      > = {
        all: undefined,
        draft: "DRAFT",
        active: "ACTIVE",
        paused: "PAUSED",
        expired: "EXPIRED",
      };
      const response = await adminService.getPromotions(hotelId, {
        page,
        size: pageSize,
        status: statusParamMap[myPromotionsSubTab],
        applyChannel: "B2C",
      });
      setPromotions(response.content || response.data || []);
      setTotalPages(response.totalPages || 0);
      setTotalElements(response.totalElements || 0);
      setHasNext(Boolean(response.hasNext));
      setHasPrevious(Boolean(response.hasPrevious));
    } catch (error) {
      console.error("Error loading promotions:", error);
      showToast("Failed to load promotions", "error");
      setPromotions([]);
      setTotalPages(0);
      setTotalElements(0);
      setHasNext(false);
      setHasPrevious(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePromotion = (type: string) => {
    const url = hotelId
      ? `/promotions/create/${type}?hotelId=${hotelId}`
      : `/promotions/create/${type}`;
    navigate(url);
  };

  const handleStatusChange = async (promotionId: string, newStatus: string) => {
    if (!hotelId) {
      showToast("Please select a hotel first", "error");
      return;
    }

    try {
      await adminService.updatePromotionStatus(hotelId, promotionId, {
        status: newStatus as "DRAFT" | "ACTIVE" | "PAUSED" | "EXPIRED",
      });
      const statusLabels: Record<string, string> = {
        DRAFT: "drafted",
        ACTIVE: "activated",
        PAUSED: "paused",
        EXPIRED: "expired",
      };
      showToast(
        `Promotion ${statusLabels[newStatus] || "updated"} successfully`,
        "success",
      );
      // Reload promotions list
      loadPromotions();
    } catch (error: any) {
      console.error("Error updating promotion status:", error);
      showToast(
        error?.response?.data?.message || "Failed to update promotion status",
        "error",
      );
    }
  };

  const statusOptions = [
    { value: "DRAFT", label: "Draft" },
    { value: "ACTIVE", label: "Active" },
    { value: "PAUSED", label: "Paused" },
    { value: "EXPIRED", label: "Expired" },
  ];

  const getStatusSelectClass = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "border-emerald-200 bg-emerald-50 text-emerald-800";
      case "DRAFT":
        return "border-sky-200 bg-sky-50 text-sky-800";
      case "PAUSED":
        return "border-amber-200 bg-amber-50 text-amber-800";
      case "EXPIRED":
        return "border-rose-200 bg-rose-50 text-rose-800";
      default:
        return "border-slate-200 bg-slate-50 text-slate-700";
    }
  };

  const getApplyChannelLabel = (channel?: string) => {
    switch (channel) {
      case "B2C":
        return "B2C";
      case "B2B":
        return "B2B";
      case "PACKAGE":
      case "BUNDLED_RATES":
        return "Bundled Rates";
      default:
        return channel || "—";
    }
  };

  const getPromotionTypeLabel = (type: string) => {
    switch (type) {
      case "BASIC":
        return "Basic";
      case "LAST_MINUTE":
        return "Last Minute";
      case "EARLY_BIRD":
        return "Early Bird";
      case "LONG_STAY":
        return "Long Stay";
      case "SPECIAL_AUDIENCE":
        return "Special Audience";
      default:
        return type.replaceAll("_", " ");
    }
  };

  const getPromotionTypeMeta = (type: string) => {
    switch (type) {
      case "BASIC":
        return {
          icon: <Percent className="h-3 w-3" />,
          className: "bg-sky-50 text-sky-800 ring-sky-200",
        };
      case "LAST_MINUTE":
        return {
          icon: <Clock className="h-3 w-3" />,
          className: "bg-violet-50 text-violet-800 ring-violet-200",
        };
      case "EARLY_BIRD":
        return {
          icon: <Bird className="h-3 w-3" />,
          className: "bg-emerald-50 text-emerald-800 ring-emerald-200",
        };
      case "LONG_STAY":
        return {
          icon: <Calendar className="h-3 w-3" />,
          className: "bg-orange-50 text-orange-800 ring-orange-200",
        };
      case "SPECIAL_AUDIENCE":
        return {
          icon: <Crown className="h-3 w-3" />,
          className: "bg-indigo-50 text-indigo-800 ring-indigo-200",
        };
      default:
        return {
          icon: <Tag className="h-3 w-3" />,
          className: "bg-slate-100 text-slate-700 ring-slate-200",
        };
    }
  };

  const filteredPromotions = useMemo(() => {
    const q = promotionSearch.trim().toLowerCase();
    if (!q) return promotions;
    return promotions.filter((promotion) => {
      const name = (promotion.promotionName ?? "").toLowerCase();
      const type = (promotion.promotionType ?? "").toLowerCase();
      const typeLabel = getPromotionTypeLabel(promotion.promotionType).toLowerCase();
      const status = (promotion.status ?? "").toLowerCase();
      const offerType = (promotion.offerType ?? "").toLowerCase();
      const applyChannel = (promotion.applyChannel ?? "").toLowerCase();
      const applyChannelLabel = getApplyChannelLabel(
        promotion.applyChannel,
      ).toLowerCase();
      const discount = String(promotion.discountAllUsers ?? "").toLowerCase();
      const expiring = (promotion.expiringLabel ?? "").toLowerCase();
      const lastModified = promotion.lastModified
        ? new Date(promotion.lastModified)
            .toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })
            .toLowerCase()
        : "";
      return (
        name.includes(q) ||
        type.includes(q) ||
        typeLabel.includes(q) ||
        status.includes(q) ||
        offerType.includes(q) ||
        applyChannel.includes(q) ||
        applyChannelLabel.includes(q) ||
        discount.includes(q) ||
        expiring.includes(q) ||
        lastModified.includes(q)
      );
    });
  }, [promotions, promotionSearch]);

  const columns: GridColDef<PromotionListItem>[] = [
    {
      field: "promotionName",
      headerName: "Promotion Name",
      flex: 1,
      minWidth: 160,
      sortable: false,
      renderCell: (params) => (
        <p className="font-medium text-slate-900">{params.row.promotionName}</p>
      ),
    },
    {
      field: "promotionType",
      headerName: "Type",
      width: 160,
      sortable: false,
      renderCell: (params) => {
        const typeMeta = getPromotionTypeMeta(params.row.promotionType);
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1",
              typeMeta.className,
            )}
          >
            {typeMeta.icon}
            {getPromotionTypeLabel(params.row.promotionType)}
          </span>
        );
      },
    },
    {
      field: "applyChannel",
      headerName: "Channel",
      width: 140,
      sortable: false,
      renderCell: (params) => (
        <span className="inline-flex items-center rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800 ring-1 ring-sky-200">
          {getApplyChannelLabel(params.row.applyChannel)}
        </span>
      ),
    },
    {
      field: "discountAllUsers",
      headerName: "Discount",
      width: 130,
      sortable: false,
      renderCell: (params) => {
        const promotion = params.row;
        const discountText = `${
          promotion.offerType === "FIXED" ? "₹" : ""
        }${promotion.discountAllUsers}${
          promotion.offerType === "PERCENTAGE" ? "%" : ""
        }`;
        const extraDiscount =
          promotion.extraLoggedDiscount > 0
            ? `+${promotion.offerType === "FIXED" ? "₹" : ""}${
                promotion.extraLoggedDiscount
              }${promotion.offerType === "PERCENTAGE" ? "%" : ""}`
            : null;
        return (
          <span className="inline-flex items-center gap-1">
            <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold tabular-nums text-emerald-800 ring-1 ring-emerald-200">
              {discountText}
            </span>
            {extraDiscount ? (
              <span className="text-xs font-medium text-emerald-600">
                {extraDiscount}
              </span>
            ) : null}
          </span>
        );
      },
    },
    {
      field: "status",
      headerName: "Status",
      width: 140,
      sortable: false,
      renderCell: (params) => (
        <select
          aria-label={`Status for ${params.row.promotionName}`}
          value={params.row.status}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) =>
            void handleStatusChange(params.row.id, event.target.value)
          }
          className={cn(
            "h-8 cursor-pointer rounded-full border px-2.5 text-xs font-semibold outline-none transition focus:ring-2 focus:ring-[#2f3d95]/25",
            getStatusSelectClass(params.row.status),
          )}
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ),
    },
    {
      field: "expiringLabel",
      headerName: "Valid Until",
      width: 150,
      sortable: false,
      renderCell: (params) =>
        params.row.expiringLabel ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
            <Calendar className="h-3 w-3" />
            {params.row.expiringLabel}
          </span>
        ) : (
          <span className="text-sm text-slate-400">No end date</span>
        ),
    },
    {
      field: "lastModified",
      headerName: "Last Modified",
      width: 140,
      sortable: false,
      renderCell: (params) => (
        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-700 ring-1 ring-slate-200">
          {new Date(params.row.lastModified).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 110,
      sortable: false,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => (
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
          onClick={(event) => {
            event.stopPropagation();
            const url = hotelId
              ? `/promotions/edit/${params.row.id}?hotelId=${hotelId}&mode=view`
              : `/promotions/edit/${params.row.id}?mode=view`;
            navigate(url);
          }}
        >
          <Eye className="h-3.5 w-3.5" />
          View
        </button>
      ),
    },
  ];

  const subTabCount =
    myPromotionsSubTab === "all" ? totalElements : undefined;

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-350 px-3 py-4 sm:px-5">
      <Tabs
        defaultValue="create"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsContent value="create" className="mt-0">
          <button
            type="button"
            onClick={() => setActiveTab("my-promotions")}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#2f3d95] transition-colors hover:text-[#263578]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Choose a promotion type
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Select a template and configure the details on the next step.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {promotionTypes.map((promo) => (
              <button
                key={promo.id}
                type="button"
                onClick={() => handleCreatePromotion(promo.id)}
                className="group rounded-2xl border border-slate-200 bg-white px-5 py-5 text-left shadow-sm transition-all hover:border-[#2f3d95]/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f3d95]/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${promo.iconBg || "bg-blue-50"} ${promo.iconColor || "text-blue-600"} transition-transform group-hover:scale-105`}
                    >
                      {promo.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {promo.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {promo.description}
                      </p>
                    </div>
                  </div>
                  {promo.id === "basic" ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                      Recommended
                    </span>
                  ) : null}
                </div>
              </button>
            ))}

            <button
              type="button"
              onClick={() => {
                const url = hotelId
                  ? `/promotions/special-audience?hotelId=${hotelId}`
                  : `/promotions/special-audience`;
                navigate(url);
              }}
              className="group rounded-2xl border border-indigo-100 bg-white px-5 py-5 text-left shadow-sm transition-all hover:border-indigo-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-transform group-hover:scale-105">
                    <Crown className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Special Audience Promotion
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Create My Partner promotions with fixed audience type and
                      B2B channel settings.
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                  Audience
                </span>
              </div>
            </button>
          </div>
        </TabsContent>

        <TabsContent value="my-promotions" className="mt-0">
          <div className="mb-3 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
              <div className="flex flex-wrap items-center gap-1">
                {PROMO_STATUS_TABS.map((tab) => {
                  const isActive = myPromotionsSubTab === tab.value;
                  const count =
                    tab.value === "all"
                      ? subTabCount
                      : isActive
                        ? totalElements
                        : undefined;
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setMyPromotionsSubTab(tab.value)}
                      className={cn(
                        "cursor-pointer rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide transition",
                        isActive
                          ? "bg-[#2f3d95] text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                      )}
                    >
                      {tab.label}
                      {count !== undefined ? (
                        <span
                          className={cn(
                            "ml-1.5 rounded-full px-1.5 py-px text-[10px] font-bold",
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-white text-slate-500",
                          )}
                        >
                          {count}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <Button
                size="sm"
                className="gap-1.5 bg-[#2f3d95] text-white hover:bg-[#263578]"
                onClick={() => setActiveTab("create")}
              >
                <Plus className="h-4 w-4" />
                Create New Promotion
              </Button>
            </div>
          </div>

          <DataTable
            subtitle={
              loading && promotions.length === 0 ? (
                "Loading…"
              ) : promotionSearch.trim() ? (
                `Showing ${filteredPromotions.length} of ${promotions.length} on this page · ${totalElements.toLocaleString("en-IN")} total`
              ) : (
                <>
                  <span className="font-medium text-slate-600">
                    {totalElements.toLocaleString("en-IN")}{" "}
                    {totalElements === 1 ? "promotion" : "promotions"}
                  </span>
                  <span className="text-slate-400">
                    {" "}
                    · Page {totalPages === 0 ? 0 : page + 1} of{" "}
                    {Math.max(totalPages, 1)}
                  </span>
                </>
              )
            }
            afterHeader={
              <div className="border-b border-slate-100 px-3 py-2">
                <div className="relative w-full max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search promotions..."
                    value={promotionSearch}
                    onChange={(e) => setPromotionSearch(e.target.value)}
                    className="h-9 border-slate-200 bg-slate-50/80 pl-9 focus:bg-white"
                  />
                </div>
              </div>
            }
            rows={filteredPromotions}
            columns={columns}
            getRowId={(row) => row.id}
            loading={loading}
            paginationMode="server"
            rowCount={totalElements}
            paginationModel={{ page, pageSize }}
            onPaginationModelChange={(model) => {
              if (model.pageSize !== pageSize) {
                setPageSize(model.pageSize);
                setPage(0);
                return;
              }
              if (model.page === page) return;
              if (model.page < page && !hasPrevious) return;
              if (model.page > page && !hasNext) return;
              setPage(model.page);
            }}
            pageSizeOptions={[10, 20, 50]}
            disableRowSelectionOnClick
            disableColumnFilter
            showToolbar
            showExport={false}
            allowHorizontalScroll
            localeText={{
              noRowsLabel:
                promotions.length === 0
                  ? myPromotionsSubTab === "all"
                    ? "No promotions yet. Create an offer to boost bookings."
                    : `No ${myPromotionsSubTab} promotions.`
                  : "No promotions match your search.",
            }}
            sx={{
              "& .MuiDataGrid-cell": {
                alignItems: "center",
                whiteSpace: "normal",
                py: "8px",
              },
            }}
          />
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
