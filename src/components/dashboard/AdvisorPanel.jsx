import "../../styles/dashboard/advisor-panel.css";

export default function AdvisorPanel({
  currency = "MYR",
  targetMonth = "-",
  deployable = 0,
  bestOffer = null,
}) {
  const amount = Number(deployable || 0);

  const formattedDeployable = `${currency} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

  return (
    <section className="dashboard-section advisor-panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">Private Banker AI</p>
          <h2>Advisor Panel</h2>
          <p className="muted">
            Capital guidance based on deployable funds, reserve position and
            weakest maturity month.
          </p>
        </div>
      </div>

      <div className="advisor-box">
        <div className="advisor-line">
          <span>Current Deployable Capital</span>
          <strong>{formattedDeployable}</strong>
        </div>

        <div className="advisor-line">
          <span>Priority Target Month</span>
          <strong>{targetMonth || "-"}</strong>
        </div>

        <div className="advisor-line">
          <span>Best Active Offer</span>
          <strong>
            {bestOffer
              ? `${bestOffer.bank || "Bank"} · ${
                  bestOffer.tenureMonths || bestOffer.tenure || "-"
                }M · ${Number(bestOffer.ratePa || bestOffer.rate || 0).toFixed(
                  2
                )}%`
              : "No active offer detected"}
          </strong>
        </div>

        <div className="advisor-recommendation">
          <strong>Suggested Action</strong>
          <p>
            Protect your reserve first. If excess cash is available, consider
            deploying into the weakest maturity month to improve ladder balance.
          </p>
        </div>
      </div>
    </section>
  );
}