import { useMemo, useState } from "react";

function formatMoney(value, currency = "MYR") {
  const amount = Number(value || 0);
  return `${currency} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function daysBetween(fromDate, toDate) {
  if (!fromDate || !toDate) return null;
  const a = new Date(fromDate);
  const b = new Date(toDate);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  const diff = b.setHours(0, 0, 0, 0) - a.setHours(0, 0, 0, 0);
  return Math.round(diff / 86400000);
}

function monthKey(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 7);
}

function buildProjection(activeFdRecords = [], targetPerMonth = 36000) {
  const today = new Date();
  const months = [];

  for (let i = 0; i < 6; i += 1) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push(key);
  }

  const actualMap = {};
  months.forEach((m) => {
    actualMap[m] = 0;
  });

  activeFdRecords.forEach((record) => {
    const key = monthKey(record.maturityDate);
    if (key && Object.prototype.hasOwnProperty.call(actualMap, key)) {
      actualMap[key] += Number(record.amount || 0);
    }
  });

  return months.map((month) => {
    const actual = Number(actualMap[month] || 0);
    const gap = Math.max(targetPerMonth - actual, 0);
    const excess = Math.max(actual - targetPerMonth, 0);

    return { month, target: targetPerMonth, actual, gap, excess };
  });
}

export default function DashboardPage({
  tabs = {},
  onTabChange,
  currency = "MYR",
  records,
  activeRecords,
}) {
  const [activeView, setActiveView] = useState("summary");

  const safeRecords = Array.isArray(records) ? records : [];
  const safeActiveRecords = Array.isArray(activeRecords) ? activeRecords : [];

  const activeFdRecords = useMemo(
    () => safeActiveRecords.filter((r) => String(r.recordType).toUpperCase() === "FD"),
    [safeActiveRecords]
  );

  const savingsRecords = useMemo(
    () => safeActiveRecords.filter((r) => String(r.recordType).toUpperCase() === "SAVINGS"),
    [safeActiveRecords]
  );

  const parkingCashRecords = useMemo(
    () =>
      safeActiveRecords.filter(
        (r) => String(r.recordType).toUpperCase() === "PARKING CASH"
      ),
    [safeActiveRecords]
  );

  const totalActivePortfolio = useMemo(
    () => safeActiveRecords.reduce((sum, r) => sum + Number(r.amount || 0), 0),
    [safeActiveRecords]
  );

  const totalFixedDeposits = useMemo(
    () => activeFdRecords.reduce((sum, r) => sum + Number(r.amount || 0), 0),
    [activeFdRecords]
  );

  const totalSavings = useMemo(
    () => savingsRecords.reduce((sum, r) => sum + Number(r.amount || 0), 0),
    [savingsRecords]
  );

  const totalParkingCash = useMemo(
    () => parkingCashRecords.reduce((sum, r) => sum + Number(r.amount || 0), 0),
    [parkingCashRecords]
  );

  const todayIso = new Date().toISOString().slice(0, 10);

  const overdueRecords = useMemo(
    () =>
      activeFdRecords
        .map((r) => ({ ...r, overdueDays: daysBetween(r.maturityDate, todayIso) }))
        .filter((r) => typeof r.overdueDays === "number" && r.overdueDays > 0),
    [activeFdRecords, todayIso]
  );

  const dueTodayRecords = useMemo(
    () =>
      activeFdRecords.filter((r) => {
        const diff = daysBetween(todayIso, r.maturityDate);
        return diff === 0;
      }),
    [activeFdRecords, todayIso]
  );

  const dueIn7DaysRecords = useMemo(
    () =>
      activeFdRecords.filter((r) => {
        const diff = daysBetween(todayIso, r.maturityDate);
        return typeof diff === "number" && diff >= 1 && diff <= 7;
      }),
    [activeFdRecords, todayIso]
  );

  const dueIn30DaysRecords = useMemo(
    () =>
      activeFdRecords.filter((r) => {
        const diff = daysBetween(todayIso, r.maturityDate);
        return typeof diff === "number" && diff >= 8 && diff <= 30;
      }),
    [activeFdRecords, todayIso]
  );

  const projection = useMemo(() => buildProjection(activeFdRecords, 36000), [activeFdRecords]);

  const weakestMonth = useMemo(() => {
    if (!projection.length) return null;
    return projection.reduce((best, item) => (item.gap > best.gap ? item : best), projection[0]);
  }, [projection]);

  const strongestMonth = useMemo(() => {
    if (!projection.length) return null;
    return projection.reduce((best, item) => (item.actual > best.actual ? item : best), projection[0]);
  }, [projection]);

  const topSignals = useMemo(() => {
    const list = [];

    if (overdueRecords.length > 0) {
      list.push({
        title: "Maturity Alert",
        text: `${overdueRecords[0].bank} ${overdueRecords[0].id} is overdue`,
        tone: "blue",
      });
    }

    if (weakestMonth && weakestMonth.gap > 0) {
      list.push({
        title: `Fill ${weakestMonth.month}`,
        text: `Gap ${formatMoney(weakestMonth.gap, currency)}`,
        tone: "orange",
      });
    }

    if (strongestMonth) {
      list.push({
        title: `Strongest ${strongestMonth.month}`,
        text: `Actual ${formatMoney(strongestMonth.actual, currency)}`,
        tone: "green",
      });
    }

    list.push({
      title: "Maintain Ladder Rhythm",
      text: "Keep staggered maturities for monthly liquidity",
      tone: "blue",
    });

    return list.slice(0, 4);
  }, [overdueRecords, weakestMonth, strongestMonth, currency]);

  const openRecordsTab = () => {
    if (onTabChange && tabs.RECORDS) onTabChange(tabs.RECORDS);
  };

  const openMoreTab = () => {
    if (onTabChange && tabs.MORE) onTabChange(tabs.MORE);
  };

  const grandTotal = totalFixedDeposits + totalSavings + totalParkingCash || 1;
  const notificationCount = overdueRecords.length + dueTodayRecords.length;

  return (
    <div className="page bank-dashboard-page">
      <section className="hero-card bank-hero dashboard-hero">
        <div className="hero-left">
          <div className="hero-badge">FD WEALTH ENGINE</div>
          <h1 className="bank-title">Fixed Deposit Portfolio Dashboard</h1>
          <p className="bank-subtitle">
            Monitor active deposits, maturity schedules, funding sources and rate
            opportunities across your portfolio.
          </p>
        </div>

        <div className="hero-right">
          <div className="metric-card bank-main-metric dashboard-main-metric">
            <span>ACTIVE PORTFOLIO</span>
            <strong>{formatMoney(totalActivePortfolio, currency)}</strong>
          </div>
        </div>
      </section>

      <div className="dashboard-tabs summary-tabs">
        <button
          className={`tab-chip tab-btn ${activeView === "summary" ? "active" : ""}`}
          onClick={() => setActiveView("summary")}
        >
          Summary
        </button>
        <button
          className={`tab-chip tab-btn ${activeView === "alerts" ? "active" : ""}`}
          onClick={() => setActiveView("alerts")}
        >
          Alerts
        </button>
        <button
          className={`tab-chip tab-btn ${activeView === "analytics" ? "active" : ""}`}
          onClick={() => setActiveView("analytics")}
        >
          Analytics
        </button>
      </div>

      {activeView === "summary" && (
        <>
          <div className="dashboard-metrics-grid dashboard-summary-grid">
            <div className="metric-box summary-card dashboard-stat-card">
              <span>FIXED DEPOSITS</span>
              <strong className="metric-value">
                {formatMoney(totalFixedDeposits, currency)}
              </strong>
              <small>Locked capital</small>
            </div>

            <div className="metric-box summary-card dashboard-stat-card">
              <span>SAVINGS</span>
              <strong className="metric-value">
                {formatMoney(totalSavings, currency)}
              </strong>
              <small>Flexible reserve</small>
            </div>

            <div className="metric-box summary-card dashboard-stat-card">
              <span>PARKING CASH</span>
              <strong className="metric-value">
                {formatMoney(totalParkingCash, currency)}
              </strong>
              <small>Ready to deploy</small>
            </div>

            <div className="metric-box summary-card dashboard-stat-card notification-card">
              <span>NOTIFICATIONS</span>
              <strong className="metric-value">{notificationCount}</strong>
              <small>{notificationCount > 0 ? "Action required" : "All clear"}</small>
            </div>
          </div>

          <div className="dashboard-two-col">
            <section className="bank-panel advisor-focus">
              <div className="bank-panel-head">
                <div>
                  <div className="panel-kicker">ADVISOR FOCUS</div>
                  <h3>Top Signals</h3>
                </div>
                <small>Most important now</small>
              </div>

              <div className="signal-list">
                {topSignals.map((item, index) => (
                  <div
                    key={`${item.title}-${index}`}
                    className={`signal-card top-signal-card tone-${item.tone}`}
                  >
                    <h4>{item.title}</h4>
                    <p>{item.text}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="bank-panel immediate-action">
              <div className="bank-panel-head">
                <div>
                  <div className="panel-kicker">IMMEDIATE ACTION</div>
                  <h3>Execution Snapshot</h3>
                </div>
                <small>Today and this week</small>
              </div>

              <div className="action-cards">
                <div className="action-card execution-snapshot-card tone-blue">
                  <h4>Open Records</h4>
                  <p>Manage active records, overdue items and rollover opportunities.</p>
                  <button className="primary-btn" onClick={openRecordsTab}>
                    Open Records
                  </button>
                </div>

                <div className="action-card execution-snapshot-card tone-orange">
                  <h4>Open Planner</h4>
                  <p>Review weak month funding gaps and placement decisions.</p>
                  <button className="primary-btn" onClick={openMoreTab}>
                    Open Planner
                  </button>
                </div>
              </div>
            </section>
          </div>
        </>
      )}

      {activeView === "alerts" && (
        <section className="bank-panel">
          <div className="bank-panel-head">
            <div>
              <div className="panel-kicker">NOTIFICATION CENTER</div>
              <h3>Maturity Monitoring</h3>
            </div>
            <small>Overdue / Due soon</small>
          </div>

          <div className="alerts-grid">
            <div className="alert-box">
              <div className="alert-box-head">
                <h4>Overdue</h4>
                <span>{overdueRecords.length}</span>
              </div>
              {overdueRecords.length ? (
                overdueRecords.slice(0, 1).map((r) => (
                  <div key={r.id} className="alert-record overdue">
                    <div className="alert-row">
                      <strong>
                        {r.bank} · {r.id}
                      </strong>
                      <span className="pill overdue">{r.overdueDays}D overdue</span>
                    </div>
                    <div className="alert-sub">{r.productName}</div>
                    <div className="alert-row">
                      <small>{r.maturityDate}</small>
                      <strong>{formatMoney(r.amount, currency)}</strong>
                    </div>
                  </div>
                ))
              ) : (
                <div className="alert-empty">No data</div>
              )}
            </div>

            <div className="alert-box">
              <div className="alert-box-head">
                <h4>Today</h4>
                <span>{dueTodayRecords.length}</span>
              </div>
              {dueTodayRecords.length ? (
                dueTodayRecords.map((r) => (
                  <div key={r.id} className="alert-record">
                    <strong>
                      {r.bank} · {r.id}
                    </strong>
                  </div>
                ))
              ) : (
                <div className="alert-empty">No data</div>
              )}
            </div>

            <div className="alert-box">
              <div className="alert-box-head">
                <h4>Due in 7 Days</h4>
                <span>{dueIn7DaysRecords.length}</span>
              </div>
              {dueIn7DaysRecords.length ? (
                dueIn7DaysRecords.map((r) => (
                  <div key={r.id} className="alert-record">
                    <strong>
                      {r.bank} · {r.id}
                    </strong>
                  </div>
                ))
              ) : (
                <div className="alert-empty">No data</div>
              )}
            </div>

            <div className="alert-box">
              <div className="alert-box-head">
                <h4>Due in 30 Days</h4>
                <span>{dueIn30DaysRecords.length}</span>
              </div>
              {dueIn30DaysRecords.length ? (
                dueIn30DaysRecords.map((r) => (
                  <div key={r.id} className="alert-record">
                    <strong>
                      {r.bank} · {r.id}
                    </strong>
                  </div>
                ))
              ) : (
                <div className="alert-empty">No data</div>
              )}
            </div>
          </div>
        </section>
      )}

      {activeView === "analytics" && (
        <>
          <div className="dashboard-two-col">
            <section className="bank-panel">
              <div className="bank-panel-head">
                <div>
                  <div className="panel-kicker">MONTH ANALYSIS</div>
                  <h3>Weak vs Strong</h3>
                </div>
                <small>Funding balance</small>
              </div>

              <div className="signal-list">
                <div className="signal-card tone-orange">
                  <h4>Weakest Month</h4>
                  <p>{weakestMonth?.month || "N/A"}</p>
                  <small>{formatMoney(weakestMonth?.gap || 0, currency)}</small>
                </div>

                <div className="signal-card tone-green">
                  <h4>Strongest Month</h4>
                  <p>{strongestMonth?.month || "N/A"}</p>
                  <small>{formatMoney(strongestMonth?.actual || 0, currency)}</small>
                </div>
              </div>
            </section>

            <section className="bank-panel">
              <div className="bank-panel-head">
                <div>
                  <div className="panel-kicker">ALLOCATION CHART</div>
                  <h3>Portfolio Allocation</h3>
                </div>
                <small>FD / Savings / Cash</small>
              </div>

              <div className="allocation-list">
                <div className="allocation-row">
                  <span>FD</span>
                  <div className="allocation-bar">
                    <div
                      className="allocation-fill blue"
                      style={{ width: `${(totalFixedDeposits / grandTotal) * 100}%` }}
                    />
                  </div>
                  <strong>{formatMoney(totalFixedDeposits, currency)}</strong>
                </div>

                <div className="allocation-row">
                  <span>Savings</span>
                  <div className="allocation-bar">
                    <div
                      className="allocation-fill purple"
                      style={{ width: `${(totalSavings / grandTotal) * 100}%` }}
                    />
                  </div>
                  <strong>{formatMoney(totalSavings, currency)}</strong>
                </div>

                <div className="allocation-row">
                  <span>Cash</span>
                  <div className="allocation-bar">
                    <div
                      className="allocation-fill green"
                      style={{ width: `${(totalParkingCash / grandTotal) * 100}%` }}
                    />
                  </div>
                  <strong>{formatMoney(totalParkingCash, currency)}</strong>
                </div>
              </div>
            </section>
          </div>

          <section className="bank-panel" style={{ marginTop: 24 }}>
            <div className="bank-panel-head">
              <div>
                <div className="panel-kicker">FUNDING GAP CHART</div>
                <h3>Monthly Projection</h3>
              </div>
              <small>Target vs actual</small>
            </div>

            <div className="projection-list">
              {projection.map((item) => (
                <div key={item.month} className="projection-card">
                  <div className="projection-month">{item.month}</div>
                  <div className="projection-meta">
                    Target {formatMoney(item.target, currency)} · Actual{" "}
                    {formatMoney(item.actual, currency)}
                  </div>

                  <div className="projection-line">
                    <span>Actual</span>
                    <div className="allocation-bar">
                      <div
                        className="allocation-fill blue"
                        style={{ width: `${Math.min((item.actual / item.target) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="projection-line">
                    <span>{item.gap > 0 ? "Gap" : "Excess"}</span>
                    <div className="allocation-bar">
                      <div
                        className={`allocation-fill ${item.gap > 0 ? "orange" : "green"}`}
                        style={{
                          width: `${Math.min(((item.gap || item.excess) / item.target) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="projection-note">
                    {item.gap > 0
                      ? `Need ${formatMoney(item.gap, currency)}`
                      : `Excess ${formatMoney(item.excess, currency)}`}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}