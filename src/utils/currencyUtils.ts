import { CurrencyCode } from '../types';

export interface CurrencyInfo {
  code: CurrencyCode;
  name: string;
  symbol: string;
  flag: string;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'USD', name: 'Dólar USA', symbol: '$', flag: '🇺🇸' },
  { code: 'GBP', name: 'Libra Esterlina', symbol: '£', flag: '🇬🇧' },
  { code: 'AUD', name: 'Dólar Australiano', symbol: 'A$', flag: '🇦🇺' },
  { code: 'CAD', name: 'Dólar Canadiense', symbol: 'C$', flag: '🇨🇦' },
  { code: 'JPY', name: 'Yen Japonés', symbol: '¥', flag: '🇯🇵' },
  { code: 'CHF', name: 'Franco Suizo', symbol: 'CHF', flag: '🇨🇭' },
  { code: 'MXN', name: 'Peso Mexicano', symbol: 'Mex$', flag: '🇲🇽' },
  { code: 'SGD', name: 'Dólar Singapur', symbol: 'S$', flag: '🇸🇬' },
  { code: 'THB', name: 'Baht Tailandés', symbol: '฿', flag: '🇹🇭' },
];

export function getCurrencyInfo(code: CurrencyCode): CurrencyInfo {
  return CURRENCIES.find((c) => c.code === code) || CURRENCIES[0];
}

export function calculateForeignToVndRate(
  rates: Record<string, number>,
  currencyCode: CurrencyCode
): number {
  const usdVndRate = rates['VND'] || 26000;
  const foreignUsdRate = rates[currencyCode] || (currencyCode === 'USD' ? 1 : 0.8965);
  return usdVndRate / foreignUsdRate;
}

export function formatForeignPrice(
  vndAmount: number,
  currencyCode: CurrencyCode,
  rates: Record<string, number>,
  options?: { compact?: boolean }
): string {
  const foreignToVndRate = calculateForeignToVndRate(rates, currencyCode);
  const foreignVal = vndAmount / foreignToVndRate;
  const curr = getCurrencyInfo(currencyCode);

  if (currencyCode === 'JPY') {
    return `${Math.round(foreignVal).toLocaleString('es-ES')} ${curr.symbol}`;
  }

  if (options?.compact && foreignVal >= 100) {
    return `${Math.round(foreignVal).toLocaleString('es-ES')} ${curr.symbol}`;
  }

  return `${foreignVal.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${curr.symbol}`;
}
