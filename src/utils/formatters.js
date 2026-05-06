import { parseNumber } from "./finance";

export function formatMoney(value, currency = "MYR") {
  const amount = parseNumber(value, 0);

  return `${currency} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}