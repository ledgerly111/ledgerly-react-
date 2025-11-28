import { GCC_COUNTRIES } from '../constants/gccCountries.js';

export function convertCurrency(amount, { from = 'USD', to, countryCode } = {}) {
  const sourceCurrency = from ?? 'USD';
  const targetCurrency = to ?? countryCode ?? 'USD';

  if (!amount || typeof amount !== 'number') {
    return 0;
  }

  if (sourceCurrency === targetCurrency) {
    return amount;
  }

  const targetInfo = GCC_COUNTRIES[targetCurrency] ?? GCC_COUNTRIES[countryCode ?? 'AE'];
  const defaultInfo = GCC_COUNTRIES[countryCode ?? 'AE'];

  if (!targetInfo) {
    return amount;
  }

  const toRate = targetInfo.rate;
  const fromInfo = Object.values(GCC_COUNTRIES).find((info) => info.currency === sourceCurrency);
  const fromRate = fromInfo?.rate;

  if (sourceCurrency === 'USD') {
    return amount * toRate;
  }

  if (targetCurrency === 'USD') {
    return amount / (fromRate ?? 1);
  }

  if (!fromRate) {
    return amount;
  }

  // Convert to USD then to target
  const amountInUsd = amount / fromRate;
  return amountInUsd * toRate;
}

export function formatCurrency(amount, { countryCode, showSymbol = true } = {}) {
  const info = GCC_COUNTRIES[countryCode ?? 'AE'] ?? GCC_COUNTRIES.AE;
  const value = typeof amount === 'number' ? amount : Number(amount) || 0;

  if (showSymbol) {
    return `${info.symbol} ${value.toFixed(2)}`;
  }

  return `${value.toFixed(2)} ${info.currency}`;
}

export function getTaxInfo(countryCode) {
  const info = GCC_COUNTRIES[countryCode ?? 'AE'] ?? GCC_COUNTRIES.AE;
  return {
    rate: info.tax,
    name: info.taxName,
    amount(value) {
      const base = typeof value === 'number' ? value : Number(value) || 0;
      return base * info.tax;
    },
  };
}

