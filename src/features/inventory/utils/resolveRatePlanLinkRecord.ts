import {
  rateService,
  type HotelRatePlanListItem,
  type RatePlanLinkRecord,
} from "../services/rateService";

type LinkRecordRaw = RatePlanLinkRecord & { linkId?: number };

export function normalizeRatePlanLinkRecord(
  raw: LinkRecordRaw,
): RatePlanLinkRecord | null {
  const id = raw.id ?? raw.linkId;
  if (id == null || !Number.isFinite(id)) return null;
  return {
    ...raw,
    id,
  };
}

function pickExistingLink(
  links: LinkRecordRaw[],
  clickedRatePlanId: number,
): RatePlanLinkRecord | null {
  const normalized = links
    .map(normalizeRatePlanLinkRecord)
    .filter((link): link is RatePlanLinkRecord => link != null);

  return (
    normalized.find(
      (link) =>
        link.masterRatePlanId === clickedRatePlanId && link.active !== false,
    ) ??
    normalized.find((link) => link.masterRatePlanId === clickedRatePlanId) ??
    normalized.find(
      (link) =>
        link.slaveRatePlanId === clickedRatePlanId && link.active !== false,
    ) ??
    normalized.find((link) => link.slaveRatePlanId === clickedRatePlanId) ??
    null
  );
}

/** Resolve the active link for the clicked rate plan (as master or slave). */
export async function resolveRatePlanLinkRecord(
  clickedRatePlanId: number,
  allRatePlans: HotelRatePlanListItem[],
): Promise<RatePlanLinkRecord | null> {
  const linksForClickedAsMaster = await rateService
    .getRatePlanLinksByMaster(clickedRatePlanId)
    .catch(() => []);
  const fromClickedMaster = pickExistingLink(
    linksForClickedAsMaster as LinkRecordRaw[],
    clickedRatePlanId,
  );
  if (fromClickedMaster) return fromClickedMaster;

  const candidateMasters = allRatePlans.filter(
    (plan) => plan.ratePlanId !== clickedRatePlanId,
  );
  if (candidateMasters.length === 0) return null;

  const linksByMaster = await Promise.all(
    candidateMasters.map((plan) =>
      rateService.getRatePlanLinksByMaster(plan.ratePlanId).catch(() => []),
    ),
  );

  return pickExistingLink(
    linksByMaster.flat() as LinkRecordRaw[],
    clickedRatePlanId,
  );
}
