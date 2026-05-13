import "../../styles/dashboard/capital-panel.css";

function safeNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function getMonthAmount(monthData) {
  return (
    safeNumber(monthData?.amount) ||
    safeNumber(monthData?.totalPrincipal) ||
    safeNumber(monthData?.totalFdAmount)
  );
}

export default function CapitalPanel({
  currency = "MYR",
  reserveAmount = 0,
  setReserveAmount,
  capitalHealth,
  formatMoney,
  totalActivePortfolio = 0,
  totalFixedDeposits = 0,
  totalDeployableFunds = 0,
  totalDeployableWithUpcoming = 0,
  capitalSignal = "neutral",
  nextTargetMonth,
  strongestMonth,
  weakestMonth,
  idleCash = 0,
  liquidityBuffer = 0,
}) {
  const healthScore =
    typeof capitalHealth === "object"
      ? capitalHealth?.score ?? 0
      : capitalHealth ?? 0;

  const healthLabel =
    typeof capitalHealth === "object"
      ? capitalHealth?.label ?? "Capital status"
      : "Capital status";

  const healthReasons =
    typeof capitalHealth === "object" && Array.isArray(capitalHealth?.reasons)
      ? capitalHealth.reasons
      : [];

  const signalClass =
    capitalSignal === "moderate"
      ? "warning"
      : capitalSignal === "healthy"
      ? "good"
      : capitalSignal === "danger"
      ? "danger"
      : "stable";

  return (
    <section className="dashboard-section capital-panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">V33.2 Capital Intelligence</p>
          <h2>Capital Engine</h2>
          <p className="muted">
            Private banking view of total capital, locked FD capital,
            deployable funds and liquidity buffer.
          </p>
        </div>

        <div className="score-card">
          <span>Capital Health</span>
          <strong>{healthScore}/100</strong>
          <small>{healthLabel}</small>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <span>Total Capital</span>
          <strong>{formatMoney(totalActivePortfolio, currency)}</strong>
          <small>FD + Savings + Parking Cash</small>
        </div>

        <div className="summary-card">
          <span>Locked FD Capital</span>
          <strong>{formatMoney(totalFixedDeposits, currency)}</strong>
          <small>Currently placed in FD</small>
        </div>

        <div className="summary-card">
          <span>Deployable Now</span>
          <strong>{formatMoney(totalDeployableFunds, currency)}</strong>
          <small>Available after reserve</small>
        </div>

        <div className="summary-card">
          <span>With Upcoming FD</span>
          <strong>{formatMoney(totalDeployableWithUpcoming, currency)}</strong>
          <small>Deployable + next maturity</small>
        </div>
      </div>

      <div className="capital-grid">
        <div className="projection-card">
          <span>Reserve Amount</span>
          <input
            type="number"
            min="0"
            step="1000"
            value={reserveAmount}
            onChange={(e) => setReserveAmount?.(safeNumber(e.target.value))}
            placeholder="Example: 20000"
          />
          <small className="muted">
            Protected liquidity that should not be deployed.
          </small>
        </div>

        <div className="projection-card">
          <span>Strongest Month</span>
          <strong>{strongestMonth?.month || "-"}</strong>
          <small>
            {formatMoney(getMonthAmount(strongestMonth), currency)}
          </small>
        </div>

        <div className="projection-card">
          <span>Weakest Month</span>
          <strong>{weakestMonth?.month || "-"}</strong>
          <small>{formatMoney(getMonthAmount(weakestMonth), currency)}</small>
        </div>

        <div className="projection-card">
          <span>Idle Cash</span>
          <strong>{formatMoney(idleCash, currency)}</strong>
          <small>Savings + Parking Cash</small>
        </div>

        <div className="projection-card">
          <span>Liquidity Buffer</span>
          <strong>{formatMoney(liquidityBuffer, currency)}</strong>
          <small>Reserve and flexible cash layer</small>
        </div>

        <div className="projection-card">
          <span>Next Target Month</span>
          <strong>{nextTargetMonth?.month || "-"}</strong>
          <small>
            Gap: {formatMoney(nextTargetMonth?.gap || 0, currency)}
          </small>
        </div>
      </div>

      <div className={`capital-signal ${signalClass}`}>
        <strong>Capital Intelligence Signal</strong>

        <p>
          {totalDeployableFunds > 20000
            ? `Excess idle capital detected: ${formatMoney(
                totalDeployableFunds,
                currency
              )}. Consider deploying capital into the FD ladder.`
            : totalDeployableFunds >= 5000
            ? `Moderate idle cash detected: ${formatMoney(
                totalDeployableFunds,
                currency
              )}. Monitor upcoming FD opportunities.`
            : totalDeployableFunds > 0
            ? `Healthy liquidity level: ${formatMoney(
                totalDeployableFunds,
                currency
              )}.`
            : "No deployable capital detected yet."}
        </p>
      </div>

      {healthReasons.length > 0 && (
        <div className="capital-signal stable">
          <strong>Capital Health Explanation</strong>

          {healthReasons.map((reason, index) => (
            <p key={index}>• {reason}</p>
          ))}
        </div>
      )}

      <div className="capital-signal stable">
        <strong>Banker Intelligence Insight</strong>

        <p>
          {weakestMonth?.month && strongestMonth?.month
            ? `Current strongest maturity concentration is ${strongestMonth.month}, while weakest coverage is ${weakestMonth.month}. Future deployment should improve weaker maturity periods.`
            : "Add more FD records to activate banker intelligence analysis."}
        </p>
      </div>
    </section>
  );
}