import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
  Loader2,
  Crown,
  Eye,
  Search,
  ArrowLeft,
  Tag,
  Sparkles,
} from "lucide-react";

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
        return "border-slate-200 bg-slate-50 text-slate-700";
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
          className: "border-sky-200 bg-sky-50 text-sky-800",
        };
      case "LAST_MINUTE":
        return {
          icon: <Clock className="h-3 w-3" />,
          className: "border-violet-200 bg-violet-50 text-violet-800",
        };
      case "EARLY_BIRD":
        return {
          icon: <Bird className="h-3 w-3" />,
          className: "border-emerald-200 bg-emerald-50 text-emerald-800",
        };
      case "LONG_STAY":
        return {
          icon: <Calendar className="h-3 w-3" />,
          className: "border-orange-200 bg-orange-50 text-orange-800",
        };
      case "SPECIAL_AUDIENCE":
        return {
          icon: <Crown className="h-3 w-3" />,
          className: "border-indigo-200 bg-indigo-50 text-indigo-800",
        };
      default:
        return {
          icon: <Tag className="h-3 w-3" />,
          className: "border-slate-200 bg-slate-50 text-slate-700",
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

  const subTabCount =
    myPromotionsSubTab === "all" ? totalElements : undefined;

  return (
    <div className="min-h-screen bg-[#f7f8fb]">
      <div className="container mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <Tabs
        defaultValue="create"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        {activeTab === "my-promotions" && (
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-[#2f3d95] text-white shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Promotions
                </h1>
                <p className="mt-1 max-w-xl text-sm text-slate-500">
                  One-stop solution to offer the best promotions & coupons to
                  guests.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {myPromotionsSubTab === "active" && totalElements > 0 ? (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  {totalElements} active
                </span>
              ) : null}
              <Button
                className="bg-[#2f3d95] hover:bg-[#263578] text-white font-medium"
                onClick={() => setActiveTab("create")}
              >
                Create New Promotion
              </Button>
            </div>
          </div>
        )}

        <TabsContent value="create" className="mt-2">
          <button
            type="button"
            onClick={() => setActiveTab("my-promotions")}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#2f3d95] transition-colors hover:text-[#263578]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-slate-900">
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

        <TabsContent value="my-promotions" className="mt-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <Tabs
              value={myPromotionsSubTab}
              onValueChange={(value) =>
                setMyPromotionsSubTab(
                  value as "all" | "draft" | "active" | "paused" | "expired",
                )
              }
              className="w-fit"
            >
              <TabsList className="h-auto gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                {(
                  [
                    ["all", "All"],
                    ["draft", "Draft"],
                    ["active", "Active"],
                    ["paused", "Paused"],
                    ["expired", "Expired"],
                  ] as const
                ).map(([value, label]) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="rounded-lg px-3 py-1.5 text-sm data-[state=active]:bg-[#eef2ff] data-[state=active]:text-[#2f3d95] data-[state=active]:shadow-none"
                  >
                    {label}
                    {value === "all" && subTabCount !== undefined
                      ? ` (${subTabCount})`
                      : myPromotionsSubTab === value && value !== "all"
                        ? ` (${totalElements})`
                        : ""}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            {loading ? (
              <div className="flex min-h-[360px] items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-[#2f3d95]" />
              </div>
            ) : promotions.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#2f3d95]">
                  <Tag className="h-5 w-5" />
                </div>
                <p className="font-medium text-slate-800">
                  {myPromotionsSubTab === "all"
                    ? "No promotions yet"
                    : `No ${myPromotionsSubTab} promotions`}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Create an offer to boost bookings for this property.
                </p>
                {myPromotionsSubTab === "all" ? (
                  <Button
                    onClick={() => setActiveTab("create")}
                    className="mt-4 bg-[#2f3d95] hover:bg-[#263578]"
                  >
                    Create Your First Promotion
                  </Button>
                ) : null}
              </div>
            ) : (
              <>
                <div className="border-b border-slate-100 px-4 py-3">
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
                {filteredPromotions.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <p className="text-sm text-slate-500">
                      No promotions match your search.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-3"
                      onClick={() => setPromotionSearch("")}
                    >
                      Clear search
                    </Button>
                  </div>
                ) : (
                <>
                <div className="overflow-x-auto">
                <table className="w-full min-w-[920px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/90">
                      {[
                        "Promotion Name",
                        "Type",
                        "Channel",
                        "Discount",
                        "Status",
                        "Valid Until",
                        "Last Modified",
                        "Actions",
                      ].map((label) => (
                        <th
                          key={label}
                          className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPromotions.map((promotion) => {
                      const typeMeta = getPromotionTypeMeta(
                        promotion.promotionType,
                      );
                      const discountText = `${
                        promotion.offerType === "FIXED" ? "₹" : ""
                      }${promotion.discountAllUsers}${
                        promotion.offerType === "PERCENTAGE" ? "%" : ""
                      }`;
                      const extraDiscount =
                        promotion.extraLoggedDiscount > 0
                          ? `+${promotion.offerType === "FIXED" ? "₹" : ""}${
                              promotion.extraLoggedDiscount
                            }${
                              promotion.offerType === "PERCENTAGE" ? "%" : ""
                            }`
                          : null;

                      return (
                      <tr
                        key={promotion.id}
                        className="transition-colors hover:bg-slate-50/80"
                      >
                        <td className="px-4 py-3">
                          <span className="text-sm font-semibold text-slate-900">
                            {promotion.promotionName}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                              typeMeta.className,
                            )}
                          >
                            {typeMeta.icon}
                            {getPromotionTypeLabel(promotion.promotionType)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center rounded-full border border-sky-100 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-800">
                            {getApplyChannelLabel(promotion.applyChannel)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm font-semibold tabular-nums text-slate-800">
                            {discountText}
                          </span>
                          {extraDiscount ? (
                            <span className="ml-1 text-xs text-slate-400">
                              {extraDiscount}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <select
                            aria-label={`Status for ${promotion.promotionName}`}
                            value={promotion.status}
                            onChange={(e) =>
                              handleStatusChange(
                                promotion.id,
                                e.target.value,
                              )
                            }
                            className={cn(
                              "h-8 cursor-pointer rounded-lg border px-2.5 text-xs font-semibold outline-none transition focus:ring-2 focus:ring-[#2f3d95]/25",
                              getStatusSelectClass(promotion.status),
                            )}
                          >
                            {statusOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={cn(
                              "text-sm",
                              promotion.expiringLabel
                                ? "text-slate-700"
                                : "text-slate-400",
                            )}
                          >
                            {promotion.expiringLabel || "No end date"}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm tabular-nums text-slate-500">
                            {new Date(
                              promotion.lastModified,
                            ).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-[#2f3d95] transition-colors hover:border-[#2f3d95]/30 hover:bg-[#eef2ff]"
                            onClick={() => {
                              const url = hotelId
                                ? `/promotions/edit/${promotion.id}?hotelId=${hotelId}&mode=view`
                                : `/promotions/edit/${promotion.id}?mode=view`;
                              navigate(url);
                            }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </button>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
                <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-500">
                  {promotionSearch.trim() ? (
                    <>
                      Showing {filteredPromotions.length} of {promotions.length}{" "}
                      on this page ({totalElements} total)
                    </>
                  ) : (
                    <>
                      Page {totalPages === 0 ? 0 : page + 1} of {totalPages} ·{" "}
                      {totalElements} total
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="promotions-page-size"
                    className="text-sm text-slate-500"
                  >
                    Rows
                  </label>
                  <select
                    id="promotions-page-size"
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700"
                    value={pageSize}
                    onChange={(e) => {
                      const nextSize = Number(e.target.value);
                      setPageSize(nextSize);
                      setPage(0);
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasPrevious || loading}
                    onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasNext || loading}
                    onClick={() => setPage((prev) => prev + 1)}
                  >
                    Next
                  </Button>
                </div>
                </div>
                </>
                )}
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
