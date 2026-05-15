import "../../styles/dashboard/maturity-alerts.css";

function getAmount(record) {
  return Number(record?.principal ?? record?.amount ?? 0);
}

function getMaturityDate(record) {
  return record?.maturityDate || record?.maturity_date || "";
}

function getDaysLeft(dateString) {
  if (!dateString) return null;

  const today = new Date();
  const target = new Date(dateString);

  if (Number.isNaN(target.getTime())) return null;

  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  return Math.ceil((target - today) / 86400000);
}

function formatMoney(value, currency = "MYR") {
  const amount = Number(value || 0);

  return `${currency} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export default function MaturityAlerts({
  records = [],
  currency = "MYR",
}) {
  const safeRecords = Array.isArray(records) ? records : [];

  const maturityAlerts = safeRecords
    .filter((record) => {
      const type = String(record?.recordType || record?.type || "FD")
        .toUpperCase()
        .replace(/\s+/g, "_");

      const status = String(record?.status || "ACTIVE").toUpperCase();

      return type === "FD" && status !== "CLOSED";
    })
    .map((record) => {
      const daysLeft = getDaysLeft(getMaturityDate(record));

      let level = null;

      if (daysLeft !== null && daysLeft < 0) {
        level = "Overdue";
      } else if (daysLeft === 0) {
        level = "Due Today";
      } else if (daysLeft > 0 && daysLeft <= 3) {
        level = "Urgent";
      } else if (daysLeft > 3 && daysLeft <= 7) {
        level = "Upcoming";
      }

      return {
        ...record,
        daysLeft,
        level,
      };
    })
    .filter((record) => record.level)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  return (
    <section className="dashboard-section maturity-alerts">
      <div className="section-header">
        <div>
          <p className="eyebrow">Maturity Alerts</p>
          <h2>Upcoming FD Watch</h2>
          <p className="muted">
            Monitor fixed deposits that are overdue, due today, or maturing
            within the next 7 days.
          </p>
        </div>

        <div className="score-card">
          <span>Alerts</span>
          <strong>{maturityAlerts.length}</strong>
        </div>
      </div>

      {!maturityAlerts.length ? (
        <div className="empty-state">
          No FD maturing within 7 days.
        </div>
      ) : (
        <div className="audit-list">
          {maturityAlerts.map((record) => (
            <div
              key={record.id || record.generationId || record.maturityDate}
              className={`projection-card ${
                record.level === "Overdue" ? "overdue-card" : ""
              }`}
            >
              <div>
                <span>{record.level}</span>

                <strong>
                  {record.id || record.generationId || "FD Record"}
                </strong>

                <p className="muted">
                  {record.bank || "Bank"} · {getMaturityDate(record)}
                </p>
              </div>

              <div>
                <strong>
                  {record.daysLeft < 0
                    ? `${Math.abs(record.daysLeft)}D overdue`
                    : record.daysLeft === 0
                    ? "Due today"
                    : `${record.daysLeft}D left`}
                </strong>

                <p className="muted">
                  {formatMoney(getAmount(record), currency)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}