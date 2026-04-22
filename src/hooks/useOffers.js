import useLocalStorage from "./useLocalStorage";
import { DEFAULT_OFFERS } from "../data/defaultOffers";
import { parseNumber } from "../utils/finance";

const STORAGE_KEY = "fd_advisor_v24_offers";

export function getInitialOfferForm(currency = "MYR") {
  return {
    id: "",
    bank: "",
    productName: "",
    currency,
    tenureMonths: "",
    rate: "",
    minAmount: "",
    note: "",
  };
}

export default function useOffers() {
  const [offers, setOffers] = useLocalStorage(STORAGE_KEY, DEFAULT_OFFERS);

  function normalizeOffer(offer) {
    return {
      ...offer,
      id: offer.id || `OF${Date.now()}`,
      tenureMonths: parseNumber(offer.tenureMonths),
      rate: parseNumber(offer.rate),
      minAmount: parseNumber(offer.minAmount),
    };
  }

  function addOffer(offer) {
    const normalized = normalizeOffer(offer);
    setOffers((prev) => [normalized, ...prev]);
  }

  function updateOffer(offerId, updatedOffer) {
    setOffers((prev) =>
      prev.map((item) =>
        item.id === offerId
          ? normalizeOffer({ ...item, ...updatedOffer })
          : item
      )
    );
  }

  function deleteOffer(offerId) {
    setOffers((prev) => prev.filter((item) => item.id !== offerId));
  }

  return {
    offers,
    setOffers,
    addOffer,
    updateOffer,
    deleteOffer,
    normalizeOffer,
  };
}