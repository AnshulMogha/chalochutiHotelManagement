import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { adminService, type PromotionListItem } from "@/features/admin/services/adminService";
import { useToast } from "@/components/ui/Toast";
import {
  Building2,
  Info,
  Loader2,
  Crown,
  ArrowLeft,
} from "lucide-react";

interface SpecialAudienceType {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  iconColor?: string;
  iconBg?: string;
  discount?: number;
}

const specialAudienceTypes: SpecialAudienceType[] = [
  {
    id: "mypartner",
    title: "MyPartner",
    description: "We're among India's largest agent networks, with 40,000+ agents across 550+ cities. Offer discounts to expand your reach among customers.",
    icon: <Building2 className="w-6 h-6" />,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
  },
];

export default function SpecialAudiencePromotionsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const hotelId = searchParams.get("hotelId");
  const { showToast } = useToast();
  const [defaultDiscount, setDefaultDiscount] = useState(5);
  const [promotions, setPromotions] = useState<PromotionListItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hotelId) {
      loadPromotions();
    }
  }, [hotelId]);

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
      ? `/promotions/special-audience/create/${type}?hotelId=${hotelId}&defaultDiscount=${defaultDiscount}`
      : `/promotions/special-audience/create/${type}?defaultDiscount=${defaultDiscount}`;
    navigate(url);
  };

  const getPromotionDiscount = (type: string) => {
    // Find the promotion for this audience type
    const promo = promotions.find((p) => 
      p.promotionType.toLowerCase().includes(type.toLowerCase()) ||
      p.promotionName.toLowerCase().includes(type.toLowerCase())
    );
    return promo ? promo.discountAllUsers : defaultDiscount;
  };

  const hasPromotion = (type: string) => {
    return promotions.some((p) => 
      p.promotionType.toLowerCase().includes(type.toLowerCase()) ||
      p.promotionName.toLowerCase().includes(type.toLowerCase())
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <button
          onClick={() => navigate("/promotions")}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Crown className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Special Audience Promotions (Tier 2)</h1>
        </div>
      </div>

      {/* Special Audience Promotion Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          specialAudienceTypes.map((audience) => {
            const discount = getPromotionDiscount(audience.id);
            const exists = hasPromotion(audience.id);
            return (
              <Card
                key={audience.id}
                variant="outlined"
                className="p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 ${audience.iconBg || "bg-blue-50"} rounded-xl ${audience.iconColor || "text-blue-600"}`}>
                      {audience.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {audience.title}
                        </h3>
                        <button
                          type="button"
                          className="text-gray-400 hover:text-gray-600"
                          title="More information"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {audience.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">
                        {discount}%
                      </div>
                      <div className="text-xs text-gray-500 border-b border-dashed border-gray-300">
                        Discount
                      </div>
                    </div>
                    <Button
                      onClick={() => handleCreatePromotion(audience.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2"
                      disabled={!hotelId}
                    >
                      {exists ? "Edit" : "Create"}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

