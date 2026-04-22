export function getMonthMatrix(baseDate) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];

  for (let i = 0; i < startDay; i += 1) {
    cells.push(null);
  }

  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push(new Date(year, month, d));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return weeks;
}