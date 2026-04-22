export function getBestOffer(offers) {
  if (!offers.length) return null;
  return [...offers].sort((a, b) => Number(b.rate || 0) - Number(a.rate || 0))[0];
}

export function getTopOffers(offers, limit = 3) {
  return [...offers]
    .sort((a, b) => Number(b.rate || 0) - Number(a.rate || 0))
    .slice(0, limit);
}