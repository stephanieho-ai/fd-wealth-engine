export function groupCurrenciesByLetter(currencies, keyword = "") {
  const q = keyword.toLowerCase();

  const filtered = currencies.filter((item) =>
    `${item.name} ${item.code}`.toLowerCase().includes(q)
  );

  const groups = {};
  filtered.forEach((item) => {
    const letter = item.name[0].toUpperCase();
    if (!groups[letter]) groups[letter] = [];
    groups[letter].push(item);
  });

  return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
}