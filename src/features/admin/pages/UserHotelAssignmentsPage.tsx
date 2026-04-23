import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router";
import {
  adminService,
  type User,
  type UserHotelAssignment,
  type ApprovedHotelItem,
} from "../services/adminService";
import {
  teamService,
  type Permission,
  type PermissionModule,
} from "@/features/team/services/teamService";
import { propertyService } from "@/features/properties/services/propertyService";
import {
  Button,
  LoadingSpinner,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui";
import { Toast, useToast } from "@/components/ui/Toast";
import { ROUTES } from "@/constants";
import {
  isHotelOwner,
  isSuperAdminExcludedFromUserEdit,
} from "@/constants/roles";
import { useAuth } from "@/hooks";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  Check,
  X,
  User as UserIcon,
  Trash2,
  Settings,
  Eye,
  EyeOff,
  Lock,
  Unlock,
} from "lucide-react";

type HotelOption = { hotelId: string; hotelName: string; hotelCode: string };

/** Modules Super Admin can grant for Hotel BD at user level (Finance excluded by product policy). */
const HOTEL_BD_PERMISSION_MODULES: { value: PermissionModule; label: string }[] = [
  { value: "PROPERTY_BASIC_INFO", label: "Property - Basic Information" },
  {
    value: "PROPERTY_ROOMS_RATEPLANS",
    label: "Property - Rooms & Rate Plans",
  },
  { value: "PROPERTY_PHOTOS_VIDEOS", label: "Property - Photos & Videos" },
  {
    value: "PROPERTY_AMENITIES_RESTAURANTS",
    label: "Property - Amenities & Restaurants",
  },
  { value: "PROPERTY_POLICY_RULES", label: "Property - Policy & Rules" },
  { value: "PROPERTY_DOCUMENT", label: "Property - Documents" },
  { value: "RATES_INVENTORY", label: "Rates & Inventory" },
  { value: "OFFERS", label: "Promotions" },
];

