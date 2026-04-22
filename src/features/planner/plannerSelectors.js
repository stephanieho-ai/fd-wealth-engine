import { calcMaturityAmount } from "../../utils/finance";
import { TARGET_MONTHS } from "../../data/targets";

function getMonthKey(dateStr) {
  if (!dateStr) return null;
  return String(dateStr).slice(0, 7);
}

function getSafeDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getDaysFromToday(dateStr) {
  const d = getSafeDate(dateStr);
  if (!d) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(d);
  target.setHours(0, 0, 0, 0);

  return Math.floor((target - today) / (1000 * 60 * 60 * 24));
}

function getRecordProjectedAmount(record) {
  if (!record) return 0;

  if (record.type === "FD") {
    return calcMaturityAmount(
      Number(record.principal || 0),
      Number(record.rate || 0),
      Number(record.tenureMonths || 0)
    );
  }

  return Number(record.principal || 0);
}

function getDeployableFunds(records = []) {
  return records
    .filter((r) => r.status !== "CLOSED")
    .filter((r) => r.type === "Savings" || r.type === "Parking Cash")
    .reduce((sum, r) => sum + Number(r.principal || 0), 0);
}

export function buildMonthlyProjection(records = []) {
  const map = {};

  TARGET_MONTHS.forEach((m) => {
    map[m.month] = {
      target: Number(m.target || 0),
      actual: 0,
    };
  });

  records.forEach((record) => {
    if (!record.maturityDate) return;

    const month = getMonthKey(record.maturityDate);
    if (!month) return;

    if (!map[month]) {
      map[month] = {
        target: 0,
        actual: 0,
      };
    }

    map[month].actual += getRecordProjectedAmount(record);
  });

  return map;
}

