import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { adminService, type PromotionListItem } from "@/features/admin/services/adminService";
import { useToast } from "@/components/ui/Toast";
import {
  Percent,
  Clock,
  Bird,
  Calendar,
  Loader2,
  Crown,
} from "lucide-react";

interface PromotionType {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  activeCount?: number;
  iconColor?: string;
  iconBg?: string;
}

const promotionTypes: PromotionType[] = [
  {
    id: "basic",
    title: "Basic Promotion",
    description: "Offer recurring discounts to improve occupancy.",
    icon: <Percent className="w-6 h-6" />,
    activeCount: 3,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
  },
  {
    id: "last-minute",
    title: "Last Minute Promotion",
    description:
      "Offer last-minute discounts to guests who book 0, 1, or 2 days before check-in.",
    icon: <Clock className="w-6 h-6" />,
    activeCount: 1,
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
  const [activeTab, setActiveTab] = useState(tabFromUrl || "create");
  const [loading, setLoading] = useState(false);
  const [promotions, setPromotions] = useState<PromotionListItem[]>([]);
  const navigate = useNavigate();
  const hotelId = searchParams.get("hotelId");
  const { showToast } = useToast();

  // Update active tab when URL param changes
  useEffect(() => {
    if (tabFromUrl && (tabFromUrl === "create" || tabFromUrl === "my-promotions")) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  useEffect(() => {
    if (activeTab === "my-promotions" && hotelId) {
      loadPromotions();
    }
  }, [activeTab, hotelId]);

  const loadPromotions = async () => {
    if (!hotelId) return;
    setLoading(true);
    try {
      const response = await adminService.getPromotions(hotelId);
      setPromotions(response.data || []);
    } catch (error) {
      console.error("Error loading promotions:", error);
      showToast("Failed to load promotions", "error");
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
      showToast(`Promotion ${statusLabels[newStatus] || "updated"} successfully`, "success");
      // Reload promotions list
      loadPromotions();
    } catch (error: any) {
      console.error("Error updating promotion status:", error);
      showToast(error?.response?.data?.message || "Failed to update promotion status", "error");
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
        return "bg-green-100 text-green-700";
      case "DRAFT":
        return "bg-gray-100 text-gray-700";
      case "PAUSED":
        return "bg-yellow-100 text-yellow-700";
      case "EXPIRED":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
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

  const activeCount = promotions.filter((p) => p.status === "ACTIVE").length;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Promotions</h1>
        <p className="text-gray-600 mt-2">
          One-stop solution to offer the best promotions & coupons to guests
        </p>
      </div>

      <Tabs
        defaultValue="create"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList>
          <TabsTrigger value="create">Create New Promotion</TabsTrigger>
          <TabsTrigger value="my-promotions">My Promotions</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="mt-6">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Promotions (Tier 1)
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Choose a promotion type to get started
                </p>
              </div>
              <div className="flex items-center gap-3">
                {activeCount > 0 && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-full">
                    {activeCount} ACTIVE
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("my-promotions")}
                >
                  View All Promotions
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {promotionTypes.map((promo) => (
              <Card
                key={promo.id}
                variant="outlined"
                className="bg-white hover:shadow-xl transition-all duration-200 border-2 hover:border-blue-200"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 ${promo.iconBg || "bg-blue-50"} rounded-xl ${promo.iconColor || "text-blue-600"}`}>
                        {promo.icon}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {promo.title}
                        </h3>
                        {promo.activeCount !== undefined && (
                          <span className="inline-block mt-1 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                            {promo.activeCount} ACTIVE
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                    {promo.description}
                  </p>

                  <Button
                    onClick={() => handleCreatePromotion(promo.id)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  >
                    Create
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="my-promotions" className="mt-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : promotions.length === 0 ? (
              <div className="text-center py-12 px-6">
                <p className="text-gray-500 mb-4">No promotions found</p>
                <Button
                  onClick={() => setActiveTab("create")}
                  variant="outline"
                >
                  Create Your First Promotion
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Promotion Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Discount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Valid Until
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Last Modified
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {promotions.map((promotion) => (
                      <tr key={promotion.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {promotion.promotionName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-700">
                            {getPromotionTypeLabel(promotion.promotionType)}
                          </div>
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
                                {promotion.offerType === "PERCENTAGE" ? "%" : ""}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <span
                              className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(
                                promotion.status
                              )}`}
                            >
                              {promotion.status}
                            </span>
                            <div className="w-32">
                              <Select
                                value={promotion.status}
                                onChange={(e) => handleStatusChange(promotion.id, e.target.value)}
                                options={statusOptions}
                                className="text-xs py-1.5"
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
                            {new Date(promotion.lastModified).toLocaleDateString()}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Special Audience Promotions Section */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <Card variant="outlined" className="p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Crown className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                Special Audience Promotions (Tier 2)
              </h2>
            </div>
            <Button
              onClick={() => {
                const url = hotelId
                  ? `/promotions/special-audience?hotelId=${hotelId}`
                  : `/promotions/special-audience`;
                navigate(url);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2"
            >
              Create Now
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

