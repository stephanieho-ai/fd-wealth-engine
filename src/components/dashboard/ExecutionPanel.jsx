import "../../styles/dashboard/execution-panel.css";

export default function ExecutionPanel({
  currency = "MYR",
  upcomingMaturityAmount = 0,
  idleCash = 0,
  onUndoExecution,
}) {
  const formatMoney = (value) =>
    `${currency} ${Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;

  return (
    <section className="dashboard-section">
      <div className="section-header">
        <div>
          <p className="eyebrow">Execution Control</p>
          <h2>Execution Snapshot</h2>
          <p className="muted">
            Monitor upcoming maturity capital and idle cash readiness.
          </p>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <span>Upcoming 30D Maturity</span>
          <strong>{formatMoney(upcomingMaturityAmount)}</strong>
        </div>

        <div className="summary-card">
          <span>Idle Cash Above Reserve</span>
          <strong>{formatMoney(idleCash)}</strong>
        </div>
      </div>

      <button
        className="secondary-button"
        type="button"
        onClick={onUndoExecution}
      >
        Undo Last Execution
      </button>
    </section>
  );
}