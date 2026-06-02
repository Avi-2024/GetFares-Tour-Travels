function toReportNumber(value, fallback = 0) {
  if (value === null || value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundAmount(value, precision = 2) {
  return Number(toReportNumber(value, 0).toFixed(precision));
}

function percentage(part, total, precision = 2) {
  const denominator = toReportNumber(total, 0);
  if (denominator <= 0) return 0;
  return roundAmount((toReportNumber(part, 0) / denominator) * 100, precision);
}

export { percentage, roundAmount, toReportNumber };