export function analyzeMonths(projection = {}) {
  const all = Object.entries(projection)
    .map(([month, data]) => ({
      month,
      target: Number(data.target || 0),
      actual: Number(data.actual || 0),
      gap: Number(data.target || 0) - Number(data.actual || 0),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const weak = all
    .filter((m) => m.gap > 0)
    .sort((a, b) => b.gap - a.gap);

  const strong = all
    .filter((m) => m.gap < 0)
    .sort((a, b) => a.gap - b.gap);

  return { all, weak, strong };
}

export function pickBestOffer(offers = []) {
  if (!offers.length) return null;

  return [...offers].sort((a, b) => {
    const rateDiff = Number(b.rate || 0) - Number(a.rate || 0);
    if (rateDiff !== 0) return rateDiff;
    return Number(b.tenureMonths || 0) - Number(a.tenureMonths || 0);
  })[0];
}

export function findUpcoming(records = []) {
  return records
    .filter((record) => record.maturityDate)
    .map((record) => ({
      ...record,
      days: getDaysFromToday(record.maturityDate),
      maturityAmount: getRecordProjectedAmount(record),
    }))
    .filter((record) => record.days !== null && record.days >= -30 && record.days <= 30)
    .sort((a, b) => a.days - b.days);
}

function buildNotifications(records = []) {
  const fdRecords = records
    .filter((record) => record.type === "FD" && record.maturityDate)
    .map((record) => ({
      ...record,
      days: getDaysFromToday(record.maturityDate),
      maturityAmount: getRecordProjectedAmount(record),
    }))
    .filter((record) => record.days !== null);

  const overdue = [];
  const today = [];
  const due7 = [];
  const due30 = [];

  fdRecords.forEach((record) => {
    if (record.days < 0) overdue.push(record);
    else if (record.days === 0) today.push(record);
    else if (record.days <= 7) due7.push(record);
    else if (record.days <= 30) due30.push(record);
  });

  overdue.sort((a, b) => a.days - b.days);
  today.sort((a, b) => a.bank.localeCompare(b.bank));
  due7.sort((a, b) => a.days - b.days);
  due30.sort((a, b) => a.days - b.days);

  return {
    overdue,
    today,
    due7,
    due30,
    total: overdue.length + today.length + due7.length + due30.length,
  };
}

function buildAutoFDEngine({ weak, strong, bestOffer, records }) {
  const deployableFunds = getDeployableFunds(records);
  const plan = [];

  if (!bestOffer || deployableFunds <= 0 || weak.length === 0) {
    return {
      deployableFunds,
      remainingFunds: deployableFunds,
      recommendedOffer: bestOffer,
      placements: [],
      summary: "No auto placement plan can be generated yet.",
    };
  }

  let remaining = deployableFunds;

  weak.slice(0, 3).forEach((monthRow, index) => {
    if (remaining <= 0) return;

    const suggestedAmount = Math.min(remaining, Math.max(0, monthRow.gap));
    if (suggestedAmount <= 0) return;

    plan.push({
      id: `AUTO-${index + 1}`,
      month: monthRow.month,
      amount: suggestedAmount,
      bank: bestOffer.bank,
      productName: bestOffer.productName || "Deposit Product",
      tenureMonths: bestOffer.tenureMonths,
      rate: bestOffer.rate,
      note: `Auto placement suggestion for ${monthRow.month}`,
      offerId: bestOffer.id,
    });

    remaining -= suggestedAmount;
  });

  const strongMonth = strong[0]?.month || null;

  return {
    deployableFunds,
    remainingFunds: remaining,
    recommendedOffer: bestOffer,
    placements: plan,
    summary:
      plan.length > 0
        ? `Generated ${plan.length} suggested placement(s) using ${bestOffer.bank} ${bestOffer.tenureMonths}M @ ${bestOffer.rate}%.${strongMonth ? ` Avoid adding to ${strongMonth}.` : ""}`
        : "No valid placement generated.",
  };
}

export function buildAdvisor({ records = [], offers = [] }) {
  const projection = buildMonthlyProjection(records);
  const { all, weak, strong } = analyzeMonths(projection);
  const bestOffer = pickBestOffer(offers);
  const upcoming = findUpcoming(records);
  const notifications = buildNotifications(records);
  const autoFD = buildAutoFDEngine({
    weak,
    strong,
    bestOffer,
    records,
  });

  const actions = [];
  if (upcoming.length > 0) {
    const r = upcoming[0];
    actions.push({
      type:
        r.days < 0
          ? "urgent"
          : r.days === 0
          ? "today"
          : r.days <= 7
          ? "warning"
          : "info",
      title: "Maturity Alert",
      message:
        r.days < 0
          ? `${r.bank} is overdue by ${Math.abs(r.days)} day(s)`
          : r.days === 0
          ? `${r.bank} matures today`
          : `${r.bank} matures in ${r.days} day(s)`,
    });
  }

  if (weak.length > 0 && bestOffer) {
    const m = weak[0];
    actions.push({
      type: "opportunity",
      title: `Fill ${m.month}`,
      message: `Gap ${m.gap.toFixed(0)} → Use ${bestOffer.bank} ${bestOffer.tenureMonths}M @ ${bestOffer.rate}%`,
    });
  }

  if (strong.length > 0) {
    const m = strong[0];
    actions.push({
      type: "warning",
      title: `Overfunded ${m.month}`,
      message: `Excess ${Math.abs(m.gap).toFixed(0)} → Avoid adding more`,
    });
  }

  const execution = [
    ...(upcoming[0]
      ? [
          {
            bucket: "today",
            tone: upcoming[0].days < 0 ? "urgent" : "warning",
            title:
              upcoming[0].days < 0
                ? "Handle overdue maturity"
                : "Prepare upcoming maturity",
            body:
              upcoming[0].days < 0
                ? `${upcoming[0].bank} ${upcoming[0].id} is overdue by ${Math.abs(upcoming[0].days)} day(s).`
                : `${upcoming[0].bank} ${upcoming[0].id} matures in ${upcoming[0].days} day(s).`,
            primaryLabel: "Open Records",
            actionType: "open_records",
            payload: { recordId: upcoming[0].id },
            secondaryLabel: "Close FD",
            secondaryActionType: "close_record",
            secondaryPayload: { recordId: upcoming[0].id },
          },
        ]
      : []),

    ...(weak[0] && bestOffer
      ? [
          {
            bucket: "month",
            tone: "opportunity",
            title: `Fund weakest month ${weak[0].month}`,
            body: `Gap ${weak[0].gap.toFixed(0)} → Consider ${bestOffer.bank} ${bestOffer.tenureMonths}M @ ${bestOffer.rate}%.`,
            primaryLabel: "Open Planner",
            actionType: "open_planner",
            payload: { month: weak[0].month },
            secondaryLabel: "Open Auto FD",
            secondaryActionType: "open_auto_fd",
            secondaryPayload: {},
          },
        ]
      : []),

    ...(autoFD.placements.length > 0
      ? [
          {
            bucket: "month",
            tone: "info",
            title: "Auto FD plan ready",
            body: `${autoFD.placements.length} placement(s) generated from available funds.`,
            primaryLabel: "Open Auto FD",
            actionType: "open_auto_fd",
            payload: {},
          },
        ]
      : []),
  ];

  return {
    projection,
    actions,
    weak,
    strong,
    all,
    bestOffer,
    upcoming,
    execution,
    notifications,
    autoFD,
  };
}