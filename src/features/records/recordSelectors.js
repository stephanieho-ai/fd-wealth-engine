import { calcMaturityAmount } from "../../utils/finance";
import { daysUntil, monthKey } from "../../utils/dates";

export function getActiveRecords(records) {
  return records.filter((r) => r.status === "ACTIVE");
}

export function getFilteredRecords(records, query) {
  const q = query.trim().toLowerCase();
  if (!q) return records;

  return records.filter((r) =>
    [
      r.id,
      r.bank,
      r.productName,
      r.type,
      r.currency,
      r.sourceAccount,
      r.savingBucket,
      r.note,
    ]
      .join(" ")
      .toLowerCase()
      .includes(q)
  );
}

export function getMaturityAlerts(records) {
  return getActiveRecords(records)
    .filter((r) => r.type === "FD" && r.maturityDate)
    .map((r) => {
      const days = daysUntil(r.maturityDate);
      return {
        ...r,
        days,
        level:
          days < 0 ? "danger" : days <= 1 ? "danger" : days <= 7 ? "warning" : "info",
      };
    })
    .filter((r) => r.days !== null && r.days <= 30)
    .sort((a, b) => a.days - b.days);
}

export function getMoneySources(records) {
  const active = getActiveRecords(records);
  const result = {
    FD: 0,
    Savings: 0,
    "Parking Cash": 0,
  };

  active.forEach((r) => {
    if (r.type === "FD") result.FD += Number(r.principal || 0);
    if (r.type === "Savings") result.Savings += Number(r.principal || 0);
    if (r.type === "Parking Cash") result["Parking Cash"] += Number(r.principal || 0);
  });

  return result;
}

export function getMonthlyMaturityMap(records) {
  const active = getActiveRecords(records);
  const map = {};

  active
    .filter((r) => r.type === "FD" && r.maturityDate)
    .forEach((r) => {
      const key = monthKey(r.maturityDate);
      if (!map[key]) {
        map[key] = { month: key, principal: 0, interest: 0, total: 0 };
      }

      const total = calcMaturityAmount(r.principal, r.rate, r.tenureMonths);
      const interest = total - Number(r.principal || 0);

      map[key].principal += Number(r.principal || 0);
      map[key].interest += interest;
      map[key].total += total;
    });

  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
}