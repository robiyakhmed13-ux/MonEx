import { useState, useEffect, useCallback, useMemo } from "react";
import { Currency, ExchangeRates } from "@/types";
import { safeJSON } from "@/lib/storage";

const DEFAULT_CURRENCIES: Currency[] = [
  { code: "UZS", symbol: "so'm", name: "Uzbek Som", rate: 1 },
  { code: "USD", symbol: "$", name: "US Dollar", rate: 12850 },
  { code: "EUR", symbol: "€", name: "Euro", rate: 14100 },
  { code: "RUB", symbol: "₽", name: "Russian Ruble", rate: 130 },
  { code: "KZT", symbol: "₸", name: "Kazakhstani Tenge", rate: 26 },
  { code: "GBP", symbol: "£", name: "British Pound", rate: 16500 },
  { code: "TRY", symbol: "₺", name: "Turkish Lira", rate: 365 },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan", rate: 1760 },
];

// Free exchange rate API
const EXCHANGE_API = "https://open.er-api.com/v6/latest/USD";

export const useCurrency = () => {
  const [baseCurrency, setBaseCurrencyState] = useState<string>(() => 
    safeJSON.get("hamyon_baseCurrency", "UZS")
  );
  const [currencies, setCurrencies] = useState<Currency[]>(DEFAULT_CURRENCIES);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(() =>
    safeJSON.get("hamyon_exchangeRates", null)
  );
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  // Fetch latest exchange rates
  const fetchExchangeRates = useCallback(async () => {
    setLoading(true);
    setLastError(null);
    try {
      const response = await fetch(EXCHANGE_API);
      const data = await response.json();
      
      if (data.result === "success") {
        const rates: ExchangeRates = {
          base: "USD",
          rates: data.rates,
          lastUpdated: new Date().toISOString(),
        };
        setExchangeRates(rates);
        safeJSON.set("hamyon_exchangeRates", rates);
        
        // Update currency rates based on USD
        const uzsRate = data.rates.UZS || 12850;
        const updatedCurrencies = DEFAULT_CURRENCIES.map(curr => ({
          ...curr,
          rate: curr.code === "UZS" ? 1 : Math.round(uzsRate / (data.rates[curr.code] || 1)),
        }));
        setCurrencies(updatedCurrencies);
        safeJSON.set("hamyon_currencies", updatedCurrencies);
      }
    } catch (error) {
      console.error("Failed to fetch exchange rates:", error);
      setLastError("Failed to fetch exchange rates");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh rates on mount if stale (older than 1 hour)
  useEffect(() => {
    const lastUpdated = exchangeRates?.lastUpdated;
    if (!lastUpdated) {
      fetchExchangeRates();
    } else {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      if (lastUpdated < hourAgo) {
        fetchExchangeRates();
      }
    }
  }, []);

  const setBaseCurrency = useCallback((code: string) => {
    setBaseCurrencyState(code);
    safeJSON.set("hamyon_baseCurrency", code);
  }, []);

  // Convert amount from one currency to another
  const convert = useCallback((amount: number, fromCurrency: string, toCurrency: string): number => {
    if (fromCurrency === toCurrency) return amount;
    
    const fromRate = currencies.find(c => c.code === fromCurrency)?.rate || 1;
    const toRate = currencies.find(c => c.code === toCurrency)?.rate || 1;
    
    // Convert to UZS first, then to target currency
    const inUZS = amount * fromRate;
    return Math.round(inUZS / toRate);
  }, [currencies]);

  // Format amount with currency symbol
  const formatWithCurrency = useCallback((amount: number, currencyCode: string): string => {
    const currency = currencies.find(c => c.code === currencyCode);
    const formatted = new Intl.NumberFormat("uz-UZ").format(Math.abs(amount));
    const symbol = currency?.symbol || currencyCode;
    
    if (amount < 0) {
      return `-${formatted} ${symbol}`;
    }
    return `${formatted} ${symbol}`;
  }, [currencies]);

  // Get currency by code
  const getCurrency = useCallback((code: string): Currency | undefined => {
    return currencies.find(c => c.code === code);
  }, [currencies]);

  return {
    baseCurrency,
    setBaseCurrency,
    currencies,
    exchangeRates,
    loading,
    lastError,
    fetchExchangeRates,
    convert,
    formatWithCurrency,
    getCurrency,
  };
};
