import { useMemo, useState } from "react";

const OFFERS_STORAGE_KEY = "fdOffers";

function formatMoney(value, currency = "MYR") {
  const amount = Number(value || 0);
  return `${currency} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function getAmount(record) {
  return Number(record?.principal ?? record?.amount ?? 0);
}

function normalizeRecordType(type) {
  const value = String(type || "").toUpperCase().replace(/\s+/g, "_");
  if (value === "FD") return "FD";
  if (value === "SAVINGS") return "SAVINGS";
  if (value === "CASH") return "PARKING_CASH";
  if (value === "PARKING_CASH") return "PARKING_CASH";
  return "FD";
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

function buildNextMonths(count = 12) {
  const today = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

function buildMonthlyFdSummary(activeFdRecords = []) {
  const map = {};

  activeFdRecords.forEach((record) => {
    const key = monthKey(record.maturityDate);
    if (!key) return;

    if (!map[key]) {
      map[key] = {
        month: key,
        totalFdAmount: 0,
        totalInterest: 0,
        records: [],
      };
    }

    map[key].totalFdAmount += getAmount(record);
    map[key].totalInterest += Number(record.estimatedInterest || 0);
    map[key].records.push(record);
  });

  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
}

function roundTarget(value) {
  if (!value || value <= 0) return 0;
  return Math.round(value / 1000) * 1000;
}

function recommendTarget(totalFd, deployableFunds, monthlySummary, strategyMode) {
  if (totalFd <= 0) return 0;

  const base = totalFd / 12;
  const concentration = monthlySummary.length
    ? Math.max(...monthlySummary.map((m) => m.totalFdAmount))
    : 0;

  let multiplier = 1;
  if (strategyMode === "conservative") multiplier = 0.7;
  if (strategyMode === "balanced") multiplier = 1;
  if (strategyMode === "aggressive") multiplier = 1.25;

  let target = base * multiplier;

  if (deployableFunds > 0) {
    target = Math.max(target, deployableFunds * 0.5);
  }

  if (concentration > base * 2) {
    target = Math.min(target, concentration * 0.6);
  }

  return roundTarget(target);
}

function readOffers() {
  try {
    const raw = localStorage.getItem(OFFERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function getBestActiveOffer(offers, currency) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const active = offers.filter((offer) => {
    const sameCurrency = !offer.currency || offer.currency === currency;
    const isActive = String(offer.status || "ACTIVE").toUpperCase() === "ACTIVE";

    const effectiveUntil = offer.effectiveUntil
      ? new Date(offer.effectiveUntil)
      : null;

    if (effectiveUntil) {
      effectiveUntil.setHours(0, 0, 0, 0);
    }

    const notExpired = !effectiveUntil || effectiveUntil >= today;

    return sameCurrency && isActive && notExpired;
  });

  if (!active.length) return null;

  return active.reduce(
    (best, offer) =>
      Number(offer.ratePa || 0) > Number(best.ratePa || 0) ? offer : best,
    active[0]
  );
}

export default function DashboardPage({
  tabs = {},
  onTabChange,
  currency = "MYR",
  records,
  activeRecords,
  onAddRecord,
  onUpdateRecord,
  onDeleteRecord,
  onUndoExecution,
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [activeView, setActiveView] = useState("summary");
  const [strategyMode, setStrategyMode] = useState("balanced");
  const [customTarget, setCustomTarget] = useState("");
  const [customExecutionAmount, setCustomExecutionAmount] = useState("");
  const [offers] = useState(() => readOffers());

  const safeRecords = Array.isArray(records) ? records : [];
  const safeActiveRecords = Array.isArray(activeRecords)
    ? activeRecords
    : safeRecords.filter(
        (r) => String(r.status || "ACTIVE").toUpperCase() === "ACTIVE"
      );

  const bestOffer = useMemo(
    () => getBestActiveOffer(offers, currency),
    [offers, currency]
  );

  const activeFdRecords = useMemo(
    () =>
      safeActiveRecords.filter(
        (r) => normalizeRecordType(r.recordType) === "FD"
      ),
    [safeActiveRecords]
  );

  const savingsRecords = useMemo(
    () =>
      safeActiveRecords.filter(
        (r) => normalizeRecordType(r.recordType) === "SAVINGS"
      ),
    [safeActiveRecords]
  );

  const parkingCashRecords = useMemo(
    () =>
      safeActiveRecords.filter(
        (r) => normalizeRecordType(r.recordType) === "PARKING_CASH"
      ),
    [safeActiveRecords]
  );

  const totalFixedDeposits = useMemo(
    () => activeFdRecords.reduce((sum, r) => sum + getAmount(r), 0),
    [activeFdRecords]
  );

  const totalSavings = useMemo(
    () => savingsRecords.reduce((sum, r) => sum + getAmount(r), 0),
    [savingsRecords]
  );

  const totalParkingCash = useMemo(
    () => parkingCashRecords.reduce((sum, r) => sum + getAmount(r), 0),
    [parkingCashRecords]
  );



  // =============================
  // V33 – CAPITAL ENGINE
  // =============================
  // =============================
const [reserveAmount, setReserveAmount] = useState(0);

const deployableSavings = Math.max(
  0,
  totalSavings - Number(reserveAmount || 0)
);

const totalDeployableFunds = deployableSavings + totalParkingCash;
 
  const totalActivePortfolio =
    totalFixedDeposits + totalSavings + totalParkingCash;

  const totalInterestEarned = useMemo(
    () =>
      activeFdRecords.reduce(
        (sum, r) => sum + Number(r.estimatedInterest || 0),
        0
      ),
    [activeFdRecords]
  );

  const monthlyFdSummary = useMemo(
    () => buildMonthlyFdSummary(activeFdRecords),
    [activeFdRecords]
  );

  const recommendedTarget = useMemo(
    () =>
      recommendTarget(
        totalFixedDeposits,
        totalDeployableFunds,
        monthlyFdSummary,
        strategyMode
      ),
    [totalFixedDeposits, totalDeployableFunds, monthlyFdSummary, strategyMode]
  );

  const targetAmount =
    strategyMode === "custom"
      ? Number(customTarget || 0)
      : Number(recommendedTarget || 0);

  const hasTarget = targetAmount > 0;

  const monthlyMap = useMemo(() => {
    const map = {};
    monthlyFdSummary.forEach((m) => {
      map[m.month] = m;
    });
    return map;
  }, [monthlyFdSummary]);

  const ladderMonths = useMemo(() => {
    return buildNextMonths(12).map((month) => {
      const data = monthlyMap[month];
      const totalFdAmount = data?.totalFdAmount || 0;
      const totalInterest = data?.totalInterest || 0;
      const recordsList = data?.records || [];
      const gap = hasTarget ? Math.max(targetAmount - totalFdAmount, 0) : 0;

      let status = "NO TARGET";
      if (hasTarget) {
        if (totalFdAmount >= targetAmount) status = "FULL";
        else if (totalFdAmount > 0) status = "PARTIAL";
        else status = "EMPTY";
      } else if (totalFdAmount > 0) {
        status = "BUILT";
      }

      return {
        month,
        target: targetAmount,
        totalFdAmount,
        totalInterest,
        gap,
        records: recordsList,
        status,
      };
    });
  }, [monthlyMap, targetAmount, hasTarget]);

  const todayIso = new Date().toISOString().slice(0, 10);

  const overdueRecords = useMemo(
    () =>
      activeFdRecords
        .map((r) => ({
          ...r,
          overdueDays: daysBetween(r.maturityDate, todayIso),
        }))
        .filter((r) => typeof r.overdueDays === "number" && r.overdueDays > 0),
    [activeFdRecords, todayIso]
  );

  const dueTodayRecords = useMemo(
    () =>
      activeFdRecords.filter((r) => daysBetween(todayIso, r.maturityDate) === 0),
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

  const nextMaturityMonth = monthlyFdSummary[0] || null;

  const largestMaturityMonth = useMemo(() => {
    if (!monthlyFdSummary.length) return null;
    return monthlyFdSummary.reduce(
      (best, item) => (item.totalFdAmount > best.totalFdAmount ? item : best),
      monthlyFdSummary[0]
    );
  }, [monthlyFdSummary]);

  const nextTargetMonth = useMemo(() => {
    if (!hasTarget) return null;
    return (
      ladderMonths.find((m) => m.status === "EMPTY") ||
      ladderMonths.find((m) => m.status === "PARTIAL") ||
      null
    );
  }, [ladderMonths, hasTarget]);

  const upcomingFdAmount = nextMaturityMonth?.totalFdAmount || 0;
  const totalDeployableWithUpcoming = totalDeployableFunds + upcomingFdAmount;

  const aiReason = useMemo(() => {
    if (!activeFdRecords.length) {
      return "Add FD records first. The system will analyze your maturity pattern and recommend a monthly ladder target.";
    }

    if (strategyMode === "custom") {
      return "Custom mode uses your own monthly ladder target. This is best when you already know your personal monthly FD goal.";
    }

    if (strategyMode === "conservative") {
      return "Conservative mode uses a smaller monthly target to reduce pressure and keep more cash flexibility.";
    }

    if (strategyMode === "aggressive") {
      return "Aggressive mode uses a higher monthly target to build stronger monthly maturity coverage faster.";
    }

    return "Balanced mode spreads your current FD portfolio across 12 months and adjusts for deployable cash and maturity concentration.";
  }, [activeFdRecords.length, strategyMode]);

  const bestOfferText = bestOffer
    ? `${bestOffer.bank} · ${bestOffer.tenureMonths}M · ${Number(
        bestOffer.ratePa || 0
      ).toFixed(2)}%`
    : "No active offer yet";
    // ===============================
// V31.4 Execution Timing Engine
// ===============================
const executionPlan = useMemo(() => {
  if (!hasTarget || !nextTargetMonth) return null;

  const gap = nextTargetMonth.gap || 0;
  const nowFunds = totalDeployableFunds || 0;
  const futureFunds = totalDeployableWithUpcoming || 0;

  if (nowFunds >= gap && gap > 0) {
    return {
      action: "EXECUTE_NOW",
      amount: gap,
      source: "Savings + Parking",
      timing: "Today",
      reason:
        "You already have sufficient deployable funds to fill the ladder gap.",
    };
  }

  if (futureFunds >= gap && gap > 0) {
    return {
      action: "WAIT_MATURITY",
      amount: gap,
      source: "Upcoming FD + Cash",
      timing: "After next FD maturity",
      reason:
        "Upcoming FD maturity will unlock sufficient funds. Waiting improves execution efficiency.",
    };
  }

  if (gap > 0) {
    return {
      action: "PARTIAL_BUILD",
      amount: nowFunds,
      source: "Partial build",
      timing: "Start now, complete later",
      reason:
        "Current funds are insufficient. Start partial ladder build and complete after future inflows.",
    };
  }

  return {
    action: "NO_ACTION",
    amount: 0,
    source: "-",
    timing: "-",
    reason: "Ladder already fully covered.",
  };
}, [
  hasTarget,
  nextTargetMonth,
  totalDeployableFunds,
  totalDeployableWithUpcoming,
]);

const getDaysLeft = (dateStr) => {
  if (!dateStr) return null;
  const today = new Date();
  const m = new Date(dateStr);
  if (Number.isNaN(m.getTime())) return null;
  return Math.ceil((m - today) / (1000 * 60 * 60 * 24));
};

const maturityAlerts = safeRecords
  .filter((r) => String(r.recordType || "").toUpperCase() === "FD")
  .filter((r) => r.status !== "CLOSED")
  .map((r) => {
    const daysLeft = getDaysLeft(r.maturityDate);

    let level = null;
    if (daysLeft === 0) level = "🔥 Due Today";
    else if (daysLeft > 0 && daysLeft <= 3) level = "⚠️ Urgent";
    else if (daysLeft > 3 && daysLeft <= 7) level = "📅 Upcoming";

    return { ...r, daysLeft, level };
  })
  .filter((r) => r.level)
  .sort((a, b) => a.daysLeft - b.daysLeft);

const notifications = maturityAlerts.map((r) => ({
  id: `alert-${r.id}`,
  recordId: r.id,
  message: `${r.bank} (${r.id}) matures in ${r.daysLeft} day(s)`,
  level: r.level,
}));

const LADDER_TARGET = 36000;

const monthlyTotals = {};

safeRecords
  .filter((r) => String(r.recordType || "").toUpperCase() === "FD")
  .forEach((r) => {
    if (!r.maturityDate) return;
    const d = new Date(r.maturityDate);
    if (Number.isNaN(d.getTime())) return;

    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyTotals[key] = (monthlyTotals[key] || 0) + Number(r.principal || 0);
  });

const monthlyHeatmap = Object.entries(monthlyTotals).map(([month, amount]) => {
  let strength = "weak";
  if (amount >= LADDER_TARGET) strength = "strong";
  else if (amount >= LADDER_TARGET * 0.7) strength = "balanced";

  return { month, amount, strength };
});

const executionOrders = useMemo(() => {
  if (!executionPlan || !nextTargetMonth) return [];

  let remaining = Math.min(
  executionPlan.amount || 0,
  totalDeployableFunds
);
  if (remaining <= 0) return [];

  if (remaining > 30000) {
    const first = Math.round(remaining * 0.55);
    const second = remaining - first;

  return [
  {
    amount: first,
    label: "Primary placement",
    bank: bestOffer?.bank || "Bank TBD",
    tenureMonths: bestOffer?.tenureMonths || 12,
    ratePa: bestOffer?.ratePa || 0,
    reason: "Place after FD maturity",
  },
  {
    amount: second,
    label: "Secondary placement",
    bank: bestOffer?.bank || "Bank TBD",
    tenureMonths: bestOffer?.tenureMonths || 12,
    ratePa: bestOffer?.ratePa || 0,
    reason: "Balance ladder distribution",
  },
]; 
  }

  return [
  {
    amount: remaining,
    label: "Single placement",
    bank: bestOffer?.bank || "Bank TBD",
    tenureMonths: bestOffer?.tenureMonths || 12,
    ratePa: bestOffer?.ratePa || 0,
    reason: "Direct ladder placement",
  },
];

  }, [executionPlan, nextTargetMonth, totalDeployableFunds]);

  const executePlan = () => {
  console.log("onAddRecord:", onAddRecord);
  console.log("🔥 EXECUTE PLAN TRIGGERED");
  const batchId = `EXE-${new Date().toISOString().slice(0,10).replace(/-/g,"")}-${Date.now()}`;
  console.log("executionOrders:", executionOrders);
  if (!executionOrders.length) {
  setToastMessage("⚠️ No execution order available.");

setTimeout(() => {
  setToastMessage("");
}, 3000);
    return;
  }

  const existingRecords = JSON.parse(
    localStorage.getItem("fd_v315_records") || "[]"
  );

  let nextNumber = existingRecords.length + 1;

  const newRecords = executionOrders.map((order, index) => {
   
    const idNumber = String(nextNumber + index).padStart(3, "0");

    const startDate = new Date().toISOString().slice(0, 10);

    const maturityDate = new Date();
    maturityDate.setMonth(
      maturityDate.getMonth() + Number(order.tenureMonths || 12)
    );

    const maturityDateText = maturityDate.toISOString().slice(0, 10);

    const interest =
      (Number(order.amount || 0) *
        Number(order.ratePa || 0) *
        Number(order.tenureMonths || 12)) /
      12 /
      100;

    return {
      id: `FD${idNumber}`,

      // ✅ 用 recordType（你系统标准）
      recordType: "FD",

      bank: order.bank || "Unknown Bank",
      productName: `${order.tenureMonths || 12}M Placement @ ${Number(order.ratePa || 0).toFixed(2)}%`,
      principal: Number(order.amount || 0),
      rate: Number(order.ratePa || 0),
      tenure: Number(order.tenureMonths || 12),

      startDate,
      maturityDate: maturityDateText,

      estimatedInterest: interest,

      status: "ACTIVE",
      tag: "AUTO_EXECUTED",
      executionBatchId: batchId,
      note: `Auto generated from V32 Execution Engine → ${order.label} | ${order.reason}`,
      
    };
  });
console.log("newRecords:", newRecords);

  newRecords.forEach((record) => {
    onAddRecord?.(record);
});

  setToastMessage("✅ Execution completed. FD records created.");

setTimeout(() => {
  setToastMessage("");
}, 3000);


  if (typeof openRecordsTab === "function") {
    openRecordsTab();
  }
};
const undoLastExecution = () => {
  const autoRecords = safeRecords.filter(
    (r) => r.tag === "AUTO_EXECUTED" && r.executionBatchId
  );

  if (!autoRecords.length) {
    setToastMessage("No execution to undo.");
    return;
  }

  const lastBatchId =
    autoRecords[autoRecords.length - 1].executionBatchId;

  const lastBatchRecords = autoRecords.filter(
    (r) => r.executionBatchId === lastBatchId
  );

  const refundAmount = lastBatchRecords.reduce(
    (sum, r) => sum + Number(r.principal ?? r.amount ?? 0),
    0
  );

  const savingsRecord = safeRecords.find((r) => {
    const type = String(r.recordType || "")
      .toUpperCase()
      .replace(/\s+/g, "_");
    return type === "SAVINGS";
  });

  lastBatchRecords.forEach((r) => {
    onDeleteRecord?.(r.id);
  });

  if (savingsRecord) {
    const currentAmount = Number(
      savingsRecord.principal ?? savingsRecord.amount ?? 0
    );

    onUpdateRecord?.({
      ...savingsRecord,
      principal: currentAmount + refundAmount,
      amount: currentAmount + refundAmount,
      status: "ACTIVE",
    });
  }

  setToastMessage(
    `Undo completed. MYR ${refundAmount.toLocaleString()} returned to Savings.`
  );

  setTimeout(() => {
    setToastMessage("");
  }, 3000);
};

const aiSuggestion = useMemo(() => {
  const offerLine = bestOffer
    ? ` Current best rate awareness: ${bestOffer.bank} ${
        bestOffer.tenureMonths
      }M at ${Number(bestOffer.ratePa || 0).toFixed(2)}%.`
    : " Add bank offers in Rates Center for better rate awareness.";

  const executionBlock = executionPlan
    ? `

👉 Execution Plan:
📅 ${executionPlan.timing}
💰 ${formatMoney(executionPlan.amount, currency)}
🏦 ${executionPlan.source}

🧠 ${executionPlan.reason}
`
    : "";

  // ✅ 1. 完全没有 FD
  if (!activeFdRecords.length) {
    return `Start building your FD ladder.

👉 Action:
Use any available funds (Savings / Parking Cash).

👉 Strategy:
Focus on building monthly maturity structure first.

👉 Important:
Do NOT lock bank, rate or tenure yet.${executionBlock}${offerLine}`;
  }

  // ✅ 2. 没 target
  if (!hasTarget) {
    return `Set a monthly ladder target to activate timing-aware advice.

👉 Strategy:
Define how much FD should mature every month before making placement decisions.${executionBlock}${offerLine}`;
  }

  // ✅ 3. 有 gap
  if (nextTargetMonth) {
    // ❌ 钱不够
    if (totalDeployableWithUpcoming < nextTargetMonth.gap) {
      return `Target Month: ${nextTargetMonth.month}
Gap: ${formatMoney(nextTargetMonth.gap, currency)}

👉 Action:
WAIT.

👉 Reason:
Your funds are not enough yet.

👉 Strategy:
Wait for upcoming FD maturity or new savings.

👉 Important:
Do NOT lock rate/tenure early.${executionBlock}${offerLine}`;
    }

    // ✅ 钱够 → 可以做
    if (totalDeployableFunds >= nextTargetMonth.gap) {
      return `Target Month: ${nextTargetMonth.month}
Gap: ${formatMoney(nextTargetMonth.gap, currency)}

👉 Action:
You may consider placing FD soon.

👉 Strategy:
Choose best rate ONLY at placement time.

👉 Important:
Rates change. Do not pre-lock decision.${executionBlock}${offerLine}`;
    }

    // ⚠️ 半够
    return `Target Month: ${nextTargetMonth.month}
Gap: ${formatMoney(nextTargetMonth.gap, currency)}

👉 Action:
Partially ready.

👉 Strategy:
Combine Savings + Parking + Upcoming FD before placing.${executionBlock}${offerLine}`;
  }

  // ✅ 已覆盖
  return `Your FD ladder is balanced.

👉 Strategy:
Maintain structure and optimize future placements using latest rates.${executionBlock}${offerLine}`;
}, [
  hasTarget,
  nextTargetMonth,
  totalDeployableFunds,
  totalDeployableWithUpcoming,
  activeFdRecords,
  currency,
  bestOffer,
  executionPlan,
]);
  const topSignals = useMemo(() => {
    const list = [];

    if (nextMaturityMonth) {
      list.push({
        title: "Next Maturity",
        text: `${nextMaturityMonth.month} · ${formatMoney(
          nextMaturityMonth.totalFdAmount,
          currency
        )}`,
        tone: "blue",
      });
    }

    if (bestOffer) {
      list.push({
        title: "Best Active Offer",
        text: `${bestOffer.bank} · ${bestOffer.tenureMonths}M · ${Number(
          bestOffer.ratePa || 0
        ).toFixed(2)}%`,
        tone: "green",
      });
    }

    if (largestMaturityMonth) {
      list.push({
        title: "Largest Maturity Month",
        text: `${largestMaturityMonth.month} · ${formatMoney(
          largestMaturityMonth.totalFdAmount,
          currency
        )}`,
        tone: "orange",
      });
    }

    if (hasTarget && nextTargetMonth) {
      list.push({
        title: "Next Ladder Target",
        text: `${nextTargetMonth.month} · Gap ${formatMoney(
          nextTargetMonth.gap,
          currency
        )}`,
        tone: nextTargetMonth.status === "EMPTY" ? "orange" : "blue",
      });
    }

    if (totalDeployableFunds > 0) {
      list.push({
        title: "Deployable Funds",
        text: `${formatMoney(totalDeployableFunds, currency)} available`,
        tone: "green",
      });
    }

    if (!list.length) {
      list.push({
        title: "Start Ladder",
        text: "Add FD records and choose a strategy mode.",
        tone: "blue",
      });
    }

    return list.slice(0, 5);
  }, [
    nextMaturityMonth,
    bestOffer,
    largestMaturityMonth,
    hasTarget,
    nextTargetMonth,
    totalDeployableFunds,
    currency,
  ]);

  const openRecordsTab = () => {
    if (onTabChange && tabs.RECORDS) onTabChange(tabs.RECORDS);
  };

  const openMoreTab = () => {
    if (onTabChange && tabs.MORE) onTabChange(tabs.MORE);
  };

  const notificationCount = overdueRecords.length + dueTodayRecords.length;
  const grandTotal = totalActivePortfolio || 1;

  return (
    <div className="page bank-dashboard-page"> 
      <section className="hero-card bank-hero dashboard-hero">
        <div className="hero-left">
          <div className="hero-badge">FD WEALTH ENGINE</div>
          <h1 className="bank-title">Private Banker Ladder Engine</h1>
          <p className="bank-subtitle">
            Build a monthly FD ladder using FD maturity, savings reserve,
            parking cash and live rate offers.
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
        {["summary", "ladder", "alerts", "analytics"].map((tab) => (
          <button
            key={tab}
            className={`tab-chip tab-btn ${activeView === tab ? "active" : ""}`}
            onClick={() => setActiveView(tab)}
          >
            {tab === "summary"
              ? "Summary"
              : tab === "ladder"
              ? "Ladder"
              : tab === "alerts"
              ? "Alerts" 
              : "Analytics"}
          </button>
        ))}
      </div>

      {activeView === "summary" && (
        <>
          <section className="bank-panel" style={{ marginBottom: 24 }}>
            <div className="bank-panel-head">
              <div>
                <div className="panel-kicker">PRIVATE BANKER AI</div>
                <h3>Strategy Mode & Ladder Target</h3>
              </div>
              <small>Connected to Rates Center</small>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 16,
              }}
            >
              <div className="field">
                <label>Strategy Mode</label>
                <select
                  className="input"
                  value={strategyMode}
                  onChange={(e) => setStrategyMode(e.target.value)}
                >
                  <option value="conservative">Conservative</option>
                  <option value="balanced">Balanced</option>
                  <option value="aggressive">Aggressive</option>
                  <option value="custom">Custom</option>
                </select>
                <small
                  style={{ color: "#7b87a8", display: "block", marginTop: 8 }}
                >
                  Choose how fast you want to build your ladder.
                </small>
              </div>

              <div className="field">
                <label>
                  {strategyMode === "custom"
                    ? `Custom Target (${currency})`
                    : `Recommended Target (${currency})`}
                </label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="e.g. 10000"
                  value={
                    strategyMode === "custom" ? customTarget : recommendedTarget
                  }
                  disabled={strategyMode !== "custom"}
                  onChange={(e) => setCustomTarget(e.target.value)}
                />
                <small
                  style={{ color: "#7b87a8", display: "block", marginTop: 8 }}
                >
                  {strategyMode === "custom"
                    ? "Enter your own monthly ladder target."
                    : "Auto-calculated from FD size and maturity pattern."}
                </small>
              </div>

              <div className="metric-box summary-card dashboard-stat-card">
                <span>TARGET MONTH</span>
                <strong className="metric-value">
                  {!hasTarget
                    ? "Set target"
                    : nextTargetMonth
                    ? nextTargetMonth.month
                    : "Covered"}
                </strong>
                <small>
                  {!hasTarget
                    ? "No target detected"
                    : nextTargetMonth
                    ? `Gap ${formatMoney(nextTargetMonth.gap, currency)}`
                    : "No gap detected"}
                </small>
              </div>
            </div>

            <div className="signal-card tone-blue" style={{ marginTop: 18 }}>
              <h4>Why this target?</h4>
              <p>{aiReason}</p>
            </div>

            <div className="signal-card tone-green" style={{ marginTop: 18 }}>
              <h4>Best Active Offer</h4>
              <p>{bestOfferText}</p>
              <p>
                {bestOffer
                  ? `Minimum: ${formatMoney(
                      bestOffer.minAmount,
                      bestOffer.currency
                    )} · Effective until: ${
                      bestOffer.effectiveUntil || "Not specified"
                    }`
                  : "Go to More → Rates Center to add FD offers."}
              </p>
            </div>
          </section>

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

            <div className="metric-box summary-card dashboard-stat-card">
              <span>TOTAL DEPLOYABLE</span>
              <strong className="metric-value">
                {formatMoney(totalDeployableWithUpcoming, currency)}
              </strong>
              <small>Savings + Parking + Upcoming FD</small>
            </div>
          </div>

          <div className="dashboard-two-col">
            <section className="bank-panel advisor-focus">
  <div className="bank-panel-head">
    <div>
      <div className="panel-kicker">AI ADVISOR FOCUS</div>
      <h3>Top Signals</h3>
    </div>
    <small>Based on ladder + rates</small>
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

  {/* 🔥 Maturity Alerts */}
  <div
    className={`signal-card ${
      maturityAlerts.some(a => a.daysLeft <= 3)
        ? "tone-red"
        : maturityAlerts.length > 0
        ? "tone-orange"
        : "tone-blue"
    }`}
  >
    <h4>🔔 Maturity Alerts</h4>

    {maturityAlerts.length === 0 ? (
      <p>No FD maturity within 7 days.</p>
    ) : (
      maturityAlerts.map((alert) => (
        <div key={alert.id}>
          <strong>{alert.level}</strong>
          <div>
            {alert.id} · {alert.bank} · {alert.daysLeft} day(s)
          </div>
        </div>
      ))
    )}
  </div>
</div>                 
</section>

<section className="bank-panel immediate-action">
  <div className="bank-panel-head">
    <div>
      <div className="panel-kicker">AI SUGGESTION</div>
      <h3>Next FD Action</h3>
    </div>
    <small>Build the next weak month</small>
  </div>

  <div className="action-card execution-snapshot-card tone-orange">
    <h4>Your next FD target</h4>
    <p>{aiSuggestion}</p>

    {executionPlan && (
      <div className="signal-card tone-green" style={{ marginTop: 12 }}>
        <h4>Execution Plan</h4>

        {executionOrders.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <h4 style={{ marginBottom: 8 }}>
            Suggested Execution Amount
            </h4>
            {executionOrders.map((order, i) => (
              <div
                key={i}
                style={{
                  padding: "14px",
                  borderRadius: 12,
                  background: "#0b1d3a",
                  color: "#fff",
                  marginBottom: 10,
                  boxShadow: "0 6px 14px rgba(0,0,0,0.2)",
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                 {i === 0
                   ? "SUGGESTED ORDER"
                   : "SECONDARY SUGGESTION"}
                </div>

                <div style={{ fontSize: 14, marginTop: 4 }}>
                  🏦 {bestOffer?.bank || "Bank TBD"} ·{" "}
                  {bestOffer?.tenureMonths || "-"}M
                </div>

                <div style={{ fontSize: 22, fontWeight: 600, marginTop: 6 }}>
                  {formatMoney(order.amount, currency)}
                </div>

                <div style={{ fontSize: 12, marginTop: 6, opacity: 0.7 }}>
              {i === 0
                ? "→ Review and choose your final amount before confirming"
                : "→ Optional split suggestion"}    
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 10, marginTop: 14, marginBottom: 14 }}>
   <button
  className="primary-btn"
  onClick={() => {
    setCustomExecutionAmount(String(executionPlan?.amount || ""));
    setShowConfirm(true);
  }}
>
  Review & Execute
</button>     



<button
  className="btn-secondary"
  onClick={undoLastExecution}
>
  Undo Last Execution
</button>
</div>
        <p>📅 Action Timing: {executionPlan.timing}</p>
        <p>💰 Suggested Amount: {formatMoney(executionPlan.amount, currency)}</p>
        <p>🏦 Source: {executionPlan.source}</p>

        {bestOffer && (
          <p>
            📊 Suggested Rate: {bestOffer.bank} · {bestOffer.tenureMonths}M ·{" "}
            {Number(bestOffer.ratePa).toFixed(2)}%
          </p>
        )}

        <p style={{ marginTop: 6 }}>🧠 {executionPlan.reason}</p>
      </div>
    )}

    <div className="projection-note">
      Savings: {formatMoney(totalSavings, currency)}
    </div>

    <div className="projection-note">
      Parking Cash: {formatMoney(totalParkingCash, currency)}
    </div>

    <div className="projection-note">
      Upcoming FD: {formatMoney(upcomingFdAmount, currency)}
    </div>

    <div className="projection-note">
      Best Offer: {bestOfferText}
    </div>

    <button className="primary-btn" onClick={openRecordsTab}>
      Open Records
    </button>
  </div>
</section>
          </div>
        </>
      )}

      {activeView === "ladder" && (
        <section className="bank-panel">
          <div className="bank-panel-head">
            <div>
              <div className="panel-kicker">MONTHLY LADDER STATUS</div>
              <h3>12-Month Ladder Coverage</h3>
            </div>
            <small>
              {hasTarget
                ? `Target: ${formatMoney(targetAmount, currency)}`
                : "No target set"}
            </small>
          </div>

          <div className="projection-list">
            {ladderMonths.map((item) => (
              <div key={item.month} className="projection-card">
                <div className="projection-month">
                  {item.month}{" "}
                  {!hasTarget
                    ? item.totalFdAmount > 0
                      ? "✔ Built"
                      : "○ No Target"
                    : item.status === "FULL"
                    ? "✔ Full"
                    : item.status === "PARTIAL"
                    ? "⚠ Partial"
                    : "❌ Gap"}
                </div>

                <div className="projection-note">
                  Total FD Amount: {formatMoney(item.totalFdAmount, currency)}
                </div>

                <div className="projection-note">
                  Target:{" "}
                  {hasTarget ? formatMoney(item.target, currency) : "Not set"}
                </div>

                <div className="projection-note">
                  Gap: {hasTarget ? formatMoney(item.gap, currency) : "-"}
                </div>

                <div className="projection-note">
                  Total Interest Earned:{" "}
                  {formatMoney(item.totalInterest, currency)}
                </div>

                <div className="projection-note">
                  FD Records: {item.records.length}
                </div>

                <div className="projection-note">
                  FD IDs:{" "}
                  {item.records.length
                    ? item.records.map((r) => r.id).filter(Boolean).join(", ")
                    : "-"}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeView === "alerts" && (
        <section className="bank-panel">
          <div className="bank-panel-head">
            <div>
              <div className="panel-kicker">NOTIFICATION CENTER</div>
              <h3>Maturity Monitoring</h3>
            </div>
            <small>FD records only</small>
          </div>

          <div className="alerts-grid">
            {[
              ["Overdue", overdueRecords],
              ["Today", dueTodayRecords],
              ["Due in 7 Days", dueIn7DaysRecords],
              ["Due in 30 Days", dueIn30DaysRecords],
            ].map(([title, list]) => (
              <div className="alert-box" key={title}>
                <div className="alert-box-head">
                  <h4>{title}</h4>
                  <span>{list.length}</span>
                </div>

                {list.length ? (
                  list.map((r) => (
                    <div key={r.id} className="alert-record">
                      <strong>
                        {r.bank || "FD"} · {r.id || "No ID"}
                      </strong>
                      <div className="alert-sub">{r.productName || "-"}</div>
                      <div className="alert-row">
                        <small>{r.maturityDate || "-"}</small>
                        <strong>{formatMoney(getAmount(r), currency)}</strong>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="alert-empty">No data</div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {activeView === "analytics" && (
        <>
          <section className="bank-panel">
            <div className="bank-panel-head">
              <div>
                <div className="panel-kicker">MONTHLY FD SUMMARY</div>
                <h3>Next Maturity Summary</h3>
              </div>
              <small>Monthly FD amount + interest</small>
            </div>

            <div className="projection-list">
              {monthlyFdSummary.length ? (
                monthlyFdSummary.map((item) => (
                  <div key={item.month} className="projection-card">
                    <div className="projection-month">📅 {item.month}</div>

                    <div className="projection-note">
                      Total FD Amount:{" "}
                      {formatMoney(item.totalFdAmount, currency)}
                    </div>

                    <div className="projection-note">
                      Total Interest Earned:{" "}
                      {formatMoney(item.totalInterest, currency)}
                    </div>

                    <div className="projection-note">
                      FD Records: {item.records.length}
                    </div>

                    <div className="projection-note">
                      FD IDs:{" "}
                      {item.records.map((r) => r.id).filter(Boolean).join(", ")}
                    </div>
                  </div>
                ))
              ) : (
                <div className="signal-card tone-blue">
                  <h4>No FD maturity data yet</h4>
                  <p>Add FD records with maturity dates to see monthly summary.</p>
                </div>
              )}
            </div>
          </section>

          <section className="bank-panel" style={{ marginTop: 24 }}>
            <div className="bank-panel-head">
              <div>
                <div className="panel-kicker">ALLOCATION CHART</div>
                <h3>Portfolio Allocation</h3>
              </div>
              <small>FD / Savings / Parking Cash</small>
            </div>

            <div className="allocation-list">
              <div className="allocation-row">
                <span>FD</span>
                <div className="allocation-bar">
                  <div
                    className="allocation-fill blue"
                    style={{
                      width: `${(totalFixedDeposits / grandTotal) * 100}%`,
                    }}
                  />
                </div>
                <strong>{formatMoney(totalFixedDeposits, currency)}</strong>
              </div>

              <div className="allocation-row">
                <span>Savings</span>
                <div className="allocation-bar">
                  <div
                    className="allocation-fill purple"
                    style={{
                      width: `${(totalSavings / grandTotal) * 100}%`,
                    }}
                  />
                </div>
                <strong>{formatMoney(totalSavings, currency)}</strong>
              </div>

              <div className="allocation-row">
                <span>Parking Cash</span>
                <div className="allocation-bar">
                  <div
                    className="allocation-fill green"
                    style={{
                      width: `${(totalParkingCash / grandTotal) * 100}%`,
                    }}
                  />
                </div>
                <strong>{formatMoney(totalParkingCash, currency)}</strong>
              </div>
            </div>
          </section>
        </>
      )}
{showConfirm && (
  <div className="confirm-overlay">
    <div className="confirm-modal">
      <h3>Confirm Execution</h3>

      <div style={{ marginBottom: 14 }}>
        <strong>Available Deployable Funds</strong>
        <div>{formatMoney(totalDeployableFunds, currency)}</div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <strong>Suggested Amount</strong>
        <div>{formatMoney(executionPlan?.amount || 0, currency)}</div>
      </div>

      <div className="field" style={{ marginTop: 12 }}>
        <label>Execution Amount ({currency})</label>
        <input
          className="input"
          type="number"
          min="0"
          step="100"
          value={customExecutionAmount}
          onChange={(e) => setCustomExecutionAmount(e.target.value)}
          placeholder="Example: 5000"
        />
        <small style={{ color: "#7b87a8", display: "block", marginTop: 8 }}>
          You can execute any amount within your available Savings / Parking Cash.
        </small>
      </div>

      <div style={{ marginTop: 14 }}>
        <strong>FD Preview</strong>
        <div>
          {formatMoney(Number(customExecutionAmount || 0), currency)} ·{" "}
          {bestOffer?.tenureMonths || 12}M ·{" "}
          {Number(bestOffer?.ratePa || 0).toFixed(2)}%
        </div>
      </div>

      <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
        <button
          className="primary-btn"
          onClick={() => {
            const amount = Number(customExecutionAmount || 0);

            if (amount <= 0) {
              setToastMessage("⚠️ Please enter a valid execution amount.");
              setTimeout(() => setToastMessage(""), 3000);
              return;
            }

            if (amount > totalDeployableFunds) {
              setToastMessage("⚠️ Amount cannot exceed available deployable funds.");
              setTimeout(() => setToastMessage(""), 3000);
              return;
            }

            const customOrder = {
              amount,
              label: "Custom placement",
              bank: bestOffer?.bank || "Bank TBD",
              tenureMonths: bestOffer?.tenureMonths || 12,
              ratePa: bestOffer?.ratePa || 0,
              reason: "Custom flexible execution amount",
            };

            const originalOrders = executionOrders;
            executionOrders.length = 0;
            executionOrders.push(customOrder);

            executePlan();

            executionOrders.length = 0;
            originalOrders.forEach((o) => executionOrders.push(o));

            setShowConfirm(false);
          }}
        >
          Confirm
        </button>

        <button className="btn-secondary" onClick={() => setShowConfirm(false)}>
          Cancel
        </button>
      </div>
    </div>
  </div>
)}

{toastMessage && (
  <div className="toast-success">
    {toastMessage}
  </div>
)}
    </div>
  );
}