import React, { useMemo, useState } from "react";

import CapitalPanel from "../components/dashboard/CapitalPanel";
import AdvisorPanel from "../components/dashboard/AdvisorPanel";
import AuditTrail from "../components/dashboard/AuditTrail";
import ExecutionPanel from "../components/dashboard/ExecutionPanel";
import MaturityAlerts from "../components/dashboard/MaturityAlerts";
import SummaryGrid from "../components/dashboard/SummaryGrid";

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function getAmount(record) {
  return toNumber(
    record?.principal ??
      record?.principal_rm ??
      record?.amount ??
      0
  );
}

function isClosed(record) {
  return String(record?.status || "").toUpperCase() === "CLOSED";
}

function normalizeType(record) {
  return String(record?.recordType || record?.type || "FD")
    .toUpperCase()
    .replace(/\s+/g, "_");
}

function isFD(record) {
  return normalizeType(record) === "FD";
}

function isDeployableRecord(record) {
  const type = normalizeType(record);
  return type === "SAVINGS" || type === "PARKING_CASH";
}

function getMaturityDate(record) {
  return (
    record?.maturityDate ||
    record?.maturity_date ||
    record?.maturity ||
    ""
  );
}

function getMonthKey(dateString) {
  if (!dateString) return "-";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "-";

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

function daysUntil(dateString) {
  if (!dateString) return null;

  const today = new Date();
  const target = new Date(dateString);

  if (Number.isNaN(target.getTime())) return null;

  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  return Math.ceil((target - today) / 86400000);
}

function formatMoney(value, currency = "MYR") {
  return `${currency} ${toNumber(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function getBestOffer(offers = []) {
  const activeOffers = offers.filter((offer) => {
    const status = String(offer?.status || "ACTIVE").toUpperCase();
    return status !== "INACTIVE";
  });

  if (!activeOffers.length) return null;

  return activeOffers.reduce((best, current) => {
    const bestRate = toNumber(best?.ratePa ?? best?.rate ?? 0);
    const currentRate = toNumber(current?.ratePa ?? current?.rate ?? 0);

    return currentRate > bestRate ? current : best;
  }, activeOffers[0]);
}

function getCapitalHealthScore({
  totalPortfolio,
  totalFD,
  deployableFunds,
  reserveAmount,
}) {
  if (!totalPortfolio) {
    return {
      score: 0,
      label: "No portfolio data",
      reasons: [
        "Add FD, Savings or Parking Cash records to activate capital health scoring.",
      ],
    };
  }

  const fdRatio = totalFD / totalPortfolio;
  const liquidityRatio = deployableFunds / totalPortfolio;
  const reserveGap =
    deployableFunds >= reserveAmount
      ? 1
      : deployableFunds / Math.max(reserveAmount, 1);

  let score = 70;
  const reasons = [];

  if (fdRatio > 0.9) {
    score -= 20;
    reasons.push("FD concentration is above 90%. Liquidity may be too tight.");
  } else if (fdRatio >= 0.55 && fdRatio <= 0.85) {
    score += 10;
    reasons.push("FD allocation is within a balanced portfolio range.");
  }

  if (liquidityRatio < 0.05) {
    score -= 15;
    reasons.push("Liquidity ratio is below 5% of total portfolio.");
  } else if (liquidityRatio >= 0.08) {
    score += 10;
    reasons.push("Liquidity buffer is healthy relative to total capital.");
  }

  if (reserveGap < 1) {
    score -= 15;
    reasons.push("Deployable funds are below the reserve target.");
  } else {
    reasons.push("Reserve target is currently covered.");
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  let label = "Stable";
  if (finalScore >= 80) label = "Healthy";
  else if (finalScore >= 60) label = "Watch";
  else if (finalScore > 0) label = "Needs Attention";

  return {
    score: finalScore,
    label,
    reasons,
  };
}

  export default function DashboardPage({
  records = [],
  offers = [],
  currency = "MYR",
  settings = {},
  onUndoExecution,
  onAddRecord,
  onDeleteRecord,
}) {
  const [reserveAmount, setReserveAmount] = useState(
    toNumber(settings?.reserveAmount ?? 0)
  );

  const [toastMessage, setToastMessage] = useState("");

  const safeRecords = Array.isArray(records) ? records : [];
  const safeOffers = Array.isArray(offers) ? offers : [];

  const activeRecords = useMemo(
    () => safeRecords.filter((record) => !isClosed(record)),
    [safeRecords]
  );

  const activeFDRecords = useMemo(
    () => activeRecords.filter((record) => isFD(record)),
    [activeRecords]
  );

  const deployableRecords = useMemo(
    () => activeRecords.filter((record) => isDeployableRecord(record)),
    [activeRecords]
  );

  const totalActivePortfolio = useMemo(
    () =>
      activeRecords.reduce(
        (sum, record) => sum + getAmount(record),
        0
      ),
    [activeRecords]
  );


  const totalFixedDeposits = useMemo(
    () =>
      activeFDRecords.reduce(
        (sum, record) => sum + getAmount(record),
        0
      ),
    [activeFDRecords]
  );

    const totalSavings = useMemo(
      () =>
        activeRecords
          .filter(
            (record) => normalizeType(record) === "SAVINGS"
          )
          .reduce(
            (sum, record) => sum + getAmount(record),
            0
          ),
      [activeRecords]
    );

    const totalParkingCash = useMemo(
      () =>
        activeRecords
          .filter(
            (record) =>
              normalizeType(record) === "PARKING_CASH"
          )
          .reduce(
            (sum, record) => sum + getAmount(record),
            0
          ),
      [activeRecords]
    );

  const totalDeployableFunds = useMemo(
    () =>
      deployableRecords.reduce(
        (sum, record) => sum + getAmount(record),
        0
      ),
    [deployableRecords]
  );

  const maturityMap = useMemo(() => {
    const map = {};

    activeFDRecords.forEach((record) => {
      const key = getMonthKey(getMaturityDate(record));

      if (key === "-") return;

      map[key] = (map[key] || 0) + getAmount(record);
    });

    return map;
  }, [activeFDRecords]);

  const maturityMonths = useMemo(() => {
    return Object.entries(maturityMap)
      .map(([month, amount]) => ({
        month,
        amount,
        totalPrincipal: amount,
        totalFdAmount: amount,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [maturityMap]);

  const strongestMonth = useMemo(() => {
    if (!maturityMonths.length) return null;

    return maturityMonths.reduce(
      (best, item) => (item.amount > best.amount ? item : best),
      maturityMonths[0]
    );
  }, [maturityMonths]);

  const weakestMonth = useMemo(() => {
    if (!maturityMonths.length) return null;

    return maturityMonths.reduce(
      (weak, item) => (item.amount < weak.amount ? item : weak),
      maturityMonths[0]
    );
  }, [maturityMonths]);

  const upcomingMaturityAmount = useMemo(() => {
    return activeFDRecords.reduce((sum, record) => {
      const days = daysUntil(getMaturityDate(record));

      if (days !== null && days >= 0 && days <= 30) {
        return sum + getAmount(record);
      }

      return sum;
    }, 0);
  }, [activeFDRecords]);

  const totalDeployableWithUpcoming =
    totalDeployableFunds + upcomingMaturityAmount;

  const idleCash = Math.max(totalDeployableFunds - reserveAmount, 0);
  const liquidityBuffer = totalDeployableFunds;

  const nextTargetMonth = weakestMonth || maturityMonths[0] || null;
  const bestOffer = getBestOffer(safeOffers);

  const capitalHealth = useMemo(
    () =>
      getCapitalHealthScore({
        totalPortfolio: totalActivePortfolio,
        totalFD: totalFixedDeposits,
        deployableFunds: totalDeployableFunds,
        reserveAmount,
      }),
    [
      totalActivePortfolio,
      totalFixedDeposits,
      totalDeployableFunds,
      reserveAmount,
    ]
  );

  const fdRatio = totalActivePortfolio
    ? totalFixedDeposits / totalActivePortfolio
    : 0;

  const capitalSignal = useMemo(() => {
    if (!totalActivePortfolio) {
      return "neutral";
    }

    if (totalDeployableFunds < reserveAmount) {
      return "danger";
    }

    if (fdRatio > 0.9) {
      return "moderate";
    }

    if (idleCash > 0) {
      return "healthy";
    }

    return "stable";
  }, [
    totalActivePortfolio,
    totalDeployableFunds,
    reserveAmount,
    fdRatio,
    idleCash,
  ]);

  const notificationCount = useMemo(() => {
    return activeFDRecords.filter((record) => {
      const days = daysUntil(getMaturityDate(record));
      return days !== null && days <= 7;
    }).length;
  }, [activeFDRecords]);

  const handleExecuteDeployment = () => {
  if (idleCash <= 0) {
    setToastMessage("No deployable idle cash available.");
    return;
  }

  let remainingAmount = idleCash;

  const sourceBreakdown = deployableRecords.map((record) => {
    if (remainingAmount <= 0) return null;

    const availableAmount = getAmount(record);
    const usedAmount = Math.min(availableAmount, remainingAmount);

    remainingAmount -= usedAmount;

    return {
      id: record.id,
      bank: record.bank,
      recordType: normalizeType(record),
      amount: usedAmount,
    };
  }).filter(Boolean);

  const executionRecord = {
    id: `AUTO-${Date.now()}`,
    bank: bestOffer?.bank || "Suggested FD",
    principal: idleCash,
    rate: bestOffer?.rate || 0,
    tenureMonths: bestOffer?.tenureMonths || 6,
    startDate: new Date().toISOString().split("T")[0],

    maturityDate: new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 30 * 6
    )
      .toISOString()
      .split("T")[0],

    status: "ACTIVE",
    tag: "AUTO_EXECUTED",
    recordType: "FD",
    sourceBreakdown,
  };

  onAddRecord?.(executionRecord);

  const auditEntry = {
    id: `AUDIT-${Date.now()}`,
    type: "EXECUTE",
    amount: idleCash,
    currency,
    batchId: executionRecord.id,
    timestamp: new Date().toISOString(),
  };

  const existingAudit = JSON.parse(
    localStorage.getItem("fd_execution_history") || "[]"
  );

  localStorage.setItem(
    "fd_execution_history",
    JSON.stringify([...existingAudit, auditEntry])
  );

  window.dispatchEvent(
    new Event("auditTrailUpdated")
  );

  setToastMessage(
    `Execution completed. ${currency} ${idleCash.toLocaleString()} deployed.`
  );

  setTimeout(() => {
    setToastMessage("");
  }, 3000);
};

  const handleUndoExecution = () => {
  const autoRecords = safeRecords.filter(
    (record) => record.tag === "AUTO_EXECUTED"
  );

  if (!autoRecords.length) {
    setToastMessage("No auto execution to undo.");
    return;
  }

  const latestAutoRecord = autoRecords[autoRecords.length - 1];

  onDeleteRecord?.(latestAutoRecord.id);

(latestAutoRecord.sourceBreakdown || []).forEach(
  (source, index) => {
    onAddRecord?.({
      id: `RESTORE-${Date.now()}-${index}`,
      bank: source.bank || "Recovered Capital",
      principal: source.amount,
      amount: source.amount,
      status: "ACTIVE",
      recordType: source.recordType,
      note: `Restored from undo execution ${latestAutoRecord.id}`,
    });
  }
);

  const auditEntry = {
    id: `AUDIT-${Date.now()}`,
    type: "UNDO",
    amount: getAmount(latestAutoRecord),
    currency,
    batchId: latestAutoRecord.id,
    timestamp: new Date().toISOString(),
  };

  const existingAudit = JSON.parse(
    localStorage.getItem("fd_execution_history") || "[]"
  );

  localStorage.setItem(
    "fd_execution_history",
    JSON.stringify([...existingAudit, auditEntry])
  );

  window.dispatchEvent(
    new Event("auditTrailUpdated")
  );

  setToastMessage(
    `Undo completed. ${currency} ${getAmount(latestAutoRecord).toLocaleString()} reversed.`
  );

  setTimeout(() => {
    setToastMessage("");
  }, 3000);
};

  const summaryItems = [
    {
      label: "Active Portfolio",
      value: formatMoney(totalActivePortfolio, currency),
      note: "Total active capital",
    },
    {
      label: "FD Alerts",
      value: notificationCount,
      note: "Due / upcoming alerts",
    },
    {
      label: "Capital Health",
      value: `${capitalHealth.score}/100`,
      note: capitalHealth.label,
    },
    {
      label: "Best Offer",
      value: bestOffer
        ? `${bestOffer.bank || "Bank"} · ${Number(
            bestOffer.ratePa ?? bestOffer.rate ?? 0
          ).toFixed(2)}%`
        : "No active offer",
      note: bestOffer
        ? `${bestOffer.tenureMonths ?? bestOffer.tenure ?? "-"} months`
        : "Add offer in Rates Center",
    },
  ];

  return (
    <main className="dashboard-page">
      {toastMessage && (
        <div className="toast-message">
          {toastMessage}
        </div>
      )}

      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">FD Wealth Engine</p>

          <h1>Private Banking Console</h1>

          <p className="muted">
            V33.2 Stable Refactor with Capital Intelligence,
            Advisor Panel, Maturity Watch, Execution Panel and Audit Trail.
          </p>
        </div>

        <div className="hero-alert">
          <span>FD Alerts</span>
          <strong>{notificationCount}</strong>
        </div>
      </section>

      <SummaryGrid items={summaryItems} />

      <CapitalPanel
        currency={currency}
        reserveAmount={reserveAmount}
        setReserveAmount={setReserveAmount}
        capitalHealth={capitalHealth}
        formatMoney={formatMoney}
        totalActivePortfolio={totalActivePortfolio}
        totalFixedDeposits={totalFixedDeposits}
        totalSavings={totalSavings}
        totalParkingCash={totalParkingCash}
        totalDeployableFunds={totalDeployableFunds}
        totalDeployableWithUpcoming={totalDeployableWithUpcoming}
        capitalSignal={capitalSignal}
        nextTargetMonth={nextTargetMonth}
        strongestMonth={strongestMonth}
        weakestMonth={weakestMonth}
        idleCash={idleCash}
        liquidityBuffer={liquidityBuffer}
      />

      {/* Dashboard Main Composition Layer */}
      <div className="dashboard-main-grid">
   {/* Left Intelligence Column */}   
  <div className="dashboard-main-side">
    <AdvisorPanel
      currency={currency}
      targetMonth={nextTargetMonth?.month || "-"}
      weakMonth={weakestMonth?.month || "-"}
      deployable={totalDeployableWithUpcoming}
      bestOffer={bestOffer}
    />

    <MaturityAlerts
      records={safeRecords}
      currency={currency}
    />

  <ExecutionPanel
    currency={currency}
    upcomingMaturityAmount={upcomingMaturityAmount}
    idleCash={idleCash}
    onExecute={handleExecuteDeployment}
    onUndoExecution={handleUndoExecution}
  />
  </div>
  {/* Right Governance Column */}
  <AuditTrail />
</div>
</main>
  );
}