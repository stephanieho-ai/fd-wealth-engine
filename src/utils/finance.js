export function parseNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function calcInterest(principal, rate, tenureMonths) {
  return (
    (parseNumber(principal) * parseNumber(rate) * parseNumber(tenureMonths)) /
    1200
  );
}

export function calcMaturityAmount(principal, rate, tenureMonths) {
  return parseNumber(principal) + calcInterest(principal, rate, tenureMonths);
}