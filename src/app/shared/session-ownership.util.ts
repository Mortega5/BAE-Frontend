/** True when `record.relatedParty` includes the given party id — used to detect
 * whether a record loaded before a `ChangedSession` event still belongs to the
 * newly active party. Missing data (no record yet, no relatedParty, no partyId)
 * defaults to `true` — err on not kicking the user out over inconclusive data. */
export function belongsToParty(
  record: { relatedParty?: { id?: string }[] } | null | undefined,
  partyId: string | null | undefined
): boolean {
  if (!record || !partyId || !record.relatedParty?.length) return true;
  return record.relatedParty.some(rp => rp.id === partyId);
}
