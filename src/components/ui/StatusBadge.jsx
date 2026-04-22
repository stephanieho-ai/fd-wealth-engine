export default function StatusBadge({ value }) {
  const lower = String(value || "").toLowerCase();
  return <div className={`status-badge ${lower}`}>{value}</div>;
}