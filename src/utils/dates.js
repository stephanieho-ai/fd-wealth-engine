export function safeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(value) {
  const d = safeDate(value);
  if (!d) return "—";
  return d.toLocaleDateString("en-GB");
}

export function daysUntil(dateStr) {
  const d = safeDate(dateStr);
  if (!d) return null;

  const today = new Date();
  const x = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const y = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = y.getTime() - x.getTime();

  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export function monthKey(dateStr) {
  const d = safeDate(dateStr);
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function addMonthsToDate(dateStr, months) {
  const d = safeDate(dateStr);
  if (!d) return "";

  const copy = new Date(d);
  copy.setMonth(copy.getMonth() + Number(months || 0));
  return copy.toISOString().slice(0, 10);
}