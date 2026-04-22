import useLocalStorage from "./useLocalStorage";
import { DEFAULT_RECORDS } from "../data/defaultRecords";
import { parseNumber } from "../utils/finance";

const STORAGE_KEY = "fd_advisor_v24_records";

export function getInitialRecordForm(currency = "MYR") {
  return {
    type: "FD",
    bank: "",
    productName: "",
    sourceAccount: "",
    savingBucket: "FD Allocation",
    currency,
    principal: "",
    rate: "",
    startDate: "",
    tenureMonths: "",
    maturityDate: "",
    status: "ACTIVE",
    note: "",
  };
}

export default function useRecords() {
  const [records, setRecords] = useLocalStorage(STORAGE_KEY, DEFAULT_RECORDS);

  function addRecord(record) {
    setRecords((prev) => [record, ...prev]);
  }

  function updateRecord(recordId, updatedRecord) {
    setRecords((prev) =>
      prev.map((item) => (item.id === recordId ? updatedRecord : item))
    );
  }

  function deleteRecord(recordId) {
    setRecords((prev) => prev.filter((item) => item.id !== recordId));
  }

  function closeRecord(recordId) {
    setRecords((prev) =>
      prev.map((item) =>
        item.id === recordId ? { ...item, status: "CLOSED" } : item
      )
    );
  }

  function replaceAllRecords(nextRecords) {
    setRecords(nextRecords);
  }

  function normalizeImportedRecords(rows, fallbackCurrency = "MYR") {
    return rows.map((row) => ({
      id: row.id || `FD${Date.now()}`,
      type: row.type || "FD",
      bank: row.bank || "",
      productName: row.productName || "",
      sourceAccount: row.sourceAccount || "",
      savingBucket: row.savingBucket || "",
      currency: row.currency || fallbackCurrency,
      principal: parseNumber(row.principal),
      rate: parseNumber(row.rate),
      startDate: row.startDate || "",
      tenureMonths: parseNumber(row.tenureMonths),
      maturityDate: row.maturityDate || "",
      status: row.status || "ACTIVE",
      note: row.note || "",
    }));
  }

  return {
    records,
    setRecords,
    addRecord,
    updateRecord,
    deleteRecord,
    closeRecord,
    replaceAllRecords,
    normalizeImportedRecords,
  };
}