function HotelBdPermissionsModal({
  isOpen,
  onClose,
  subjectUserId,
  subjectLabel,
  initialPermissions,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  subjectUserId: number;
  subjectLabel: string;
  initialPermissions?: Permission[];
  onSaved: () => void | Promise<void>;
}) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoadingPerms, setIsLoadingPerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loadWarning, setLoadWarning] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      setIsLoadingPerms(true);
      setApiError(null);
      setLoadWarning(null);
      const defaults: Permission[] = HOTEL_BD_PERMISSION_MODULES.map((m) => ({
        module: m.value,
        canView: false,
        canEdit: false,
      }));
      const hydratedFromInitial = HOTEL_BD_PERMISSION_MODULES.map((mod) => {
        const ex = (initialPermissions || []).find((p) => p.module === mod.value);
        return ex
          ? { module: mod.value, canView: ex.canView, canEdit: ex.canEdit }
          : { module: mod.value, canView: false, canEdit: false };
      });
      if (!cancelled && initialPermissions?.length) {
        setPermissions(hydratedFromInitial);
      }
      try {
        const profile = await adminService.getUserById(subjectUserId);
        const existing = profile.permissions || [];
        const merged = HOTEL_BD_PERMISSION_MODULES.map((mod) => {
          const ex = existing.find((p) => p.module === mod.value);
          return ex
            ? { module: mod.value, canView: ex.canView, canEdit: ex.canEdit }
            : { module: mod.value, canView: false, canEdit: false };
        });
        if (!cancelled) {
          setPermissions(merged);
        }
      } catch {
        if (!cancelled) {
          setPermissions(initialPermissions?.length ? hydratedFromInitial : defaults);
          setLoadWarning(
            "Could not load current permissions (you can still set and save them).",
          );
        }
      } finally {
        if (!cancelled) setIsLoadingPerms(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, subjectUserId, initialPermissions]);

  const handleToggleView = (module: PermissionModule) => {
    setPermissions((prev) =>
      prev.map((p) => {
        if (p.module !== module) return p;
        const newCanView = !p.canView;
        return {
          ...p,
          canView: newCanView,
          canEdit: newCanView ? p.canEdit : false,
        };
      }),
    );
  };

  const handleToggleEdit = (module: PermissionModule) => {
    setPermissions((prev) =>
      prev.map((p) => {
        if (p.module !== module) return p;
        const newCanEdit = !p.canEdit;
        return {
          ...p,
          canEdit: newCanEdit,
          canView: newCanEdit ? true : p.canView,
        };
      }),
    );
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    setApiError(null);
    try {
      await adminService.assignUserPermissions(subjectUserId, permissions);
      await onSaved();
      onClose();
    } catch (e: unknown) {
      const err = e as { message?: string };
      setApiError(err?.message || "Failed to save permissions");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && !isSubmitting && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl m-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-linear-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-gray-900">
                Hotel BD — user permissions
              </h2>
              <p className="text-sm text-gray-600 truncate">{subjectLabel}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !isSubmitting && onClose()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6">
          {loadWarning && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {loadWarning}
            </div>
          )}
          {apiError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
              {apiError}
            </div>
          )}

          {isLoadingPerms ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {HOTEL_BD_PERMISSION_MODULES.map((mod) => {
                  const permission = permissions.find((p) => p.module === mod.value);
                  const canView = permission?.canView ?? false;
                  const canEdit = permission?.canEdit ?? false;
                  return (
                    <div
                      key={mod.value}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <h3 className="font-medium text-gray-900 text-sm sm:text-base">
                        {mod.label}
                      </h3>
                      <div className="flex items-center gap-3 sm:gap-4">
                        <button
                          type="button"
                          onClick={() => handleToggleView(mod.value)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                            canView
                              ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                          )}
                        >
                          {canView ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          )}
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleEdit(mod.value)}
                          disabled={!canView}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                            canEdit
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                            !canView && "opacity-50 cursor-not-allowed",
                          )}
                        >
                          {canEdit ? (
                            <Unlock className="w-4 h-4" />
                          ) : (
                            <Lock className="w-4 h-4" />
                          )}
                          Edit
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => void handleSave()}
              disabled={isSubmitting || isLoadingPerms}
            >
              {isSubmitting ? "Saving..." : "Save permissions"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AssignHotelModal({
  isOpen,
  onClose,
  onSubmit,
  userLabel,
  loadHotels,
  excludedHotelIds,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (hotelId: string) => Promise<void>;
  userLabel: string;
  loadHotels: () => Promise<HotelOption[]>;
  excludedHotelIds: Set<string>;
}) {
  const [hotels, setHotels] = useState<HotelOption[]>([]);
  const [selectedHotelId, setSelectedHotelId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoadingHotels, setIsLoadingHotels] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHotelDropdownOpen, setIsHotelDropdownOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchHotels = async () => {
      try {
        setIsLoadingHotels(true);
        setApiError(null);
        const list = await loadHotels();
        setHotels(list.filter((hotel) => !excludedHotelIds.has(hotel.hotelId)));
      } catch (error: unknown) {
        const err = error as { message?: string };
        setApiError(err?.message || "Failed to load hotels");
        setHotels([]);
      } finally {
        setIsLoadingHotels(false);
      }
    };
    fetchHotels();
    setSelectedHotelId("");
    setErrors({});
  }, [isOpen, loadHotels, excludedHotelIds]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHotelId) {
      setErrors({ hotelId: "Please select a hotel" });
      return;
    }

    setIsSubmitting(true);
    setApiError(null);
    setErrors({});
    try {
      await onSubmit(selectedHotelId);
      onClose();
    } catch (error: unknown) {
      const err = error as { message?: string };
      setApiError(err?.message || "Failed to assign hotel");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg m-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Assign Hotel</h2>
              <p className="text-sm text-gray-600">
                Assign a hotel to {userLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {apiError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {apiError}
            </div>
          )}

          <div className={cn("w-full", errors.hotelId ? "mb-2" : "mb-0")}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hotel
            </label>
            <DropdownMenu
              open={isHotelDropdownOpen}
              onOpenChange={setIsHotelDropdownOpen}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-between",
                    !selectedHotelId && "text-gray-500",
                    errors.hotelId && "border-red-500",
                  )}
                  disabled={isLoadingHotels || isSubmitting || hotels.length === 0}
                >
                  <span className="truncate">
                    {selectedHotelId
                      ? (() => {
                          const selectedHotel = hotels.find(
                            (hotel) => hotel.hotelId === selectedHotelId,
                          );
                          return selectedHotel
                            ? `${selectedHotel.hotelName} (${selectedHotel.hotelCode})`
                            : "Select Hotel";
                        })()
                      : isLoadingHotels
                        ? "Loading hotels..."
                        : hotels.length === 0
                          ? "No hotels available"
                          : "Select Hotel"}
                  </span>
                  <ChevronDown className="w-4 h-4 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                side="bottom"
                sideOffset={6}
                className="w-[420px] max-w-[calc(100vw-48px)] max-h-56 overflow-y-auto z-[2000]"
              >
                {hotels.map((hotel) => {
                  const isSelected = selectedHotelId === hotel.hotelId;
                  return (
                    <DropdownMenuItem
                      key={hotel.hotelId}
                      onClick={() => {
                        setSelectedHotelId(hotel.hotelId);
                        setIsHotelDropdownOpen(false);
                        if (errors.hotelId) {
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.hotelId;
                            return next;
                          });
                        }
                      }}
                      className="flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <span className="truncate">
                        {hotel.hotelName} ({hotel.hotelCode})
                      </span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-blue-600 shrink-0" />
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
            {errors.hotelId && (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {errors.hotelId}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isLoadingHotels || isSubmitting || hotels.length === 0}
            >
              {isSubmitting ? "Assigning..." : "Assign Hotel"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** API may return `accessId` or `access_id`. */
function extractAccessId(row: UserHotelAssignment): number | undefined {
  if (typeof row.accessId === "number" && !Number.isNaN(row.accessId)) {
    return row.accessId;
  }
  const raw = (row as Record<string, unknown>)["access_id"];
  if (typeof raw === "number" && !Number.isNaN(raw)) return raw;
  if (typeof raw === "string" && /^\d+$/.test(raw)) return Number(raw);
  return undefined;
}

function assignmentKey(row: UserHotelAssignment, index: number): string {
  if (row.hotelId) return String(row.hotelId);
  const aid = extractAccessId(row);
  if (aid != null) return `access-${aid}`;
  return `row-${index}`;
}

function RevokeAccessConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  userLabel,
  count,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  userLabel: string;
  count: number;
  isSubmitting: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && !isSubmitting && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md m-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-red-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Revoke access</h2>
              <p className="text-sm text-gray-600">
                Remove all hotel access for {userLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !isSubmitting && onClose()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-700">
            This will revoke access for{" "}
            <span className="font-semibold">{count}</span> hotel
            {count === 1 ? "" : "s"} using the server access records. The user
            will no longer appear in assignments until access is granted again.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={isSubmitting}
              onClick={() => void onConfirm()}
            >
              {isSubmitting ? "Revoking…" : "Revoke all access"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserHotelAssignmentsPage() {
  const { user: authUser } = useAuth();
  const { userId: userIdParam } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const contextHotelId = searchParams.get("hotelId");

  const isAdminContext = location.pathname.startsWith("/admin/");
  const userId = userIdParam ? Number(userIdParam) : NaN;
  const preloadedUser =
    (location.state as { user?: User } | null)?.user ?? null;

  const [user, setUser] = useState<User | null>(preloadedUser);
  const [assignments, setAssignments] = useState<UserHotelAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [revokeConfirmOpen, setRevokeConfirmOpen] = useState(false);
  const [isRevokingAll, setIsRevokingAll] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [bdPermModalOpen, setBdPermModalOpen] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const goBack = useCallback(() => {
    if (isAdminContext) {
      navigate(ROUTES.ADMIN.USERS);
    } else {
      const q = contextHotelId
        ? `?hotelId=${encodeURIComponent(contextHotelId)}`
        : "";
      navigate(`${ROUTES.TEAM.LIST}${q}`);
    }
  }, [contextHotelId, isAdminContext, navigate]);

  const loadAssignments = useCallback(async () => {
    if (!Number.isFinite(userId)) return;
    const rows = await adminService.getUserHotelAssignments(userId);
    const hotels: HotelOption[] = isAdminContext
      ? (await adminService.getApprovedHotels()).map((h: ApprovedHotelItem) => ({
          hotelId: h.hotelId,
          hotelName: h.hotelName,
          hotelCode: h.hotelCode,
        }))
      : (await propertyService.getAllHotels())
          .filter((hotel) => hotel.status === "LIVE")
          .map((hotel) => ({
            hotelId: hotel.hotelId,
            hotelName: hotel.hotelName,
            hotelCode: hotel.hotelCode,
          }));

    const byId = new Map(hotels.map((h) => [h.hotelId, h]));
    const byCode = new Map(hotels.map((h) => [h.hotelCode, h]));

    const enriched = rows.map((row) => {
      const accessId = extractAccessId(row);
      const normalized: UserHotelAssignment = {
        ...row,
        ...(accessId != null ? { accessId } : {}),
      };
      const match =
        (normalized.hotelId ? byId.get(String(normalized.hotelId)) : undefined) ||
        (normalized.hotelCode
          ? byCode.get(String(normalized.hotelCode))
          : undefined);
      if (!match) return normalized;
      return {
        ...normalized,
        hotelName: normalized.hotelName || match.hotelName,
        hotelCode: normalized.hotelCode || match.hotelCode,
      };
    });

    setAssignments(enriched);
  }, [isAdminContext, userId]);

  useEffect(() => {
    if (!Number.isFinite(userId)) {
      setLoadError("Invalid user");
      setIsLoading(false);
      return;
    }

    const run = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        try {
          const profile = await adminService.getUserById(userId);
          setUser(profile);
        } catch {
          setUser(null);
        }
        await loadAssignments();
      } catch (e: unknown) {
        const err = e as { message?: string };
        setLoadError(err?.message || "Failed to load assignments");
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [userId, loadAssignments]);

  const loadHotelsAdmin = useCallback(async (): Promise<HotelOption[]> => {
    const approved = await adminService.getApprovedHotels();
    return (approved as ApprovedHotelItem[]).map((h) => ({
      hotelId: h.hotelId,
      hotelName: h.hotelName,
      hotelCode: h.hotelCode,
    }));
  }, []);

  const loadHotelsTeam = useCallback(async (): Promise<HotelOption[]> => {
    const allHotels = await propertyService.getAllHotels();
    return (allHotels || [])
      .filter((hotel) => hotel.status === "LIVE")
      .map((hotel) => ({
        hotelId: hotel.hotelId,
        hotelName: hotel.hotelName,
        hotelCode: hotel.hotelCode,
      }));
  }, []);

  const handleAssign = async (hotelId: string) => {
    if (!Number.isFinite(userId)) return;
    if (isAdminContext) {
      await adminService.assignHotelToUser(hotelId, userId);
    } else {
      await teamService.assignHotelToUser(hotelId, userId);
    }
    setSuccessMessage("Hotel assigned successfully.");
    await loadAssignments();
  };

  const revocableAccessIds = useMemo(() => {
    const ids = assignments
      .map((row) => extractAccessId(row))
      .filter((id): id is number => id != null);
    return [...new Set(ids)];
  }, [assignments]);

  const handleRevokeAllAccess = async () => {
    if (revocableAccessIds.length === 0) {
      setRevokeError(
        "No access records to revoke. If assignments still appear, refresh or contact support.",
      );
      setRevokeConfirmOpen(false);
      return;
    }
    setIsRevokingAll(true);
    setRevokeError(null);
    try {
      const results = await Promise.allSettled(
        revocableAccessIds.map((id) => teamService.revokeAccess(id)),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) {
        const firstReason =
          results.find((r) => r.status === "rejected") as
            | PromiseRejectedResult
            | undefined;
        const msg =
          (firstReason?.reason as { message?: string })?.message ||
          "Request failed";
        setSuccessMessage(null);
        setRevokeError(
          failed === revocableAccessIds.length
            ? msg
            : `Revoked ${revocableAccessIds.length - failed} of ${revocableAccessIds.length}. ${msg}`,
        );
      } else {
        setSuccessMessage("All hotel access revoked for this user.");
      }
      setRevokeConfirmOpen(false);
      await loadAssignments();
    } catch (e: unknown) {
      const err = e as { message?: string };
      setRevokeError(err?.message || "Failed to revoke access");
    } finally {
      setIsRevokingAll(false);
    }
  };

  const userLabel =
    user?.firstName || user?.lastName
      ? [user.firstName, user.lastName].filter(Boolean).join(" ")
      : user?.email || `User #${userId}`;

  const isTargetHotelBd = !!(user?.roles || []).includes("HOTEL_BD");
  const showHotelBdUserPermissions = isAdminContext && isTargetHotelBd;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (loadError || !Number.isFinite(userId)) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-red-600 mb-4">{loadError || "Invalid user"}</p>
        <Button type="button" variant="outline" onClick={goBack}>
          Go back
        </Button>
      </div>
    );
  }

  const superAdminCannotManageStaff =
    isAdminContext &&
    user &&
    isSuperAdminExcludedFromUserEdit(user.roles);

  if (superAdminCannotManageStaff) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-gray-900 font-medium mb-2">
          This user cannot be managed from admin
        </p>
        <p className="text-gray-600 text-sm mb-4">
          Hotel managers, accountants, and front desk staff are created and
          managed under the property account&apos;s My Team. They may appear in
          the global user list for visibility only.
        </p>
        <Button type="button" variant="outline" onClick={goBack}>
          Go back
        </Button>
      </div>
    );
  }

  const hotelOwnerCannotManageTarget =
    !isAdminContext &&
    authUser &&
    isHotelOwner(authUser.roles) &&
    user &&
    (user.userId === authUser.userId ||
      (user.roles || []).includes("HOTEL_OWNER"));

  if (hotelOwnerCannotManageTarget) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-gray-900 font-medium mb-2">
          You cannot manage this account from here
        </p>
        <p className="text-gray-600 text-sm mb-4">
          Hotel owners cannot assign or revoke their own hotel access or
          another owner&apos;s access from My Team. Co-owners may still appear
          on the hotel user list for visibility.
        </p>
        <Button type="button" variant="outline" onClick={goBack}>
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={goBack}
            className="mt-1 p-2 rounded-lg hover:bg-gray-100 text-gray-700"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Manage hotels
            </h1>
            <div className="mt-2 flex items-center gap-2 text-gray-600">
              <UserIcon className="w-4 h-4 shrink-0" />
              <span className="text-sm sm:text-base">{userLabel}</span>
              <span className="text-gray-400">·</span>
              <span className="text-sm text-gray-500">ID {userId}</span>
            </div>
            <p className="text-gray-600 text-sm mt-1">
              Hotels this user is assigned to for this account.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-start">
          {showHotelBdUserPermissions && (
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => setBdPermModalOpen(true)}
            >
              <Settings className="w-4 h-4" />
              User permissions
            </Button>
          )}
          {revocableAccessIds.length > 0 && (
            <Button
              type="button"
              variant="outline"
              className="gap-2 text-red-700 border-red-200 hover:bg-red-50"
              disabled={isRevokingAll}
              onClick={() => {
                setRevokeError(null);
                setRevokeConfirmOpen(true);
              }}
            >
              <Trash2 className="w-4 h-4" />
              Revoke Access
            </Button>
          )}
          <Button
            type="button"
            variant="primary"
            className="gap-2"
            onClick={() => setAssignModalOpen(true)}
          >
            <Building2 className="w-4 h-4" />
            Assign Hotel
          </Button>
        </div>
      </div>

      {successMessage && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center justify-between">
          <span>{successMessage}</span>
          <button
            type="button"
            className="text-green-700 hover:text-green-900"
            onClick={() => setSuccessMessage(null)}
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {revokeError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>{revokeError}</span>
          <button
            type="button"
            className="text-red-700 hover:text-red-900"
            onClick={() => setRevokeError(null)}
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {assignments.length === 0 ? (
          <div className="px-6 py-16 text-center text-gray-600">
            <Building2 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="font-medium text-gray-800">No hotels assigned yet</p>
            <p className="text-sm mt-1">
              Use &quot;Assign Hotel&quot; to link this user to a property.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#2f3d95]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">
                    Hotel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">
                    Role
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {assignments.map((row, index) => (
                  <tr key={assignmentKey(row, index)} className="hover:bg-blue-50/50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {String(row.hotelName ?? "—")}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {String(row.hotelCode ?? "—")}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {row.role != null && String(row.role).length > 0
                        ? String(row.role)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AssignHotelModal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        onSubmit={handleAssign}
        userLabel={userLabel}
        loadHotels={isAdminContext ? loadHotelsAdmin : loadHotelsTeam}
        excludedHotelIds={
          new Set(
            assignments
              .map((row) => (row.hotelId != null ? String(row.hotelId) : ""))
              .filter(Boolean),
          )
        }
      />

      <RevokeAccessConfirmModal
        isOpen={revokeConfirmOpen}
        onClose={() => !isRevokingAll && setRevokeConfirmOpen(false)}
        onConfirm={handleRevokeAllAccess}
        userLabel={userLabel}
        count={revocableAccessIds.length}
        isSubmitting={isRevokingAll}
      />

      {showHotelBdUserPermissions && (
        <HotelBdPermissionsModal
          isOpen={bdPermModalOpen}
          onClose={() => setBdPermModalOpen(false)}
          subjectUserId={userId}
          subjectLabel={userLabel}
          initialPermissions={user?.permissions || []}
          onSaved={async () => {
            showToast("User permissions updated.", "success");
            try {
              const profile = await adminService.getUserById(userId);
              setUser(profile);
            } catch {
              /* keep existing user state */
            }
            await loadAssignments();
          }}
        />
      )}

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
        duration={4000}
      />
    </div>
  );
}
