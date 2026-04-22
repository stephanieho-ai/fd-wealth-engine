import { useEffect, useMemo, useState } from "react";

const STORAGE_KEYS = {
  RATES: "fd_v322_rates",
  SAVED_PLANS: "fd_v322_saved_plans",
  ACTIVITY: "fd_v322_activity",
};

const RATE_CURRENCIES = ["MYR", "USD", "SGD", "EUR", "GBP", "AUD", "HKD", "CNY"];
const DEFAULT_PREFERENCE = "Balanced";

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function formatMoney(value, currency = "MYR", digits = 0) {
  const num = Number(value || 0);
  return `${currency} ${num.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function formatDateTime(value) {
  try {
    return new Date(value).toLocaleString("en-GB");
  } catch {
    return value;
  }
}

function monthLabel(yyyyMm) {
  if (!yyyyMm) return "";
  const [y, m] = yyyyMm.split("-").map(Number);
  if (!y || !m) return yyyyMm;
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function addMonths(yyyyMm, offset) {
  const [y, m] = yyyyMm.split("-").map(Number);
  const d = new Date(y, m - 1 + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function averageRate(rateEntries, currency) {
  const filtered = rateEntries.filter(
    (item) =>
      Number(item.rate) > 0 && (!currency || item.currency === currency)
  );
  if (!filtered.length) return 0;
  const sum = filtered.reduce((acc, item) => acc + Number(item.rate), 0);
  return sum / filtered.length;
}

function estimatePrincipal(monthlyInterest, annualRatePct) {
  const monthly = Number(monthlyInterest || 0);
  const annualRate = Number(annualRatePct || 0) / 100;
  if (monthly <= 0 || annualRate <= 0) return 0;
  return (monthly * 12) / annualRate;
}

function buildMonthlyRows({
  targetMonth,
  buildYears,
  monthlyPlacement,
  ratePct,
  currency,
  tenureMonths,
}) {
  const totalMonths = Number(buildYears) * 12;
  const rows = [];
  let cumulativePrincipal = 0;

  for (let i = totalMonths - 1; i >= 0; i -= 1) {
    const month = addMonths(targetMonth, -i);
    cumulativePrincipal += monthlyPlacement;

    const estimatedAnnualInterest = monthlyPlacement * (Number(ratePct) / 100);
    const estimatedMonthlyInterest = estimatedAnnualInterest / 12;

    rows.push({
      id: `${month}_${i}`,
      placeMonth: month,
      placeMonthLabel: monthLabel(month),
      monthlyPlacement,
      monthlyPlacementLabel: formatMoney(monthlyPlacement, currency, 0),
      tenureLabel: `${Number(tenureMonths || 12)}M`,
      ratePct,
      rateLabel: formatPercent(ratePct),
      estimatedAnnualInterest,
      estimatedAnnualInterestLabel: formatMoney(
        estimatedAnnualInterest,
        currency,
        0
      ),
      estimatedMonthlyInterest,
      estimatedMonthlyInterestLabel: formatMoney(
        estimatedMonthlyInterest,
        currency,
        2
      ),
      cumulativePrincipal,
      cumulativePrincipalLabel: formatMoney(cumulativePrincipal, currency, 0),
    });
  }

  return rows;
}

function buildYearlyRows(monthlyRows, annualRatePct, currency) {
  const yearMap = {};

  monthlyRows.forEach((row) => {
    const year = row.placeMonth.slice(0, 4);
    if (!yearMap[year]) {
      yearMap[year] = {
        year,
        totalPrincipal: 0,
      };
    }
    yearMap[year].totalPrincipal = row.cumulativePrincipal;
  });

  return Object.values(yearMap).map((item) => {
    const estimatedAnnualInterest =
      item.totalPrincipal * (Number(annualRatePct || 0) / 100);
    const estimatedMonthlyInterest = estimatedAnnualInterest / 12;

    return {
      year: item.year,
      totalPrincipal: item.totalPrincipal,
      totalPrincipalLabel: formatMoney(item.totalPrincipal, currency, 0),
      estimatedAnnualInterest,
      estimatedAnnualInterestLabel: formatMoney(
        estimatedAnnualInterest,
        currency,
        0
      ),
      estimatedMonthlyInterest,
      estimatedMonthlyInterestLabel: formatMoney(
        estimatedMonthlyInterest,
        currency,
        2
      ),
    };
  });
}

function buildActivity(message) {
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    message,
    createdAt: new Date().toISOString(),
  };
}

function softBoxStyle() {
  return {
    background: "var(--panel)",
    border: "1px solid var(--border)",
    borderRadius: 18,
    padding: 18,
  };
}

function tableWrapStyle() {
  return {
    overflowX: "auto",
    border: "1px solid var(--border)",
    borderRadius: 18,
    background: "var(--panel)",
  };
}

function tableStyle() {
  return {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 920,
  };
}

function thTdStyle() {
  return {
    padding: "16px 18px",
    borderBottom: "1px solid var(--border)",
    textAlign: "left",
    whiteSpace: "nowrap",
  };
}

export default function MorePage({ currency = "MYR" }) {
  const [activeTab, setActiveTab] = useState("GUIDE");

  const [rates, setRates] = useState(() => readStorage(STORAGE_KEYS.RATES, []));
  const [savedPlans, setSavedPlans] = useState(() =>
    readStorage(STORAGE_KEYS.SAVED_PLANS, [])
  );
  const [activityLog, setActivityLog] = useState(() =>
    readStorage(STORAGE_KEYS.ACTIVITY, [])
  );

  const [rateForm, setRateForm] = useState({
    bank: "",
    currency,
    tenureMonths: "",
    rate: "",
    updatedMonth: "",
    notes: "",
  });

  const [goalForm, setGoalForm] = useState({
    monthlyInterest: "",
    currency,
    targetMonth: "",
    buildYears: "",
    tenureMonths: "12",
    preference: DEFAULT_PREFERENCE,
  });

  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    writeStorage(STORAGE_KEYS.RATES, rates);
  }, [rates]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.SAVED_PLANS, savedPlans);
  }, [savedPlans]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.ACTIVITY, activityLog);
  }, [activityLog]);

  useEffect(() => {
    setRateForm((prev) => ({ ...prev, currency }));
    setGoalForm((prev) => ({ ...prev, currency }));
  }, [currency]);

  const avgRate = useMemo(() => {
    return averageRate(rates, goalForm.currency || currency);
  }, [rates, goalForm.currency, currency]);

  const addActivityItem = (message) => {
    setActivityLog((prev) => [buildActivity(message), ...prev].slice(0, 40));
  };

  const handleAddRate = () => {
    if (!rateForm.bank.trim()) {
      setErrorMessage("Please enter bank name.");
      return;
    }
    if (!rateForm.tenureMonths || Number(rateForm.tenureMonths) <= 0) {
      setErrorMessage("Please enter valid tenure months.");
      return;
    }
    if (!rateForm.rate || Number(rateForm.rate) <= 0) {
      setErrorMessage("Please enter valid FD rate.");
      return;
    }
    if (!rateForm.updatedMonth) {
      setErrorMessage("Please select updated month.");
      return;
    }

    const newRate = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      bank: rateForm.bank.trim(),
      currency: rateForm.currency,
      tenureMonths: Number(rateForm.tenureMonths),
      rate: Number(rateForm.rate),
      updatedMonth: rateForm.updatedMonth,
      notes: rateForm.notes.trim(),
    };

    setRates((prev) => [newRate, ...prev]);
    setRateForm({
      bank: "",
      currency: goalForm.currency || currency,
      tenureMonths: "",
      rate: "",
      updatedMonth: "",
      notes: "",
    });
    setErrorMessage("");
    addActivityItem(`Latest rate added for ${newRate.bank}.`);
  };

  const handleDeleteRate = (id) => {
    const target = rates.find((item) => item.id === id);
    setRates((prev) => prev.filter((item) => item.id !== id));
    if (target) {
      addActivityItem(`A market rate entry was removed from ${target.bank}.`);
    }
  };

  const handleGeneratePlan = () => {
    const monthlyInterest = Number(goalForm.monthlyInterest || 0);
    const targetMonth = goalForm.targetMonth;
    const buildYears = Number(goalForm.buildYears || 0);
    const selectedCurrency = goalForm.currency || currency;
    const tenureMonths = Number(goalForm.tenureMonths || 12);

    if (monthlyInterest <= 0) {
      setErrorMessage("Please enter target monthly interest.");
      return;
    }
    if (!targetMonth) {
      setErrorMessage("Please select target month.");
      return;
    }
    if (buildYears <= 0) {
      setErrorMessage("Please enter build-up years.");
      return;
    }
    if (tenureMonths <= 0) {
      setErrorMessage("Please enter valid tenure months.");
      return;
    }
    if (!rates.length) {
      setErrorMessage("Please add latest bank rates first.");
      return;
    }
    if (avgRate <= 0) {
      setErrorMessage("No valid rate available for this currency.");
      return;
    }

    const principalNeeded = estimatePrincipal(monthlyInterest, avgRate);
    const monthlyPlacement = principalNeeded / (buildYears * 12);

    const monthlyRows = buildMonthlyRows({
      targetMonth,
      buildYears,
      monthlyPlacement,
      ratePct: avgRate,
      currency: selectedCurrency,
      tenureMonths,
    });

    const yearlyRows = buildYearlyRows(monthlyRows, avgRate, selectedCurrency);

    const stableYear =
      yearlyRows.find(
        (item) => Number(item.estimatedMonthlyInterest || 0) >= monthlyInterest
      )?.year || yearlyRows[yearlyRows.length - 1]?.year || "";

    const nextResult = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      currency: selectedCurrency,
      monthlyInterest,
      monthlyInterestLabel: formatMoney(monthlyInterest, selectedCurrency, 2),
      targetMonth,
      targetMonthLabel: monthLabel(targetMonth),
      buildYears,
      tenureMonths,
      preference: goalForm.preference,
      avgRate,
      avgRateLabel: formatPercent(avgRate),
      principalNeeded,
      principalNeededLabel: formatMoney(principalNeeded, selectedCurrency, 0),
      monthlyPlacement,
      monthlyPlacementLabel: formatMoney(monthlyPlacement, selectedCurrency, 0),
      stableYear,
      stableYearLabel: stableYear || "-",
      monthlyRows,
      yearlyRows,
    };

    setResult(nextResult);
    setActiveTab("RESULTS");
    setErrorMessage("");
    addActivityItem("Planner generated a new recommendation set.");
  };

  const handleSavePlan = () => {
    if (!result) return;
    const saveItem = {
      ...result,
      savedAt: new Date().toISOString(),
    };
    setSavedPlans((prev) => [saveItem, ...prev]);
    setActiveTab("SAVED");
    addActivityItem(`Saved plan: ${result.targetMonthLabel} ladder target.`);
  };

  const handleDeleteSavedPlan = (id) => {
    setSavedPlans((prev) => prev.filter((item) => item.id !== id));
    addActivityItem("A saved plan was removed.");
  };

  const resetGoal = () => {
    setGoalForm({
      monthlyInterest: "",
      currency,
      targetMonth: "",
      buildYears: "",
      tenureMonths: "12",
      preference: DEFAULT_PREFERENCE,
    });
    setResult(null);
    setErrorMessage("");
  };

  return (
    <div className="page">
      <section className="hero-card">
        <div className="hero-copy">
          <div className="eyebrow-pill">FD WEALTH ENGINE</div>
          <h1>Execution Center</h1>
          <p>
            Guided workflow for global users to enter latest bank rates, set
            ladder goals, and generate a clear FD build plan.
          </p>
        </div>

        <div className="hero-metric-card">
          <div className="hero-metric-label">MODE</div>
          <div className="hero-metric-value">Planner</div>
        </div>
      </section>

      {errorMessage ? (
        <section className="content-card">
          <div className="settings-feedback" style={{ marginTop: 0 }}>
            {errorMessage}
          </div>
        </section>
      ) : null}

      <section className="content-card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div className="card-kicker">GLOBAL USER GUIDE</div>
            <h2 style={{ marginTop: 8 }}>How to Use This Page</h2>
          </div>
          <div className="status-badge">Step-by-step</div>
        </div>

        <div className="guide-grid">
          <div className="guide-item">
            <div className="guide-head">
              <span>Rates</span>
              <span className="status-badge">Step 1</span>
            </div>
            <p>Add the latest monthly FD rates manually from the banks you want to compare.</p>
          </div>

          <div className="guide-item">
            <div className="guide-head">
              <span>Goal</span>
              <span className="status-badge">Step 2</span>
            </div>
            <p>Set your target monthly interest, target month, build-up years, and tenure.</p>
          </div>

          <div className="guide-item">
            <div className="guide-head">
              <span>Planner</span>
              <span className="status-badge">Step 3</span>
            </div>
            <p>Generate the ladder only after your own inputs are ready. No default amount is used.</p>
          </div>

          <div className="guide-item">
            <div className="guide-head">
              <span>Result</span>
              <span className="status-badge">Step 4</span>
            </div>
            <p>Read the month-by-month ladder table, year-by-year accumulation, saved plans, and activity.</p>
          </div>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          marginTop: 24,
        }}
      >
        <div className="content-card">
          <div className="card-kicker">STEP 1</div>
          <h2>Enter Latest Bank Rates</h2>

          <div className="settings-form-grid" style={{ marginTop: 20 }}>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>Bank</label>
              <input
                className="input"
                placeholder="Example: HLB / DBS / HSBC / UOB"
                value={rateForm.bank}
                onChange={(e) =>
                  setRateForm((prev) => ({ ...prev, bank: e.target.value }))
                }
              />
            </div>

            <div className="field">
              <label>Currency</label>
              <select
                value={rateForm.currency}
                onChange={(e) =>
                  setRateForm((prev) => ({ ...prev, currency: e.target.value }))
                }
              >
                {RATE_CURRENCIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Tenure Months</label>
              <input
                className="input"
                type="number"
                min="1"
                placeholder="12"
                value={rateForm.tenureMonths}
                onChange={(e) =>
                  setRateForm((prev) => ({
                    ...prev,
                    tenureMonths: e.target.value,
                  }))
                }
              />
            </div>

            <div className="field">
              <label>Rate (%)</label>
              <input
                className="input"
                type="number"
                step="0.01"
                min="0"
                placeholder="3.60"
                value={rateForm.rate}
                onChange={(e) =>
                  setRateForm((prev) => ({ ...prev, rate: e.target.value }))
                }
              />
            </div>

            <div className="field">
              <label>Updated Month</label>
              <input
                className="input"
                type="month"
                value={rateForm.updatedMonth}
                onChange={(e) =>
                  setRateForm((prev) => ({
                    ...prev,
                    updatedMonth: e.target.value,
                  }))
                }
              />
            </div>

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>Notes</label>
              <input
                className="input"
                placeholder="Promo / standard / online special"
                value={rateForm.notes}
                onChange={(e) =>
                  setRateForm((prev) => ({ ...prev, notes: e.target.value }))
                }
              />
            </div>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={handleAddRate}
          >
            Add Rate
          </button>

          <div style={{ marginTop: 20, display: "grid", gap: 14 }}>
            {rates.length === 0 ? (
              <div className="empty" style={softBoxStyle()}>
                No market rate entries yet.
              </div>
            ) : (
              rates.map((item) => (
                <div key={item.id} style={softBoxStyle()}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div className="status-title">{item.bank}</div>
                      <div className="status-subtitle">
                        {item.currency} · {item.tenureMonths}M · {item.updatedMonth}
                      </div>
                    </div>
                    <div className="status-badge">{formatPercent(item.rate)}</div>
                  </div>

                  <div className="list-row" style={{ marginTop: 14 }}>
                    <span className="text-muted">Notes</span>
                    <span>{item.notes || "-"}</span>
                  </div>

                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ marginTop: 14 }}
                    onClick={() => handleDeleteRate(item.id)}
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="content-card">
          <div className="card-kicker">STEP 2</div>
          <h2>Set Your Monthly Interest Goal</h2>

          <div className="settings-form-grid" style={{ marginTop: 20 }}>
            <div className="field">
              <label>Target Monthly Interest</label>
              <input
                className="input"
                type="number"
                min="0"
                placeholder="Example: 1500"
                value={goalForm.monthlyInterest}
                onChange={(e) =>
                  setGoalForm((prev) => ({
                    ...prev,
                    monthlyInterest: e.target.value,
                  }))
                }
              />
            </div>

            <div className="field">
              <label>Currency</label>
              <select
                value={goalForm.currency}
                onChange={(e) =>
                  setGoalForm((prev) => ({ ...prev, currency: e.target.value }))
                }
              >
                {RATE_CURRENCIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Target Month</label>
              <input
                className="input"
                type="month"
                value={goalForm.targetMonth}
                onChange={(e) =>
                  setGoalForm((prev) => ({
                    ...prev,
                    targetMonth: e.target.value,
                  }))
                }
              />
            </div>

            <div className="field">
              <label>Build-up Years</label>
              <input
                className="input"
                type="number"
                min="1"
                placeholder="Example: 3"
                value={goalForm.buildYears}
                onChange={(e) =>
                  setGoalForm((prev) => ({
                    ...prev,
                    buildYears: e.target.value,
                  }))
                }
              />
            </div>

            <div className="field">
              <label>Tenure Months</label>
              <input
                className="input"
                type="number"
                min="1"
                placeholder="12"
                value={goalForm.tenureMonths}
                onChange={(e) =>
                  setGoalForm((prev) => ({
                    ...prev,
                    tenureMonths: e.target.value,
                  }))
                }
              />
            </div>

            <div className="field">
              <label>Preference</label>
              <select
                value={goalForm.preference}
                onChange={(e) =>
                  setGoalForm((prev) => ({
                    ...prev,
                    preference: e.target.value,
                  }))
                }
              >
                <option value="Balanced">Balanced</option>
                <option value="Conservative">Conservative</option>
                <option value="Aggressive">Aggressive</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
            <button
              type="button"
              className="btn-primary"
              onClick={handleGeneratePlan}
            >
              Generate Step-by-step Plan
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={resetGoal}
            >
              Reset Goal
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginTop: 20,
            }}
          >
            <div style={softBoxStyle()}>
              <div className="text-muted">Estimated rate used</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8 }}>
                {result ? result.avgRateLabel : "-"}
              </div>
            </div>

            <div style={softBoxStyle()}>
              <div className="text-muted">Total FD Required</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8 }}>
                {result ? result.principalNeededLabel : "-"}
              </div>
            </div>

            <div style={softBoxStyle()}>
              <div className="text-muted">Monthly FD Required</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8 }}>
                {result ? result.monthlyPlacementLabel : "-"}
              </div>
            </div>

            <div style={softBoxStyle()}>
              <div className="text-muted">Time to build</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8 }}>
                {result
                  ? `${Number(result.buildYears) * 12} month(s) / ${Number(
                      result.buildYears
                    ).toFixed(1)} year(s)`
                  : "-"}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="content-card" style={{ marginTop: 28 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
          <button
            type="button"
            className={activeTab === "GUIDE" ? "btn-primary" : "btn-secondary"}
            onClick={() => setActiveTab("GUIDE")}
          >
            Guide
          </button>
          <button
            type="button"
            className={activeTab === "RESULTS" ? "btn-primary" : "btn-secondary"}
            onClick={() => setActiveTab("RESULTS")}
          >
            Results
          </button>
          <button
            type="button"
            className={activeTab === "SAVED" ? "btn-primary" : "btn-secondary"}
            onClick={() => setActiveTab("SAVED")}
          >
            Saved Plans
          </button>
        </div>

        {activeTab === "GUIDE" && (
          <div style={softBoxStyle()}>
            <h2>Simple explanation</h2>
            <p className="text-muted" style={{ marginTop: 16, lineHeight: 1.8 }}>
              This planner calculates how much total FD you need to reach your
              monthly interest goal, then spreads it into a month-by-month FD ladder.
            </p>
          </div>
        )}

        {activeTab === "RESULTS" && (
          <div style={{ display: "grid", gap: 24 }}>
            {!result ? (
              <div className="empty" style={softBoxStyle()}>
                No result yet. Enter latest rates, set your monthly interest goal,
                then click Generate Step-by-step Plan.
              </div>
            ) : (
              <>
                <div style={softBoxStyle()}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 16,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div className="card-kicker">STEP 4</div>
                      <h2 style={{ marginTop: 8 }}>Month-by-Month Ladder Table</h2>
                    </div>

                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleSavePlan}
                    >
                      Save This Plan
                    </button>
                  </div>

                  <div style={{ marginTop: 18, ...tableWrapStyle() }}>
                    <table style={tableStyle()}>
                      <thead>
                        <tr>
                          <th style={thTdStyle()}>Place Month</th>
                          <th style={thTdStyle()}>Monthly FD Required</th>
                          <th style={thTdStyle()}>Tenure</th>
                          <th style={thTdStyle()}>Rate</th>
                          <th style={thTdStyle()}>Estimated Annual Interest</th>
                          <th style={thTdStyle()}>Estimated Monthly Interest</th>
                          <th style={thTdStyle()}>Cumulative Principal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.monthlyRows.map((row) => (
                          <tr key={row.id}>
                            <td style={thTdStyle()}>{row.placeMonthLabel}</td>
                            <td style={thTdStyle()}>{row.monthlyPlacementLabel}</td>
                            <td style={thTdStyle()}>{row.tenureLabel}</td>
                            <td style={thTdStyle()}>{row.rateLabel}</td>
                            <td style={thTdStyle()}>
                              {row.estimatedAnnualInterestLabel}
                            </td>
                            <td style={thTdStyle()}>
                              {row.estimatedMonthlyInterestLabel}
                            </td>
                            <td style={thTdStyle()}>
                              {row.cumulativePrincipalLabel}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={softBoxStyle()}>
                  <div className="card-kicker">YEAR SUMMARY</div>
                  <h2 style={{ marginTop: 8 }}>Year-by-Year Accumulation</h2>

                  <div style={{ marginTop: 18, ...tableWrapStyle() }}>
                    <table style={tableStyle()}>
                      <thead>
                        <tr>
                          <th style={thTdStyle()}>Year</th>
                          <th style={thTdStyle()}>Total Principal</th>
                          <th style={thTdStyle()}>Estimated Annual Interest</th>
                          <th style={thTdStyle()}>Estimated Monthly Interest</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.yearlyRows.map((row) => (
                          <tr key={row.year}>
                            <td style={thTdStyle()}>{row.year}</td>
                            <td style={thTdStyle()}>{row.totalPrincipalLabel}</td>
                            <td style={thTdStyle()}>
                              {row.estimatedAnnualInterestLabel}
                            </td>
                            <td style={thTdStyle()}>
                              {row.estimatedMonthlyInterestLabel}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "SAVED" && (
          <div style={{ display: "grid", gap: 16 }}>
            {savedPlans.length === 0 ? (
              <div className="empty" style={softBoxStyle()}>
                No saved plans yet.
              </div>
            ) : (
              savedPlans.map((plan) => (
                <div key={plan.id} style={softBoxStyle()}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div className="status-title">
                        {plan.monthlyInterestLabel}/month target
                      </div>
                      <div className="status-subtitle">
                        Target: {plan.targetMonthLabel} · Saved:{" "}
                        {formatDateTime(plan.savedAt || plan.createdAt)}
                      </div>
                    </div>
                    <div className="status-badge">{plan.preference}</div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: 16,
                      marginTop: 16,
                    }}
                  >
                    <div style={softBoxStyle()}>
                      <div className="text-muted">Estimated rate</div>
                      <div style={{ fontWeight: 900, marginTop: 8 }}>
                        {formatPercent(plan.avgRate)}
                      </div>
                    </div>

                    <div style={softBoxStyle()}>
                      <div className="text-muted">Total FD Required</div>
                      <div style={{ fontWeight: 900, marginTop: 8 }}>
                        {plan.principalNeededLabel}
                      </div>
                    </div>

                    <div style={softBoxStyle()}>
                      <div className="text-muted">Monthly FD Required</div>
                      <div style={{ fontWeight: 900, marginTop: 8 }}>
                        {plan.monthlyPlacementLabel}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ marginTop: 14 }}
                    onClick={() => handleDeleteSavedPlan(plan.id)}
                  >
                    Delete Saved Plan
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          marginTop: 28,
        }}
      >
        <div className="content-card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div>
              <div className="card-kicker">ACTION QUEUE</div>
              <h2>What to Do Next</h2>
            </div>
            <div className="text-muted">
              {result ? "3 suggested actions" : "0 suggested actions"}
            </div>
          </div>

          <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
            <div style={softBoxStyle()}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div className="status-title">1. Enter latest FD rates</div>
                <div className="status-badge">High</div>
              </div>
              <div className="status-subtitle" style={{ marginTop: 10 }}>
                Start with real monthly bank rates instead of guessing.
              </div>
            </div>

            <div style={softBoxStyle()}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div className="status-title">2. Set your target monthly interest</div>
                <div className="status-badge">High</div>
              </div>
              <div className="status-subtitle" style={{ marginTop: 10 }}>
                Example: if you want MYR 1,500 monthly interest, enter 1500.
              </div>
            </div>

            <div style={softBoxStyle()}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div className="status-title">3. Review the ladder tables clearly</div>
                <div className="status-badge">Medium</div>
              </div>
              <div className="status-subtitle" style={{ marginTop: 10 }}>
                Check month-by-month placement and year-by-year accumulation.
              </div>
            </div>
          </div>
        </div>

        <div className="content-card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div>
              <div className="card-kicker">ACTIVITY LOG</div>
              <h2>Recent Notes</h2>
            </div>
            <div className="text-muted">Latest actions</div>
          </div>

          <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
            {activityLog.length === 0 ? (
              <div className="empty" style={softBoxStyle()}>
                No activity yet.
              </div>
            ) : (
              activityLog.map((item) => (
                <div key={item.id} style={softBoxStyle()}>
                  <div className="status-title">{item.message}</div>
                  <div className="status-subtitle" style={{ marginTop: 8 }}>
                    {formatDateTime(item.createdAt)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}