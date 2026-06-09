export function getSalaryRoyaltyPeriod(anchorDate = new Date()) {
  const normalizedDate = new Date(anchorDate);
  const start = new Date(
    Date.UTC(normalizedDate.getUTCFullYear(), normalizedDate.getUTCMonth(), 1),
  );
  const end = new Date(
    Date.UTC(normalizedDate.getUTCFullYear(), normalizedDate.getUTCMonth() + 1, 0, 23, 59, 59, 999),
  );

  return { end, start };
}
