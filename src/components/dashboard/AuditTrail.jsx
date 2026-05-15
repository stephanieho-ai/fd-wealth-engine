import "../../styles/dashboard/audit-trail.css";
import { useEffect, useMemo, useState } from "react";

const AUDIT_STORAGE_KEY = "fd_execution_history";

function formatMoney(value, currency = "MYR") {
  const amount = Number(value || 0);

  return `${currency} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export default function AuditTrail() {
  const [filter, setFilter] = useState("ALL");
  const [showAll, setShowAll] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
  const handleAuditUpdated = () => {
    setRefreshKey((key) => key + 1);
  };

  window.addEventListener("auditTrailUpdated", handleAuditUpdated);

  return () => {
    window.removeEventListener("auditTrailUpdated", handleAuditUpdated);
  };
}, [refreshKey]);

  const auditTrail = useMemo(() => {
    try {
      const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];

      return Array.isArray(parsed)
        ? parsed.slice().reverse()
        : [];
    } catch (error) {
      console.error("AuditTrail load failed:", error);
      return [];
    }
  }, [refreshKey]);

  const filteredAuditTrail = useMemo(() => {
    const today = new Date()
      .toISOString()
      .slice(0, 10);

    return auditTrail.filter((item) => {
      if (filter === "ALL") return true;

      if (filter === "TODAY") {
        return String(item?.timestamp || "")
          .startsWith(today);
      }

      return (
        String(item?.type || "")
          .toUpperCase() === filter
      );
    });
  }, [auditTrail, filter]);

  const visibleAuditTrail = showAll
    ? filteredAuditTrail
    : filteredAuditTrail.slice(0, 3);

  return (
    <section className="dashboard-section audit-trail">
      <div className="section-header">
        <div>
          <p className="eyebrow">
            Execution Governance
          </p>

          <h2>Audit Trail</h2>

          <p className="muted">
            Execution history and undo tracking layer.
          </p>
        </div>
      </div>

<div className="filter-row">
  {["ALL", "EXECUTE", "UNDO", "TODAY"].map((item) => (
    <button
      key={item}
      type="button"
      className={filter === item ? "active" : ""}
      onClick={() => setFilter(item)}
    >
      {item}
    </button>
  ))}

  <button
    type="button"
    className="danger-chip"
    onClick={() => {
      localStorage.removeItem(AUDIT_STORAGE_KEY);

      setFilter("ALL");

      window.dispatchEvent(
        new Event("auditTrailUpdated")
      );
    }}
  >
    CLEAR
  </button>
</div>

      {!visibleAuditTrail.length ? (
        <div className="empty-state">
          No audit events yet.
        </div>
      ) : (
        <div className="audit-list">
          {visibleAuditTrail.map((item, index) => (
            <div
              key={
                item.id ||
                `${item.type}-${item.timestamp}-${index}`
              }
              className={`projection-card ${
                index === 0
                  ? "latest-audit-card"
                  : ""
              }`}
            >
              <div>
                <strong>
                  {item.type || "EVENT"}
                </strong>

                <p className="muted">
                  {item.batchId ||
                    item.executionBatchId ||
                    "No batch ID"}
                </p>
              </div>

              <div>
                <strong>
                  {item.amount
                    ? formatMoney(
                        item.amount,
                        item.currency || "MYR"
                      )
                    : "-"}
                </strong>

                <p className="muted">
                  {item.timestamp || "-"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredAuditTrail.length > 3 && (
        <button
          type="button"
          className="secondary-button"
          onClick={() =>
            setShowAll((v) => !v)
          }
        >
          {showAll
            ? "Show Less"
            : "Show More"}
        </button>
      )}
    </section>
  );
}