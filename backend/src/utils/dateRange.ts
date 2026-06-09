export function buildDateRangeFilter(input: { fromDate?: string; toDate?: string }) {
  const range: { $gte?: Date; $lt?: Date } = {};

  if (input.fromDate) {
    range.$gte = new Date(`${input.fromDate}T00:00:00.000Z`);
  }

  if (input.toDate) {
    const endDate = new Date(`${input.toDate}T00:00:00.000Z`);
    endDate.setUTCDate(endDate.getUTCDate() + 1);
    range.$lt = endDate;
  }

  return Object.keys(range).length ? range : undefined;
}
