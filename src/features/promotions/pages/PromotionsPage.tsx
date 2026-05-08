import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import {
  adminService,
  type PromotionListItem,
} from "@/features/admin/services/adminService";
import { useToast } from "@/components/ui/Toast";
import { Percent, Clock, Bird, Calendar, Loader2, Crown, Eye } from "lucide-react";

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
  const [statusCounts, setStatusCounts] = useState({
    all: 0,
    draft: 0,
    active: 0,
    paused: 0,
    expired: 0,
  });
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
    if (activeTab !== "my-promotions" || !hotelId) return;
    loadStatusCounts();
  }, [activeTab, hotelId]);

  useEffect(() => {
    setPage(0);
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

  const loadStatusCounts = async () => {
    if (!hotelId) return;
    try {
      const [all, draft, active, paused, expired] = await Promise.all([
        adminService.getPromotions(hotelId, { page: 0, size: 1 }),
        adminService.getPromotions(hotelId, {
          page: 0,
          size: 1,
          status: "DRAFT",
        }),
        adminService.getPromotions(hotelId, {
          page: 0,
          size: 1,
          status: "ACTIVE",
        }),
        adminService.getPromotions(hotelId, {
          page: 0,
          size: 1,
          status: "PAUSED",
        }),
        adminService.getPromotions(hotelId, {
          page: 0,
          size: 1,
          status: "EXPIRED",
        }),
      ]);
      setStatusCounts({
        all: all.totalElements || 0,
        draft: draft.totalElements || 0,
        active: active.totalElements || 0,
        paused: paused.totalElements || 0,
        expired: expired.totalElements || 0,
      });
    } catch (error) {
      console.error("Error loading promotion status counts:", error);
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
      loadStatusCounts();
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

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-50 text-green-700 border-green-200";
      case "DRAFT":
        return "bg-gray-50 text-gray-700 border-gray-200";
      case "PAUSED":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "EXPIRED":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
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
      default:
        return type;
    }
  };

  const getPromotionTypeMeta = (type: string) => {
    switch (type) {
      case "BASIC":
        return {
          icon: <Percent className="w-3.5 h-3.5" />,
          bg: "bg-blue-50",
          text: "text-blue-700",
          border: "border-blue-100",
        };
      case "LAST_MINUTE":
        return {
          icon: <Clock className="w-3.5 h-3.5" />,
          bg: "bg-purple-50",
          text: "text-purple-700",
          border: "border-purple-100",
        };
      case "EARLY_BIRD":
        return {
          icon: <Bird className="w-3.5 h-3.5" />,
          bg: "bg-emerald-50",
          text: "text-emerald-700",
          border: "border-emerald-100",
        };
      case "LONG_STAY":
        return {
          icon: <Calendar className="w-3.5 h-3.5" />,
          bg: "bg-amber-50",
          text: "text-amber-700",
          border: "border-amber-100",
        };
      default:
        return {
          icon: null,
          bg: "bg-gray-50",
          text: "text-gray-700",
          border: "border-gray-100",
        };
    }
  };

  const activeCount = statusCounts.active;

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Tabs
        defaultValue="create"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        {activeTab === "my-promotions" && (
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Promotions</h1>
              <p className="text-gray-600 mt-2">
                One-stop solution to offer the best promotions & coupons to
                guests
              </p>
            </div>
            <div className="flex items-center gap-3">
              {activeCount > 0 && (
                <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-full">
                  {activeCount} ACTIVE
                </span>
              )}
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                onClick={() => setActiveTab("create")}
              >
                Create New Promotion
              </Button>
            </div>
          </div>
        )}

        <TabsContent value="create" className="mt-2">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Choose a promotion type
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Select a template and configure the details on the next step.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {promotionTypes.map((promo) => (
              <button
                key={promo.id}
                type="button"
                onClick={() => handleCreatePromotion(promo.id)}
                className="group text-left rounded-2xl border border-gray-200 bg-white px-5 py-5 shadow-sm hover:border-blue-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${promo.iconBg || "bg-blue-50"} ${promo.iconColor || "text-blue-600"} group-hover:scale-105 transition-transform`}
                    >
                      {promo.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {promo.title}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {promo.description}
                      </p>
                    </div>
                  </div>
                  {promo.id === "basic" && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                      Recommended
                    </span>
                  )}
                </div>
                <div className="mt-4 flex items-center justify-between text-[11px] text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    One-click setup
                  </span>
                </div>
              </button>
            ))}

            {/* Special Audience Promotions card in same list */}
            <button
              type="button"
              onClick={() => {
                const url = hotelId
                  ? `/promotions/special-audience?hotelId=${hotelId}`
                  : `/promotions/special-audience`;
                navigate(url);
              }}
              className="group text-left rounded-2xl border border-blue-100 bg-white px-5 py-5 shadow-sm hover:border-blue-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:scale-105 transition-transform">
                    <Crown className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Special Audience Promotion
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Target members, mobile users, corporate travelers, or agency partners with tailored discounts.
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                  Audience
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between text-[11px] text-gray-500">
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  One-click setup
                </span>
              </div>
            </button>
          </div>
        </TabsContent>

        <TabsContent value="my-promotions" className="mt-2">
          <div className="mb-4">
            <Tabs
              value={myPromotionsSubTab}
              onValueChange={(value) =>
                setMyPromotionsSubTab(
                  value as "all" | "draft" | "active" | "paused" | "expired",
                )
              }
              className="w-fit"
            >
              <TabsList className="bg-white border border-gray-200">
                <TabsTrigger value="all" className="text-sm">
                  All ({statusCounts.all})
                </TabsTrigger>
                <TabsTrigger value="draft" className="text-sm">
                  Draft ({statusCounts.draft})
                </TabsTrigger>
                <TabsTrigger value="active" className="text-sm">
                  Active ({statusCounts.active})
                </TabsTrigger>
                <TabsTrigger value="paused" className="text-sm">
                  Paused ({statusCounts.paused})
                </TabsTrigger>
                <TabsTrigger value="expired" className="text-sm">
                  Expired ({statusCounts.expired})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : promotions.length === 0 ? (
              <div className="text-center py-12 px-6">
                <p className="text-gray-500 mb-4">
                  {myPromotionsSubTab === "all"
                    ? "No promotions found"
                    : `No ${myPromotionsSubTab} promotions found`}
                </p>
                {myPromotionsSubTab === "all" && (
                  <Button
                    onClick={() => setActiveTab("create")}
                    variant="outline"
                  >
                    Create Your First Promotion
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">
                        Promotion Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">
                        Discount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">
                        Valid Until
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">
                        Last Modified
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {promotions.map((promotion) => (
                      <tr
                        key={promotion.id}
                        className="hover:bg-blue-50/60 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">
                            {promotion.promotionName}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(() => {
                            const meta = getPromotionTypeMeta(
                              promotion.promotionType,
                            );
                            return (
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${meta.bg} ${meta.text} ${meta.border}`}
                              >
                                {meta.icon && (
                                  <span className="flex items-center justify-center rounded-full bg-white/70 p-[2px]">
                                    {meta.icon}
                                  </span>
                                )}
                                {getPromotionTypeLabel(promotion.promotionType)}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-700">
                            {promotion.offerType === "FIXED" ? "₹" : ""}
                            {promotion.discountAllUsers}
                            {promotion.offerType === "PERCENTAGE" ? "%" : ""}
                            {promotion.extraLoggedDiscount > 0 && (
                              <span className="text-gray-500 ml-1">
                                + {promotion.offerType === "FIXED" ? "₹" : ""}
                                {promotion.extraLoggedDiscount}
                                {promotion.offerType === "PERCENTAGE"
                                  ? "%"
                                  : ""}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${getStatusBadgeColor(
                                promotion.status,
                              )}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  promotion.status === "ACTIVE"
                                    ? "bg-green-500"
                                    : promotion.status === "PAUSED"
                                      ? "bg-amber-500"
                                      : promotion.status === "EXPIRED"
                                        ? "bg-red-500"
                                        : "bg-gray-400"
                                }`}
                              />
                              {promotion.status}
                            </span>
                            <div className="w-32">
                              <Select
                                value={promotion.status}
                                onChange={(e) =>
                                  handleStatusChange(
                                    promotion.id,
                                    e.target.value,
                                  )
                                }
                                options={statusOptions}
                                className="text-xs py-1.5 bg-gray-50 border border-gray-200 rounded-md"
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-700">
                            {promotion.expiringLabel || "No end date"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {new Date(
                              promotion.lastModified,
                            ).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Button
                            variant="outline"
                            size="sm"
                            className="inline-flex items-center gap-1.5"
                            onClick={() => {
                              const url = hotelId
                                ? `/promotions/edit/${promotion.id}?hotelId=${hotelId}&mode=view`
                                : `/promotions/edit/${promotion.id}?mode=view`;
                              navigate(url);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
                <div className="px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-sm text-gray-600">
                  Showing page {totalPages === 0 ? 0 : page + 1} of {totalPages} (
                  {totalElements} total)
                </div>
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="promotions-page-size"
                    className="text-sm text-gray-600"
                  >
                    Rows:
                  </label>
                  <select
                    id="promotions-page-size"
                    className="h-9 rounded-md border border-gray-300 px-2 text-sm"
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
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
