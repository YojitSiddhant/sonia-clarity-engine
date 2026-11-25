import type { Citation } from "./answer";

const EVIDENCE_LABEL: Record<Citation["evidence"], string> = {
  direct: "My words",
  interpretive: "Editorial reading",
  record: "Dated record",
};

/**
 * Display-only labels for sources that are neither her words nor a dated
 * record. Keyed by id so the evidence type the model sees stays unchanged.
 */
const LABEL_BY_ID: Record<string, string> = {
  "profile:name": "Profile", // her name as the profile shows it, not a quotation
};

export function sourceLabel(c: Pick<Citation, "id" | "evidence">): string {
  return Object.hasOwn(LABEL_BY_ID, c.id) ? LABEL_BY_ID[c.id] : EVIDENCE_LABEL[c.evidence];
}
