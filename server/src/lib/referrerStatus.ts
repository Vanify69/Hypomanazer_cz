/**
 * Mapování interních stavů leadu/případu na stav viditelný tipaři (bez citlivých údajů).
 */

export type ReferrerVisibleStatus =
  | "RECEIVED"
  | "CONTACTED"
  | "DOCUMENTS_IN"
  | "IN_BANK"
  | "APPROVED"
  | "SIGNED"
  | "CLOSED_WON"
  | "CLOSED_LOST";

interface LeadLike {
  status: string;
}

interface IntakeSessionLike {
  state?: string;
}

interface CaseLike {
  dealStatus?: string | null;
}

/**
 * Vrací stav obchodu, jak ho vidí tipař (anonymizovaně).
 */
export function mapToReferrerVisibleStatus(
  lead: LeadLike,
  intakeSession?: IntakeSessionLike | null,
  caseData?: CaseLike | null
): ReferrerVisibleStatus {
  if (caseData?.dealStatus === "LOST") return "CLOSED_LOST";
  if (caseData?.dealStatus === "CLOSED") return "CLOSED_WON";
  if (caseData?.dealStatus === "SIGNED_BY_CLIENT") return "SIGNED";
  if (caseData?.dealStatus === "APPROVED") return "APPROVED";
  if (caseData?.dealStatus === "SENT_TO_BANK") return "IN_BANK";

  if (lead.status === "SUBMITTED" || lead.status === "CONVERTED") return "DOCUMENTS_IN";
  if (lead.status === "SENT" || lead.status === "OPENED" || lead.status === "IN_PROGRESS") return "CONTACTED";

  return "RECEIVED";
}

export const REFERRER_VISIBLE_STATUS_LABELS: Record<ReferrerVisibleStatus, string> = {
  RECEIVED: "Přijato",
  CONTACTED: "Kontaktováno",
  DOCUMENTS_IN: "Podklady doručeny",
  IN_BANK: "U banky",
  APPROVED: "Schváleno",
  SIGNED: "Podepsáno",
  CLOSED_WON: "Uzavřeno (úspěch)",
  CLOSED_LOST: "Uzavřeno (neúspěch)",
};
